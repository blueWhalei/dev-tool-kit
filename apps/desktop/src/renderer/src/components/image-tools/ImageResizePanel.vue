<template>
  <NTabPane
    name="resize"
    :tab="page.t('tabs.resize')"
  >
    <div class="action-bar">
      <NButton
        type="primary"
        :loading="imageLoading"
        @click="pickImageForResize"
      >
        {{ page.t('actions.pickImage') }}
      </NButton>
    </div>

    <template v-if="pickedImage">
      <NCard
        class="editor-card"
        :bordered="false"
        style="margin-top: 16px"
      >
        <template #header>
          <div class="card-header-flex">
            <span class="card-title">{{ page.t('labels.original') }}</span>
            <NTag
              v-if="infoData"
              size="small"
              :bordered="false"
            >
              {{ infoData.width }}×{{ infoData.height }}
            </NTag>
          </div>
        </template>
        <div class="image-preview-wrap">
          <img
            :src="resizeOriginalPreviewUri"
            :alt="page.t('labels.original')"
            class="image-preview"
          >
        </div>
      </NCard>

      <NCard
        class="editor-card"
        :bordered="false"
        style="margin-top: 16px"
      >
        <template #header>
          <span class="card-title">{{ page.t('labels.resizeMode') }}</span>
        </template>
        <div class="resize-options">
          <div class="option-row">
            <NRadioGroup
              v-model:value="resizeMode"
              size="small"
            >
              <NRadioButton value="preset">
                {{ page.t('labels.presetSizes') }}
              </NRadioButton>
              <NRadioButton value="custom">
                {{ page.t('labels.customSize') }}
              </NRadioButton>
            </NRadioGroup>
          </div>

          <div
            v-if="resizeMode === 'preset'"
            class="option-row"
          >
            <span class="section-label">{{ page.t('labels.presetSizes') }}</span>
            <NSelect
              v-model:value="resizePreset"
              :options="presetSizeOptions"
              style="min-width: 220px"
            />
          </div>

          <div
            v-if="resizeMode === 'custom'"
            class="custom-size-row"
          >
            <div class="custom-size-field">
              <span class="section-label">{{ page.t('labels.width') }}</span>
              <NInput
                :value="resizeCustomWidth != null ? String(resizeCustomWidth) : ''"
                :placeholder="page.t('placeholders.width')"
                style="width: 120px"
                @update:value="handleResizeWidthInput"
              />
            </div>
            <div class="lock-toggle">
              <NButton
                size="small"
                :type="resizeLockAspect ? 'primary' : 'default'"
                quaternary
                @click="resizeLockAspect = !resizeLockAspect"
              >
                {{ resizeLockAspect ? '🔗' : '🔗' }}
              </NButton>
            </div>
            <div class="custom-size-field">
              <span class="section-label">{{ page.t('labels.height') }}</span>
              <NInput
                :value="resizeCustomHeight != null ? String(resizeCustomHeight) : ''"
                :placeholder="page.t('placeholders.height')"
                style="width: 120px"
                @update:value="handleResizeHeightInput"
              />
            </div>
          </div>

          <div class="option-row">
            <span class="section-label">{{ page.t('labels.fit') }}</span>
            <NSelect
              v-model:value="resizeFit"
              :options="fitOptions"
              style="width: 160px"
            />
          </div>

          <div class="option-row">
            <span class="section-label">{{ page.t('labels.withoutEnlargement') }}</span>
            <NRadioGroup
              v-model:value="resizeWithoutEnlargement"
              size="small"
            >
              <NRadioButton :value="false">
                {{ page.t('labels.no') }}
              </NRadioButton>
              <NRadioButton :value="true">
                {{ page.t('labels.yes') }}
              </NRadioButton>
            </NRadioGroup>
          </div>
        </div>
      </NCard>

      <NCard
        v-if="resizeResult"
        class="editor-card"
        :bordered="false"
        style="margin-top: 16px"
      >
        <template #header>
          <div class="card-header-flex">
            <span class="card-title">{{ page.t('labels.result') }}</span>
            <NTag
              size="small"
              :bordered="false"
            >
              {{ resizeResult.width }}×{{ resizeResult.height }}
            </NTag>
          </div>
        </template>
        <div class="image-preview-wrap">
          <img
            :src="`data:${resizeResult.mimeType};base64,${resizeResult.data}`"
            :alt="page.t('labels.result')"
            class="image-preview"
          >
        </div>
      </NCard>

      <div class="action-bar">
        <NButton
          type="primary"
          :loading="resizeLoading"
          @click="handleResize"
        >
          {{ page.t('actions.resize') }}
        </NButton>
        <NButton
          v-if="resizeResult"
          @click="saveResized"
        >
          {{ page.t('actions.save') }}
        </NButton>
      </div>
    </template>
  </NTabPane>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NCard, NTag, NSelect, NInput, NRadioGroup, NRadioButton, useMessage } from 'naive-ui'
import { type ProcessedImage, type ResizeOptions, type ImageInfo } from '@dev-tool-kit/shared'
import { useToolI18n } from '../../composables/useToolI18n'
import { useIpc } from '../../composables/useIpc'
import { useSharedImageState } from '../../composables/useSharedImageState'

const message = useMessage()
const page = useToolI18n('imageTools')
const { invoke } = useIpc()
const { pickedImage, infoData, imageLoading, pickImage, saveProcessedImage } = useSharedImageState()

const resizeMode = ref<'preset' | 'custom'>('preset')
const resizePreset = ref<string | null>('avatar')
const resizeCustomWidth = ref<number | null>(null)
const resizeCustomHeight = ref<number | null>(null)
const resizeLockAspect = ref(true)
const resizeFit = ref<'cover' | 'contain' | 'fill' | 'inside' | 'outside'>('cover')
const resizeWithoutEnlargement = ref(false)
const resizeResult = ref<ProcessedImage | null>(null)
const resizeLoading = ref(false)

const resizeOriginalPreviewUri = computed(() => pickedImage.value?.dataUri ?? '')

const presetSizeOptions = computed(() => [
  { label: page.t('presetSizes.favicon32'), value: 'favicon32' },
  { label: page.t('presetSizes.favicon64'), value: 'favicon64' },
  { label: page.t('presetSizes.icon128'), value: 'icon128' },
  { label: page.t('presetSizes.icon512'), value: 'icon512' },
  { label: page.t('presetSizes.avatar'), value: 'avatar' },
  { label: page.t('presetSizes.ogImage'), value: 'ogImage' },
  { label: page.t('presetSizes.thumbnail'), value: 'thumbnail' },
  { label: page.t('presetSizes.socialCover'), value: 'socialCover' }
])

const PRESET_DIMENSIONS: Record<string, { width: number; height: number }> = {
  favicon32: { width: 32, height: 32 },
  favicon64: { width: 64, height: 64 },
  icon128: { width: 128, height: 128 },
  icon512: { width: 512, height: 512 },
  avatar: { width: 256, height: 256 },
  ogImage: { width: 1200, height: 630 },
  thumbnail: { width: 150, height: 150 },
  socialCover: { width: 1640, height: 856 }
}

const fitOptions = computed(() => [
  { label: page.t('labels.fitCover'), value: 'cover' },
  { label: page.t('labels.fitContain'), value: 'contain' },
  { label: page.t('labels.fitFill'), value: 'fill' },
  { label: page.t('labels.fitInside'), value: 'inside' },
  { label: page.t('labels.fitOutside'), value: 'outside' }
])

function handleResizeWidthInput(val: string) {
  const w = parseInt(val, 10)
  resizeCustomWidth.value = isNaN(w) ? null : w
  if (resizeLockAspect.value && pickedImage.value && resizeCustomWidth.value && infoData.value?.width && infoData.value?.height) {
    const origW = infoData.value?.width ?? 1
    const origH = infoData.value?.height ?? 1
    resizeCustomHeight.value = Math.round((resizeCustomWidth.value / origW) * origH)
  }
}

function handleResizeHeightInput(val: string) {
  const h = parseInt(val, 10)
  resizeCustomHeight.value = isNaN(h) ? null : h
  if (resizeLockAspect.value && pickedImage.value && resizeCustomHeight.value && infoData.value?.width && infoData.value?.height) {
    const origW = infoData.value?.width ?? 1
    const origH = infoData.value?.height ?? 1
    resizeCustomWidth.value = Math.round((resizeCustomHeight.value / origH) * origW)
  }
}

async function pickImageForResize() {
  resizeResult.value = null
  const data = await pickImage()
  if (!data) return
  // Fetch info for aspect ratio calculations
  try {
    const info = await invoke<ImageInfo | null>('image-tools:getInfo', data.filePath)
    infoData.value = info ?? null
  } catch {
    // Non-critical — proceed without info
  }
}

async function handleResize() {
  if (!pickedImage.value) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  let targetWidth: number | undefined
  let targetHeight: number | undefined

  if (resizeMode.value === 'preset' && resizePreset.value) {
    const dims = PRESET_DIMENSIONS[resizePreset.value]
    if (dims) {
      targetWidth = dims.width
      targetHeight = dims.height
    }
  } else {
    targetWidth = resizeCustomWidth.value ?? undefined
    targetHeight = resizeCustomHeight.value ?? undefined
  }

  if (!targetWidth && !targetHeight) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }

  resizeLoading.value = true
  try {
    const options: ResizeOptions = {
      width: targetWidth,
      height: targetHeight,
      fit: resizeFit.value,
      withoutEnlargement: resizeWithoutEnlargement.value || undefined
    }
    const result = await invoke<ProcessedImage | null>('image-tools:resize', pickedImage.value.filePath, options)
    if (result) {
      resizeResult.value = result
      message.success(page.t('messages.resizeSuccess'))
    } else {
      message.error(page.t('messages.resizeFailed'))
    }
  } catch {
    message.error(page.t('messages.resizeFailed'))
  } finally {
    resizeLoading.value = false
  }
}

async function saveResized() {
  if (!resizeResult.value) return
  await saveProcessedImage(resizeResult.value)
}
</script>

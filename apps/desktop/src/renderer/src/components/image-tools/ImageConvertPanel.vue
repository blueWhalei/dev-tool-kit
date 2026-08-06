<template>
    <div class="action-bar">
      <NButton
        type="primary"
        :loading="imageLoading"
        @click="pickImageForConvert"
      >
        {{ page.t('actions.pickImage') }}
      </NButton>
    </div>

    <template v-if="pickedImage">
      <NGrid
        cols="1 768:2"
        :x-gap="16"
        :y-gap="16"
        style="margin-top: 16px"
      >
        <NGridItem>
          <NCard
            class="editor-card"
            :bordered="false"
          >
            <template #header>
              <div class="card-header-flex">
                <span class="card-title">{{ page.t('labels.original') }}</span>
                <NTag
                  size="small"
                  :bordered="false"
                >
                  {{ pickedImage.mimeType }}
                </NTag>
              </div>
            </template>
            <div class="image-preview-wrap">
              <img
                :src="convertOriginalPreviewUri"
                :alt="page.t('labels.original')"
                class="image-preview"
              >
            </div>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard
            v-if="convertResult"
            class="editor-card"
            :bordered="false"
          >
            <template #header>
              <div class="card-header-flex">
                <span class="card-title">{{ page.t('labels.result') }}</span>
                <NTag
                  size="small"
                  :bordered="false"
                >
                  {{ convertResult.mimeType }}
                </NTag>
              </div>
            </template>
            <div class="image-preview-wrap">
              <img
                :src="`data:${convertResult.mimeType};base64,${convertResult.data}`"
                :alt="page.t('labels.result')"
                class="image-preview"
              >
            </div>
          </NCard>
          <NCard
            v-else
            class="editor-card"
            :bordered="false"
          >
            <div class="result-placeholder">
              {{ page.t('labels.result') }}
            </div>
          </NCard>
        </NGridItem>
      </NGrid>

      <NCard
        class="editor-card"
        :bordered="false"
        style="margin-top: 16px"
      >
        <template #header>
          <span class="card-title">{{ page.t('labels.targetFormat') }}</span>
        </template>
        <div class="convert-options">
          <div class="option-row">
            <span class="section-label">{{ page.t('labels.targetFormat') }}</span>
            <NSelect
              v-model:value="convertTargetFormat"
              :options="convertFormatOptions"
              style="width: 160px"
            />
          </div>
          <div
            v-if="convertTargetFormat !== 'png'"
            class="option-row"
          >
            <span class="section-label">{{ page.t('labels.quality') }}: {{ convertQuality }}</span>
            <NSlider
              v-model:value="convertQuality"
              :min="1"
              :max="100"
              :step="1"
              style="width: 260px"
            />
          </div>
          <div
            v-if="convertTargetFormat === 'jpeg' && sourceHasAlpha"
            class="option-row"
          >
            <span class="section-label">{{ page.t('labels.background') }}</span>
            <NInput
              v-model:value="convertBackground"
              :placeholder="page.t('placeholders.backgroundColor')"
              style="width: 160px"
            />
            <span
              class="color-swatch"
              :style="{ backgroundColor: convertBackground }"
            />
          </div>
        </div>
      </NCard>

      <div class="action-bar">
        <NButton
          type="primary"
          :loading="convertLoading"
          @click="handleConvert"
        >
          {{ page.t('actions.convert') }}
        </NButton>
        <NButton
          v-if="convertResult"
          @click="saveConverted"
        >
          {{ page.t('actions.save') }}
        </NButton>
      </div>
    </template>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NCard, NGrid, NGridItem, NTag, NSelect, NSlider, NInput, useMessage } from 'naive-ui'
import { type ProcessedImage, type ImageConvertOptions } from '@dev-tool-kit/shared'
import { useToolI18n } from '../../composables/useToolI18n'
import { useIpc } from '../../composables/useIpc'
import { useSharedImageState } from '../../composables/useSharedImageState'

const message = useMessage()
const page = useToolI18n('imageTools')
const { invoke } = useIpc()
const { pickedImage, imageLoading, pickImage, saveProcessedImage } = useSharedImageState()

const convertTargetFormat = ref<'png' | 'jpeg' | 'webp'>('png')
const convertBackground = ref('#ffffff')
const convertQuality = ref(90)
const convertResult = ref<ProcessedImage | null>(null)
const convertLoading = ref(false)

const convertOriginalPreviewUri = computed(() => pickedImage.value?.dataUri ?? '')

const sourceHasAlpha = computed(() => {
  if (!pickedImage.value) return false
  return pickedImage.value.mimeType === 'image/png' || pickedImage.value.mimeType === 'image/webp'
})

const convertFormatOptions = computed(() => [
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'WebP', value: 'webp' }
])

async function pickImageForConvert() {
  convertResult.value = null
  await pickImage()
}

async function handleConvert() {
  if (!pickedImage.value) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  convertLoading.value = true
  try {
    const options: ImageConvertOptions = {
      format: convertTargetFormat.value,
      quality: convertTargetFormat.value !== 'png' ? convertQuality.value : undefined,
      background: convertTargetFormat.value === 'jpeg' && sourceHasAlpha.value ? convertBackground.value : undefined
    }
    const result = await invoke<ProcessedImage | null>('image-tools:convert', pickedImage.value.filePath, options)
    if (result) {
      convertResult.value = result
      message.success(page.t('messages.convertSuccess'))
    } else {
      message.error(page.t('messages.convertFailed'))
    }
  } catch {
    message.error(page.t('messages.convertFailed'))
  } finally {
    convertLoading.value = false
  }
}

async function saveConverted() {
  if (!convertResult.value) return
  await saveProcessedImage(convertResult.value)
}
</script>

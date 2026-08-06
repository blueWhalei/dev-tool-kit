<template>
    <div class="action-bar">
      <NButton
        type="primary"
        :loading="imageLoading"
        @click="pickImageForCompress"
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
              <span class="card-title">{{ page.t('labels.original') }}</span>
            </template>
            <div class="image-preview-wrap">
              <img
                :src="compressOriginalPreviewUri"
                :alt="page.t('labels.original')"
                class="image-preview"
              >
            </div>
            <div
              class="image-meta"
              style="margin-top: 8px"
            >
              <span>{{ page.t('labels.fileSize') }}: {{ formatBytes(pickedImage.size) }}</span>
            </div>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard
            v-if="compressResult"
            class="editor-card"
            :bordered="false"
          >
            <template #header>
              <span class="card-title">{{ page.t('labels.result') }}</span>
            </template>
            <div class="image-preview-wrap">
              <img
                :src="`data:${compressResult.mimeType};base64,${compressResult.data}`"
                :alt="page.t('labels.result')"
                class="image-preview"
              >
            </div>
            <div
              class="image-meta"
              style="margin-top: 8px"
            >
              <span>{{ page.t('labels.sizeAfter') }}: {{ formatBytes(compressResult.size) }}</span>
              <NTag
                type="success"
                size="small"
                :bordered="false"
              >
                {{ page.t('labels.compressionRatio') }}: {{ compressRatio }}
              </NTag>
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
          <span class="card-title">{{ page.t('labels.outputFormat') }}</span>
        </template>
        <div class="compress-options">
          <div class="option-row">
            <span class="section-label">{{ page.t('labels.outputFormat') }}</span>
            <NSelect
              v-model:value="compressFormat"
              :options="compressFormatOptions"
              style="width: 160px"
            />
          </div>
          <div
            v-if="compressFormat !== 'png'"
            class="option-row"
          >
            <span class="section-label">{{ page.t('labels.quality') }}: {{ compressQuality }}</span>
            <NSlider
              v-model:value="compressQuality"
              :min="1"
              :max="100"
              :step="1"
              style="width: 260px"
            />
          </div>
          <div
            v-if="compressFormat === 'png'"
            class="option-row"
          >
            <span class="section-label">{{ page.t('labels.palette') }}</span>
            <NRadioGroup
              v-model:value="compressPalette"
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

      <div class="action-bar">
        <NButton
          type="primary"
          :loading="compressLoading"
          @click="handleCompress"
        >
          {{ page.t('actions.compress') }}
        </NButton>
        <NButton
          v-if="compressResult"
          @click="saveCompressed"
        >
          {{ page.t('actions.save') }}
        </NButton>
      </div>
    </template>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NCard, NGrid, NGridItem, NTag, NSelect, NSlider, NRadioGroup, NRadioButton, useMessage } from 'naive-ui'
import { formatBytes, type ProcessedImage, type CompressOptions } from '@dev-tool-kit/shared'
import { useToolI18n } from '../../composables/useToolI18n'
import { useIpc } from '../../composables/useIpc'
import { useSharedImageState } from '../../composables/useSharedImageState'

const message = useMessage()
const page = useToolI18n('imageTools')
const { invoke } = useIpc()
const { pickedImage, imageLoading, pickImage, saveProcessedImage } = useSharedImageState()

const compressFormat = ref<'jpeg' | 'webp' | 'png'>('jpeg')
const compressQuality = ref(80)
const compressPalette = ref(false)
const compressResult = ref<ProcessedImage | null>(null)
const compressLoading = ref(false)

const compressOriginalPreviewUri = computed(() => pickedImage.value?.dataUri ?? '')

const compressRatio = computed(() => {
  if (!compressResult.value || !pickedImage.value) return ''
  const original = pickedImage.value.size
  const compressed = compressResult.value.size
  const ratio = ((1 - compressed / original) * 100).toFixed(1)
  return `${ratio}%`
})

const compressFormatOptions = computed(() => [
  { label: 'JPEG', value: 'jpeg' },
  { label: 'WebP', value: 'webp' },
  { label: 'PNG', value: 'png' }
])

async function pickImageForCompress() {
  compressResult.value = null
  await pickImage()
}

async function handleCompress() {
  if (!pickedImage.value) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  compressLoading.value = true
  try {
    const options: CompressOptions = {
      format: compressFormat.value,
      quality: compressFormat.value === 'png' ? 80 : compressQuality.value,
      palette: compressFormat.value === 'png' ? compressPalette.value : undefined
    }
    const result = await invoke<ProcessedImage | null>('image-tools:compress', pickedImage.value.filePath, options)
    if (result) {
      compressResult.value = result
      message.success(page.t('messages.compressSuccess'))
    } else {
      message.error(page.t('messages.compressFailed'))
    }
  } catch {
    message.error(page.t('messages.compressFailed'))
  } finally {
    compressLoading.value = false
  }
}

async function saveCompressed() {
  if (!compressResult.value) return
  await saveProcessedImage(compressResult.value)
}
</script>

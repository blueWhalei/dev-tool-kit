<template>
  <div
    class="action-bar"
    style="margin-top: 0; border-top: none; padding-top: 0"
  >
    <NButton
      type="primary"
      :loading="imageLoading"
      @click="pickImageForPreset"
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
        <span class="card-title">{{ page.t('labels.encodePreset') }}</span>
      </template>
      <p class="preset-description">
        {{ page.t('labels.presetDescription') }}
      </p>
      <div class="preset-grid">
        <div
          v-for="preset in ENCODE_PRESETS"
          :key="preset.key"
          class="preset-card"
          :class="{ 'preset-card--loading': presetLoading }"
          @click="applyPreset(preset)"
        >
          <span class="preset-name">{{ page.t(`labels.${preset.key}` as any) }}</span>
          <span class="preset-desc">{{ page.t(`labels.${preset.key}Desc` as any) }}</span>
        </div>
      </div>
    </NCard>

    <NCard
      v-if="presetResult"
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
            {{ presetResult.mimeType }}
          </NTag>
        </div>
      </template>
      <div class="image-preview-wrap">
        <img
          :src="`data:${presetResult.mimeType};base64,${presetResult.data}`"
          :alt="page.t('labels.result')"
          class="image-preview"
        >
      </div>
      <div
        class="image-meta"
        style="margin-top: 8px"
      >
        <span>{{ presetResult.width }}×{{ presetResult.height }}</span>
        <span>{{ formatBytes(presetResult.size) }}</span>
      </div>
      <div
        class="action-bar"
        style="margin-top: 12px; border-top: none; padding-top: 0"
      >
        <NButton @click="savePresetResult">
          {{ page.t('actions.save') }}
        </NButton>
      </div>
    </NCard>
  </template>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NCard, NTag, useMessage } from 'naive-ui'
import { formatBytes, type ProcessedImage, type CompressOptions, type ResizeOptions, type ImageConvertOptions } from '@dev-tool-kit/shared'
import { useToolI18n } from '../../composables/useToolI18n'
import { useIpc } from '../../composables/useIpc'
import { useSharedImageState } from '../../composables/useSharedImageState'

const message = useMessage()
const page = useToolI18n('imageTools')
const { invoke } = useIpc()
const { pickedImage, imageLoading, pickImage, saveProcessedImage } = useSharedImageState()

const presetLoading = ref(false)
const presetResult = ref<ProcessedImage | null>(null)

interface PresetConfig {
  key: string
  operation: 'compress' | 'resize' | 'convert'
  compressOptions?: CompressOptions
  resizeOptions?: ResizeOptions
  convertOptions?: ImageConvertOptions
}

const ENCODE_PRESETS: PresetConfig[] = [
  {
    key: 'presetWeb',
    operation: 'compress',
    compressOptions: { format: 'webp', quality: 80 }
  },
  {
    key: 'presetAvatar',
    operation: 'resize',
    resizeOptions: { width: 256, height: 256, fit: 'cover' }
  },
  {
    key: 'presetAppIcon',
    operation: 'compress',
    compressOptions: { format: 'png', quality: 80 }
  },
  {
    key: 'presetEcommerce',
    operation: 'resize',
    resizeOptions: { width: 800, height: 800, fit: 'cover' }
  },
  {
    key: 'presetOg',
    operation: 'resize',
    resizeOptions: { width: 1200, height: 630, fit: 'cover' }
  }
]

async function pickImageForPreset() {
  presetResult.value = null
  await pickImage()
}

async function applyPreset(preset: PresetConfig) {
  if (!pickedImage.value) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  presetLoading.value = true
  try {
    let result: ProcessedImage | null = null
    switch (preset.operation) {
      case 'compress':
        result = await invoke<ProcessedImage | null>('image-tools:compress', pickedImage.value.filePath, preset.compressOptions!) ?? null
        break
      case 'resize':
        result = await invoke<ProcessedImage | null>('image-tools:resize', pickedImage.value.filePath, preset.resizeOptions!) ?? null
        break
      case 'convert':
        result = await invoke<ProcessedImage | null>('image-tools:convert', pickedImage.value.filePath, preset.convertOptions!) ?? null
        break
    }
    if (result) {
      presetResult.value = result
      message.success(page.t('messages.presetApplySuccess'))
    } else {
      message.error(page.t('messages.presetApplyFailed'))
    }
  } catch {
    message.error(page.t('messages.presetApplyFailed'))
  } finally {
    presetLoading.value = false
  }
}

async function savePresetResult() {
  if (!presetResult.value) return
  await saveProcessedImage(presetResult.value)
}
</script>

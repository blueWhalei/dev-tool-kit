<template>
  <div
    class="action-bar"
    style="margin-top: 0; border-top: none; padding-top: 0"
  >
    <NButton
      type="primary"
      :loading="svgLoading"
      @click="pickSvgFile"
    >
      {{ page.t('actions.pickSvg') }}
    </NButton>
  </div>

  <template v-if="svgFile">
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
              <span class="card-title">{{ page.t('labels.svgInput') }}</span>
              <NTag
                size="small"
                :bordered="false"
              >
                {{ formatBytes(svgFile.size) }}
              </NTag>
            </div>
          </template>
          <div class="image-preview-wrap">
            <img
              :src="svgOriginalBlobUrl"
              alt="SVG"
              class="image-preview"
            >
          </div>
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard
          v-if="svgOptimizeResult"
          class="editor-card"
          :bordered="false"
        >
          <template #header>
            <div class="card-header-flex">
              <span class="card-title">{{ page.t('labels.svgOutput') }}</span>
              <NTag
                type="success"
                size="small"
                :bordered="false"
              >
                {{ page.t('labels.savings') }}: {{ svgOptimizeResult.savings }}%
              </NTag>
            </div>
          </template>
          <div class="image-meta">
            <span>{{ page.t('labels.sizeBefore') }}: {{ formatBytes(svgOptimizeResult.originalSize) }}</span>
            <span>{{ page.t('labels.sizeAfter') }}: {{ formatBytes(svgOptimizeResult.optimizedSize) }}</span>
          </div>
          <div class="image-preview-wrap">
            <img
              :src="svgOptimizedBlobUrl"
              alt="Optimized SVG"
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
            {{ page.t('labels.svgOutput') }}
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
        <span class="card-title">{{ page.t('labels.svgOptions') }}</span>
      </template>
      <NGrid
        cols="1 640:2"
        :x-gap="16"
        :y-gap="8"
      >
        <NGridItem
          v-for="(val, key) in svgOptions"
          :key="key"
        >
          <div class="svg-option-row">
            <NSwitch
              :value="val"
              @update:value="(v: boolean) => { (svgOptions as any)[key] = v }"
            />
            <span class="svg-option-label">{{ page.t(`labels.${key}` as any) || key }}</span>
          </div>
        </NGridItem>
      </NGrid>
    </NCard>

    <div class="action-bar">
      <NButton
        type="primary"
        :loading="svgOptimizing"
        @click="handleOptimizeSvg"
      >
        {{ page.t('actions.optimizeSvg') }}
      </NButton>
      <NButton
        v-if="svgOptimizeResult"
        @click="saveOptimizedSvg"
      >
        {{ page.t('actions.save') }}
      </NButton>
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { NButton, NGrid, NGridItem, NCard, NTag, NSwitch, useMessage } from 'naive-ui'
import { formatBytes, type SvgOptimizeOptions, type SvgOptimizeResult } from '@dev-tool-kit/shared'
import { useToolI18n } from '../../composables/useToolI18n'
import { useIpc } from '../../composables/useIpc'

const message = useMessage()
const page = useToolI18n('imageTools')
const { invoke } = useIpc()

interface SvgFileData {
  fileName: string
  filePath: string
  content: string
  size: number
}

const svgFile = ref<SvgFileData | null>(null)
const svgLoading = ref(false)
const svgOptimizeResult = ref<SvgOptimizeResult | null>(null)
const svgOptimizing = ref(false)
const svgOptions = ref<SvgOptimizeOptions>({
  removeComments: true,
  removeMetadata: true,
  removeEditorsNSData: true,
  cleanupAttrs: true,
  removeEmptyAttrs: true,
  removeHiddenElems: true,
  removeEmptyText: true,
  removeEmptyContainers: true,
  removeUnusedNS: true,
  collapseGroups: true,
  convertShapeToPath: false,
  minifyStyles: true
})

// SVG 预览 blob URL：变化时 revoke 旧 URL，组件卸载时统一清理，避免泄漏
const svgOriginalBlobUrl = ref('')
watch(
  () => svgFile.value,
  (file) => {
    if (svgOriginalBlobUrl.value) URL.revokeObjectURL(svgOriginalBlobUrl.value)
    svgOriginalBlobUrl.value = file
      ? URL.createObjectURL(new Blob([file.content], { type: 'image/svg+xml' }))
      : ''
  }
)

const svgOptimizedBlobUrl = ref('')
watch(
  () => svgOptimizeResult.value?.optimized,
  (optimized) => {
    if (svgOptimizedBlobUrl.value) URL.revokeObjectURL(svgOptimizedBlobUrl.value)
    svgOptimizedBlobUrl.value = optimized
      ? URL.createObjectURL(new Blob([optimized], { type: 'image/svg+xml' }))
      : ''
  }
)

onUnmounted(() => {
  if (svgOriginalBlobUrl.value) URL.revokeObjectURL(svgOriginalBlobUrl.value)
  if (svgOptimizedBlobUrl.value) URL.revokeObjectURL(svgOptimizedBlobUrl.value)
})

async function pickSvgFile() {
  svgLoading.value = true
  svgOptimizeResult.value = null
  try {
    const data = await invoke<SvgFileData | null>('image-tools:pickSvgFile')
    if (data) {
      svgFile.value = data
      message.success(page.t('messages.svgLoaded'))
    }
  } catch {
    message.error(page.t('messages.svgLoadFailed'))
  } finally {
    svgLoading.value = false
  }
}

async function handleOptimizeSvg() {
  if (!svgFile.value) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  svgOptimizing.value = true
  try {
    const result = await invoke<SvgOptimizeResult | null>('image-tools:optimizeSvg', svgFile.value.content, svgOptions.value)
    if (result) {
      svgOptimizeResult.value = result
      message.success(page.t('messages.svgOptimized'))
    } else {
      message.error(page.t('messages.svgOptimizeFailed'))
    }
  } catch {
    message.error(page.t('messages.svgOptimizeFailed'))
  } finally {
    svgOptimizing.value = false
  }
}

async function saveOptimizedSvg() {
  if (!svgOptimizeResult.value || !svgFile.value) return
  const fileName = svgFile.value.fileName
  try {
    const result = await invoke<{ success: boolean }>('image-tools:saveImage',
      btoa(svgOptimizeResult.value.optimized), fileName, 'image/svg+xml')
    if (result?.success) {
      message.success(page.t('messages.saveSuccess'))
    } else {
      message.error(page.t('messages.saveFailed'))
    }
  } catch {
    message.error(page.t('messages.saveFailed'))
  }
}
</script>

<template>
  <NTabPane
    name="batch"
    :tab="page.t('tabs.batch')"
  >
    <div
      class="action-bar"
      style="margin-top: 0; border-top: none; padding-top: 0"
    >
      <NButton
        type="primary"
        @click="pickBatchImages"
      >
        {{ page.t('actions.pickImages') }}
      </NButton>
    </div>

    <template v-if="batchImages.length > 0">
      <NCard
        class="editor-card"
        :bordered="false"
        style="margin-top: 16px"
      >
        <template #header>
          <span class="card-title">{{ page.t('labels.batchImages') }} ({{ batchImages.length }})</span>
        </template>
        <div class="batch-image-list">
          <div
            v-for="(img, i) in batchImages"
            :key="i"
            class="batch-image-item"
          >
            <span class="batch-image-name">{{ img.fileName }}</span>
            <span class="batch-image-size">{{ formatBytes(img.size) }}</span>
            <NButton
              size="tiny"
              quaternary
              @click="removeBatchImage(i)"
            >
              ✕
            </NButton>
          </div>
        </div>
      </NCard>

      <NCard
        class="editor-card"
        :bordered="false"
        style="margin-top: 16px"
      >
        <template #header>
          <span class="card-title">{{ page.t('labels.batchOperation') }}</span>
        </template>
        <div class="batch-options">
          <div class="option-row">
            <span class="section-label">{{ page.t('labels.batchOperation') }}</span>
            <NSelect
              v-model:value="batchOperation"
              :options="batchOperationOptions"
              style="width: 160px"
            />
          </div>
          <div
            v-if="batchOperation === 'compress' || batchOperation === 'convert'"
            class="option-row"
          >
            <span class="section-label">{{ page.t('labels.outputFormat') }}</span>
            <NSelect
              v-model:value="batchFormat"
              :options="batchFormatOptions"
              style="width: 120px"
            />
          </div>
          <div
            v-if="batchOperation === 'compress' || batchOperation === 'convert'"
            class="option-row"
          >
            <span class="section-label">{{ page.t('labels.quality') }}: {{ batchQuality }}</span>
            <NSlider
              v-model:value="batchQuality"
              :min="1"
              :max="100"
              :step="1"
              style="width: 260px"
            />
          </div>
        </div>
      </NCard>

      <div class="action-bar">
        <NButton
          type="primary"
          :loading="batchLoading"
          @click="handleBatchProcess"
        >
          {{ page.t('actions.startBatch') }}
        </NButton>
        <NButton
          v-if="batchDoneCount > 0"
          @click="saveBatchResults"
        >
          {{ page.t('actions.saveAll') }}
        </NButton>
      </div>
    </template>

    <template v-if="batchItems.length > 0">
      <NCard
        class="editor-card"
        :bordered="false"
        style="margin-top: 16px"
      >
        <template #header>
          <div class="card-header-flex">
            <span class="card-title">{{ page.t('labels.batchResults') }}</span>
            <NTag
              v-if="batchDoneCount > 0"
              type="success"
              size="small"
              :bordered="false"
            >
              {{ batchDoneCount }}/{{ batchItems.length }}
            </NTag>
            <NTag
              v-if="batchErrorCount > 0"
              type="error"
              size="small"
              :bordered="false"
            >
              {{ batchErrorCount }}
            </NTag>
          </div>
        </template>
        <div class="batch-result-list">
          <div
            v-for="(item, i) in batchItems"
            :key="i"
            class="batch-result-item"
          >
            <span class="batch-result-name">{{ item.fileName }}</span>
            <NTag
              :type="item.status === 'done' ? 'success' : item.status === 'error' ? 'error' : 'default'"
              size="small"
              :bordered="false"
            >
              {{ item.status === 'done' ? page.t('labels.result') : item.status === 'error' ? page.t('messages.batchItemFailed') : item.status }}
            </NTag>
            <span
              v-if="item.result"
              class="batch-result-meta"
            >
              {{ formatBytes(item.result.size) }}
            </span>
            <span
              v-if="item.error"
              class="batch-result-error"
            >{{ item.error }}</span>
          </div>
        </div>
      </NCard>
    </template>
  </NTabPane>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NCard, NSelect, NSlider, NTag, useMessage } from 'naive-ui'
import { formatBytes, type BatchConfig, type BatchItem } from '@dev-tool-kit/shared'
import { useToolI18n } from '../../composables/useToolI18n'
import { useIpc } from '../../composables/useIpc'

const message = useMessage()
const page = useToolI18n('imageTools')
const { invoke } = useIpc()

interface BatchImageItem {
  fileName: string
  filePath: string
  mimeType: string
  base64: string
  size: number
}

const batchImages = ref<BatchImageItem[]>([])
const batchOperation = ref<'compress' | 'resize' | 'convert'>('compress')
const batchItems = ref<BatchItem[]>([])
const batchLoading = ref(false)
const batchFormat = ref<'jpeg' | 'webp' | 'png'>('jpeg')
const batchQuality = ref(80)

const batchOperationOptions = computed(() => [
  { label: page.t('tabs.compress'), value: 'compress' },
  { label: page.t('tabs.resize'), value: 'resize' },
  { label: page.t('tabs.convert'), value: 'convert' }
])

const batchFormatOptions = computed(() => [
  { label: 'JPEG', value: 'jpeg' },
  { label: 'WebP', value: 'webp' },
  { label: 'PNG', value: 'png' }
])

const batchDoneCount = computed(() => batchItems.value.filter(i => i.status === 'done').length)
const batchErrorCount = computed(() => batchItems.value.filter(i => i.status === 'error').length)

async function pickBatchImages() {
  try {
    const images = await invoke<BatchImageItem[] | null>('image-tools:pickImages')
    if (images && images.length > 0) {
      batchImages.value = images
      batchItems.value = []
      message.success(page.t('messages.imageLoaded'))
    }
  } catch {
    message.error(page.t('messages.imageLoadFailed'))
  }
}

async function handleBatchProcess() {
  if (batchImages.value.length === 0) {
    message.warning(page.t('labels.batchNoImages'))
    return
  }
  batchLoading.value = true

  let config: BatchConfig
  switch (batchOperation.value) {
    case 'compress':
      config = {
        operation: 'compress',
        compressOptions: { format: batchFormat.value, quality: batchQuality.value }
      }
      break
    case 'resize':
      config = {
        operation: 'resize',
        resizeOptions: { width: 256, height: 256, fit: 'cover' }
      }
      break
    case 'convert':
      config = {
        operation: 'convert',
        convertOptions: { format: batchFormat.value, quality: batchQuality.value }
      }
      break
  }

  try {
    const items = batchImages.value.map(img => ({
      fileName: img.fileName,
      filePath: img.filePath,
      status: 'pending' as const
    }))
    const result = await invoke<BatchItem[] | null>('image-tools:batchProcess', items, config)
    if (result) {
      batchItems.value = result
      const errorCount = result.filter(i => i.status === 'error').length
      if (errorCount === 0) {
        message.success(page.t('messages.batchSuccess'))
      } else {
        message.warning(page.t('messages.batchFailed'))
      }
    } else {
      message.error(page.t('messages.batchFailed'))
    }
  } catch {
    message.error(page.t('messages.batchFailed'))
  } finally {
    batchLoading.value = false
  }
}

async function saveBatchResults() {
  const doneItems = batchItems.value.filter(i => i.status === 'done' && i.result)
  if (doneItems.length === 0) return
  const images = doneItems.map(item => ({
    data: item.result!.data,
    fileName: item.result!.fileName
  }))
  try {
    const result = await invoke<{ success: boolean }>('image-tools:saveImages', images)
    if (result?.success) {
      message.success(page.t('messages.batchSaveSuccess'))
    } else {
      message.error(page.t('messages.batchSaveFailed'))
    }
  } catch {
    message.error(page.t('messages.batchSaveFailed'))
  }
}

function removeBatchImage(index: number) {
  batchImages.value.splice(index, 1)
}
</script>

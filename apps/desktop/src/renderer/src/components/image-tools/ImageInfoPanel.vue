<template>
    <div class="action-bar">
      <NButton
        type="primary"
        :loading="imageLoading || infoLoading"
        @click="pickImageForInfo"
      >
        {{ page.t('actions.pickImage') }}
      </NButton>
    </div>

    <div
      v-if="infoPreviewUri"
      class="image-preview-wrap"
      style="margin-top: 16px"
    >
      <img
        :src="infoPreviewUri"
        :alt="page.t('labels.preview')"
        class="image-preview"
      >
    </div>

    <NCard
      v-if="infoData"
      class="editor-card"
      :bordered="false"
      style="margin-top: 16px"
    >
      <template #header>
        <span class="card-title">{{ page.t('labels.fileName') }}</span>
      </template>
      <NGrid
        cols="1 640:2"
        :x-gap="16"
        :y-gap="12"
      >
        <NGridItem>
          <div class="info-item">
            <span class="result-label">{{ page.t('labels.fileName') }}</span>
            <span class="info-value">{{ infoData.fileName }}</span>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="info-item">
            <span class="result-label">{{ page.t('labels.filePath') }}</span>
            <span class="info-value info-path">{{ infoData.filePath }}</span>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="info-item">
            <span class="result-label">{{ page.t('labels.dimensions') }}</span>
            <span class="info-value">{{ infoData.width }}×{{ infoData.height }}</span>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="info-item">
            <span class="result-label">{{ page.t('labels.format') }}</span>
            <span class="info-value">{{ infoData.format }}</span>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="info-item">
            <span class="result-label">{{ page.t('labels.fileSize') }}</span>
            <span class="info-value">{{ formatBytes(infoData.size) }}</span>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="info-item">
            <span class="result-label">{{ page.t('labels.hasAlpha') }}</span>
            <NTag
              :type="infoData.hasAlpha ? 'success' : 'default'"
              size="small"
              :bordered="false"
            >
              {{ infoData.hasAlpha ? page.t('labels.yes') : page.t('labels.no') }}
            </NTag>
          </div>
        </NGridItem>
        <NGridItem v-if="infoData.density != null">
          <div class="info-item">
            <span class="result-label">{{ page.t('labels.density') }}</span>
            <span class="info-value">{{ infoData.density }} DPI</span>
          </div>
        </NGridItem>
      </NGrid>
    </NCard>

    <NCard
      v-if="infoData"
      class="editor-card"
      :bordered="false"
      style="margin-top: 16px"
    >
      <template #header>
        <span class="card-title">{{ page.t('labels.exifData') }}</span>
      </template>
      <div
        v-if="exifEntries.length"
        class="exif-grid"
      >
        <div
          v-for="(entry, index) in exifEntries"
          :key="index"
          class="exif-row"
        >
          <span class="exif-key">{{ entry.key }}</span>
          <span class="exif-val">{{ entry.value }}</span>
          <NButton
            size="tiny"
            quaternary
            @click="copy(entry.value, page.t('messages.imageCopied'))"
          >
            {{ page.t('actions.copyValue') }}
          </NButton>
        </div>
      </div>
      <div
        v-else
        class="result-placeholder"
      >
        {{ page.t('labels.noExif') }}
      </div>
    </NCard>

    <NAlert
      v-if="infoData"
      type="info"
      :show-icon="true"
      style="margin-top: 16px"
    >
      {{ page.t('messages.exifStripped') }}
    </NAlert>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NCard, NGrid, NGridItem, NTag, NAlert, useMessage } from 'naive-ui'
import { formatBytes, type ImageInfo } from '@dev-tool-kit/shared'
import { useToolI18n } from '../../composables/useToolI18n'
import { useIpc } from '../../composables/useIpc'
import { useSharedImageState } from '../../composables/useSharedImageState'
import { useCopyToClipboard } from '../../composables/useCopyToClipboard'

const message = useMessage()
const page = useToolI18n('imageTools')
const { invoke } = useIpc()
const { pickedImage, infoData, imageLoading, pickImage } = useSharedImageState()
const { copy } = useCopyToClipboard()

const infoLoading = ref(false)

const infoPreviewUri = computed(() => {
  if (!pickedImage.value) return ''
  return pickedImage.value.dataUri
})

const exifEntries = computed<{ key: string; value: string }[]>(() => {
  const exif = infoData.value?.exif
  if (!exif) return []
  const entries: { key: string; value: string }[] = []
  if (exif.make) entries.push({ key: page.t('labels.make'), value: exif.make })
  if (exif.model) entries.push({ key: page.t('labels.model'), value: exif.model })
  if (exif.dateTime) entries.push({ key: page.t('labels.dateTime'), value: exif.dateTime })
  if (exif.exposureTime) entries.push({ key: page.t('labels.exposureTime'), value: String(exif.exposureTime) })
  if (exif.fNumber != null) entries.push({ key: page.t('labels.fNumber'), value: `f/${exif.fNumber}` })
  if (exif.iso) entries.push({ key: page.t('labels.iso'), value: String(exif.iso) })
  if (exif.focalLength != null) entries.push({ key: page.t('labels.focalLength'), value: `${exif.focalLength}mm` })
  if (exif.gps) {
    entries.push({
      key: page.t('labels.gps'),
      value: `${page.t('labels.latitude')}: ${exif.gps.latitude}, ${page.t('labels.longitude')}: ${exif.gps.longitude}${exif.gps.altitude != null ? `, ${exif.gps.altitude}m` : ''}`
    })
  }
  return entries
})

async function pickImageForInfo() {
  const data = await pickImage()
  if (!data) return
  infoLoading.value = true
  try {
    const info = await invoke<ImageInfo | null>('image-tools:getInfo', data.filePath)
    infoData.value = info ?? null
  } catch {
    message.error(page.t('messages.imageLoadFailed'))
    infoData.value = null
  } finally {
    infoLoading.value = false
  }
}
</script>

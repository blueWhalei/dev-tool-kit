<script setup lang="ts">
import { ref } from 'vue'
import { NTabs, NTabPane, NRadioGroup, NRadioButton, useMessage } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import ImageSvgPanel from '../components/image-tools/ImageSvgPanel.vue'
import ImageBatchPanel from '../components/image-tools/ImageBatchPanel.vue'
import ImageComparePanel from '../components/image-tools/ImageComparePanel.vue'
import ImageInfoPanel from '../components/image-tools/ImageInfoPanel.vue'
import ImageDataUrlPanel from '../components/image-tools/ImageDataUrlPanel.vue'
import ImageCompressPanel from '../components/image-tools/ImageCompressPanel.vue'
import ImageResizePanel from '../components/image-tools/ImageResizePanel.vue'
import ImageConvertPanel from '../components/image-tools/ImageConvertPanel.vue'
import ImageColorPanel from '../components/image-tools/ImageColorPanel.vue'
import ImageFaviconPanel from '../components/image-tools/ImageFaviconPanel.vue'
import ImagePresetPanel from '../components/image-tools/ImagePresetPanel.vue'
import ImageBase64Panel from '../components/image-tools/ImageBase64Panel.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useTabNavigation } from '../composables/useTabNavigation'
import { useSharedImageState, type PickedImage } from '../composables/useSharedImageState'
import { IMAGE_TOOLS_TAB_STORAGE_KEY } from '@dev-tool-kit/shared'

const message = useMessage()
const page = useToolI18n('imageTools')
const { pickedImage } = useSharedImageState()

// ─── Tab / Category management ───────────────────────────────────────────────

const VALID_TABS = ['base64', 'info', 'dataUrl', 'compress', 'resize', 'svg', 'convert', 'color', 'favicon', 'batch', 'compare', 'preset'] as const
type TabName = (typeof VALID_TABS)[number]

type CategoryName = 'basic' | 'optimize' | 'convert' | 'batch'

const TAB_CATEGORIES: Record<CategoryName, readonly TabName[]> = {
  basic: ['base64', 'info', 'dataUrl'],
  optimize: ['compress', 'resize', 'svg', 'favicon'],
  convert: ['convert', 'color', 'compare', 'preset'],
  batch: ['batch']
}

const {
  activeTab,
  activeCategory,
  showTab
} = useTabNavigation({
  validTabs: VALID_TABS,
  tabCategories: TAB_CATEGORIES,
  defaultCategory: 'basic',
  storageKey: IMAGE_TOOLS_TAB_STORAGE_KEY
})

// ─── Drag & Drop ──────────────────────────────────────────────────────────

const isDragOver = ref(false)

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const file = files[0]
  if (!file.type.startsWith('image/')) {
    message.error(page.t('messages.imageLoadFailed'))
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const base64 = (reader.result as string).split(',')[1] ?? ''
    const dataUri = reader.result as string
    const img: PickedImage = {
      fileName: file.name,
      filePath: '',
      mimeType: file.type,
      base64,
      dataUri,
      size: file.size
    }
    pickedImage.value = img
    message.success(page.t('messages.imageLoaded'))
  }

  reader.readAsDataURL(file)
}

// ─── Clipboard paste ──────────────────────────────────────────────────────

function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (!file) continue

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1] ?? ''
        const dataUri = reader.result as string
        const img: PickedImage = {
          fileName: `clipboard-${Date.now()}.png`,
          filePath: '',
          mimeType: item.type,
          base64,
          dataUri,
          size: file.size
        }
        pickedImage.value = img
        message.success(page.t('messages.clipboardImageLoaded'))
      }

      reader.readAsDataURL(file)
      break
    }
  }
}

</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="image-tools-view page-container--wide"
  >
    <div
      class="drop-zone"
      :class="{ 'drop-zone--active': isDragOver }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @paste="handlePaste"
    >
      <NRadioGroup
        v-model:value="activeCategory"
        class="category-tabs"
      >
        <NRadioButton value="basic">
          {{ page.t('categories.basic') }}
        </NRadioButton>
        <NRadioButton value="optimize">
          {{ page.t('categories.optimize') }}
        </NRadioButton>
        <NRadioButton value="convert">
          {{ page.t('categories.convert') }}
        </NRadioButton>
        <NRadioButton value="batch">
          {{ page.t('categories.batch') }}
        </NRadioButton>
      </NRadioGroup>

      <NTabs
        v-model:value="activeTab"
        type="line"
        animated
        class="converter-tabs"
      >
        <!-- ─── Base64 Tab ──────────────────────────────────────────────── -->
        <NTabPane
          v-if="showTab('base64')"
          name="base64"
          :tab="page.t('tabs.base64')"
        >
          <ImageBase64Panel />
        </NTabPane>
        <NTabPane
          v-if="showTab('info')"
          name="info"
          :tab="page.t('tabs.info')"
        >
          <ImageInfoPanel />
        </NTabPane>
        <NTabPane
          v-if="showTab('compress')"
          name="compress"
          :tab="page.t('tabs.compress')"
        >
          <ImageCompressPanel />
        </NTabPane>
        <NTabPane
          v-if="showTab('resize')"
          name="resize"
          :tab="page.t('tabs.resize')"
        >
          <ImageResizePanel />
        </NTabPane>
        <NTabPane
          v-if="showTab('convert')"
          name="convert"
          :tab="page.t('tabs.convert')"
        >
          <ImageConvertPanel />
        </NTabPane>
        <NTabPane
          v-if="showTab('dataUrl')"
          name="dataUrl"
          :tab="page.t('tabs.dataUrl')"
        >
          <ImageDataUrlPanel />
        </NTabPane>
        <NTabPane
          v-if="showTab('svg')"
          name="svg"
          :tab="page.t('tabs.svg')"
        >
          <ImageSvgPanel />
        </NTabPane>
        <NTabPane
          v-if="showTab('color')"
          name="color"
          :tab="page.t('tabs.color')"
        >
          <ImageColorPanel />
        </NTabPane>
        <NTabPane
          v-if="showTab('favicon')"
          name="favicon"
          :tab="page.t('tabs.favicon')"
        >
          <ImageFaviconPanel />
        </NTabPane>
        <NTabPane
          v-if="showTab('batch')"
          name="batch"
          :tab="page.t('tabs.batch')"
        >
          <ImageBatchPanel />
        </NTabPane>
        <!-- ─── Compare Tab ──────────────────────────────────────────── -->
        <NTabPane
          v-if="showTab('compare')"
          name="compare"
          :tab="page.t('tabs.compare')"
        >
          <ImageComparePanel />
        </NTabPane>
        <!-- ─── Preset Tab ──────────────────────────────────────────── -->
        <NTabPane
          v-if="showTab('preset')"
          name="preset"
          :tab="page.t('tabs.preset')"
        >
          <ImagePresetPanel />
        </NTabPane>
      </NTabs>
    </div>
  </PageLayout>
</template>

<style scoped>
.drop-zone {
  position: relative;
}

.drop-zone--active::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(24, 160, 88, 0.08);
  border: 2px dashed var(--color-primary);
  border-radius: 12px;
  z-index: 100;
  pointer-events: none;
}

.category-tabs {
  margin-bottom: var(--space-4);
}

.converter-tabs {
  margin-top: var(--space-2);
}

.editor-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
}

.editor-card :deep(.n-card-header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.editor-card :deep(.n-card__content) {
  padding: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.card-header-flex {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-input {
  font-family: var(--font-family-mono);
  font-size: 14px;
}

.code-input :deep(.n-input__textarea-el) {
  font-family: var(--font-family-mono);
}

.action-bar {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.result-box {
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  font-family: var(--font-family-mono);
  font-size: 14px;
}

.result-label {
  color: var(--color-text-secondary);
  margin-right: 8px;
}

.result-placeholder {
  padding: 16px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.section-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  min-width: 100px;
}

/* ─── Base64 Tab ─────────────────────────────── */
.image-base64-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.image-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.image-base64-output {
  margin-top: 8px;
}

.decode-mime-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.image-preview-wrap {
  margin-top: 16px;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  text-align: center;
}

.image-preview {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}

.preview-hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

/* ─── Info Tab ─────────────────────────────── */
.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.info-value {
  color: var(--color-text-primary);
  font-size: 14px;
  word-break: break-all;
}

.info-path {
  font-family: var(--font-family-mono);
  font-size: 13px;
}

.exif-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exif-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.exif-key {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  min-width: 80px;
  flex-shrink: 0;
}

.exif-val {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  word-break: break-all;
}

/* ─── Compress / Resize / Convert Options ──── */
.compress-options,
.resize-options,
.convert-options,
.favicon-options,
.batch-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.custom-size-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-size-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lock-toggle {
  display: flex;
  align-items: center;
}

.svg-option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.svg-option-label {
  font-size: 13px;
  color: var(--color-text-primary);
}

.color-swatch {
  display: inline-block;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* ─── Color Picker ─────────────────────────────── */
.picked-color-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.color-swatch-large {
  display: inline-block;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  border: 2px solid var(--color-border);
  flex-shrink: 0;
}

.color-values {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.color-value-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-code {
  font-family: var(--font-family-mono);
  font-size: 13px;
  color: var(--color-text-primary);
}

.color-palette {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-palette-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.color-palette-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.color-ratio {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.color-picker-preview {
  cursor: crosshair;
}

/* ─── Favicon ─────────────────────────────── */
.favicon-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  min-width: 80px;
}

.icon-preview {
  width: 48px;
  height: 48px;
  object-fit: contain;
  image-rendering: pixelated;
}

.icon-label {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.icon-filename {
  font-size: 10px;
  color: var(--color-text-tertiary);
  font-family: var(--font-family-mono);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Batch ─────────────────────────────── */
.batch-image-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
}

.batch-image-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.batch-image-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-image-size {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.batch-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.batch-result-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.batch-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.batch-result-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-result-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.batch-result-error {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* ─── Compare ─────────────────────────────── */
.compare-side-by-side {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.compare-image-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.compare-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.compare-image {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 8px;
}

.compare-meta {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.compare-slider-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  cursor: ew-resize;
  user-select: none;
}

.compare-slider-img {
  display: block;
  width: 100%;
  height: auto;
}

.compare-slider-clip {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  overflow: hidden;
}

.compare-slider-clip .compare-slider-img {
  width: auto;
  min-width: 100%;
  max-width: none;
}

.compare-slider-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-primary);
  transform: translateX(-50%);
  z-index: 2;
  pointer-events: none;
}

.compare-slider-handle::before,
.compare-slider-handle::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.compare-slider-handle::before {
  top: 50%;
  margin-top: -12px;
}

.compare-slider-labels {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 12px;
  pointer-events: none;
}

.compare-label-a,
.compare-label-b {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 8px;
  border-radius: 4px;
}

.compare-diff-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.compare-diff-legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.diff-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.diff-legend-color {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid var(--color-border);
}

/* ─── Preset ─────────────────────────────── */
.preset-description {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.preset-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.preset-card--loading {
  opacity: 0.6;
  pointer-events: none;
}

.preset-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.preset-desc {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.image-preview-wrap {
  display: flex;
  justify-content: center;
}

.image-preview-wrap .image-preview {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
}

.image-meta {
  display: flex;
  gap: 16px;
  justify-content: center;
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>

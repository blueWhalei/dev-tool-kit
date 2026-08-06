<template>
  <NTabPane
    name="compare"
    :tab="page.t('tabs.compare')"
  >
    <div
      class="action-bar"
      style="margin-top: 0; border-top: none; padding-top: 0"
    >
      <NButton
        type="primary"
        :loading="compareLoadingA"
        @click="pickCompareImage('A')"
      >
        {{ page.t('actions.pickImageA') }}
      </NButton>
      <NButton
        type="primary"
        :loading="compareLoadingB"
        @click="pickCompareImage('B')"
      >
        {{ page.t('actions.pickImageB') }}
      </NButton>
      <NButton
        v-if="compareImageA && compareImageB"
        @click="swapCompareImages"
      >
        {{ page.t('actions.swapImages') }}
      </NButton>
    </div>

    <template v-if="compareImageA && compareImageB">
      <NCard
        class="editor-card"
        :bordered="false"
        style="margin-top: 16px"
      >
        <template #header>
          <div class="card-header-flex">
            <span class="card-title">{{ page.t('labels.compareMode') }}</span>
            <NRadioGroup
              v-model:value="compareMode"
              size="small"
            >
              <NRadioButton value="sideBySide">
                {{ page.t('labels.sideBySide') }}
              </NRadioButton>
              <NRadioButton value="slider">
                {{ page.t('labels.slider') }}
              </NRadioButton>
              <NRadioButton value="diffOverlay">
                {{ page.t('labels.diffOverlay') }}
              </NRadioButton>
            </NRadioGroup>
          </div>
        </template>

        <!-- Side by side -->
        <div
          v-if="compareMode === 'sideBySide'"
          class="compare-side-by-side"
        >
          <div class="compare-image-panel">
            <span class="compare-label">{{ page.t('labels.imageA') }}</span>
            <img
              :src="compareImageA.dataUri"
              alt="A"
              class="compare-image"
            >
            <span class="compare-meta">{{ compareImageA.width }}×{{ compareImageA.height }} · {{ formatBytes(compareImageA.size) }}</span>
          </div>
          <div class="compare-image-panel">
            <span class="compare-label">{{ page.t('labels.imageB') }}</span>
            <img
              :src="compareImageB.dataUri"
              alt="B"
              class="compare-image"
            >
            <span class="compare-meta">{{ compareImageB.width }}×{{ compareImageB.height }} · {{ formatBytes(compareImageB.size) }}</span>
          </div>
        </div>

        <!-- Slider -->
        <div
          v-else-if="compareMode === 'slider'"
          class="compare-slider-container"
          @mousedown="onSliderMouseDown"
          @mousemove="onSliderMouseMove"
          @mouseup="onSliderMouseUp"
          @mouseleave="onSliderMouseUp"
        >
          <img
            :src="compareImageB.dataUri"
            alt="B"
            class="compare-slider-img"
          >
          <div
            class="compare-slider-clip"
            :style="{ width: sliderPos + '%' }"
          >
            <img
              :src="compareImageA.dataUri"
              alt="A"
              class="compare-slider-img"
            >
          </div>
          <div
            class="compare-slider-handle"
            :style="{ left: sliderPos + '%' }"
          />
          <div class="compare-slider-labels">
            <span class="compare-label-a">A</span>
            <span class="compare-label-b">B</span>
          </div>
        </div>

        <!-- Diff overlay -->
        <div
          v-else-if="compareMode === 'diffOverlay'"
          class="compare-diff-overlay"
        >
          <img
            v-if="diffOverlayDataUri"
            :src="diffOverlayDataUri"
            alt="Diff"
            class="compare-image"
          >
          <NAlert
            v-else
            type="info"
            :bordered="false"
          >
            {{ page.t('labels.diffOverlay') }}
          </NAlert>
          <div class="compare-diff-legend">
            <span class="diff-legend-item"><span
              class="diff-legend-color"
              style="background: rgba(255, 200, 0, 0.8)"
            /> {{ page.t('labels.imageA') }} ≠ {{ page.t('labels.imageB') }}</span>
            <span class="diff-legend-item"><span
              class="diff-legend-color"
              style="background: rgba(128, 128, 128, 0.3)"
            /> {{ page.t('labels.imageA') }} = {{ page.t('labels.imageB') }}</span>
          </div>
        </div>
      </NCard>
    </template>

    <NCard
      v-else
      class="editor-card"
      :bordered="false"
      style="margin-top: 16px"
    >
      <div class="result-placeholder">
        {{ page.t('messages.compareNeedTwoImages') }}
      </div>
    </NCard>
  </NTabPane>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton, NCard, NRadioGroup, NRadioButton, NAlert, useMessage } from 'naive-ui'
import { formatBytes, type ImageInfo } from '@dev-tool-kit/shared'
import { useToolI18n } from '../../composables/useToolI18n'
import { useIpc } from '../../composables/useIpc'

const message = useMessage()
const page = useToolI18n('imageTools')
const { invoke } = useIpc()

interface PickedImage {
  fileName: string
  filePath: string
  mimeType: string
  base64: string
  dataUri: string
  size: number
}

interface CompareImage {
  fileName: string
  filePath: string
  dataUri: string
  width: number
  height: number
  size: number
}

const compareImageA = ref<CompareImage | null>(null)
const compareImageB = ref<CompareImage | null>(null)
const compareMode = ref<'sideBySide' | 'slider' | 'diffOverlay'>('slider')
const sliderPos = ref(50)
const isDragging = ref(false)
const compareLoadingA = ref(false)
const compareLoadingB = ref(false)

async function pickCompareImage(side: 'A' | 'B') {
  const loadingRef = side === 'A' ? compareLoadingA : compareLoadingB
  loadingRef.value = true
  try {
    const data = await invoke<PickedImage | null>('image-tools:pickImage')
    if (!data) return
    const img: CompareImage = {
      fileName: data.fileName,
      filePath: data.filePath,
      dataUri: data.dataUri,
      width: 0,
      height: 0,
      size: data.size
    }
    // Get dimensions
    const info = await invoke<ImageInfo | null>('image-tools:getInfo', data.filePath)
    if (info) {
      img.width = info.width
      img.height = info.height
    }
    if (side === 'A') {
      compareImageA.value = img
    } else {
      compareImageB.value = img
    }
    message.success(page.t('messages.imageLoaded'))
  } catch {
    message.error(page.t('messages.imageLoadFailed'))
  } finally {
    loadingRef.value = false
  }
}

function swapCompareImages() {
  const tmp = compareImageA.value
  compareImageA.value = compareImageB.value
  compareImageB.value = tmp
}

function onSliderMouseDown(e: MouseEvent) {
  isDragging.value = true
  updateSliderPos(e)
}

function onSliderMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  updateSliderPos(e)
}

function onSliderMouseUp() {
  isDragging.value = false
}

function updateSliderPos(e: MouseEvent) {
  const container = (e.currentTarget as HTMLElement)?.closest('.compare-slider-container') as HTMLElement
  if (!container) return
  const rect = container.getBoundingClientRect()
  const x = e.clientX - rect.left
  sliderPos.value = Math.max(0, Math.min(100, (x / rect.width) * 100))
}

const diffOverlayDataUri = ref('')
const THRESHOLD = 40

let diffRequestSeq = 0

function computeDiffOverlay() {
  if (!compareImageA.value || !compareImageB.value) return
  const seq = ++diffRequestSeq
  const imgA = new Image()
  const imgB = new Image()
  let loaded = 0
  // 加载失败或过期请求：丢弃结果，避免旧图覆盖新结果
  const fail = () => {
    if (seq !== diffRequestSeq) return
    diffOverlayDataUri.value = ''
  }
  imgA.onerror = fail
  imgB.onerror = fail
  const onBothLoaded = () => {
    loaded++
    if (loaded < 2) return
    if (seq !== diffRequestSeq) return
    const w = Math.max(imgA.naturalWidth, imgB.naturalWidth)
    const h = Math.max(imgA.naturalHeight, imgB.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(imgA, 0, 0)
    const dataA = ctx.getImageData(0, 0, w, h).data
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(imgB, 0, 0)
    const dataB = ctx.getImageData(0, 0, w, h).data
    const diffData = ctx.createImageData(w, h)
    for (let i = 0; i < dataA.length; i += 4) {
      const dr = Math.abs(dataA.data[i] - dataB.data[i])
      const dg = Math.abs(dataA.data[i + 1] - dataB.data[i + 1])
      const db = Math.abs(dataA.data[i + 2] - dataB.data[i + 2])
      const isDiff = dr > THRESHOLD || dg > THRESHOLD || db > THRESHOLD
      if (isDiff) {
        // Highlight differences in red
        diffData.data[i] = 255
        diffData.data[i + 1] = Math.min(255, (dr + dg + db) / 3)
        diffData.data[i + 2] = 0
        diffData.data[i + 3] = 200
      } else {
        // Same pixels shown as faded original
        diffData.data[i] = dataA.data[i]
        diffData.data[i + 1] = dataA.data[i + 1]
        diffData.data[i + 2] = dataA.data[i + 2]
        diffData.data[i + 3] = 80
      }
    }
    ctx.putImageData(diffData, 0, 0)
    diffOverlayDataUri.value = canvas.toDataURL('image/png')
  }
  imgA.onload = onBothLoaded
  imgB.onload = onBothLoaded
  imgA.src = compareImageA.value.dataUri
  imgB.src = compareImageB.value.dataUri
}

watch(compareMode, (mode) => {
  if (mode === 'diffOverlay') {
    computeDiffOverlay()
  }
})
</script>

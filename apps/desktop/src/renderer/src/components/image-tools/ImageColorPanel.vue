<template>
  <NTabPane
    name="color"
    :tab="page.t('tabs.color')"
  >
    <div
      class="action-bar"
      style="margin-top: 0; border-top: none; padding-top: 0"
    >
      <NButton
        type="primary"
        :loading="imageLoading"
        @click="pickImageForColor"
      >
        {{ page.t('actions.pickImage') }}
      </NButton>
      <NButton @click="loadFromClipboard">
        {{ page.t('labels.clipboardImage') }}
      </NButton>
    </div>

    <template v-if="pickedImage">
      <NCard
        class="editor-card"
        :bordered="false"
        style="margin-top: 16px"
      >
        <template #header>
          <span class="card-title">{{ page.t('labels.clickToPick') }}</span>
        </template>
        <div class="image-preview-wrap color-picker-preview">
          <img
            :src="pickedImage.dataUri"
            :alt="page.t('labels.preview')"
            class="image-preview"
            crossorigin="anonymous"
            style="cursor: crosshair"
            @click="handleImageClick"
          >
        </div>
      </NCard>

      <NCard
        v-if="colorPickedHex"
        class="editor-card"
        :bordered="false"
        style="margin-top: 16px"
      >
        <template #header>
          <span class="card-title">{{ page.t('labels.pickedColor') }}</span>
        </template>
        <div class="picked-color-row">
          <span
            class="color-swatch-large"
            :style="{ backgroundColor: colorPickedHex }"
          />
          <div class="color-values">
            <div class="color-value-row">
              <span class="result-label">HEX</span>
              <code class="color-code">{{ colorPickedHex }}</code>
              <NButton
                size="tiny"
                quaternary
                @click="copy(colorPickedHex, page.t('messages.imageCopied'))"
              >
                {{ page.t('actions.copyValue') }}
              </NButton>
            </div>
            <div
              v-if="colorPickedRgb"
              class="color-value-row"
            >
              <span class="result-label">RGB</span>
              <code class="color-code">rgb({{ colorPickedRgb.r }}, {{ colorPickedRgb.g }}, {{ colorPickedRgb.b }})</code>
              <NButton
                size="tiny"
                quaternary
                @click="copy(`rgb(${colorPickedRgb!.r}, ${colorPickedRgb!.g}, ${colorPickedRgb!.b})`, page.t('messages.imageCopied'))"
              >
                {{ page.t('actions.copyValue') }}
              </NButton>
            </div>
            <div
              v-if="colorPickedHsl"
              class="color-value-row"
            >
              <span class="result-label">HSL</span>
              <code class="color-code">hsl({{ colorPickedHsl.h }}, {{ colorPickedHsl.s }}%, {{ colorPickedHsl.l }}%)</code>
              <NButton
                size="tiny"
                quaternary
                @click="copy(`hsl(${colorPickedHsl!.h}, ${colorPickedHsl!.s}%, ${colorPickedHsl.l}%)`, page.t('messages.imageCopied'))"
              >
                {{ page.t('actions.copyValue') }}
              </NButton>
            </div>
          </div>
        </div>
      </NCard>

      <NCard
        class="editor-card"
        :bordered="false"
        style="margin-top: 16px"
      >
        <template #header>
          <div class="card-header-flex">
            <span class="card-title">{{ page.t('labels.dominantColors') }}</span>
            <NButton
              size="small"
              :loading="colorExtracting"
              @click="handleExtractColors"
            >
              {{ page.t('actions.extractColors') }}
            </NButton>
          </div>
        </template>
        <div
          v-if="colorExtractedColors.length"
          class="color-palette"
        >
          <div
            v-for="(c, i) in colorExtractedColors"
            :key="i"
            class="color-palette-item"
          >
            <span
              class="color-swatch"
              :style="{ backgroundColor: c.hex }"
            />
            <span class="color-palette-info">
              <code class="color-code">{{ c.hex }}</code>
              <span class="color-ratio">{{ c.ratio }}%</span>
            </span>
            <NButton
              size="tiny"
              quaternary
              @click="copy(c.hex, page.t('messages.imageCopied'))"
            >
              {{ page.t('actions.copyValue') }}
            </NButton>
          </div>
        </div>
        <div
          v-else
          class="result-placeholder"
        >
          {{ page.t('labels.noColorsExtracted') }}
        </div>
      </NCard>

      <div class="action-bar">
        <NButton @click="goToColorConverter">
          {{ page.t('actions.goToColorConverter') }}
        </NButton>
      </div>
    </template>
  </NTabPane>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard, useMessage } from 'naive-ui'
import { type ExtractedColor } from '@dev-tool-kit/shared'
import { useToolI18n } from '../../composables/useToolI18n'
import { useIpc } from '../../composables/useIpc'
import { useSharedImageState } from '../../composables/useSharedImageState'
import { useCopyToClipboard } from '../../composables/useCopyToClipboard'

const message = useMessage()
const page = useToolI18n('imageTools')
const router = useRouter()
const { invoke } = useIpc()
const { pickedImage, imageLoading, pickImage } = useSharedImageState()
const { copy } = useCopyToClipboard()

const colorPickedHex = ref('')
const colorPickedRgb = ref<{ r: number; g: number; b: number } | null>(null)
const colorPickedHsl = ref<{ h: number; s: number; l: number } | null>(null)
const colorExtractedColors = ref<ExtractedColor[]>([])
const colorExtracting = ref(false)

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else h = ((rn - gn) / d + 4) / 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function handleImageClick(e: MouseEvent) {
  const img = e.currentTarget as HTMLImageElement
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  ctx.drawImage(img, 0, 0)

  const rect = img.getBoundingClientRect()
  const scaleX = img.naturalWidth / rect.width
  const scaleY = img.naturalHeight / rect.height
  const x = Math.floor((e.clientX - rect.left) * scaleX)
  const y = Math.floor((e.clientY - rect.top) * scaleY)

  const pixel = ctx.getImageData(x, y, 1, 1).data
  const r = pixel[0], g = pixel[1], b = pixel[2]

  colorPickedRgb.value = { r, g, b }
  colorPickedHex.value = rgbToHex(r, g, b)
  colorPickedHsl.value = rgbToHsl(r, g, b)
  message.success(page.t('messages.colorPicked'))
}

async function pickImageForColor() {
  colorPickedHex.value = ''
  colorPickedRgb.value = null
  colorPickedHsl.value = null
  colorExtractedColors.value = []
  await pickImage()
}

async function loadFromClipboard() {
  try {
    const data = await invoke<{ base64: string; dataUri: string; width: number; height: number; size: number; mimeType: string } | null>('image-tools:readClipboardImage')
    if (data) {
      pickedImage.value = {
        fileName: 'clipboard.png',
        filePath: '',
        mimeType: data.mimeType,
        base64: data.base64,
        dataUri: data.dataUri,
        size: data.size
      }
      colorPickedHex.value = ''
      colorPickedRgb.value = null
      colorPickedHsl.value = null
      message.success(page.t('messages.clipboardImageLoaded'))
    } else {
      message.warning(page.t('messages.clipboardNoImage'))
    }
  } catch {
    message.error(page.t('messages.clipboardNoImage'))
  }
}

async function handleExtractColors() {
  if (!pickedImage.value?.filePath) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  colorExtracting.value = true
  try {
    const colors = await invoke<ExtractedColor[] | null>('image-tools:extractColors', pickedImage.value.filePath, 8)
    if (colors && colors.length > 0) {
      colorExtractedColors.value = colors
      message.success(page.t('messages.colorExtracted'))
    } else {
      colorExtractedColors.value = []
      message.warning(page.t('messages.colorExtractFailed'))
    }
  } catch {
    message.error(page.t('messages.colorExtractFailed'))
  } finally {
    colorExtracting.value = false
  }
}

function goToColorConverter() {
  router.push('/color-converter')
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NInput, NButton } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'

const { t } = useI18n()
const { copy } = useCopyToClipboard()
const page = useToolI18n('colorConverter')

const hexInput = ref('#2563eb')
const rgbInput = ref('37, 99, 235')
const hslInput = ref('217, 91%, 60%')

const colorPreview = ref('#2563eb')

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360
  s /= 100
  l /= 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

function updateFromHex() {
  const rgb = hexToRgb(hexInput.value)
  if (rgb) {
    rgbInput.value = `${rgb.r}, ${rgb.g}, ${rgb.b}`
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    hslInput.value = `${hsl.h}, ${hsl.s}%, ${hsl.l}%`
    colorPreview.value = hexInput.value
  }
}

function updateFromRgb() {
  const match = rgbInput.value.match(/^(\d+),\s*(\d+),\s*(\d+)$/)
  if (match) {
    const r = parseInt(match[1])
    const g = parseInt(match[2])
    const b = parseInt(match[3])
    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      hexInput.value = rgbToHex(r, g, b)
      const hsl = rgbToHsl(r, g, b)
      hslInput.value = `${hsl.h}, ${hsl.s}%, ${hsl.l}%`
      colorPreview.value = hexInput.value
    }
  }
}

function updateFromHsl() {
  const match = hslInput.value.match(/^(\d+),\s*(\d+)%?,\s*(\d+)%?$/)
  if (match) {
    const h = parseInt(match[1])
    const s = parseInt(match[2])
    const l = parseInt(match[3])
    if (h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100) {
      const rgb = hslToRgb(h, s, l)
      rgbInput.value = `${rgb.r}, ${rgb.g}, ${rgb.b}`
      hexInput.value = rgbToHex(rgb.r, rgb.g, rgb.b)
      colorPreview.value = hexInput.value
    }
  }
}

async function copyHex() {
  await copy(hexInput.value, page.t('messages.hexCopied'))
}

async function copyRgb() {
  await copy(`rgb(${rgbInput.value})`, page.t('messages.rgbCopied'))
}

async function copyHsl() {
  await copy(`hsl(${hslInput.value})`, page.t('messages.hslCopied'))
}
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="color-converter-view"
  >
    <div class="color-preview-card">
      <div class="color-preview" :style="{ backgroundColor: colorPreview }"></div>
      <div class="picker-area">
        <input
          type="color"
          v-model="hexInput"
          @input="updateFromHex"
          class="color-picker"
        />
        <span class="picker-label">{{ page.t('labels.pickColor') }}</span>
      </div>
    </div>

    <div class="color-inputs-grid">
      <div class="color-input-card">
        <div class="input-header">
          <span class="input-label">{{ page.t('labels.hex') }}</span>
          <NButton size="small" @click="copyHex">{{ t('common.copy') }}</NButton>
        </div>
        <NInput
          v-model:value="hexInput"
          :placeholder="page.t('placeholders.hex')"
          @input="updateFromHex"
          class="color-input"
        />
      </div>

      <div class="color-input-card">
        <div class="input-header">
          <span class="input-label">{{ page.t('labels.rgb') }}</span>
          <NButton size="small" @click="copyRgb">{{ t('common.copy') }}</NButton>
        </div>
        <NInput
          v-model:value="rgbInput"
          :placeholder="page.t('placeholders.rgb')"
          @input="updateFromRgb"
          class="color-input"
        />
      </div>

      <div class="color-input-card">
        <div class="input-header">
          <span class="input-label">{{ page.t('labels.hsl') }}</span>
          <NButton size="small" @click="copyHsl">{{ t('common.copy') }}</NButton>
        </div>
        <NInput
          v-model:value="hslInput"
          :placeholder="page.t('placeholders.hsl')"
          @input="updateFromHsl"
          class="color-input"
        />
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.color-converter-view {
  max-width: 800px;
  margin: 0 auto;
}

.color-preview-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  gap: 32px;
}

.color-preview {
  flex: 1;
  height: 160px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  transition: background-color 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.picker-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.color-picker {
  width: 80px;
  height: 80px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border: 2px solid var(--color-border);
  border-radius: 12px;
}

.picker-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.color-inputs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.color-input-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.input-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.color-input {
  font-family: var(--font-family-mono);
}
</style>

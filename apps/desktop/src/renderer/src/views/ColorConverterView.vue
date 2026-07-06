<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NSlider, NCard, NGrid, NGridItem } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import {
  type ColorRGBA,
  hexToRgba,
  rgbaToHex,
  rgbaToHsla,
  hslaToRgba,
  cssNameToRgba,
  rgbaToCssName,
  parseRgbString,
  parseHslString,
  rgbaToString,
  hslaToString
} from '@dev-tool-kit/shared'

const { copy } = useCopyToClipboard()
const page = useToolI18n('colorConverter')

const RECENT_COLORS_KEY = 'dev-toolkit-recent-colors'
const MAX_RECENT = 12

const currentRgba = ref<ColorRGBA>({ r: 37, g: 99, b: 235, a: 1 })
const hexInput = ref('#2563eb')
const rgbaInput = ref('37, 99, 235, 1')
const hslaInput = ref('217, 91%, 60%, 1')
const hex8Input = ref('#2563ebff')
const cssNameInput = ref('')
const resolvedCssName = ref<string | null>(null)

const recentColors = ref<string[]>(loadRecentColors())

function loadRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentColor(hex8: string) {
  const list = recentColors.value.filter(c => c !== hex8)
  list.unshift(hex8)
  recentColors.value = list.slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(recentColors.value))
}

const colorPreview = computed(() => rgbaToHex(currentRgba.value))

const colorPreviewRgba = computed(() => {
  const c = currentRgba.value
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`
})

function updateFromRgba(rgba: ColorRGBA, source: string) {
  currentRgba.value = { ...rgba }
  if (source !== 'hex') hexInput.value = rgbaToHex(rgba)
  if (source !== 'rgba') rgbaInput.value = rgbaToString(rgba).replace(/^rgba?\((.+)\)$/, '$1')
  if (source !== 'hsla') {
    const hsla = rgbaToHsla(rgba)
    hslaInput.value = `${hsla.h}, ${hsla.s}%, ${hsla.l}%, ${hsla.a}`
  }
  if (source !== 'hex8') hex8Input.value = rgbaToHex(rgba, true)
  if (source !== 'cssName') {
    resolvedCssName.value = rgbaToCssName(rgba)
    if (source !== 'picker') cssNameInput.value = resolvedCssName.value || ''
  }
  if (source !== 'picker') saveRecentColor(rgbaToHex(rgba, true))
}

function onHexInput() {
  let parsed = hexToRgba(hexInput.value)
  if (!parsed) parsed = cssNameToRgba(hexInput.value)
  if (parsed) updateFromRgba(parsed, 'hex')
}

function onRgbaInput() {
  const parsed = parseRgbString(rgbaInput.value)
  if (parsed) updateFromRgba(parsed, 'rgba')
}

function onHslaInput() {
  const parsed = parseHslString(hslaInput.value)
  if (parsed) updateFromRgba(hslaToRgba(parsed), 'hsla')
}

function onHex8Input() {
  const parsed = hexToRgba(hex8Input.value)
  if (parsed) updateFromRgba(parsed, 'hex8')
}

function onCssNameInput() {
  const parsed = cssNameToRgba(cssNameInput.value)
  if (parsed) updateFromRgba(parsed, 'cssName')
}

function onPickerChange(event: Event) {
  const input = event.target as HTMLInputElement
  const parsed = hexToRgba(input.value)
  if (parsed) {
    parsed.a = currentRgba.value.a
    updateFromRgba(parsed, 'picker')
  }
}

function onAlphaChange(value: number) {
  const rgba = { ...currentRgba.value, a: value / 100 }
  currentRgba.value = rgba
  rgbaInput.value = rgbaToString(rgba).replace(/^rgba?\((.+)\)$/, '$1')
  const hsla = rgbaToHsla(rgba)
  hslaInput.value = `${hsla.h}, ${hsla.s}%, ${hsla.l}%, ${hsla.a}`
  hex8Input.value = rgbaToHex(rgba, true)
  saveRecentColor(rgbaToHex(rgba, true))
}

function applyRecentColor(hex8: string) {
  const parsed = hexToRgba(hex8)
  if (parsed) updateFromRgba(parsed, 'picker')
}

async function copyValue(value: string, messageKey: string) {
  await copy(value, page.t(messageKey))
}

const alphaPercent = computed({
  get: () => Math.round(currentRgba.value.a * 100),
  set: (v: number) => onAlphaChange(v)
})
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="color-converter-view"
  >
    <div class="color-preview-section">
      <div class="preview-area">
        <div class="checkerboard-bg">
          <div class="color-swatch" :style="{ backgroundColor: colorPreviewRgba }"></div>
        </div>
        <label class="picker-wrapper">
          <input type="color" :value="colorPreview" @input="onPickerChange" class="color-picker" />
          <span class="picker-label">{{ page.t('labels.pickColor') }}</span>
        </label>
      </div>
      <div class="alpha-control">
        <span class="alpha-label">{{ page.t('labels.alpha') }}</span>
        <NSlider v-model:value="alphaPercent" :min="0" :max="100" :step="1" style="flex: 1" />
        <span class="alpha-value">{{ alphaPercent }}%</span>
      </div>
    </div>

    <NGrid :cols="2" :x-gap="12" :y-gap="12" responsive="screen" item-responsive>
      <NGridItem span="0:2 640:1">
        <NCard class="format-card" :bordered="false">
          <div class="format-row">
            <label class="format-label">{{ page.t('labels.hex') }}</label>
            <NInput :value="hexInput" @update:value="hexInput = $event; onHexInput()" :placeholder="page.t('placeholders.hex')" size="small" />
            <NButton size="tiny" quaternary @click="copyValue(hexInput, 'messages.hexCopied')">{{ page.t('buttons.copy') }}</NButton>
          </div>
        </NCard>
      </NGridItem>
      <NGridItem span="0:2 640:1">
        <NCard class="format-card" :bordered="false">
          <div class="format-row">
            <label class="format-label">{{ page.t('labels.rgba') }}</label>
            <NInput :value="rgbaInput" @update:value="rgbaInput = $event; onRgbaInput()" :placeholder="page.t('placeholders.rgba')" size="small" />
            <NButton size="tiny" quaternary @click="copyValue(rgbaToString(currentRgba), 'messages.rgbaCopied')">{{ page.t('buttons.copy') }}</NButton>
          </div>
        </NCard>
      </NGridItem>
      <NGridItem span="0:2 640:1">
        <NCard class="format-card" :bordered="false">
          <div class="format-row">
            <label class="format-label">{{ page.t('labels.hsla') }}</label>
            <NInput :value="hslaInput" @update:value="hslaInput = $event; onHslaInput()" :placeholder="page.t('placeholders.hsla')" size="small" />
            <NButton size="tiny" quaternary @click="copyValue(hslaToString(rgbaToHsla(currentRgba)), 'messages.hslaCopied')">{{ page.t('buttons.copy') }}</NButton>
          </div>
        </NCard>
      </NGridItem>
      <NGridItem span="0:2 640:1">
        <NCard class="format-card" :bordered="false">
          <div class="format-row">
            <label class="format-label">{{ page.t('labels.hex8') }}</label>
            <NInput :value="hex8Input" @update:value="hex8Input = $event; onHex8Input()" :placeholder="page.t('placeholders.hex8')" size="small" />
            <NButton size="tiny" quaternary @click="copyValue(hex8Input, 'messages.hex8Copied')">{{ page.t('buttons.copy') }}</NButton>
          </div>
        </NCard>
      </NGridItem>
      <NGridItem span="2">
        <NCard class="format-card" :bordered="false">
          <div class="format-row">
            <label class="format-label">{{ page.t('labels.cssName') }}</label>
            <NInput :value="cssNameInput" @update:value="cssNameInput = $event; onCssNameInput()" :placeholder="page.t('placeholders.cssName')" size="small" />
            <span v-if="resolvedCssName" class="css-name-hint">{{ resolvedCssName }}</span>
            <span v-else-if="cssNameInput" class="css-name-hint no-match">{{ page.t('messages.noCssName') }}</span>
            <NButton v-if="resolvedCssName" size="tiny" quaternary @click="copyValue(resolvedCssName, 'messages.cssNameCopied')">{{ page.t('buttons.copy') }}</NButton>
          </div>
        </NCard>
      </NGridItem>
    </NGrid>

    <div v-if="recentColors.length > 0" class="recent-section">
      <span class="recent-label">{{ page.t('labels.recentColors') }}</span>
      <div class="recent-colors">
        <button
          v-for="(hex8, index) in recentColors"
          :key="index"
          class="recent-swatch checkerboard-bg-small"
          @click="applyRecentColor(hex8)"
        >
          <span class="recent-swatch-inner" :style="{ backgroundColor: hex8 }"></span>
        </button>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.color-converter-view {
  max-width: 720px;
  margin: 0 auto;
}

.color-preview-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.preview-area {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.checkerboard-bg {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.color-swatch {
  position: absolute;
  inset: 0;
}

.picker-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.color-picker {
  width: 0;
  height: 0;
  opacity: 0;
  position: absolute;
}

.picker-label {
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.alpha-control {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.alpha-label {
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.alpha-value {
  font-size: var(--font-size-footnote);
  font-family: var(--font-family-mono);
  color: var(--color-text-secondary);
  min-width: 36px;
  text-align: right;
}

.format-card {
  background: var(--color-bg-primary);
}

.format-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.format-label {
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  white-space: nowrap;
  min-width: 56px;
}

.css-name-hint {
  font-size: var(--font-size-footnote);
  color: var(--color-text-tertiary);
  font-family: var(--font-family-mono);
}

.css-name-hint.no-match {
  color: var(--color-text-quaternary);
  font-style: italic;
}

.recent-section {
  margin-top: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.recent-label {
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.recent-colors {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.checkerboard-bg-small {
  position: relative;
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
}

.recent-swatch {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  cursor: pointer;
  padding: 0;
  overflow: hidden;
}

.recent-swatch-inner {
  display: block;
  width: 100%;
  height: 100%;
}

.recent-swatch:hover {
  transform: scale(1.15);
  transition: transform 0.15s ease;
}
</style>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useMessage } from 'naive-ui'
import { NButton, NInput, NInputNumber, NSelect, NCard } from 'naive-ui'
import QRCode from 'qrcode'
import type { QRCodeErrorCorrectionLevel } from 'qrcode'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'

const page = useToolI18n('qrCodeGenerator')
const message = useMessage()

const text = ref('https://example.com')
const size = ref(256)
const margin = ref(4)
const errorLevel = ref<QRCodeErrorCorrectionLevel>('M')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const hasQr = ref(false)

const errorLevelOptions = computed(() =>
  (['L', 'M', 'Q', 'H'] as const).map(level => ({
    label: page.t(`errorLevels.${level}`),
    value: level
  }))
)

const qrOptions = computed(() => ({
  width: size.value,
  margin: margin.value,
  errorCorrectionLevel: errorLevel.value
}))

async function renderQr() {
  const canvas = canvasRef.value
  if (!canvas) return

  const content = text.value.trim()
  if (!content) {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      canvas.width = size.value
      canvas.height = size.value
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    hasQr.value = false
    return
  }

  try {
    await QRCode.toCanvas(canvas, content, qrOptions.value)
    hasQr.value = true
  } catch {
    hasQr.value = false
  }
}

function getDataUrl(): string | null {
  const canvas = canvasRef.value
  if (!canvas || !hasQr.value) return null
  return canvas.toDataURL('image/png')
}

function downloadPng() {
  const dataUrl = getDataUrl()
  if (!dataUrl) {
    message.warning(page.t('messages.emptyText'))
    return
  }
  const link = document.createElement('a')
  link.download = 'qrcode.png'
  link.href = dataUrl
  link.click()
}

async function copyImage() {
  const dataUrl = getDataUrl()
  if (!dataUrl) {
    message.warning(page.t('messages.emptyText'))
    return
  }
  try {
    const blob = await fetch(dataUrl).then(r => r.blob())
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])
    message.success(page.t('messages.copiedImage'))
  } catch {
    message.error(page.t('messages.copyImageFailed'))
  }
}

onMounted(() => {
  void renderQr()
})

watch([text, size, margin, errorLevel], () => {
  void nextTick(renderQr)
})
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="qr-code-generator-view"
  >
    <template #actions>
      <div class="option-control">
        <span class="control-label">{{ page.t('labels.size') }}</span>
        <NInputNumber v-model:value="size" :min="64" :max="1024" :step="32" style="width: 120px" />
      </div>
      <NSelect
        v-model:value="errorLevel"
        :options="errorLevelOptions"
        style="width: 180px"
      />
      <div class="option-control">
        <span class="control-label">{{ page.t('labels.margin') }}</span>
        <NInputNumber v-model:value="margin" :min="0" :max="32" style="width: 80px" />
      </div>
      <NButton :disabled="!hasQr" @click="downloadPng">{{ page.t('buttons.download') }}</NButton>
      <NButton :disabled="!hasQr" @click="copyImage">{{ page.t('buttons.copyImage') }}</NButton>
    </template>

    <div class="content-grid">
      <NCard class="input-card" :bordered="false">
        <label class="field-label">{{ page.t('labels.text') }}</label>
        <NInput
          v-model:value="text"
          type="textarea"
          :placeholder="page.t('placeholders.text')"
          :autosize="{ minRows: 4, maxRows: 8 }"
        />
      </NCard>

      <NCard class="preview-card" :bordered="false">
        <div class="preview-wrap">
          <canvas ref="canvasRef" class="qr-canvas" />
          <p v-if="!hasQr" class="preview-hint">{{ page.t('messages.emptyText') }}</p>
        </div>
      </NCard>
    </div>
  </PageLayout>
</template>

<style scoped>
.qr-code-generator-view {
  max-width: 960px;
  margin: 0 auto;
}

.option-control {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.control-label,
.field-label {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
}

@media (max-width: 720px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

.input-card,
.preview-card {
  background: var(--color-bg-primary);
}

.field-label {
  display: block;
  margin-bottom: var(--space-3);
}

.preview-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  position: relative;
}

.qr-canvas {
  max-width: 100%;
  height: auto;
  image-rendering: pixelated;
}

.preview-hint {
  position: absolute;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-body);
  pointer-events: none;
}
</style>

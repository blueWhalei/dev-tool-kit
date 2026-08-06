<template>
    <div class="image-base64-panel">
      <NCard
        class="editor-card"
        :bordered="false"
      >
        <template #header>
          <span class="card-title">{{ page.t('labels.dataUrlInput') }}</span>
        </template>
        <NInput
          v-model:value="dataUrlInput"
          type="textarea"
          :rows="4"
          :placeholder="page.t('placeholders.dataUrlInput')"
          class="code-input"
        />
        <div
          class="action-bar"
          style="margin-top: 12px; border-top: none; padding-top: 0"
        >
          <NButton
            type="primary"
            @click="handleParseDataUrl"
          >
            {{ page.t('actions.parseDataUrl') }}
          </NButton>
          <NButton @click="pickImageForDataUrl">
            {{ page.t('actions.pickImage') }}
          </NButton>
        </div>
      </NCard>

      <NCard
        v-if="dataUrlParseResult"
        class="editor-card"
        :bordered="false"
      >
        <template #header>
          <span class="card-title">{{ page.t('labels.parseResult') }}</span>
        </template>
        <NGrid
          cols="1 640:2"
          :x-gap="16"
          :y-gap="12"
        >
          <NGridItem>
            <div class="info-item">
              <span class="result-label">{{ page.t('labels.mimeType') }}</span>
              <NTag
                size="small"
                :bordered="false"
              >
                {{ dataUrlParseResult.mimeType }}
              </NTag>
            </div>
          </NGridItem>
          <NGridItem>
            <div class="info-item">
              <span class="result-label">{{ page.t('labels.charset') }}</span>
              <span class="info-value">{{ dataUrlParseResult.charset || '—' }}</span>
            </div>
          </NGridItem>
          <NGridItem>
            <div class="info-item">
              <span class="result-label">{{ page.t('labels.encoding') }}</span>
              <NTag
                size="small"
                :bordered="false"
                :type="dataUrlParseResult.isBase64 ? 'info' : 'default'"
              >
                {{ dataUrlParseResult.isBase64 ? page.t('labels.base64Encoded') : page.t('labels.textEncoded') }}
              </NTag>
            </div>
          </NGridItem>
          <NGridItem>
            <div class="info-item">
              <span class="result-label">{{ page.t('labels.estimatedSize') }}</span>
              <span class="info-value">{{ formatBytes(dataUrlParseResult.size) }}</span>
            </div>
          </NGridItem>
          <NGridItem>
            <div class="info-item">
              <span class="result-label">{{ page.t('labels.decodedSize') }}</span>
              <span class="info-value">{{ formatBytes(dataUrlParseResult.decodedSize) }}</span>
            </div>
          </NGridItem>
        </NGrid>

        <div
          v-if="dataUrlParseResult.rawText && dataUrlParseResult.mimeType.startsWith('text/')"
          style="margin-top: 12px"
        >
          <span class="section-label">{{ page.t('labels.decodedText') }}</span>
          <NInput
            :value="dataUrlParseResult.rawText"
            type="textarea"
            readonly
            :rows="3"
            class="code-input"
            style="margin-top: 4px"
          />
        </div>

        <div
          v-if="dataUrlParseResult.mimeType.startsWith('image/')"
          style="margin-top: 12px"
        >
          <span class="section-label">{{ page.t('labels.preview') }}</span>
          <div
            class="image-preview-wrap"
            style="margin-top: 4px"
          >
            <img
              :src="dataUrlInput"
              :alt="page.t('labels.preview')"
              class="image-preview"
            >
          </div>
        </div>

        <div
          class="action-bar"
          style="margin-top: 12px; border-top: none; padding-top: 0"
        >
          <NButton @click="copy(dataUrlInput, page.t('messages.imageCopied'))">
            {{ page.t('actions.copyDataUri') }}
          </NButton>
        </div>
      </NCard>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NCard, NGrid, NGridItem, NTag, NInput, useMessage } from 'naive-ui'
import { formatBytes, type DataUrlParseResult } from '@dev-tool-kit/shared'
import { useToolI18n } from '../../composables/useToolI18n'
import { useSharedImageState } from '../../composables/useSharedImageState'
import { useCopyToClipboard } from '../../composables/useCopyToClipboard'

const message = useMessage()
const page = useToolI18n('imageTools')
const { pickImage } = useSharedImageState()
const { copy } = useCopyToClipboard()

const dataUrlInput = ref('')
const dataUrlParseResult = ref<DataUrlParseResult | null>(null)

function parseDataUrl(input: string): DataUrlParseResult | null {
  const match = input.trim().match(/^data:([^;,]+)?(?:;([^,]+))?,(.*)$/s)
  if (!match) return null

  const fullMediaType = match[1] || 'text/plain'
  const params = match[2] || ''
  const data = match[3]

  // Parse charset from media type params
  let charset: string | null = null
  const isBase64 = params.includes('base64')

  const charsetMatch = fullMediaType.match(/;\s*charset=([^\s;]+)/i)
  if (charsetMatch) charset = charsetMatch[1]

  const mimeType = fullMediaType.split(';')[0].trim()
  const dataByteSize = isBase64 ? Math.ceil((data.length * 3) / 4) : new TextEncoder().encode(data).length

  let rawText = ''
  if (isBase64) {
    try {
      rawText = new TextDecoder().decode(Uint8Array.from(atob(data), c => c.charCodeAt(0)))
    } catch {
      rawText = ''
    }
  } else {
    rawText = data
  }

  return {
    mimeType,
    charset,
    isBase64,
    data,
    rawText,
    size: data.length,
    decodedSize: dataByteSize
  }
}

function handleParseDataUrl() {
  if (!dataUrlInput.value.trim()) return
  const result = parseDataUrl(dataUrlInput.value)
  if (result) {
    dataUrlParseResult.value = result
    message.success(page.t('messages.dataUrlParsed'))
  } else {
    dataUrlParseResult.value = null
    message.error(page.t('messages.dataUrlInvalid'))
  }
}

async function pickImageForDataUrl() {
  const data = await pickImage()
  if (!data) return
  dataUrlInput.value = data.dataUri
  handleParseDataUrl()
}
</script>

<template>
    <div class="image-base64-panel">
      <NCard
        class="editor-card"
        :bordered="false"
      >
        <template #header>
          <div class="card-header-flex">
            <span class="card-title">{{ page.t('labels.imageToBase64') }}</span>
            <NTag
              v-if="base64FileName"
              size="small"
              :bordered="false"
            >
              {{ base64FileName }}
            </NTag>
          </div>
        </template>
        <div class="image-actions">
          <NButton
            type="primary"
            :loading="imageLoading"
            @click="pickImageForBase64"
          >
            {{ page.t('actions.pickImage') }}
          </NButton>
          <NButton
            v-if="base64Data"
            @click="copyBase64"
          >
            {{ page.t('actions.copyBase64') }}
          </NButton>
          <NButton
            v-if="base64DataUri"
            @click="copyDataUri"
          >
            {{ page.t('actions.copyDataUri') }}
          </NButton>
          <NButton
            v-if="base64Data"
            quaternary
            @click="useForDecode"
          >
            {{ page.t('actions.useForDecode') }}
          </NButton>
        </div>
        <div
          v-if="base64Data"
          class="image-meta"
        >
          <span>{{ page.t('labels.mimeType') }}: {{ base64Mime }}</span>
          <span>{{ page.t('labels.fileSize') }}: {{ formatBytes(base64FileSize) }}</span>
        </div>
        <NInput
          v-if="base64Data"
          v-model:value="base64Data"
          type="textarea"
          readonly
          :rows="6"
          class="code-input image-base64-output"
        />
      </NCard>

      <NCard
        class="editor-card"
        :bordered="false"
      >
        <template #header>
          <span class="card-title">{{ page.t('labels.base64ToImage') }}</span>
        </template>
        <div class="decode-mime-row">
          <span class="section-label">{{ page.t('labels.mimeType') }}</span>
          <NInput
            v-model:value="decodeMime"
            :placeholder="page.t('placeholders.mimeType')"
            style="max-width: 220px"
          />
        </div>
        <NInput
          v-model:value="decodeInput"
          type="textarea"
          :rows="5"
          :placeholder="page.t('placeholders.imageBase64')"
          class="code-input"
        />
        <div
          v-if="decodePreviewVisible"
          class="image-preview-wrap"
        >
          <img
            :src="decodePreviewUri"
            :alt="page.t('labels.preview')"
            class="image-preview"
          >
        </div>
        <p
          v-else-if="decodeInput.trim()"
          class="preview-hint"
        >
          {{ page.t('messages.invalidImageBase64') }}
        </p>
      </NCard>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NButton, NCard, NTag, NInput } from 'naive-ui'
import { formatBytes } from '@dev-tool-kit/shared'
import { useToolI18n } from '../../composables/useToolI18n'
import { useSharedImageState } from '../../composables/useSharedImageState'
import { useCopyToClipboard } from '../../composables/useCopyToClipboard'

const page = useToolI18n('imageTools')
const { pickedImage, imageLoading, pickImage } = useSharedImageState()
const { copy } = useCopyToClipboard()

const base64Data = ref('')
const base64Mime = ref('image/png')
const base64DataUri = ref('')
const base64FileSize = ref(0)
const base64FileName = ref('')

const decodeMime = ref('image/png')
const decodeInput = ref('')

// 拖拽/粘贴/其他面板选图后共享 pickedImage 变化，自动填充 base64 输入
watch(
  () => pickedImage.value,
  (img) => {
    if (!img) return
    base64FileName.value = img.fileName
    base64Mime.value = img.mimeType
    base64Data.value = img.base64
    base64DataUri.value = img.dataUri
    base64FileSize.value = img.size
    decodeMime.value = img.mimeType
    decodeInput.value = img.base64
  }
)

const decodePreviewUri = computed(() => {
  const raw = decodeInput.value.trim()
  if (!raw) return ''
  if (raw.startsWith('data:')) return raw
  const mime = decodeMime.value.trim() || 'image/png'
  const base64 = raw.replace(/^data:[^;]+;base64,/, '')
  return `data:${mime};base64,${base64}`
})

const decodePreviewVisible = computed(() => Boolean(decodePreviewUri.value))

async function pickImageForBase64() {
  const data = await pickImage()
  if (!data) return
  base64FileName.value = data.fileName
  base64Mime.value = data.mimeType
  base64Data.value = data.base64
  base64DataUri.value = data.dataUri
  base64FileSize.value = data.size
  decodeMime.value = data.mimeType
  decodeInput.value = data.base64
}

async function copyBase64() {
  if (!base64Data.value) return
  await copy(base64Data.value, page.t('messages.imageCopied'))
}

async function copyDataUri() {
  if (!base64DataUri.value) return
  await copy(base64DataUri.value, page.t('messages.imageCopied'))
}

function useForDecode() {
  if (base64Data.value) {
    decodeInput.value = base64Data.value
    decodeMime.value = base64Mime.value
  }
}
</script>

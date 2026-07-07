<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import { NButton, NSelect, NButtonGroup, NCard, NList, NListItem, NThing, NSpin, useMessage } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import ToolDualPanel from '../components/ToolDualPanel.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useIpc } from '../composables/useIpc'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { computeHash, type HashAlgorithm, type FileHashResults, formatBytes } from '@dev-tool-kit/shared'

const message = useMessage()
const router = useRouter()
const page = useToolI18n('hashGenerator')
const { t } = useI18n()
const { invoke } = useIpc()
const { copy } = useCopyToClipboard()

type HashMode = 'text' | 'file'

const hashMode = ref<HashMode>('text')
const inputText = ref('')
const hashOutput = ref('')
const selectedAlgorithm = ref<HashAlgorithm>('SHA-256')

const fileHashResults = ref<FileHashResults | null>(null)
const fileHashLoading = ref(false)

const SAMPLE_TEXT = 'Hello, DevToolkit!'

const algorithmOptions = [
  { label: 'MD5', value: 'MD5' },
  { label: 'SHA-1', value: 'SHA-1' },
  { label: 'SHA-256', value: 'SHA-256' },
  { label: 'SHA-512', value: 'SHA-512' }
]

async function calculateHash() {
  if (!inputText.value) {
    hashOutput.value = ''
    return
  }

  try {
    hashOutput.value = await computeHash(selectedAlgorithm.value, inputText.value)
  } catch {
    message.error(page.t('hashFailed'))
    hashOutput.value = ''
  }
}

function fillSample() {
  inputText.value = SAMPLE_TEXT
  void calculateHash()
}

function useHashInBase64() {
  if (!hashOutput.value) {
    message.warning(page.t('messages.noHash'))
    return
  }
  void router.push({
    name: 'CodeConverter',
    query: { tab: 'base64', input: hashOutput.value }
  })
}

async function selectAndHashFile() {
  try {
    const filePath = await invoke<string | null>('hash-generator:selectFile')
    if (!filePath) return

    fileHashLoading.value = true
    const data = await invoke<FileHashResults | null>('hash-generator:computeFileHash', filePath)
    if (data) {
      fileHashResults.value = data
      message.success(page.t('messages.fileHashComplete'))
    } else {
      message.error(page.t('messages.fileHashFailed'))
    }
  } catch {
    message.error(page.t('messages.fileHashFailed'))
  } finally {
    fileHashLoading.value = false
  }
}

async function copyHash(hash: string) {
  await copy(hash)
}

function useHashInJwt() {
  if (!hashOutput.value) {
    message.warning(page.t('messages.noHash'))
    return
  }
  void router.push({
    name: 'JWTGenerator',
    query: { tab: 'sign', secret: hashOutput.value }
  })
}

watchDebounced([inputText, selectedAlgorithm], calculateHash, { debounce: 300 })
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="hash-generator-view"
  >
    <template #actions>
      <NButtonGroup>
        <NButton
          :type="hashMode === 'text' ? 'primary' : 'default'"
          size="small"
          @click="hashMode = 'text'"
        >
          {{ page.t('modes.text') }}
        </NButton>
        <NButton
          :type="hashMode === 'file' ? 'primary' : 'default'"
          size="small"
          @click="hashMode = 'file'"
        >
          {{ page.t('modes.file') }}
        </NButton>
      </NButtonGroup>
      <NSelect
        v-if="hashMode === 'text'"
        v-model:value="selectedAlgorithm"
        :options="algorithmOptions"
        style="width: 160px"
      />
      <NButton
        v-if="hashMode === 'text'"
        size="small"
        quaternary
        @click="fillSample"
      >
        {{ t('common.fillSample') }}
      </NButton>
      <NButton
        v-if="hashMode === 'text' && hashOutput"
        size="small"
        quaternary
        @click="useHashInBase64"
      >
        {{ page.t('buttons.useInBase64') }}
      </NButton>
      <NButton
        v-if="hashMode === 'text' && hashOutput"
        size="small"
        type="primary"
        quaternary
        @click="useHashInJwt"
      >
        {{ page.t('buttons.useInJwt') }}
      </NButton>
      <NButton
        v-if="hashMode === 'file'"
        type="primary"
        size="small"
        :loading="fileHashLoading"
        @click="selectAndHashFile"
      >
        {{ page.t('fileArea.selectFile') }}
      </NButton>
    </template>

    <template v-if="hashMode === 'text'">
      <ToolDualPanel
        v-model:input="inputText"
        v-model:output="hashOutput"
        :input-label="page.t('input')"
        :output-label="page.t('output')"
        :input-placeholder="page.t('inputPlaceholder')"
        :output-placeholder="page.t('outputPlaceholder')"
        :input-rows="6"
        :output-rows="6"
      />
    </template>

    <template v-else>
      <NSpin :show="fileHashLoading">
        <NCard
          v-if="fileHashResults"
          class="file-hash-card"
          :bordered="false"
        >
          <div class="file-info">
            <span class="file-info-item"><strong>{{ page.t('fileArea.fileName') }}:</strong> {{ fileHashResults.fileName }}</span>
            <span class="file-info-item"><strong>{{ page.t('fileArea.fileSize') }}:</strong> {{ formatBytes(fileHashResults.fileSize) }}</span>
          </div>
          <NList hoverable>
            <NListItem
              v-for="item in fileHashResults.hashes"
              :key="item.algorithm"
            >
              <NThing>
                <template #header>
                  <span class="hash-algorithm">{{ item.algorithm }}</span>
                </template>
                <template #description>
                  <code class="hash-value">{{ item.hash }}</code>
                </template>
              </NThing>
              <template #suffix>
                <NButton
                  size="small"
                  @click="copyHash(item.hash)"
                >
                  {{ t('common.copy') }}
                </NButton>
              </template>
            </NListItem>
          </NList>
        </NCard>
        <NCard
          v-else
          class="file-hash-card empty-card"
          :bordered="false"
        >
          <div class="empty-hint">
            {{ page.t('messages.noFileSelected') }}
          </div>
        </NCard>
      </NSpin>
    </template>
  </PageLayout>
</template>

<style scoped>
.hash-generator-view {
  max-width: 1200px;
  margin: 0 auto;
}

.file-hash-card {
  background: var(--color-bg-primary);
}

.file-info {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.file-info-item {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.hash-algorithm {
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-footnote);
  color: var(--color-text-primary);
}

.hash-value {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
  word-break: break-all;
  user-select: all;
}

.empty-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}

.empty-hint {
  color: var(--color-text-quaternary);
  font-size: var(--font-size-body);
}
</style>

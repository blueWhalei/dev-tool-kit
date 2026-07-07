<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import { NGrid, NGridItem, NCard, NInput, NButton, NTag, NSwitch, NButtonGroup, useMessage } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { useIpc } from '../composables/useIpc'
import {
  computeDiff,
  formatDiffResult,
  getDiffStats,
  type DiffLine,
  type DiffMode,
  type DiffOptions
} from '@dev-tool-kit/shared'

const message = useMessage()
const { t } = useI18n()
const page = useToolI18n('textDiff')
const { copy } = useCopyToClipboard()
const { invoke } = useIpc()

const SAMPLE_A = 'line one\nline two\nline three'
const SAMPLE_B = 'line one\nline 2\nline three\nline four'

const TEXT_FILE_EXTENSIONS = [
  'txt', 'md', 'json', 'xml', 'html', 'htm', 'css', 'scss', 'less',
  'js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
  'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'log', 'csv', 'sql', 'sh', 'bat'
]

const textA = ref('')
const textB = ref('')
const fileNameA = ref('')
const fileNameB = ref('')
const loadingA = ref(false)
const loadingB = ref(false)
const diffLines = ref<DiffLine[]>([])
const viewMode = ref<'unified' | 'split'>('unified')
const diffMode = ref<DiffMode>('line')
const ignoreWhitespace = ref(false)
const ignoreCase = ref(false)

const diffOptions = computed<DiffOptions>(() => ({
  ignoreWhitespace: ignoreWhitespace.value,
  ignoreCase: ignoreCase.value
}))

const isWordMode = computed(() => diffMode.value === 'word')
const stats = computed(() => getDiffStats(diffLines.value))
const formattedResult = computed(() => formatDiffResult(diffLines.value))

function runDiff() {
  diffLines.value = computeDiff(textA.value, textB.value, diffMode.value, diffOptions.value)
}

watchDebounced([textA, textB, ignoreWhitespace, ignoreCase, diffMode], runDiff, { debounce: 300 })

async function copyResult() {
  if (!formattedResult.value) {
    message.warning(page.t('messages.noResult'))
    return
  }
  await copy(formattedResult.value, page.t('messages.copied'))
}

function fillSample() {
  textA.value = SAMPLE_A
  textB.value = SAMPLE_B
  fileNameA.value = ''
  fileNameB.value = ''
  runDiff()
}

function lineClass(type: DiffLine['type']): string {
  return `diff-line diff-line--${type}`
}

function openDialogOptions() {
  return {
    title: page.t('dialogs.openTextFile'),
    properties: ['openFile'] as const,
    filters: [
      { name: page.t('dialogs.textFiles'), extensions: TEXT_FILE_EXTENSIONS },
      { name: page.t('dialogs.allFiles'), extensions: ['*'] }
    ]
  }
}

async function loadFile(side: 'A' | 'B') {
  if (!window.electronAPI) {
    message.error(t('common.electronApiUnavailable'))
    return
  }

  const loading = side === 'A' ? loadingA : loadingB
  loading.value = true
  try {
    const result = await window.electronAPI.showOpenDialog(openDialogOptions())
    if (result.canceled || result.filePaths.length === 0) return

    const filePath = result.filePaths[0]
    const data = await invoke<{ content: string; fileName: string } | null>('text-diff:readFile', filePath)
    if (!data) {
      message.error(page.t('messages.loadFileFailed'))
      return
    }

    if (side === 'A') {
      textA.value = data.content
      fileNameA.value = data.fileName
    } else {
      textB.value = data.content
      fileNameB.value = data.fileName
    }
  } catch {
    message.error(page.t('messages.loadFileFailed'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="text-diff-view"
  >
    <template #actions>
      <NButton size="small" quaternary @click="fillSample">{{ t('common.fillSample') }}</NButton>
      <NButtonGroup size="small">
        <NButton :type="diffMode === 'line' ? 'primary' : 'default'" @click="diffMode = 'line'">{{ page.t('buttons.lineMode') }}</NButton>
        <NButton :type="diffMode === 'word' ? 'primary' : 'default'" @click="diffMode = 'word'">{{ page.t('buttons.wordMode') }}</NButton>
      </NButtonGroup>
      <label class="option-toggle">
        <NSwitch v-model:value="ignoreWhitespace" size="small" />
        <span>{{ page.t('labels.ignoreWhitespace') }}</span>
      </label>
      <label class="option-toggle">
        <NSwitch v-model:value="ignoreCase" size="small" />
        <span>{{ page.t('labels.ignoreCase') }}</span>
      </label>
    </template>

    <NGrid cols="1 768:2" :x-gap="16" :y-gap="16">
      <NGridItem>
        <NCard class="editor-card" :bordered="false">
          <template #header>
            <div class="card-header">
              <span class="card-title">{{ page.t('labels.textA') }}</span>
              <NButton size="tiny" quaternary :loading="loadingA" @click="loadFile('A')">{{ page.t('buttons.loadFile') }}</NButton>
            </div>
          </template>
          <p v-if="fileNameA" class="file-name">{{ page.t('labels.loadedFile', { name: fileNameA }) }}</p>
          <NInput
            v-model:value="textA"
            type="textarea"
            :rows="12"
            :placeholder="page.t('placeholders.textA')"
            class="code-input"
          />
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard class="editor-card" :bordered="false">
          <template #header>
            <div class="card-header">
              <span class="card-title">{{ page.t('labels.textB') }}</span>
              <NButton size="tiny" quaternary :loading="loadingB" @click="loadFile('B')">{{ page.t('buttons.loadFile') }}</NButton>
            </div>
          </template>
          <p v-if="fileNameB" class="file-name">{{ page.t('labels.loadedFile', { name: fileNameB }) }}</p>
          <NInput
            v-model:value="textB"
            type="textarea"
            :rows="12"
            :placeholder="page.t('placeholders.textB')"
            class="code-input"
          />
        </NCard>
      </NGridItem>
    </NGrid>

    <div class="action-bar">
      <NButtonGroup size="small">
        <NButton :type="viewMode === 'unified' ? 'primary' : 'default'" @click="viewMode = 'unified'">{{ page.t('buttons.unifiedView') }}</NButton>
        <NButton :type="viewMode === 'split' ? 'primary' : 'default'" @click="viewMode = 'split'">{{ page.t('buttons.splitView') }}</NButton>
      </NButtonGroup>
      <NButton @click="copyResult" :disabled="!formattedResult">{{ page.t('buttons.copyResult') }}</NButton>
      <div v-if="diffLines.length" class="stats">
        <NTag size="small">{{ page.t('labels.equal', { count: stats.equal }) }}</NTag>
        <NTag size="small" type="success">{{ page.t('labels.insert', { count: stats.insert }) }}</NTag>
        <NTag size="small" type="error">{{ page.t('labels.delete', { count: stats.delete }) }}</NTag>
      </div>
    </div>

    <NCard v-if="diffLines.length" class="result-card" :bordered="false">
      <template #header>
        <div class="result-header">
          <span class="card-title">{{ page.t('labels.result') }}</span>
          <NButton size="small" @click="copyResult">{{ t('common.copy') }}</NButton>
        </div>
      </template>

      <div
        v-if="viewMode === 'unified'"
        class="diff-output"
        :class="{ 'diff-output--word': isWordMode }"
      >
        <template v-if="isWordMode">
          <span
            v-for="(line, index) in diffLines"
            :key="index"
            :class="['diff-word', lineClass(line.type)]"
          >{{ line.content }}</span>
        </template>
        <template v-else>
          <div
            v-for="(line, index) in diffLines"
            :key="index"
            :class="lineClass(line.type)"
          >
            <span class="line-prefix">{{ line.type === 'equal' ? ' ' : line.type === 'insert' ? '+' : '-' }}</span>
            <span class="line-content">{{ line.content }}</span>
          </div>
        </template>
      </div>

      <div
        v-else
        class="split-output"
        :class="{ 'split-output--word': isWordMode }"
      >
        <div class="split-header">
          <span>{{ page.t('labels.textA') }}</span>
          <span>{{ page.t('labels.textB') }}</span>
        </div>
        <template v-if="isWordMode">
          <div class="split-row split-row--word">
            <div class="split-cell split-cell--inline">
              <span
                v-for="(line, index) in diffLines"
                :key="`a-${index}`"
                :class="['diff-word', line.type !== 'insert' ? lineClass(line.type) : '']"
              >{{ line.type !== 'insert' ? line.content : '' }}</span>
            </div>
            <div class="split-cell split-cell--inline">
              <span
                v-for="(line, index) in diffLines"
                :key="`b-${index}`"
                :class="['diff-word', line.type !== 'delete' ? lineClass(line.type) : '']"
              >{{ line.type !== 'delete' ? line.content : '' }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div
            v-for="(line, index) in diffLines"
            :key="index"
            class="split-row"
          >
            <div class="split-cell" :class="line.type === 'insert' ? 'split-cell--empty' : lineClass(line.type)">
              {{ line.type !== 'insert' ? line.content : '' }}
            </div>
            <div class="split-cell" :class="line.type === 'delete' ? 'split-cell--empty' : lineClass(line.type)">
              {{ line.type !== 'delete' ? line.content : '' }}
            </div>
          </div>
        </template>
      </div>
    </NCard>
  </PageLayout>
</template>

<style scoped>
.text-diff-view {
  max-width: 1200px;
  margin: 0 auto;
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

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.file-name {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  word-break: break-all;
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
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
  flex-wrap: wrap;
}

.stats {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.result-card {
  margin-top: 24px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.diff-output,
.split-output {
  font-family: var(--font-family-mono);
  font-size: 13px;
  line-height: 1.6;
  max-height: 480px;
  overflow: auto;
}

.diff-output--word {
  padding: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.diff-line,
.split-cell {
  display: flex;
  padding: 2px 8px;
  border-radius: 2px;
}

.diff-word {
  border-radius: 2px;
}

.diff-line--equal,
.split-cell.diff-line--equal,
.diff-word.diff-line--equal {
  color: var(--color-text-primary);
}

.diff-line--insert,
.split-cell.diff-line--insert,
.diff-word.diff-line--insert {
  background: color-mix(in srgb, var(--color-success) 15%, transparent);
  color: var(--color-success);
}

.diff-line--delete,
.split-cell.diff-line--delete,
.diff-word.diff-line--delete {
  background: color-mix(in srgb, var(--color-error) 15%, transparent);
  color: var(--color-error);
}

.line-prefix {
  width: 16px;
  flex-shrink: 0;
  user-select: none;
}

.line-content {
  white-space: pre-wrap;
  word-break: break-all;
}

.split-header,
.split-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.split-header {
  position: sticky;
  top: 0;
  background: var(--color-bg-primary);
  padding-bottom: 8px;
  margin-bottom: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.split-cell {
  min-height: 24px;
  white-space: pre-wrap;
  word-break: break-all;
}

.split-cell--inline {
  display: block;
  padding: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.split-row--word {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.split-cell--empty {
  background: var(--color-bg-secondary);
}

.option-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>

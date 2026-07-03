<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import { NGrid, NGridItem, NCard, NInput, NButton, NTag, NSwitch, NButtonGroup, useMessage } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import {
  computeLineDiff,
  formatDiffResult,
  getDiffStats,
  type DiffLine,
  type DiffOptions
} from '@dev-tool-kit/shared'

const message = useMessage()
const { t } = useI18n()
const page = useToolI18n('textDiff')
const { copy } = useCopyToClipboard()

const SAMPLE_A = 'line one\nline two\nline three'
const SAMPLE_B = 'line one\nline 2\nline three\nline four'

const textA = ref('')
const textB = ref('')
const diffLines = ref<DiffLine[]>([])
const viewMode = ref<'unified' | 'split'>('unified')
const ignoreWhitespace = ref(false)
const ignoreCase = ref(false)

const diffOptions = computed<DiffOptions>(() => ({
  ignoreWhitespace: ignoreWhitespace.value,
  ignoreCase: ignoreCase.value
}))

const stats = computed(() => getDiffStats(diffLines.value))
const formattedResult = computed(() => formatDiffResult(diffLines.value))

function runDiff() {
  diffLines.value = computeLineDiff(textA.value, textB.value, diffOptions.value)
}

watchDebounced([textA, textB, ignoreWhitespace, ignoreCase], runDiff, { debounce: 300 })

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
}

function lineClass(type: DiffLine['type']): string {
  return `diff-line diff-line--${type}`
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
            <span class="card-title">{{ page.t('labels.textA') }}</span>
          </template>
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
            <span class="card-title">{{ page.t('labels.textB') }}</span>
          </template>
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

      <div v-if="viewMode === 'unified'" class="diff-output">
        <div
          v-for="(line, index) in diffLines"
          :key="index"
          :class="lineClass(line.type)"
        >
          <span class="line-prefix">{{ line.type === 'equal' ? ' ' : line.type === 'insert' ? '+' : '-' }}</span>
          <span class="line-content">{{ line.content }}</span>
        </div>
      </div>

      <div v-else class="split-output">
        <div class="split-header">
          <span>{{ page.t('labels.textA') }}</span>
          <span>{{ page.t('labels.textB') }}</span>
        </div>
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

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
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

.diff-line,
.split-cell {
  display: flex;
  padding: 2px 8px;
  border-radius: 2px;
}

.diff-line--equal,
.split-cell.diff-line--equal {
  color: var(--color-text-primary);
}

.diff-line--insert,
.split-cell.diff-line--insert {
  background: color-mix(in srgb, var(--color-success) 15%, transparent);
  color: var(--color-success);
}

.diff-line--delete,
.split-cell.diff-line--delete {
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

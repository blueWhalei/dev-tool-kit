<script setup lang="ts">
import { ref, onMounted, watch, computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import { NInput, NButton, NSpace, NTabs, NTabPane, NGrid, NGridItem, NCard, NTag, NAlert, useMessage } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import ToolDualPanel from '../components/ToolDualPanel.vue'
import JsonTreeView from '../components/JsonTreeView.vue'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { useKeyboardShortcut, isModKey } from '../composables/useKeyboardShortcut'
import { translateToolError } from '../utils/translateToolError'
import {
  base64Encode,
  base64Decode,
  urlEncode,
  urlDecode,
  jsonFormat,
  jsonMinify,
  parseJsonValue,
  validateAgainstSchema,
  formatSchemaErrorLine,
  type SchemaValidationError,
  parseTimestampInput,
  numberBaseConvert,
  convertAllCaseFormats,
  htmlEncode,
  htmlDecode,
  yamlToJson,
  jsonToYaml,
  yamlFormat,
  yamlMinify,
  tomlToJson,
  jsonToToml,
  tomlFormat,
  CODE_CONVERTER_TAB_STORAGE_KEY,
  type TimestampInfo,
  type CaseFormats
} from '@dev-tool-kit/shared'

const message = useMessage()
const { t } = useI18n()
const page = useToolI18n('codeConverter')
const { copy } = useCopyToClipboard()
const route = useRoute()

const VALID_TABS = ['base64', 'url', 'json', 'timestamp', 'number', 'case', 'html', 'yaml', 'toml'] as const
type TabName = (typeof VALID_TABS)[number]

const activeTab = ref<TabName>('base64')

function resolveTab(tab: unknown): TabName | null {
  if (typeof tab === 'string' && (VALID_TABS as readonly string[]).includes(tab)) {
    return tab as TabName
  }
  return null
}

onMounted(() => {
  const queryTab = resolveTab(route.query.tab)
  if (queryTab) {
    activeTab.value = queryTab
  } else {
    const saved = localStorage.getItem(CODE_CONVERTER_TAB_STORAGE_KEY)
    const savedTab = resolveTab(saved)
    if (savedTab) activeTab.value = savedTab
  }
})

watch(activeTab, (tab) => {
  localStorage.setItem(CODE_CONVERTER_TAB_STORAGE_KEY, tab)
})

watch(() => route.query.tab, (tab) => {
  const resolved = resolveTab(tab)
  if (resolved) activeTab.value = resolved
})

const base64Input = ref('')
const base64Output = ref('')
const urlInput = ref('')
const urlOutput = ref('')
const jsonInput = ref('')
const jsonOutput = ref('')
const jsonSchemaInput = ref('')
const jsonParsedValue = ref<unknown | null>(null)
const schemaValidationErrors = ref<SchemaValidationError[] | null>(null)
const schemaValidationValid = ref<boolean | null>(null)
const schemaValidationError = ref('')
const timestampInput = ref(String(Math.floor(Date.now() / 1000)))
const timestampResult = ref<TimestampInfo | null>(null)
const numberInput = ref('255')
const fromBase = ref(10)
const toBase = ref(16)
const numberOutput = ref('')
const caseInput = ref('')
const caseFormats = ref<CaseFormats | null>(null)
const htmlInput = ref('')
const htmlOutput = ref('')
const yamlInput = ref('')
const yamlOutput = ref('')
const tomlInput = ref('')
const tomlOutput = ref('')

const caseFormatRows = computed(() => {
  if (!caseFormats.value) return []
  return [
    { label: page.t('labels.camelCase'), value: caseFormats.value.camelCase },
    { label: page.t('labels.snakeCase'), value: caseFormats.value.snakeCase },
    { label: page.t('labels.kebabCase'), value: caseFormats.value.kebabCase },
    { label: page.t('labels.titleCase'), value: caseFormats.value.titleCase }
  ]
})

function translateError(error: string | undefined): string {
  return translateToolError(t, 'codeConverter', error) || error || ''
}

function setOutput(
  result: { success: boolean; result?: string; error?: string },
  target: Ref<string>
) {
  if (result.success) {
    target.value = result.result ?? ''
  } else {
    const errorMsg = translateError(result.error)
    target.value = errorMsg
    if (errorMsg) message.warning(errorMsg)
  }
}

function handleBase64Encode() {
  setOutput(base64Encode(base64Input.value), base64Output)
}

function handleBase64Decode() {
  setOutput(base64Decode(base64Input.value), base64Output)
}

function handleUrlEncode() {
  setOutput(urlEncode(urlInput.value), urlOutput)
}

function handleUrlDecode() {
  setOutput(urlDecode(urlInput.value), urlOutput)
}

function handleJsonFormat() {
  setOutput(jsonFormat(jsonInput.value), jsonOutput)
}

function handleJsonMinify() {
  setOutput(jsonMinify(jsonInput.value), jsonOutput)
}

function updateJsonParsedValue() {
  const result = parseJsonValue(jsonInput.value)
  if (result.success) {
    jsonParsedValue.value = result.result ?? null
  } else {
    jsonParsedValue.value = null
  }
}

function runSchemaValidation() {
  schemaValidationErrors.value = null
  schemaValidationValid.value = null
  schemaValidationError.value = ''

  if (!jsonSchemaInput.value.trim()) return

  const dataResult = parseJsonValue(jsonInput.value)
  if (!dataResult.success) {
    schemaValidationError.value = translateError(dataResult.error)
    return
  }

  const result = validateAgainstSchema(dataResult.result, jsonSchemaInput.value)
  if (!result.success) {
    schemaValidationError.value = translateError(result.error)
    return
  }

  schemaValidationValid.value = result.valid ?? false
  schemaValidationErrors.value = result.errors ?? null
}

const schemaErrorLines = computed(() =>
  (schemaValidationErrors.value ?? []).map(formatSchemaErrorLine)
)

watchDebounced(jsonInput, updateJsonParsedValue, { debounce: 300, immediate: true })
watchDebounced([jsonInput, jsonSchemaInput], runSchemaValidation, { debounce: 400 })

function handleTimestampConvert() {
  const result = parseTimestampInput(timestampInput.value)
  if (result.success) timestampResult.value = result.result ?? null
  else {
    timestampResult.value = null
    const errorMsg = translateError(result.error)
    if (errorMsg) message.warning(errorMsg)
  }
}

function handleNumberBase() {
  const result = numberBaseConvert(numberInput.value, fromBase.value, toBase.value)
  if (result.success) numberOutput.value = result.result ?? ''
  else {
    const errorMsg = translateError(result.error)
    numberOutput.value = errorMsg
    if (errorMsg) message.warning(errorMsg)
  }
}

function handleCaseConvertAll() {
  const result = convertAllCaseFormats(caseInput.value)
  if (result.success) caseFormats.value = result.result ?? null
  else {
    caseFormats.value = null
    const errorMsg = translateError(result.error)
    if (errorMsg) message.warning(errorMsg)
  }
}

watchDebounced(timestampInput, handleTimestampConvert, { debounce: 300, immediate: true })
watchDebounced([numberInput, fromBase, toBase], handleNumberBase, { debounce: 300, immediate: true })
watchDebounced(caseInput, handleCaseConvertAll, { debounce: 300 })

function handleHtmlEncode() {
  setOutput(htmlEncode(htmlInput.value), htmlOutput)
}

function handleHtmlDecode() {
  setOutput(htmlDecode(htmlInput.value), htmlOutput)
}

function handleYamlToJson() {
  setOutput(yamlToJson(yamlInput.value), yamlOutput)
}

function handleJsonToYaml() {
  setOutput(jsonToYaml(yamlInput.value), yamlOutput)
}

function handleYamlFormat() {
  setOutput(yamlFormat(yamlInput.value), yamlOutput)
}

function handleYamlMinify() {
  setOutput(yamlMinify(yamlInput.value), yamlOutput)
}

function handleTomlToJson() {
  setOutput(tomlToJson(tomlInput.value), tomlOutput)
}

function handleJsonToToml() {
  setOutput(jsonToToml(tomlInput.value), tomlOutput)
}

function handleTomlFormat() {
  setOutput(tomlFormat(tomlInput.value), tomlOutput)
}

async function copyToClipboard(text: string) {
  await copy(text)
}

function runActiveTabPrimaryAction() {
  switch (activeTab.value) {
    case 'base64': handleBase64Encode(); break
    case 'url': handleUrlEncode(); break
    case 'json': handleJsonFormat(); break
    case 'timestamp': handleTimestampConvert(); break
    case 'number': handleNumberBase(); break
    case 'case': handleCaseConvertAll(); break
    case 'html': handleHtmlEncode(); break
    case 'yaml': handleYamlToJson(); break
    case 'toml': handleTomlToJson(); break
  }
}

useKeyboardShortcut((event) => {
  if (isModKey(event) && event.key === 'Enter') {
    event.preventDefault()
    runActiveTabPrimaryAction()
  }
})
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="code-converter-view"
  >
    <NTabs v-model:value="activeTab" type="line" animated class="converter-tabs">
      <NTabPane name="base64" :tab="page.t('tabs.base64')">
        <ToolDualPanel
          v-model:input="base64Input"
          v-model:output="base64Output"
          :input-label="page.t('labels.input')"
          :output-label="page.t('labels.output')"
          :input-placeholder="page.t('placeholders.base64')"
          :output-placeholder="page.t('placeholders.timestampResult')"
        />
        <div class="action-bar">
          <NButton type="primary" @click="handleBase64Encode">{{ page.t('actions.encode') }}</NButton>
          <NButton @click="handleBase64Decode">{{ page.t('actions.decode') }}</NButton>
        </div>
      </NTabPane>

      <NTabPane name="url" :tab="page.t('tabs.url')">
        <ToolDualPanel
          v-model:input="urlInput"
          v-model:output="urlOutput"
          :input-label="page.t('labels.input')"
          :output-label="page.t('labels.output')"
          :input-placeholder="page.t('placeholders.url')"
          :output-placeholder="page.t('placeholders.timestampResult')"
        />
        <div class="action-bar">
          <NButton type="primary" @click="handleUrlEncode">{{ page.t('actions.encode') }}</NButton>
          <NButton @click="handleUrlDecode">{{ page.t('actions.decode') }}</NButton>
        </div>
      </NTabPane>

      <NTabPane name="json" :tab="page.t('tabs.json')">
        <ToolDualPanel
          v-model:input="jsonInput"
          v-model:output="jsonOutput"
          :input-label="page.t('labels.input')"
          :output-label="page.t('labels.output')"
          :input-placeholder="page.t('placeholders.json')"
          :output-placeholder="page.t('placeholders.timestampResult')"
        />
        <div class="action-bar json-action-bar">
          <NButton type="primary" @click="handleJsonFormat">{{ page.t('actions.format') }}</NButton>
          <NButton @click="handleJsonMinify">{{ page.t('actions.minify') }}</NButton>
        </div>

        <NCard v-if="jsonParsedValue !== null" class="editor-card json-tree-card" :bordered="false">
          <template #header>
            <span class="card-title">{{ page.t('labels.jsonTree') }}</span>
          </template>
          <JsonTreeView :value="jsonParsedValue" />
        </NCard>

        <NCard class="editor-card json-schema-card" :bordered="false">
          <template #header>
            <div class="card-header-flex">
              <span class="card-title">{{ page.t('labels.jsonSchema') }}</span>
              <NTag v-if="schemaValidationValid === true" type="success" size="small">
                {{ page.t('messages.schemaValid') }}
              </NTag>
              <NTag v-else-if="schemaValidationValid === false" type="error" size="small">
                {{ page.t('messages.schemaInvalid') }}
              </NTag>
            </div>
          </template>
          <NInput
            v-model:value="jsonSchemaInput"
            type="textarea"
            :rows="4"
            :placeholder="page.t('placeholders.jsonSchema')"
            class="code-input"
          />
          <NAlert
            v-if="schemaValidationError"
            type="warning"
            :show-icon="false"
            class="schema-alert"
          >
            {{ schemaValidationError }}
          </NAlert>
          <ul v-else-if="schemaErrorLines.length" class="schema-errors">
            <li v-for="(line, index) in schemaErrorLines" :key="index">{{ line }}</li>
          </ul>
        </NCard>
      </NTabPane>

      <NTabPane name="timestamp" :tab="page.t('tabs.timestamp')">
        <NGrid cols="1 768:2" :x-gap="16" :y-gap="16">
          <NGridItem>
            <NCard class="editor-card" :bordered="false">
              <template #header>
                <span class="card-title">{{ page.t('labels.input') }}</span>
              </template>
              <NInput
                v-model:value="timestampInput"
                type="textarea"
                :rows="3"
                :placeholder="page.t('placeholders.timestamp')"
                class="code-input"
              />
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard class="editor-card" :bordered="false">
              <template #header>
                <span class="card-title">{{ page.t('labels.output') }}</span>
              </template>
              <div v-if="timestampResult" class="result-box">
                <div class="result-item"><span class="result-label">{{ page.t('labels.unixSeconds') }}</span> {{ timestampResult.unix }}</div>
                <div class="result-item"><span class="result-label">{{ page.t('labels.millis') }}</span> {{ timestampResult.millis ?? timestampResult.timestamp }}</div>
                <div class="result-item"><span class="result-label">{{ page.t('labels.iso') }}</span> {{ timestampResult.iso ?? timestampResult.date }}</div>
                <div class="result-item"><span class="result-label">{{ page.t('labels.utc') }}</span> {{ timestampResult.utc }}</div>
                <div class="result-item"><span class="result-label">{{ page.t('labels.local') }}</span> {{ timestampResult.local }}</div>
              </div>
              <div v-else class="result-placeholder">{{ page.t('placeholders.timestampResult') }}</div>
            </NCard>
          </NGridItem>
        </NGrid>
        <div class="action-bar">
          <NButton type="primary" @click="handleTimestampConvert">{{ page.t('actions.convert') }}</NButton>
          <NButton @click="timestampInput = String(Math.floor(Date.now() / 1000))">{{ page.t('actions.now') }}</NButton>
        </div>
      </NTabPane>

      <NTabPane name="number" :tab="page.t('tabs.radix')">
        <NCard class="editor-card" :bordered="false">
          <div class="number-converter">
            <div class="number-input-section">
              <span class="section-label">{{ page.t('labels.inputNumber') }}</span>
              <NInput v-model:value="numberInput" :placeholder="page.t('placeholders.number')" class="number-input" />
            </div>
            <div class="base-selector">
              <span class="section-label">{{ page.t('labels.from') }}</span>
              <NSpace>
                <NButton :type="fromBase === 2 ? 'primary' : 'default'" size="small" @click="fromBase = 2">{{ page.t('bases.binary') }}</NButton>
                <NButton :type="fromBase === 8 ? 'primary' : 'default'" size="small" @click="fromBase = 8">{{ page.t('bases.octal') }}</NButton>
                <NButton :type="fromBase === 10 ? 'primary' : 'default'" size="small" @click="fromBase = 10">{{ page.t('bases.decimal') }}</NButton>
                <NButton :type="fromBase === 16 ? 'primary' : 'default'" size="small" @click="fromBase = 16">{{ page.t('bases.hexadecimal') }}</NButton>
              </NSpace>
            </div>
            <div class="base-selector">
              <span class="section-label">{{ page.t('labels.to') }}</span>
              <NSpace>
                <NButton :type="toBase === 2 ? 'primary' : 'default'" size="small" @click="toBase = 2">{{ page.t('bases.binary') }}</NButton>
                <NButton :type="toBase === 8 ? 'primary' : 'default'" size="small" @click="toBase = 8">{{ page.t('bases.octal') }}</NButton>
                <NButton :type="toBase === 10 ? 'primary' : 'default'" size="small" @click="toBase = 10">{{ page.t('bases.decimal') }}</NButton>
                <NButton :type="toBase === 16 ? 'primary' : 'default'" size="small" @click="toBase = 16">{{ page.t('bases.hexadecimal') }}</NButton>
              </NSpace>
            </div>
          </div>
        </NCard>
        <div class="action-bar">
          <NButton type="primary" @click="handleNumberBase">{{ page.t('actions.convert') }}</NButton>
        </div>
        <NCard v-if="numberOutput" class="editor-card result-card" :bordered="false">
          <div class="result-box">
            <span class="result-label">{{ page.t('labels.result') }}</span>
            <code class="result-code">{{ numberOutput }}</code>
            <NButton size="small" @click="copyToClipboard(numberOutput)">{{ page.t('actions.copy') }}</NButton>
          </div>
        </NCard>
      </NTabPane>

      <NTabPane name="case" :tab="page.t('tabs.naming')">
        <NCard class="editor-card" :bordered="false">
          <template #header>
            <span class="card-title">{{ page.t('labels.input') }}</span>
          </template>
          <NInput
            v-model:value="caseInput"
            type="textarea"
            :rows="4"
            :placeholder="page.t('placeholders.naming')"
            class="code-input"
          />
        </NCard>
        <NCard v-if="caseFormats" class="editor-card result-card" :bordered="false">
          <template #header>
            <span class="card-title">{{ page.t('labels.allFormats') }}</span>
          </template>
          <div class="case-results">
            <div v-for="item in caseFormatRows" :key="item.label" class="case-result-row">
              <span class="result-label">{{ item.label }}</span>
              <code class="result-code">{{ item.value }}</code>
              <NButton size="tiny" @click="copyToClipboard(item.value)">{{ page.t('actions.copy') }}</NButton>
            </div>
          </div>
        </NCard>
        <div v-else-if="caseInput.trim()" class="result-placeholder case-empty">{{ page.t('placeholders.namingEmpty') }}</div>
      </NTabPane>

      <NTabPane name="html" :tab="page.t('tabs.html')">
        <ToolDualPanel
          v-model:input="htmlInput"
          v-model:output="htmlOutput"
          :input-label="page.t('labels.input')"
          :output-label="page.t('labels.output')"
          :input-placeholder="page.t('placeholders.html')"
          :output-placeholder="page.t('placeholders.timestampResult')"
        />
        <div class="action-bar">
          <NButton type="primary" @click="handleHtmlEncode">{{ page.t('actions.encode') }}</NButton>
          <NButton @click="handleHtmlDecode">{{ page.t('actions.decode') }}</NButton>
        </div>
      </NTabPane>

      <NTabPane name="yaml" :tab="page.t('tabs.yaml')">
        <ToolDualPanel
          v-model:input="yamlInput"
          v-model:output="yamlOutput"
          :input-label="page.t('labels.input')"
          :output-label="page.t('labels.output')"
          :input-placeholder="page.t('placeholders.yaml')"
          :output-placeholder="page.t('placeholders.yamlOutput')"
        />
        <div class="action-bar">
          <NButton type="primary" @click="handleYamlToJson">{{ page.t('actions.yamlToJson') }}</NButton>
          <NButton @click="handleJsonToYaml">{{ page.t('actions.jsonToYaml') }}</NButton>
          <NButton @click="handleYamlFormat">{{ page.t('actions.format') }}</NButton>
          <NButton @click="handleYamlMinify">{{ page.t('actions.minify') }}</NButton>
        </div>
      </NTabPane>

      <NTabPane name="toml" :tab="page.t('tabs.toml')">
        <ToolDualPanel
          v-model:input="tomlInput"
          v-model:output="tomlOutput"
          :input-label="page.t('labels.input')"
          :output-label="page.t('labels.output')"
          :input-placeholder="page.t('placeholders.toml')"
          :output-placeholder="page.t('placeholders.tomlOutput')"
        />
        <div class="action-bar">
          <NButton type="primary" @click="handleTomlToJson">{{ page.t('actions.tomlToJson') }}</NButton>
          <NButton @click="handleJsonToToml">{{ page.t('actions.jsonToToml') }}</NButton>
          <NButton @click="handleTomlFormat">{{ page.t('actions.format') }}</NButton>
        </div>
      </NTabPane>
    </NTabs>
  </PageLayout>
</template>

<style scoped>
.code-converter-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 24px;
}

.converter-tabs {
  margin-top: 24px;
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
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.result-box {
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  font-family: var(--font-family-mono);
  font-size: 14px;
}

.result-item {
  margin-bottom: 8px;
  color: var(--color-text-primary);
}

.result-item:last-child {
  margin-bottom: 0;
}

.result-label {
  color: var(--color-text-secondary);
  margin-right: 8px;
}

.result-placeholder {
  padding: 16px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.number-converter {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
  align-items: end;
}

@media (max-width: 768px) {
  .number-converter {
    grid-template-columns: 1fr;
  }
}

.case-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.case-result-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.case-result-row .result-label {
  min-width: 100px;
  flex-shrink: 0;
}

.case-empty {
  margin-top: 16px;
  text-align: center;
}

.number-input-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.number-input {
  width: 100%;
}

.base-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.result-card {
  margin-top: 16px;
}

.result-card .result-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-code {
  flex: 1;
  font-family: var(--font-family-mono);
  font-size: 16px;
  color: var(--color-text-primary);
  word-break: break-all;
}

.json-action-bar {
  margin-bottom: 0;
}

.json-tree-card,
.json-schema-card {
  margin-top: 16px;
}

.card-header-flex {
  display: flex;
  align-items: center;
  gap: 8px;
}

.schema-alert {
  margin-top: 12px;
}

.schema-errors {
  margin: 12px 0 0;
  padding: 12px 16px;
  list-style: none;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  font-family: var(--font-family-mono);
  font-size: 13px;
  color: var(--color-text-primary);
}

.schema-errors li {
  padding: 2px 0;
  word-break: break-all;
}

.schema-errors li + li {
  margin-top: 4px;
}
</style>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import {
  NInput,
  NButton,
  NCard,
  NDataTable,
  NAlert,
  useMessage,
  type DataTableColumns
} from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { translateToolError } from '../utils/translateToolError'
import {
  parseConnectionString,
  parsedConnectionToJson,
  CONNECTION_STRING_FIELD_KEYS,
  type ParsedConnectionString
} from '@dev-tool-kit/shared'

const SAMPLE_MYSQL = 'mysql://root:password@localhost:3306/myapp?charset=utf8mb4'

const message = useMessage()
const router = useRouter()
const { t } = useI18n()
const page = useToolI18n('connectionStringParser')
const { copy } = useCopyToClipboard()

const input = ref('')
const parsed = ref<ParsedConnectionString | null>(null)
const parseError = ref('')

interface FieldRow {
  key: string
  label: string
  value: string
}

const fieldRows = computed<FieldRow[]>(() => {
  if (!parsed.value) return []
  const result = parsed.value
  return CONNECTION_STRING_FIELD_KEYS.map((key) => ({
    key,
    label: page.t(`fields.${key}`),
    value: formatFieldValue(key, result)
  })).concat(
    Object.entries(result.queryParams).map(([key, value]) => ({
      key: `param:${key}`,
      label: page.t('fields.queryParam', { name: key }),
      value
    }))
  )
})

const columns = computed<DataTableColumns<FieldRow>>(() => [
  { title: page.t('columns.field'), key: 'label', width: 160 },
  {
    title: page.t('columns.value'),
    key: 'value',
    ellipsis: { tooltip: true },
    render: (row) => row.value || page.t('labels.empty')
  },
  {
    title: page.t('columns.actions'),
    key: 'actions',
    width: 90,
    render: (row) =>
      row.value
        ? h(
            NButton,
            { size: 'small', quaternary: true, onClick: () => copyField(row.value) },
            { default: () => page.t('buttons.copy') }
          )
        : null
  }
])

function formatFieldValue(key: string, result: ParsedConnectionString): string {
  if (key === 'port') return result.port != null ? String(result.port) : ''
  const value = result[key as keyof ParsedConnectionString]
  if (value == null || typeof value === 'object') return ''
  return String(value)
}

function runParse() {
  parseError.value = ''
  parsed.value = null

  if (!input.value.trim()) return

  const result = parseConnectionString(input.value)
  if (!result.success || !result.result) {
    parseError.value =
      translateToolError(t, 'connectionStringParser', result.error) ||
      page.t('errors.unknown')
    return
  }
  parsed.value = result.result
}

function fillSample() {
  input.value = SAMPLE_MYSQL
}

async function copyField(value: string) {
  await copy(value, page.t('messages.copiedField'))
}

async function copyJson() {
  if (!parsed.value) {
    message.warning(page.t('messages.parseFirst'))
    return
  }
  await copy(parsedConnectionToJson(parsed.value), page.t('messages.copiedJson'))
}

function openInMockData() {
  if (!parsed.value) {
    message.warning(page.t('messages.parseFirst'))
    return
  }
  const result = parsed.value
  void router.push({
    name: 'MockData',
    query: {
      fromConn: '1',
      protocol: result.protocol,
      host: result.host,
      ...(result.port != null ? { port: String(result.port) } : {}),
      ...(result.database ? { database: result.database } : {}),
      ...(result.user ? { user: result.user } : {})
    }
  })
}

watchDebounced(input, runParse, { debounce: 300 })
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="connection-string-parser-view"
  >
    <template #actions>
      <NButton size="small" quaternary @click="fillSample">{{ t('common.fillSample') }}</NButton>
      <NButton
        v-if="parsed"
        size="small"
        type="primary"
        quaternary
        @click="openInMockData"
      >
        {{ page.t('buttons.openInMockData') }}
      </NButton>
      <NButton v-if="parsed" size="small" @click="copyJson">{{ page.t('buttons.copyJson') }}</NButton>
    </template>

    <NCard class="input-card" :bordered="false">
      <div class="field-label">{{ page.t('labels.input') }}</div>
      <NInput
        v-model:value="input"
        type="textarea"
        :placeholder="page.t('placeholders.input')"
        :rows="3"
        class="conn-input"
      />
    </NCard>

    <NAlert v-if="parseError" type="error" :bordered="false" class="error-alert">
      {{ parseError }}
    </NAlert>

    <NCard v-if="parsed" class="result-card" :bordered="false" :title="page.t('labels.parsed')">
      <NDataTable
        :columns="columns"
        :data="fieldRows"
        :bordered="false"
        size="small"
        :pagination="false"
      />
    </NCard>
  </PageLayout>
</template>

<style scoped>
.connection-string-parser-view {
  max-width: 900px;
  margin: 0 auto;
}

.input-card,
.result-card {
  margin-bottom: 16px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--n-text-color-2);
  margin-bottom: 8px;
}

.conn-input {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 13px;
}

.error-alert {
  margin-bottom: 16px;
}
</style>

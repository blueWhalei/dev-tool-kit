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
  NTabs,
  NTabPane,
  NSelect,
  NInputNumber,
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
  buildConnectionString,
  CONNECTION_STRING_FIELD_KEYS,
  type ParsedConnectionString
} from '@dev-tool-kit/shared'

const SAMPLE_MYSQL = 'mysql://root:password@localhost:3306/myapp?charset=utf8mb4'

const PROTOCOL_OPTIONS = [
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'Redis', value: 'redis' },
  { label: 'Redis (TLS)', value: 'rediss' },
  { label: 'MongoDB', value: 'mongodb' },
  { label: 'MongoDB SRV', value: 'mongodb+srv' }
]

const message = useMessage()
const router = useRouter()
const { t } = useI18n()
const page = useToolI18n('connectionStringParser')
const { copy } = useCopyToClipboard()

const activeTab = ref<'parse' | 'build'>('parse')
const input = ref('')
const parsed = ref<ParsedConnectionString | null>(null)
const parseError = ref('')

const buildProtocol = ref('mysql')
const buildHost = ref('localhost')
const buildPort = ref<number | null>(3306)
const buildUser = ref('')
const buildPassword = ref('')
const buildDatabase = ref('')
const buildQuery = ref('charset=utf8mb4')
const builtOutput = ref('')
const buildError = ref('')

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

function parseQueryString(query: string): Record<string, string> {
  const trimmed = query.trim().replace(/^\?/, '')
  if (!trimmed) return {}
  const params: Record<string, string> = {}
  const usp = new URLSearchParams(trimmed)
  usp.forEach((value, key) => {
    params[key] = value
  })
  return params
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

function runBuild() {
  buildError.value = ''
  builtOutput.value = ''

  const result = buildConnectionString({
    protocol: buildProtocol.value,
    host: buildHost.value,
    port: buildPort.value,
    user: buildUser.value || null,
    password: buildPassword.value || null,
    database: buildDatabase.value || null,
    queryParams: parseQueryString(buildQuery.value)
  })

  if (!result.success || !result.result) {
    buildError.value =
      translateToolError(t, 'connectionStringParser', result.error) ||
      page.t('errors.unknown')
    return
  }

  builtOutput.value = result.result
}

function fillSample() {
  input.value = SAMPLE_MYSQL
  runParse()
}

function fillBuilderFromParsed() {
  if (!parsed.value) {
    message.warning(page.t('messages.parseFirst'))
    return
  }
  const result = parsed.value
  buildProtocol.value = result.protocol
  buildHost.value = result.host
  buildPort.value = result.port
  buildUser.value = result.user ?? ''
  buildPassword.value = result.password ?? ''
  buildDatabase.value = result.database ?? ''
  buildQuery.value = new URLSearchParams(result.queryParams).toString()
  activeTab.value = 'build'
  runBuild()
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

async function copyBuilt() {
  if (!builtOutput.value) {
    message.warning(page.t('messages.buildFirst'))
    return
  }
  await copy(builtOutput.value, page.t('messages.copiedBuilt'))
}

function parseBuiltString() {
  if (!builtOutput.value) {
    message.warning(page.t('messages.buildFirst'))
    return
  }
  input.value = builtOutput.value
  activeTab.value = 'parse'
  runParse()
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

function openInPortManager() {
  const port = parsed.value?.port
  if (port == null) {
    message.warning(page.t('messages.noPort'))
    return
  }
  void router.push({
    name: 'PortManager',
    query: { port: String(port) }
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
      <NButton
        size="small"
        quaternary
        @click="fillSample"
      >
        {{ t('common.fillSample') }}
      </NButton>
      <NButton
        v-if="parsed"
        size="small"
        type="primary"
        quaternary
        @click="openInMockData"
      >
        {{ page.t('buttons.openInMockData') }}
      </NButton>
      <NButton
        v-if="parsed?.port != null"
        size="small"
        quaternary
        @click="openInPortManager"
      >
        {{ page.t('buttons.openInPortManager') }}
      </NButton>
      <NButton
        v-if="parsed"
        size="small"
        @click="copyJson"
      >
        {{ page.t('buttons.copyJson') }}
      </NButton>
    </template>

    <NTabs
      v-model:value="activeTab"
      type="line"
      animated
      class="conn-tabs"
    >
      <NTabPane
        name="parse"
        :tab="page.t('tabs.parse')"
      >
        <NCard
          class="input-card"
          :bordered="false"
        >
          <div class="field-label">
            {{ page.t('labels.input') }}
          </div>
          <NInput
            v-model:value="input"
            type="textarea"
            :placeholder="page.t('placeholders.input')"
            :rows="3"
            class="conn-input"
          />
        </NCard>

        <NAlert
          v-if="parseError"
          type="error"
          :bordered="false"
          class="error-alert"
        >
          {{ parseError }}
        </NAlert>

        <NCard
          v-if="parsed"
          class="result-card"
          :bordered="false"
          :title="page.t('labels.parsed')"
        >
          <template #header-extra>
            <NButton
              size="small"
              quaternary
              @click="fillBuilderFromParsed"
            >
              {{ page.t('buttons.fillBuilder') }}
            </NButton>
          </template>
          <NDataTable
            :columns="columns"
            :data="fieldRows"
            :bordered="false"
            size="small"
            :pagination="false"
          />
        </NCard>
      </NTabPane>

      <NTabPane
        name="build"
        :tab="page.t('tabs.build')"
      >
        <NCard
          class="input-card"
          :bordered="false"
        >
          <div class="builder-grid">
            <div class="builder-field">
              <div class="field-label">
                {{ page.t('fields.protocol') }}
              </div>
              <NSelect
                v-model:value="buildProtocol"
                :options="PROTOCOL_OPTIONS"
              />
            </div>
            <div class="builder-field">
              <div class="field-label">
                {{ page.t('fields.host') }}
              </div>
              <NInput
                v-model:value="buildHost"
                :placeholder="page.t('placeholders.host')"
              />
            </div>
            <div class="builder-field">
              <div class="field-label">
                {{ page.t('fields.port') }}
              </div>
              <NInputNumber
                v-model:value="buildPort"
                :min="1"
                :max="65535"
                class="port-input"
                clearable
              />
            </div>
            <div class="builder-field">
              <div class="field-label">
                {{ page.t('fields.user') }}
              </div>
              <NInput
                v-model:value="buildUser"
                :placeholder="page.t('placeholders.user')"
              />
            </div>
            <div class="builder-field">
              <div class="field-label">
                {{ page.t('fields.password') }}
              </div>
              <NInput
                v-model:value="buildPassword"
                type="password"
                show-password-on="click"
              />
            </div>
            <div class="builder-field">
              <div class="field-label">
                {{ page.t('fields.database') }}
              </div>
              <NInput
                v-model:value="buildDatabase"
                :placeholder="page.t('placeholders.database')"
              />
            </div>
            <div class="builder-field builder-field--wide">
              <div class="field-label">
                {{ page.t('labels.queryParams') }}
              </div>
              <NInput
                v-model:value="buildQuery"
                :placeholder="page.t('placeholders.queryParams')"
              />
            </div>
          </div>
          <div class="builder-actions">
            <NButton
              type="primary"
              @click="runBuild"
            >
              {{ page.t('buttons.build') }}
            </NButton>
            <NButton
              :disabled="!builtOutput"
              @click="parseBuiltString"
            >
              {{ page.t('buttons.parseBuilt') }}
            </NButton>
            <NButton
              :disabled="!builtOutput"
              @click="copyBuilt"
            >
              {{ page.t('buttons.copyBuilt') }}
            </NButton>
          </div>
        </NCard>

        <NAlert
          v-if="buildError"
          type="error"
          :bordered="false"
          class="error-alert"
        >
          {{ buildError }}
        </NAlert>

        <NCard
          v-if="builtOutput"
          class="result-card"
          :bordered="false"
          :title="page.t('labels.built')"
        >
          <NInput
            :value="builtOutput"
            type="textarea"
            :rows="3"
            readonly
            class="conn-input"
          />
        </NCard>
      </NTabPane>
    </NTabs>
  </PageLayout>
</template>

<style scoped>
.connection-string-parser-view {
  max-width: 900px;
  margin: 0 auto;
}

.conn-tabs {
  margin-top: 4px;
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

.builder-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.builder-field--wide {
  grid-column: 1 / -1;
}

.port-input {
  width: 100%;
}

.builder-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 640px) {
  .builder-grid {
    grid-template-columns: 1fr;
  }
}
</style>

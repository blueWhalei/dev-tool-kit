<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  NButton,
  NInputNumber,
  NCard,
  NInput,
  NSelect,
  NDataTable,
  NDropdown,
  useMessage,
  type DataTableColumns,
  type DropdownOption
} from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import {
  generateMockRecords,
  MOCK_PRESETS,
  MOCK_FIELD_TYPES,
  recordsToCsv,
  recordsToSqlInsert,
  sanitizeSqlTableName,
  downloadTextFile,
  type MockField
} from '@dev-tool-kit/shared'

const message = useMessage()
const route = useRoute()
const page = useToolI18n('mockData')
const { copy } = useCopyToClipboard()

const count = ref(10)
const activePreset = ref<string | null>('user')
const fields = ref<MockField[]>([...MOCK_PRESETS.user.fields])
const records = ref<Record<string, unknown>[]>([])
const sqlTableName = ref('mock_data')

function getColumnTitle(key: string): string {
  if (activePreset.value) {
    const labelKey = `presets.${activePreset.value}.fields.${key}`
    const label = page.t(labelKey)
    if (label !== labelKey) return label
  }
  return key
}

function onFieldNameChange() {
  activePreset.value = null
}

function onFieldTypeChange() {
  activePreset.value = null
}

const presetOptions = computed(() =>
  Object.keys(MOCK_PRESETS).map(value => ({
    label: page.t(`presets.${value}.label`),
    value
  }))
)

const fieldTypeOptions = computed(() =>
  MOCK_FIELD_TYPES.map(value => ({
    label: page.t(`fieldTypes.${value}`),
    value
  }))
)

const columns = computed<DataTableColumns<Record<string, unknown>>>(() => {
  void page.locale.value
  if (records.value.length === 0) return []
  const keys = Object.keys(records.value[0])
  return keys.map(key => ({
    title: getColumnTitle(key),
    key,
    ellipsis: { tooltip: true },
    render: (row: Record<string, unknown>) => String(row[key])
  }))
})

function applyPreset(presetKey: string | null) {
  if (!presetKey || !MOCK_PRESETS[presetKey]) return
  activePreset.value = presetKey
  fields.value = MOCK_PRESETS[presetKey].fields.map(field => ({ ...field }))
  generate()
}

function addField() {
  activePreset.value = null
  fields.value.push({ name: `field_${fields.value.length + 1}`, type: 'number' })
}

function removeField(index: number) {
  if (fields.value.length <= 1) {
    message.warning(page.t('messages.minFields'))
    return
  }
  activePreset.value = null
  fields.value.splice(index, 1)
}

function generate() {
  const validFields = fields.value.filter(field => field.name.trim())
  if (validFields.length === 0) {
    message.warning(page.t('messages.validFieldRequired'))
    return
  }
  records.value = generateMockRecords(validFields, count.value)
}

const jsonOutput = computed(() =>
  records.value.length ? JSON.stringify(records.value, null, 2) : ''
)

async function copyJson() {
  if (!jsonOutput.value) {
    message.warning(page.t('messages.generateFirst'))
    return
  }
  await copy(jsonOutput.value, page.t('messages.copiedJson'))
}

function exportJson() {
  if (!jsonOutput.value) {
    message.warning(page.t('messages.generateFirst'))
    return
  }
  downloadTextFile(`mock-data-${records.value.length}.json`, jsonOutput.value, 'application/json;charset=utf-8')
  message.success(page.t('messages.exportedJson'))
}

function exportCsv() {
  if (!records.value.length) {
    message.warning(page.t('messages.generateFirst'))
    return
  }
  downloadTextFile(`mock-data-${records.value.length}.csv`, recordsToCsv(records.value), 'text/csv;charset=utf-8')
  message.success(page.t('messages.exportedCsv'))
}

function exportSql() {
  if (!records.value.length) {
    message.warning(page.t('messages.generateFirst'))
    return
  }
  const table = sanitizeSqlTableName(sqlTableName.value)
  const sql = recordsToSqlInsert(records.value, table)
  downloadTextFile(`mock-data-${records.value.length}.sql`, sql, 'text/plain;charset=utf-8')
  message.success(page.t('messages.exportedSql'))
}

const exportMenuOptions = computed<DropdownOption[]>(() => [
  { label: page.t('buttons.exportJson'), key: 'json' },
  { label: page.t('buttons.exportCsv'), key: 'csv' },
  { label: page.t('buttons.exportSql'), key: 'sql' }
])

function handleExportMenu(key: string) {
  switch (key) {
    case 'json': exportJson(); break
    case 'csv': exportCsv(); break
    case 'sql': exportSql(); break
  }
}

onMounted(() => {
  if (route.query.addField === 'uuid') {
    activePreset.value = null
    fields.value = [
      { name: 'id', type: 'uuid' },
      ...fields.value.filter(field => field.name !== 'id')
    ]
    const queryCount = route.query.count
    if (typeof queryCount === 'string') {
      const parsed = Number.parseInt(queryCount, 10)
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 100) {
        count.value = parsed
      }
    }
    message.info(page.t('messages.uuidFieldReady'))
  }

  if (route.query.fromConn === '1') {
    activePreset.value = null
    const connFields: MockField[] = [{ name: 'id', type: 'increment' }]
    if (typeof route.query.protocol === 'string' && route.query.protocol) {
      connFields.push({ name: 'protocol', type: 'text' })
    }
    if (typeof route.query.host === 'string' && route.query.host) {
      connFields.push({ name: 'host', type: 'ip' })
    }
    if (typeof route.query.port === 'string' && route.query.port) {
      connFields.push({ name: 'port', type: 'number' })
    }
    if (typeof route.query.database === 'string' && route.query.database) {
      connFields.push({ name: 'database', type: 'text' })
      sqlTableName.value = sanitizeSqlTableName(route.query.database)
    }
    if (typeof route.query.user === 'string' && route.query.user) {
      connFields.push({ name: 'user', type: 'name' })
    }
    fields.value = connFields
    message.info(page.t('messages.connFieldsReady'))
    generate()
  }
})

generate()
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="mock-data-view page-container--wide"
  >
    <template #actions>
      <NSelect
        :options="presetOptions"
        :placeholder="page.t('placeholders.preset')"
        clearable
        style="width: 160px"
        @update:value="applyPreset"
      />
      <div class="count-control">
        <span class="control-label">{{ page.t('labels.count') }}</span>
        <NInputNumber v-model:value="count" :min="1" :max="1000" />
      </div>
      <NButton type="primary" @click="generate">{{ page.t('buttons.generate') }}</NButton>
      <NButton @click="copyJson" :disabled="!records.length">{{ page.t('buttons.copyJson') }}</NButton>
      <NDropdown
        :options="exportMenuOptions"
        :disabled="!records.length"
        @select="handleExportMenu"
      >
        <NButton :disabled="!records.length">{{ page.t('buttons.exportMenu') }}</NButton>
      </NDropdown>
    </template>

    <NCard class="fields-card" :bordered="false">
      <template #header>
        <div class="fields-header">
          <span class="card-title">{{ page.t('labels.fieldConfig') }}</span>
          <NButton size="small" @click="addField">{{ page.t('buttons.addField') }}</NButton>
        </div>
      </template>
      <div class="fields-list">
        <div v-for="(field, index) in fields" :key="index" class="field-row">
          <NInput
            v-model:value="field.name"
            :placeholder="page.t('placeholders.fieldName')"
            class="field-name"
            @update:value="onFieldNameChange"
          />
          <NSelect
            v-model:value="field.type"
            :options="fieldTypeOptions"
            class="field-type"
            @update:value="onFieldTypeChange"
          />
          <NInput
            v-if="field.type === 'enum'"
            v-model:value="field.options"
            :placeholder="page.t('placeholders.enumOptions')"
            class="field-options"
            @update:value="onFieldNameChange"
          />
          <NButton quaternary type="error" @click="removeField(index)">{{ page.t('buttons.delete') }}</NButton>
        </div>
        <p v-if="fields.some(f => f.type === 'enum')" class="enum-hint">{{ page.t('hints.enumOptions') }}</p>
      </div>
      <div class="sql-export-config">
        <span class="control-label">{{ page.t('labels.tableName') }}</span>
        <NInput
          v-model:value="sqlTableName"
          :placeholder="page.t('placeholders.tableName')"
          class="table-name-input"
        />
      </div>
    </NCard>

    <NCard v-if="records.length" class="result-card" :bordered="false">
      <template #header>
        <div class="result-header">
          <span class="card-title">{{ page.t('labels.preview', { count: records.length }) }}</span>
          <div class="result-actions">
            <NButton size="small" @click="copyJson">{{ page.t('buttons.copyJson') }}</NButton>
            <NDropdown :options="exportMenuOptions" @select="handleExportMenu">
              <NButton size="small">{{ page.t('buttons.exportMenu') }}</NButton>
            </NDropdown>
          </div>
        </div>
      </template>
      <NDataTable
        :columns="columns"
        :data="records.slice(0, 20)"
        :bordered="false"
        size="small"
        :max-height="360"
        virtual-scroll
      />
      <p v-if="records.length > 20" class="preview-hint">{{ page.t('hints.previewLimit') }}</p>
    </NCard>
  </PageLayout>
</template>

<style scoped>
.mock-data-view {
  /* layout via page-container--wide */
}

.count-control {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.control-label {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.fields-card,
.result-card {
  background: var(--color-bg-primary);
  margin-bottom: var(--space-4);
}

.fields-header,
.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.fields-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.field-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  flex-wrap: wrap;
}

.field-name {
  flex: 1;
  max-width: 200px;
}

.field-type {
  width: 140px;
}

.field-options {
  flex: 1;
  min-width: 180px;
  max-width: 280px;
}

.enum-hint {
  margin: 0;
  font-size: var(--font-size-footnote);
  color: var(--color-text-tertiary);
}

.sql-export-config {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-secondary);
}

.table-name-input {
  max-width: 200px;
}

.preview-hint {
  margin: var(--space-3) 0 0;
  font-size: var(--font-size-footnote);
  color: var(--color-text-tertiary);
  text-align: center;
}
</style>

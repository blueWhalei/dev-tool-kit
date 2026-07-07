<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import { NInput, NButton, NSwitch, NCard, NSpin, NTag, NSelect, NInputNumber } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { formatRelativeRunTimeI18n } from '../utils/formatRelativeTime'
import { translateToolError } from '../utils/translateToolError'
import {
  getCronNextRuns,
  describeCronExpressionI18n,
  parseCronFields,
  buildCronExpression,
  createDefaultCronFields,
  getLocalTimezone,
  getTimezoneOptions,
  CRON_FIELD_DEFS,
  type CronRunPreview,
  type CronFieldKey,
  type CronFields,
  type CronFieldPatternType
} from '../utils/cron-schedule'

const { t } = useI18n()
const { copy } = useCopyToClipboard()
const page = useToolI18n('cronParser')

const cronExpression = ref('0 0 9 * * *')
const cronFields = ref<CronFields>(createDefaultCronFields(true))
const nextRuns = ref<CronRunPreview[]>([])
const parseError = ref('')
const parsing = ref(false)
const includeSeconds = ref(true)
const timezone = ref(getLocalTimezone())
const syncSource = ref<'text' | 'visual' | null>(null)

const presetOptions = computed(() => [
  { label: page.t('presets.everySecond'), value: '* * * * * *' },
  { label: page.t('presets.everyMinute'), value: '* * * * *' },
  { label: page.t('presets.everyHour'), value: '0 * * * * *' },
  { label: page.t('presets.dailyAt9'), value: '0 0 9 * * *' },
  { label: page.t('presets.dailyMidnight'), value: '0 0 0 * * *' },
  { label: page.t('presets.weeklyMonday'), value: '0 0 0 * * 1' },
  { label: page.t('presets.monthlyFirst'), value: '0 0 0 1 * *' },
  { label: page.t('presets.every5Minutes'), value: '*/5 * * * * *' }
])

const timezoneOptions = computed(() =>
  getTimezoneOptions(getLocalTimezone()).map((zone) => ({
    label: zone === getLocalTimezone() ? page.t('labels.localTimezone', { zone }) : zone,
    value: zone
  }))
)

const activeFieldKeys = computed<CronFieldKey[]>(() =>
  includeSeconds.value
    ? ['second', 'minute', 'hour', 'day', 'month', 'week']
    : ['minute', 'hour', 'day', 'month', 'week']
)

const patternTypeOptions = computed(() =>
  (['every', 'step', 'value', 'range', 'list', 'custom'] as CronFieldPatternType[]).map((type) => ({
    label: page.t(`patternTypes.${type}`),
    value: type
  }))
)

const formatHint = computed(() =>
  page.t('labels.format', {
    fields: includeSeconds.value
      ? page.t('labels.formatWithSeconds')
      : page.t('labels.formatWithoutSeconds')
  })
)

const description = computed(() =>
  describeCronExpressionI18n(cronExpression.value, includeSeconds.value, t)
)

const translatedParseError = computed(() =>
  translateToolError(t, 'cronParser', parseError.value) || parseError.value
)

function fieldLabel(key: CronFieldKey): string {
  return page.t(`fieldNames.${key}`)
}

function fieldRange(key: CronFieldKey): string {
  return page.t(`fieldRanges.${key}`)
}

function fieldDef(key: CronFieldKey) {
  return CRON_FIELD_DEFS[key]
}

function syncFieldsFromExpression(expression: string) {
  const parsed = parseCronFields(expression, includeSeconds.value)
  if (parsed) {
    cronFields.value = parsed
  }
}

function syncExpressionFromFields() {
  cronExpression.value = buildCronExpression(cronFields.value, includeSeconds.value)
}

function runRelative(run: CronRunPreview): string {
  return formatRelativeRunTimeI18n(new Date(run.timestamp), t)
}

async function parseCronNextRuns() {
  parsing.value = true
  try {
    const result = await getCronNextRuns(cronExpression.value, {
      count: 5,
      includeSeconds: includeSeconds.value,
      timezone: timezone.value
    })
    if ('error' in result) {
      parseError.value = result.error
      nextRuns.value = []
      return
    }
    parseError.value = ''
    nextRuns.value = result.runs
  } finally {
    parsing.value = false
  }
}

function applyPreset(value: string) {
  cronExpression.value = value
  includeSeconds.value = value.split(/\s+/).length === 6
}

function onFieldPatternChange(key: CronFieldKey, type: CronFieldPatternType) {
  const def = fieldDef(key)
  const field = cronFields.value[key]
  field.type = type
  if (type === 'every') {
    delete field.value
    delete field.start
    delete field.end
    delete field.step
    delete field.values
    delete field.raw
  } else if (type === 'step') {
    field.step = 5
    delete field.value
  } else if (type === 'value') {
    field.value = def.min
  } else if (type === 'range') {
    field.start = def.min
    field.end = def.max
  } else if (type === 'list') {
    field.values = [def.min]
  } else if (type === 'custom') {
    const token = cronExpression.value.trim().split(/\s+/)[activeFieldKeys.value.indexOf(key)]
    field.raw = token ?? '*'
  }
}

watch(cronExpression, (expression) => {
  if (syncSource.value === 'visual') return
  syncSource.value = 'text'
  syncFieldsFromExpression(expression)
  syncSource.value = null
})

watch(
  cronFields,
  () => {
    if (syncSource.value === 'text') return
    syncSource.value = 'visual'
    syncExpressionFromFields()
    syncSource.value = null
  },
  { deep: true }
)

watch(includeSeconds, () => {
  const parts = cronExpression.value.trim().split(/\s+/)
  if (includeSeconds.value && parts.length === 5) {
    cronExpression.value = `0 ${cronExpression.value}`
  } else if (!includeSeconds.value && parts.length === 6) {
    cronExpression.value = parts.slice(1).join(' ')
  }
  syncFieldsFromExpression(cronExpression.value)
})

watchDebounced(
  [cronExpression, includeSeconds, timezone],
  parseCronNextRuns,
  { debounce: 300, immediate: true }
)

async function copyResult() {
  if (nextRuns.value.length === 0) return
  const text = nextRuns.value
    .map(
      (run, index) =>
        `${page.t('labels.runIndex', { index: index + 1 })} ${run.absolute} (${runRelative(run)})`
    )
    .join('\n')
  await copy(text)
}
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="cron-parser-view"
  >
    <NCard
      class="cron-input-card"
      :bordered="true"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">{{ page.t('labels.expression') }}</span>
          <div class="seconds-toggle">
            <span class="toggle-label">{{ page.t('labels.includeSeconds') }}</span>
            <NSwitch v-model:value="includeSeconds" />
          </div>
        </div>
      </template>
      <NInput
        v-model:value="cronExpression"
        :placeholder="page.t('placeholders.expression')"
        class="cron-input"
      />
      <div class="expression-hint">
        <span>{{ formatHint }}</span>
      </div>
    </NCard>

    <NCard
      class="visual-editor-card"
      :bordered="true"
    >
      <template #header>
        <span class="card-title">{{ page.t('labels.visualEditor') }}</span>
      </template>
      <div class="field-editor-grid">
        <div
          v-for="key in activeFieldKeys"
          :key="key"
          class="field-editor-item"
        >
          <div class="field-editor-header">
            <span class="field-name">{{ fieldLabel(key) }}</span>
            <span class="field-range">{{ fieldRange(key) }}</span>
          </div>
          <NSelect
            :value="cronFields[key].type"
            :options="patternTypeOptions"
            size="small"
            @update:value="(type: CronFieldPatternType) => onFieldPatternChange(key, type)"
          />
          <div
            v-if="cronFields[key].type === 'step'"
            class="field-editor-inputs"
          >
            <NInputNumber
              v-model:value="cronFields[key].step"
              :min="1"
              :max="fieldDef(key).max"
              size="small"
              :placeholder="page.t('placeholders.step')"
            />
          </div>
          <div
            v-else-if="cronFields[key].type === 'value'"
            class="field-editor-inputs"
          >
            <NInputNumber
              v-model:value="cronFields[key].value"
              :min="fieldDef(key).min"
              :max="fieldDef(key).max"
              size="small"
            />
          </div>
          <div
            v-else-if="cronFields[key].type === 'range'"
            class="field-editor-inputs field-editor-inputs--inline"
          >
            <NInputNumber
              v-model:value="cronFields[key].start"
              :min="fieldDef(key).min"
              :max="fieldDef(key).max"
              size="small"
            />
            <span class="field-separator">-</span>
            <NInputNumber
              v-model:value="cronFields[key].end"
              :min="fieldDef(key).min"
              :max="fieldDef(key).max"
              size="small"
            />
          </div>
          <div
            v-else-if="cronFields[key].type === 'list'"
            class="field-editor-inputs"
          >
            <NInput
              :value="(cronFields[key].values ?? []).join(',')"
              size="small"
              :placeholder="page.t('placeholders.list')"
              @update:value="
                (val: string) => {
                  cronFields[key].values = val
                    .split(',')
                    .map((part) => Number(part.trim()))
                    .filter((num) => Number.isInteger(num))
                }
              "
            />
          </div>
          <div
            v-else-if="cronFields[key].type === 'custom'"
            class="field-editor-inputs"
          >
            <NInput
              v-model:value="cronFields[key].raw"
              size="small"
            />
          </div>
        </div>
      </div>
    </NCard>

    <NCard
      class="preset-card"
      :bordered="true"
    >
      <template #header>
        <span class="card-title">{{ page.t('labels.presets') }}</span>
      </template>
      <div class="preset-buttons">
        <NButton
          v-for="preset in presetOptions"
          :key="preset.value"
          size="small"
          @click="applyPreset(preset.value)"
        >
          {{ preset.label }}
        </NButton>
      </div>
    </NCard>

    <NCard
      class="result-card"
      :bordered="true"
    >
      <template #header>
        <span class="card-title">{{ page.t('labels.description') }}</span>
      </template>
      <div class="description-content">
        {{ description }}
      </div>
    </NCard>

    <NCard
      class="result-card"
      :bordered="true"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">{{ page.t('labels.nextRuns') }}</span>
          <NButton
            size="small"
            :disabled="!nextRuns.length"
            @click="copyResult"
          >
            {{ page.t('buttons.copy') }}
          </NButton>
        </div>
      </template>
      <div class="timezone-row">
        <span class="timezone-label">{{ page.t('labels.timezone') }}</span>
        <NSelect
          v-model:value="timezone"
          :options="timezoneOptions"
          size="small"
          class="timezone-select"
        />
      </div>
      <NSpin :show="parsing">
        <div
          v-if="parseError"
          class="error-text"
        >
          {{ translatedParseError }}
        </div>
        <div
          v-else
          class="runs-list"
        >
          <div
            v-for="(run, index) in nextRuns"
            :key="index"
            class="run-item"
          >
            <span class="run-index">{{ page.t('labels.runIndex', { index: index + 1 }) }}</span>
            <span class="run-absolute">{{ run.absolute }}</span>
            <NTag
              size="small"
              :bordered="false"
            >
              {{ runRelative(run) }}
            </NTag>
          </div>
        </div>
      </NSpin>
    </NCard>
  </PageLayout>
</template>

<style scoped>
.cron-parser-view {
  max-width: 720px;
  margin: 0 auto;
}

.cron-input-card,
.visual-editor-card,
.preset-card,
.result-card {
  margin-bottom: var(--space-lg);
  border-radius: var(--radius-lg);
}

.cron-input-card:last-child,
.visual-editor-card:last-child,
.preset-card:last-child,
.result-card:last-child {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.seconds-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.toggle-label {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.cron-input {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-body);
  margin-bottom: var(--space-md);
}

.expression-hint {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.field-editor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-3);
}

.field-editor-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.field-editor-header {
  display: flex;
  flex-direction: column;
}

.field-name {
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.field-range {
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
}

.field-editor-inputs {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.field-editor-inputs--inline {
  flex-direction: row;
  align-items: center;
}

.field-separator {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-footnote);
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.description-content {
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
  padding: var(--space-2) 0;
}

.timezone-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.timezone-label {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.timezone-select {
  flex: 1;
  max-width: 280px;
}

.runs-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.run-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
}

.run-index {
  color: var(--color-text-tertiary);
  min-width: 28px;
}

.run-absolute {
  flex: 1;
}

.error-text {
  color: var(--color-error);
  padding: var(--space-2) 0;
}
</style>

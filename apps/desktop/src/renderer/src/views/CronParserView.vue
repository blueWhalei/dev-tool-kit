<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import { NInput, NButton, NSwitch, NCard, NSpin, NTag } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { formatRelativeRunTimeI18n } from '../utils/formatRelativeTime'
import { translateToolError } from '../utils/translateToolError'
import {
  getCronNextRuns,
  describeCronExpressionI18n,
  type CronRunPreview
} from '../utils/cron-schedule'

const { t } = useI18n()
const { copy } = useCopyToClipboard()
const page = useToolI18n('cronParser')

const cronExpression = ref('0 0 9 * * *')
const nextRuns = ref<CronRunPreview[]>([])
const parseError = ref('')
const parsing = ref(false)
const includeSeconds = ref(true)

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

const fieldNames = computed(() => {
  if (includeSeconds.value) {
    return [
      page.t('fieldNames.second'),
      page.t('fieldNames.minute'),
      page.t('fieldNames.hour'),
      page.t('fieldNames.day'),
      page.t('fieldNames.month'),
      page.t('fieldNames.week')
    ]
  }
  return [
    page.t('fieldNames.minute'),
    page.t('fieldNames.hour'),
    page.t('fieldNames.day'),
    page.t('fieldNames.month'),
    page.t('fieldNames.week')
  ]
})

const fieldRanges = computed(() => {
  if (includeSeconds.value) {
    return [
      page.t('fieldRanges.second'),
      page.t('fieldRanges.minute'),
      page.t('fieldRanges.hour'),
      page.t('fieldRanges.day'),
      page.t('fieldRanges.month'),
      page.t('fieldRanges.week')
    ]
  }
  return [
    page.t('fieldRanges.minute'),
    page.t('fieldRanges.hour'),
    page.t('fieldRanges.day'),
    page.t('fieldRanges.month'),
    page.t('fieldRanges.week')
  ]
})

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

function runRelative(run: CronRunPreview): string {
  return formatRelativeRunTimeI18n(new Date(run.timestamp), t)
}

async function parseCronNextRuns() {
  parsing.value = true
  try {
    const result = await getCronNextRuns(cronExpression.value, {
      count: 5,
      includeSeconds: includeSeconds.value
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

watch(includeSeconds, () => {
  const parts = cronExpression.value.trim().split(/\s+/)
  if (includeSeconds.value && parts.length === 5) {
    cronExpression.value = `0 ${cronExpression.value}`
  } else if (!includeSeconds.value && parts.length === 6) {
    cronExpression.value = parts.slice(1).join(' ')
  }
})

watchDebounced([cronExpression, includeSeconds], parseCronNextRuns, { debounce: 300, immediate: true })

async function copyResult() {
  if (nextRuns.value.length === 0) return
  const text = nextRuns.value
    .map((run, index) => `${page.t('labels.runIndex', { index: index + 1 })} ${run.absolute} (${runRelative(run)})`)
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
    <NCard class="cron-input-card" :bordered="true">
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
      <div class="expression-fields">
        <div v-for="(name, index) in fieldNames" :key="index" class="field-item">
          <span class="field-name">{{ name }}</span>
          <span class="field-range">{{ fieldRanges[index] }}</span>
        </div>
      </div>
    </NCard>

    <NCard class="preset-card" :bordered="true">
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

    <NCard class="result-card" :bordered="true">
      <template #header>
        <span class="card-title">{{ page.t('labels.description') }}</span>
      </template>
      <div class="description-content">
        {{ description }}
      </div>
    </NCard>

    <NCard class="result-card" :bordered="true">
      <template #header>
        <div class="card-header">
          <span class="card-title">{{ page.t('labels.nextRuns') }}</span>
          <NButton size="small" :disabled="!nextRuns.length" @click="copyResult">{{ page.t('buttons.copy') }}</NButton>
        </div>
      </template>
      <NSpin :show="parsing">
        <div v-if="parseError" class="error-text">{{ translatedParseError }}</div>
        <div v-else class="runs-list">
          <div v-for="(run, index) in nextRuns" :key="index" class="run-item">
            <span class="run-index">{{ page.t('labels.runIndex', { index: index + 1 }) }}</span>
            <span class="run-absolute">{{ run.absolute }}</span>
            <NTag size="small" :bordered="false">{{ runRelative(run) }}</NTag>
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
.preset-card,
.result-card {
  margin-bottom: var(--space-lg);
  border-radius: var(--radius-lg);
}

.cron-input-card:last-child,
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
  margin-bottom: var(--space-3);
}

.expression-fields {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.field-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  min-width: 48px;
}

.field-name {
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.field-range {
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
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

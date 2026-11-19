<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { NAlert, NButton, NCard, NDataTable, NSpin, NTag, type DataTableColumns } from 'naive-ui'
import { JSON_DIFF_MAX_LENGTH, type JsonChange, type JsonDiffResult } from '@dev-tool-kit/shared'
import JsonDiffWorker from '../workers/json-diff?worker'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'

const props = defineProps<{ textA: string; textB: string }>()
const page = useToolI18n('textDiff')
const { copy } = useCopyToClipboard()
const result = shallowRef<JsonDiffResult | null>(null)
const busy = ref(false)
const workerFailed = ref(false)
let worker: Worker | undefined
let delay: ReturnType<typeof setTimeout> | undefined
let timeout: ReturnType<typeof setTimeout> | undefined

function cancel() {
  clearTimeout(delay)
  clearTimeout(timeout)
  worker?.terminate()
  worker = undefined
}

function compare() {
  try {
    const current = new JsonDiffWorker()
    worker = current
    const fail = () => {
      if (worker !== current) return
      cancel()
      busy.value = false
      workerFailed.value = true
    }
    current.onerror = fail
    current.onmessageerror = fail
    timeout = setTimeout(fail, 3000)
    current.onmessage = (event: MessageEvent<JsonDiffResult>) => {
      if (worker !== current) return
      result.value = event.data
      busy.value = false
      cancel()
    }
    current.postMessage({ textA: props.textA, textB: props.textB })
  } catch {
    cancel()
    busy.value = false
    workerFailed.value = true
  }
}

watch(
  () => [props.textA, props.textB],
  () => {
    cancel()
    result.value = null
    workerFailed.value = false
    busy.value = false
    // Check before postMessage: cloning an oversized input would block the renderer.
    const oversizedSide =
      props.textA.length > JSON_DIFF_MAX_LENGTH
        ? 'A'
        : props.textB.length > JSON_DIFF_MAX_LENGTH
          ? 'B'
          : undefined
    if (oversizedSide) {
      result.value = { success: false, error: 'size', side: oversizedSide }
      return
    }
    busy.value = Boolean(props.textA || props.textB)
    if (busy.value) delay = setTimeout(compare, 300)
  },
  { immediate: true, flush: 'sync' }
)
onBeforeUnmount(cancel)

const changes = computed(() => (result.value?.success ? result.value.changes : []))
const counts = computed(() =>
  changes.value.reduce(
    (total, change) => {
      total[change.kind]++
      return total
    },
    { added: 0, removed: 0, changed: 0 }
  )
)
const shortened = computed(() =>
  changes.value.some(
    row =>
      row.path.length > 300 || (row.before?.length ?? 0) > 300 || (row.after?.length ?? 0) > 300
  )
)
function preview(value: string | undefined): string {
  if (value === undefined) return '—'
  return value.length > 300 ? value.slice(0, 300) + '…' : value
}
const columns = computed<DataTableColumns<JsonChange>>(() => [
  { title: page.t('json.kind'), key: 'kind', width: 95, render: row => page.t('json.' + row.kind) },
  { title: page.t('json.path'), key: 'path', minWidth: 160, render: row => preview(row.path) },
  {
    title: page.t('labels.textA'),
    key: 'before',
    minWidth: 180,
    render: row => preview(row.before)
  },
  { title: page.t('labels.textB'), key: 'after', minWidth: 180, render: row => preview(row.after) }
])
const error = computed(() => {
  if (workerFailed.value) return page.t('json.workerFailed')
  if (!result.value || result.value.success) return ''
  const side = result.value.side === 'both' ? '' : page.t('labels.text' + result.value.side) + ' · '
  return side + page.t('json.errors.' + result.value.error)
})
function copyResult() {
  if (result.value?.success)
    void copy(JSON.stringify(result.value.changes, null, 2), page.t('messages.copied'))
}
</script>

<template>
  <div class="json-diff-panel" :aria-busy="busy">
    <p class="json-hint">{{ page.t('json.hint') }}</p>
    <NSpin :show="busy">
      <NAlert v-if="error" type="error" role="alert">{{ error }}</NAlert>
      <NCard v-else-if="result?.success" :bordered="false">
        <template #header>
          <div class="json-summary">
            <span>{{ page.t('labels.result') }}</span>
            <NTag type="success" size="small">{{
              page.t('json.addedCount', { count: counts.added })
            }}</NTag>
            <NTag type="error" size="small">{{
              page.t('json.removedCount', { count: counts.removed })
            }}</NTag>
            <NTag type="warning" size="small">{{
              page.t('json.changedCount', { count: counts.changed })
            }}</NTag>
            <NButton size="small" @click="copyResult">{{ page.t('buttons.copyResult') }}</NButton>
          </div>
        </template>
        <p v-if="shortened" class="json-hint">{{ page.t('json.truncated') }}</p>
        <NDataTable
          v-if="changes.length"
          class="json-changes"
          :columns="columns"
          :data="changes"
          :row-key="(row: JsonChange) => row.path"
          :pagination="{ pageSize: 20 }"
          :scroll-x="640"
        />
        <NAlert v-else type="success">{{ page.t('json.equal') }}</NAlert>
      </NCard>
      <p v-else>{{ busy ? page.t('json.comparing') : page.t('json.empty') }}</p>
    </NSpin>
  </div>
</template>

<style scoped>
.json-diff-panel {
  margin-top: 24px;
}
.json-hint {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.json-summary {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.json-changes :deep(td) {
  font-family: var(--font-family-mono);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  vertical-align: top;
}
</style>

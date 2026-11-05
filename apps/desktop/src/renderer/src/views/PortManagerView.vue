<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NDataTable,
  NButton,
  NTag,
  NInput,
  NPopconfirm,
  useMessage,
  useDialog,
  NEmpty,
  NSpin,
  NButtonGroup,
  NCard,
  NAlert
} from 'naive-ui'
import PortDiagnosisPanel from '../components/PortDiagnosisPanel.vue'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useIpc } from '../composables/useIpc'
import { usePlatform } from '../composables/usePlatform'
import { useKeyboardShortcut } from '../composables/useKeyboardShortcut'
import { logError } from '../utils/error-handler'
import { PLATFORM_LABELS, type OperationResult, type PlatformId } from '@dev-tool-kit/shared'
import {
  type PortInfo,
  type CommonPort,
  isPortInfoArray,
  isCommonPortArray,
  isOperationResult,
  validateArray,
  validateOptional
} from '../utils/type-guards'

const message = useMessage()
const dialog = useDialog()
const route = useRoute()
const { t } = useI18n()
const page = useToolI18n('portManager')
const { invoke } = useIpc()
const { platform, loadPlatform, isWindows } = usePlatform()
const ports = ref<PortInfo[]>([])
const commonPorts = ref<CommonPort[]>([])
const loading = ref(false)
const scanFailed = ref(false)
let newestScan = 0
const search = ref('')
const processFilter = ref('')
const pidFilter = ref('')
const addressFilter = ref('')
const stateFilter = ref<'all' | 'LISTENING' | 'ESTABLISHED'>('all')

const diagnosing = ref(false)
const quickScanMode = ref<'all' | 'common'>('all')

const filteredPorts = computed(() => {
  let list = ports.value
  if (stateFilter.value !== 'all') {
    list = list.filter(p => p.state === stateFilter.value)
  }
  if (search.value) {
    const keyword = search.value.toLowerCase()
    list = list.filter(p => p.port.toString().includes(keyword))
  }
  if (processFilter.value) {
    const keyword = processFilter.value.toLowerCase()
    list = list.filter(
      p =>
        (p.service && p.service.toLowerCase().includes(keyword)) ||
        p.pid.toString().includes(keyword)
    )
  }
  if (pidFilter.value) {
    const keyword = pidFilter.value.trim()
    list = list.filter(p => p.pid.toString().includes(keyword))
  }
  if (addressFilter.value) {
    const keyword = addressFilter.value.trim().toLowerCase()
    list = list.filter(p => p.localAddress?.toLowerCase().includes(keyword))
  }
  return list
})

const portStats = computed(() => ({
  total: ports.value.length,
  listening: ports.value.filter(p => p.state === 'LISTENING').length,
  established: ports.value.filter(p => p.state === 'ESTABLISHED').length
}))

const platformHint = computed(() => {
  if (!platform.value || isWindows()) return ''
  const label = PLATFORM_LABELS[platform.value as PlatformId] ?? platform.value
  return page.t('hints.unixKillHint', { platform: label })
})

function translateKillError(result: OperationResult, pid: number): string {
  if (result.errorCode) {
    const key = `errors.${result.errorCode}`
    const translated = page.t(key, { pid })
    if (translated !== key) return translated
  }
  return result.error || page.t('errors.killFailed')
}

function showKillFailure(pid: number, result: OperationResult) {
  if (result.errorCode === 'process_not_found') {
    message.warning(translateKillError(result, pid))
    return
  }

  if (result.errorCode === 'protected_pid') {
    dialog.warning({
      title: page.t('dialogs.killFailedTitle'),
      content: page.t('dialogs.protectedPidContent', { pid }),
      positiveText: page.t('buttons.confirm'),
      negativeText: t('common.cancel')
    })
    return
  }

  message.error(translateKillError(result, pid))
}

const columns = computed(() => [
  {
    title: page.t('columns.port'),
    key: 'port',
    width: 90,
    sorter: (a: PortInfo, b: PortInfo) => a.port - b.port
  },
  {
    title: page.t('columns.service'),
    key: 'service',
    width: 120,
    ellipsis: { tooltip: true }
  },
  {
    title: page.t('columns.pid'),
    key: 'pid',
    width: 80,
    sorter: (a: PortInfo, b: PortInfo) => a.pid - b.pid
  },
  {
    title: page.t('columns.localAddress'),
    key: 'localAddress',
    width: 150,
    ellipsis: { tooltip: true }
  },
  {
    title: page.t('columns.protocol'),
    key: 'protocol',
    width: 70
  },
  {
    title: page.t('columns.state'),
    key: 'state',
    width: 100,
    render: (row: PortInfo) => {
      const type =
        row.state === 'LISTENING' ? 'success' : row.state === 'ESTABLISHED' ? 'warning' : 'default'
      return h(NTag, { type, size: 'small', round: true }, { default: () => row.state })
    }
  },
  {
    title: page.t('columns.actions'),
    key: 'actions',
    width: 80,
    render: (row: PortInfo) => {
      const confirmKey = isWindows() ? 'messages.killConfirm' : 'messages.killConfirmUnix'
      return h(
        NPopconfirm,
        { onPositiveClick: () => handleKillProcess(row) },
        {
          trigger: () =>
            h(
              NButton,
              {
                size: 'small',
                quaternary: true,
                type: 'error',
                disabled: row.state !== 'LISTENING' || !row.instanceId
              },
              { default: () => page.t('buttons.kill') }
            ),
          default: () =>
            page.t(confirmKey, {
              pid: row.pid,
              name: row.service,
              port: row.port,
              address: row.localAddress
            })
        }
      )
    }
  }
])

async function fetchCommonPorts() {
  try {
    const data = await invoke('port-manager:getCommonPorts')
    commonPorts.value = validateArray(data, isCommonPortArray, 'fetchCommonPorts')
  } catch (error) {
    logError('PortManager:getCommonPorts', error)
  }
}

async function fetchPorts(mode: 'all' | 'common' = 'all') {
  const current = ++newestScan
  loading.value = true
  scanFailed.value = false
  try {
    let data
    if (mode === 'common') {
      data = await invoke('port-manager:scanCommonPorts')
    } else {
      data = await invoke('port-manager:getPorts')
    }
    if (current !== newestScan) return
    if (!isPortInfoArray(data)) throw new Error('Invalid port snapshot')
    ports.value = data
  } catch (error) {
    if (current !== newestScan) return
    scanFailed.value = true
    ports.value = []
    message.error(page.t('errors.fetchFailed'))
    logError('PortManager:fetchPorts', error)
  } finally {
    if (current === newestScan) {
      loading.value = false
      quickScanMode.value = mode
    }
  }
}

function showPortList(mode: 'all' | 'common') {
  diagnosing.value = false
  void fetchPorts(mode)
}

async function handleKillProcess(row: PortInfo) {
  const { port, pid, localAddress, instanceId } = row
  if (!instanceId) return
  try {
    const data = await invoke('port-manager:killProcess', { port, pid, localAddress, instanceId })
    const result = validateOptional(data, isOperationResult, 'handleKillProcess')
    if (result?.success) {
      message.success(page.t('messages.processKilled', { pid }))
      await fetchPorts(quickScanMode.value)
    } else if (result) {
      showKillFailure(pid, result)
    } else {
      message.error(page.t('errors.killFailed'))
    }
  } catch (error) {
    message.error(page.t('errors.killFailed'))
    logError('PortManager:killProcess', error)
  }
}

function clearSearch() {
  search.value = ''
  processFilter.value = ''
  pidFilter.value = ''
  addressFilter.value = ''
}

function applyRouteFilters() {
  const portQuery = route.query.port
  const addressQuery = route.query.address
  if (typeof portQuery === 'string' && portQuery.trim()) {
    search.value = portQuery.trim()
  }
  if (typeof addressQuery === 'string' && addressQuery.trim()) {
    addressFilter.value = addressQuery.trim()
  }
}

onMounted(async () => {
  applyRouteFilters()
  await loadPlatform()
  await fetchCommonPorts()
  await fetchPorts('all')
})

useKeyboardShortcut(event => {
  const tag = (event.target as HTMLElement)?.tagName
  if (diagnosing.value || tag === 'INPUT' || tag === 'TEXTAREA') return
  if (event.key === 'r' || event.key === 'R') {
    event.preventDefault()
    void fetchPorts(quickScanMode.value)
  }
})
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="port-manager-view page-container--wide"
  >
    <template #actions>
      <NButtonGroup>
        <NButton
          :type="!diagnosing && quickScanMode === 'all' ? 'primary' : 'default'"
          :loading="loading && quickScanMode === 'all'"
          @click="showPortList('all')"
        >
          {{ page.t('buttons.scanAll') }}
        </NButton>
        <NButton
          :type="!diagnosing && quickScanMode === 'common' ? 'primary' : 'default'"
          :loading="loading && quickScanMode === 'common'"
          @click="showPortList('common')"
        >
          {{ page.t('buttons.scanCommon') }}
        </NButton>
        <NButton :type="diagnosing ? 'primary' : 'default'" @click="diagnosing = true">{{
          page.t('diagnosis.title')
        }}</NButton>
      </NButtonGroup>
    </template>

    <PortDiagnosisPanel v-if="diagnosing" :is-windows="isWindows()" @failed="showKillFailure" />
    <template v-else>
      <div class="page-toolbar port-toolbar">
        <NInput
          v-model:value="search"
          :placeholder="page.t('placeholders.searchPort')"
          style="width: 140px"
          clearable
        />
        <NInput
          v-model:value="processFilter"
          :placeholder="page.t('placeholders.searchProcess')"
          style="width: 160px"
          clearable
        />
        <NInput
          v-model:value="pidFilter"
          :placeholder="page.t('placeholders.searchPid')"
          style="width: 120px"
          clearable
        />
        <NInput
          v-model:value="addressFilter"
          :placeholder="page.t('placeholders.searchAddress')"
          style="width: 160px"
          clearable
        />
        <NButton quaternary @click="clearSearch">
          {{ t('common.clear') }}
        </NButton>
      </div>

      <NAlert
        v-if="platform && !isWindows()"
        type="info"
        :title="page.t('hints.partialSupportTitle')"
        :bordered="false"
        style="margin-bottom: 16px; border-radius: 8px"
      >
        {{ platformHint }}
      </NAlert>

      <div class="port-filter-bar">
        <div class="port-stats">
          <NTag size="small" :bordered="false">
            {{ page.t('stats.total', { count: portStats.total }) }}
          </NTag>
          <NTag size="small" type="success" :bordered="false">
            {{ page.t('stats.listening', { count: portStats.listening }) }}
          </NTag>
          <NTag size="small" type="warning" :bordered="false">
            {{ page.t('stats.established', { count: portStats.established }) }}
          </NTag>
        </div>
        <NButtonGroup size="small" class="state-filter">
          <NButton
            :type="stateFilter === 'all' ? 'primary' : 'default'"
            @click="stateFilter = 'all'"
          >
            {{ page.t('filters.allWithCount', { count: portStats.total }) }}
          </NButton>
          <NButton
            :type="stateFilter === 'LISTENING' ? 'primary' : 'default'"
            @click="stateFilter = 'LISTENING'"
          >
            {{ page.t('filters.listeningWithCount', { count: portStats.listening }) }}
          </NButton>
          <NButton
            :type="stateFilter === 'ESTABLISHED' ? 'primary' : 'default'"
            @click="stateFilter = 'ESTABLISHED'"
          >
            {{ page.t('filters.establishedWithCount', { count: portStats.established }) }}
          </NButton>
        </NButtonGroup>
      </div>

      <NCard class="content-card" :bordered="false">
        <NSpin :show="loading && ports.length === 0">
          <NDataTable
            v-if="filteredPorts.length > 0"
            :columns="columns"
            :data="filteredPorts"
            :loading="loading"
            :pagination="{ pageSize: 10 }"
            :bordered="false"
            striped
            :row-key="
              (row: PortInfo) =>
                [row.protocol, row.localAddress, row.port, row.pid, row.instanceId].join('/')
            "
            class="port-table"
          />
          <NAlert v-else-if="scanFailed" type="error">{{ page.t('errors.fetchFailed') }}</NAlert>
          <NEmpty v-else-if="!loading" :description="page.t('empty')" />
        </NSpin>
      </NCard>
    </template>
  </PageLayout>
</template>

<style scoped>
.port-manager-view {
  /* layout via page-container--wide */
}

.content-card {
  background: var(--color-bg-primary);
  margin-top: 12px;
}

.port-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.state-filter {
  margin-left: auto;
}

.port-table :deep(.n-data-table-th) {
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}
</style>

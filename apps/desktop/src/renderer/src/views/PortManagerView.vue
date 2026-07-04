<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { NDataTable, NButton, NSpace, NTag, NInput, NPopconfirm, useMessage, NEmpty, NSpin, NButtonGroup, NCard, NAlert } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useIpc } from '../composables/useIpc'
import { usePlatform } from '../composables/usePlatform'
import { useKeyboardShortcut } from '../composables/useKeyboardShortcut'
import { logError } from '../utils/error-handler'
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
const page = useToolI18n('portManager')
const { invoke } = useIpc()
const { platform, loadPlatform, isWindows } = usePlatform()
const ports = ref<PortInfo[]>([])
const commonPorts = ref<CommonPort[]>([])
const loading = ref(false)
const search = ref('')
const stateFilter = ref<'all' | 'LISTENING' | 'ESTABLISHED'>('all')

const quickScanMode = ref<'all' | 'common'>('all')
const quickScanLoading = ref(false)

const filteredPorts = computed(() => {
  let list = ports.value
  if (stateFilter.value !== 'all') {
    list = list.filter(p => p.state === stateFilter.value)
  }
  if (!search.value) return list
  const keyword = search.value.toLowerCase()
  return list.filter(p =>
    p.port.toString().includes(keyword) ||
    p.pid.toString().includes(keyword) ||
    p.state.toLowerCase().includes(keyword) ||
    (p.service && p.service.toLowerCase().includes(keyword))
  )
})

const portStats = computed(() => ({
  total: ports.value.length,
  listening: ports.value.filter(p => p.state === 'LISTENING').length,
  established: ports.value.filter(p => p.state === 'ESTABLISHED').length
}))

const platformHint = computed(() => {
  if (!platform.value) return ''
  if (platform.value === 'darwin' || platform.value === 'linux') {
    return page.t('hints.unixKillHint', { platform: platform.value })
  }
  return ''
})

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
      const type = row.state === 'LISTENING' ? 'success' : row.state === 'ESTABLISHED' ? 'warning' : 'default'
      return h(NTag, { type, size: 'small', round: true }, { default: () => row.state })
    }
  },
  {
    title: page.t('columns.actions'),
    key: 'actions',
    width: 80,
    render: (row: PortInfo) => {
      return h(NPopconfirm, { onPositiveClick: () => handleKillProcess(row.pid) }, {
        trigger: () => h(NButton, {
          size: 'small',
          quaternary: true,
          type: 'error',
          disabled: row.state !== 'LISTENING'
        }, { default: () => page.t('buttons.kill') }),
        default: () => page.t('messages.killConfirm', { pid: row.pid })
      })
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
  loading.value = true
  try {
    let data
    if (mode === 'common') {
      data = await invoke('port-manager:scanCommonPorts')
    } else {
      data = await invoke('port-manager:getPorts')
    }
    ports.value = validateArray(data, isPortInfoArray, 'fetchPorts')
  } catch (error) {
    message.error(page.t('errors.fetchFailed'))
    logError('PortManager:fetchPorts', error)
  } finally {
    loading.value = false
    quickScanMode.value = mode
  }
}

async function handleKillProcess(pid: number) {
  try {
    const data = await invoke('port-manager:killProcess', pid)
    const result = validateOptional(data, isOperationResult, 'handleKillProcess')
    if (result?.success) {
      message.success(page.t('messages.processKilled', { pid }))
      await fetchPorts(quickScanMode.value)
    } else if (result?.needSudo) {
      message.warning(page.t('errors.needSudo', { pid }), { duration: 5000 })
    } else {
      message.error(result?.error || page.t('errors.killFailed'))
    }
  } catch (error) {
    message.error(page.t('errors.killFailed'))
    logError('PortManager:killProcess', error)
  }
}

function handleQuickScan(port: CommonPort) {
  search.value = port.port.toString()
}

function clearSearch() {
  search.value = ''
}

onMounted(async () => {
  await loadPlatform()
  await fetchCommonPorts()
  await fetchPorts('all')
})

useKeyboardShortcut((event) => {
  const tag = (event.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
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
    container-class="port-manager-view"
  >
    <template #actions>
      <NInput
        v-model:value="search"
        :placeholder="page.t('placeholders.search')"
        style="width: 220px"
        clearable
        @clear="clearSearch"
      >
        <template #prefix>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M11 11L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </template>
      </NInput>
      <NButtonGroup>
        <NButton :type="quickScanMode === 'all' ? 'primary' : 'default'" @click="fetchPorts('all')" :loading="loading && quickScanMode === 'all'">
          {{ page.t('buttons.scanAll') }}
        </NButton>
        <NButton :type="quickScanMode === 'common' ? 'primary' : 'default'" @click="fetchPorts('common')" :loading="loading && quickScanMode === 'common'">
          {{ page.t('buttons.scanCommon') }}
        </NButton>
      </NButtonGroup>
    </template>

    <NAlert
      v-if="platform && !isWindows()"
      type="warning"
      :bordered="false"
      style="margin-bottom: 16px; border-radius: 8px;"
    >
      {{ platformHint }}
    </NAlert>

    <div class="port-stats">
      <NTag size="small" :bordered="false">{{ page.t('stats.total', { count: portStats.total }) }}</NTag>
      <NTag size="small" type="success" :bordered="false">{{ page.t('stats.listening', { count: portStats.listening }) }}</NTag>
      <NTag size="small" type="warning" :bordered="false">{{ page.t('stats.established', { count: portStats.established }) }}</NTag>
    </div>

    <NButtonGroup size="small" class="state-filter">
      <NButton :type="stateFilter === 'all' ? 'primary' : 'default'" @click="stateFilter = 'all'">
        {{ page.t('filters.allWithCount', { count: portStats.total }) }}
      </NButton>
      <NButton :type="stateFilter === 'LISTENING' ? 'primary' : 'default'" @click="stateFilter = 'LISTENING'">
        {{ page.t('filters.listeningWithCount', { count: portStats.listening }) }}
      </NButton>
      <NButton :type="stateFilter === 'ESTABLISHED' ? 'primary' : 'default'" @click="stateFilter = 'ESTABLISHED'">
        {{ page.t('filters.establishedWithCount', { count: portStats.established }) }}
      </NButton>
    </NButtonGroup>

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
          :row-key="(row: PortInfo) => `${row.port}-${row.pid}`"
          class="port-table"
        />
        <NEmpty v-else-if="!loading" :description="page.t('empty')" />
      </NSpin>
    </NCard>
  </PageLayout>
</template>

<style scoped>
.port-manager-view {
  max-width: 1200px;
  margin: 0 auto;
}

.content-card {
  background: var(--color-bg-primary);
  margin-top: 12px;
}

.port-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.state-filter {
  margin-bottom: 4px;
}

.port-table :deep(.n-data-table-th) {
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}
</style>

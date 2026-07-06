<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  NDataTable, NButton, NSpace, NInput, NModal, NForm, 
  NFormItem, NPopconfirm, useMessage, useDialog, NSwitch, NEmpty,
  NAlert, NTabs, NTabPane, NList, NListItem, NThing, NTag, NSelect
} from 'naive-ui'
import { useIpc } from '../composables/useIpc'
import { usePlatform } from '../composables/usePlatform'
import { logError } from '../utils/error-handler'
import { translateToolError } from '../utils/translateToolError'
import {
  diffHostsEntries,
  summarizeHostsDiff,
  type HostsScheme,
  type HostsEntryChange
} from '@dev-tool-kit/shared'
import {
  type HostsEntry,
  type HostsGroup,
  type SchemeInfo,
  isHostsEntryArray,
  isHostsGroupArray,
  isSchemeInfoArray,
  isOperationResult,
  validateArray,
  validateOptional
} from '../utils/type-guards'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'

const message = useMessage()
const { t } = useI18n()
const page = useToolI18n('hostsEditor')
const dialog = useDialog()
const { invoke } = useIpc()
const { platform, loadPlatform } = usePlatform()
const entries = ref<HostsEntry[]>([])
const groups = ref<HostsGroup[]>([])
const schemes = ref<SchemeInfo[]>([])
const loading = ref(false)
const search = ref('')
const showEditModal = ref(false)
const editingEntry = ref<HostsEntry | null>(null)
const isNewEntry = ref(false)
const activeTab = ref('entries')
const schemeInput = ref('')
const importInputRef = ref<HTMLInputElement | null>(null)
const showDiffModal = ref(false)
const pendingScheme = ref<HostsScheme | null>(null)
const schemeDiff = ref<HostsEntryChange[]>([])

const adminHint = computed(() => {
  const suffix = platform.value
    ? page.t('hints.platformSuffix', { platform: platform.value })
    : ''
  return page.t('hints.adminRequired', { platformSuffix: suffix })
})

const filteredEntries = computed(() => {
  if (!search.value) return entries.value
  const keyword = search.value.toLowerCase()
  return entries.value.filter(e => 
    e.ip.includes(keyword) ||
    e.hostname.toLowerCase().includes(keyword) ||
    (e.comment && e.comment.toLowerCase().includes(keyword)) ||
    (e.group && e.group.toLowerCase().includes(keyword))
  )
})

const groupOptions = computed(() => [
  { label: page.t('labels.noGroup'), value: undefined },
  ...groups.value.map(g => ({ label: g.name, value: g.id }))
])

const entriesByGroup = computed(() => {
  const result: Record<string, HostsEntry[]> = { ungrouped: [] }
  for (const g of groups.value) {
    result[g.id] = []
  }
  for (const e of filteredEntries.value) {
    if (e.group && result[e.group]) {
      result[e.group].push(e)
    } else {
      result.ungrouped.push(e)
    }
  }
  return result
})

const columns = computed(() => [
  { title: page.t('columns.status'), key: 'enabled', width: 60, render: (row: HostsEntry) => h(NSwitch, { value: row.enabled, size: 'small', onUpdateValue: () => confirmToggle(row) }) },
  { title: page.t('columns.group'), key: 'group', width: 100, render: (row: HostsEntry) => {
    const g = groups.value.find(g => g.id === row.group)
    return g ? h(NTag, { size: 'small', color: { color: g.color + '20', textColor: g.color } }, { default: () => g.name }) : h('span', { style: 'color: var(--color-text-tertiary)' }, '—')
  }},
  { title: page.t('columns.ip'), key: 'ip', width: 140, ellipsis: { tooltip: true } },
  { title: page.t('columns.hostname'), key: 'hostname', ellipsis: { tooltip: true } },
  { title: page.t('columns.comment'), key: 'comment', ellipsis: { tooltip: true } },
  { title: '', key: 'actions', width: 100, render: (row: HostsEntry) => {
    return h(NSpace, { size: 'small', noWrap: true }, {
      default: () => [
        h(NButton, { size: 'small', quaternary: true, onClick: () => openEditModal(row) }, { default: () => page.t('buttons.edit') }),
        h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, { trigger: () => h(NButton, { size: 'small', quaternary: true, type: 'error' }, { default: () => page.t('buttons.delete') }) })
      ]
    })
  }}
])

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString(page.locale.value)
}

function translateError(error: string | undefined, fallbackKey: string): string {
  return translateToolError(t, 'hostsEditor', error) || page.t(fallbackKey)
}

function diffTypeLabel(type: HostsEntryChange['type']): string {
  if (type === 'added') return page.t('diff.added')
  if (type === 'removed') return page.t('diff.removed')
  return page.t('diff.modified')
}

async function fetchEntries() {
  loading.value = true
  try {
    const data = await invoke('hosts:getAll')
    entries.value = validateArray(data, isHostsEntryArray, 'fetchEntries')
  } catch {
    message.error(page.t('errors.fetchFailed'))
  } finally {
    loading.value = false
  }
}

async function fetchGroups() {
  try {
    const data = await invoke('hosts:getGroups')
    groups.value = validateArray(data, isHostsGroupArray, 'fetchGroups')
  } catch (error) {
    logError('Hosts:getGroups', error)
  }
}

async function fetchSchemes() {
  try {
    const data = await invoke('hosts:listSchemes')
    schemes.value = validateArray(data, isSchemeInfoArray, 'fetchSchemes')
  } catch (error) {
    logError('Hosts:listSchemes', error)
  }
}

function openEditModal(entry?: HostsEntry) {
  if (entry) {
    editingEntry.value = { ...entry }
    isNewEntry.value = false
  } else {
    editingEntry.value = { id: '', ip: '', hostname: '', enabled: true, group: undefined }
    isNewEntry.value = true
  }
  showEditModal.value = true
}

async function handleSave() {
  if (!editingEntry.value?.ip || !editingEntry.value?.hostname) {
    message.warning(page.t('messages.ipHostnameRequired'))
    return
  }
  try {
    const payload = { ip: editingEntry.value.ip, hostname: editingEntry.value.hostname, comment: editingEntry.value.comment, enabled: editingEntry.value.enabled, group: editingEntry.value.group }
    let data: unknown
    if (isNewEntry.value) {
      data = await invoke('hosts:add', payload)
    } else {
      data = await invoke('hosts:update', editingEntry.value.id, payload)
    }
    const result = validateOptional(data, isOperationResult, 'handleSave')
    if (result?.success) {
      message.success(isNewEntry.value ? page.t('messages.added') : page.t('messages.saved'))
      showEditModal.value = false
      await fetchEntries()
    } else {
      message.error(translateError(result?.error, 'errors.operationFailed'))
    }
  } catch {
    message.error(page.t('errors.operationFailed'))
  }
}

function confirmToggle(entry: HostsEntry) {
  dialog.info({
    title: entry.enabled ? page.t('dialogs.disableTitle') : page.t('dialogs.enableTitle'),
    content: page.t('dialogs.toggleContent', {
      action: entry.enabled ? page.t('dialogs.disable') : page.t('dialogs.enable'),
      hostname: entry.hostname
    }),
    positiveText: page.t('buttons.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => handleToggle(entry.id)
  })
}

async function handleToggle(id: string) {
  try {
    const data = await invoke('hosts:toggle', id)
    const result = validateOptional(data, isOperationResult, 'handleToggle')
    if (result?.success) {
      message.success(page.t('messages.statusUpdated'))
      await fetchEntries()
    }
  } catch {
    message.error(page.t('errors.updateFailed'))
  }
}

async function handleDelete(id: string) {
  try {
    const data = await invoke('hosts:delete', id)
    const result = validateOptional(data, isOperationResult, 'handleDelete')
    if (result?.success) {
      message.success(page.t('messages.deleted'))
      await fetchEntries()
    }
  } catch {
    message.error(page.t('errors.deleteFailed'))
  }
}

async function handleSaveScheme() {
  if (!schemeInput.value.trim()) {
    message.warning(page.t('messages.schemeNameRequired'))
    return
  }
  try {
    const data = await invoke('hosts:saveScheme', schemeInput.value)
    const result = validateOptional(data, isOperationResult, 'handleSaveScheme')
    if (result?.success) {
      message.success(page.t('messages.schemeSaved'))
      schemeInput.value = ''
      await fetchSchemes()
    } else {
      message.error(translateError(result?.error, 'errors.saveFailed'))
    }
  } catch {
    message.error(page.t('errors.saveFailed'))
  }
}

const diffSummary = computed(() => summarizeHostsDiff(schemeDiff.value))
const visibleDiffChanges = computed(() => schemeDiff.value.filter(change => change.type !== 'unchanged'))

function confirmLoadScheme(scheme: { id: string; name: string }) {
  void previewSchemeDiff(scheme.id)
}

async function previewSchemeDiff(id: string) {
  try {
    const data = await invoke<HostsScheme | null>('hosts:getScheme', id)
    if (!data || !Array.isArray(data.entries)) {
      message.error(page.t('errors.readSchemeFailed'))
      return
    }
    pendingScheme.value = data
    schemeDiff.value = diffHostsEntries(entries.value, data.entries)
    showDiffModal.value = true
  } catch (error) {
    message.error(page.t('errors.loadSchemeFailed'))
    logError('Hosts:previewSchemeDiff', error)
  }
}

async function confirmApplyScheme() {
  if (!pendingScheme.value) return
  showDiffModal.value = false
  await handleLoadScheme(pendingScheme.value.id)
  pendingScheme.value = null
  schemeDiff.value = []
}

async function handleExportSchemes() {
  try {
    const data = await invoke<HostsScheme[]>('hosts:exportSchemes')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hosts-schemes-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    message.success(page.t('messages.schemeExported'))
  } catch (error) {
    message.error(page.t('errors.exportFailed'))
    logError('Hosts:exportSchemes', error)
  }
}

function triggerImportSchemes() {
  importInputRef.value?.click()
}

async function handleImportSchemes(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const text = await file.text()
    const payload = JSON.parse(text)
    const data = await invoke('hosts:importSchemes', payload, 'merge')
    const result = validateOptional(data, isOperationResult, 'handleImportSchemes')
    if (result?.success) {
      message.success(page.t('messages.schemeImported'))
      await fetchSchemes()
    } else {
      message.error(translateError(result?.error, 'errors.importFailed'))
    }
  } catch (error) {
    message.error(page.t('errors.readFileFailed'))
    logError('Hosts:importSchemes', error)
  }
}

function confirmDeleteScheme(scheme: { id: string; name: string }) {
  dialog.warning({
    title: page.t('dialogs.deleteSchemeTitle'),
    content: page.t('dialogs.deleteSchemeContent', { name: scheme.name }),
    positiveText: page.t('buttons.delete'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => handleDeleteScheme(scheme.id)
  })
}

function confirmFlushDNS() {
  dialog.info({
    title: page.t('dialogs.flushDnsTitle'),
    content: page.t('dialogs.flushDnsContent'),
    positiveText: page.t('buttons.flushDns'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => handleFlushDNS()
  })
}

async function handleLoadScheme(id: string) {
  try {
    const data = await invoke('hosts:loadScheme', id)
    const result = validateOptional(data, isOperationResult, 'handleLoadScheme')
    if (result?.success) {
      message.success(page.t('messages.schemeLoaded'))
      await fetchEntries()
    } else {
      message.error(translateError(result?.error, 'errors.loadFailed'))
    }
  } catch {
    message.error(page.t('errors.loadFailed'))
  }
}

async function handleDeleteScheme(id: string) {
  try {
    const data = await invoke('hosts:deleteScheme', id)
    const result = validateOptional(data, isOperationResult, 'handleDeleteScheme')
    if (result?.success) {
      message.success(page.t('messages.deleted'))
      await fetchSchemes()
    }
  } catch {
    message.error(page.t('errors.deleteFailed'))
  }
}

async function handleFlushDNS() {
  try {
    const data = await invoke('hosts:flushDNS')
    const result = validateOptional(data, isOperationResult, 'handleFlushDNS')
    if (result?.success) {
      message.success(page.t('messages.dnsFlushed'))
    } else {
      message.warning(translateError(result?.error, 'errors.flushDnsFailed'))
    }
  } catch {
    message.error(page.t('errors.flushDnsFailed'))
  }
}

onMounted(async () => {
  await loadPlatform()
  await Promise.all([fetchEntries(), fetchGroups(), fetchSchemes()])
})
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="hosts-editor-view"
  >
    <input
      ref="importInputRef"
      type="file"
      accept="application/json,.json"
      class="hidden-input"
      @change="handleImportSchemes"
    >

    <template #actions>
      <div class="search-area">
        <NInput 
          v-model:value="search" 
          :placeholder="page.t('placeholders.search')" 
          style="width: 220px" 
          clearable 
        />
      </div>
      <div class="action-buttons">
        <NButton @click="confirmFlushDNS">{{ page.t('buttons.flushDns') }}</NButton>
        <NButton type="primary" @click="openEditModal()">{{ page.t('buttons.addEntry') }}</NButton>
      </div>
    </template>

    <NAlert type="info" :bordered="false" class="info-alert">
      {{ adminHint }}
    </NAlert>

    <div class="content-card">
      <NTabs v-model:value="activeTab" type="line" animated>
        <NTabPane name="entries" :tab="page.t('tabs.entries')">
          <NDataTable 
            :columns="columns" 
            :data="filteredEntries" 
            :loading="loading" 
            :pagination="{ pageSize: 10 }" 
            :bordered="false" 
            striped 
          />
          <NEmpty v-if="filteredEntries.length === 0 && !loading" :description="page.t('empty.entries')" />
        </NTabPane>
        
        <NTabPane name="groups" :tab="page.t('tabs.groups')">
          <div class="groups-container">
            <div class="group-section" v-for="group in groups" :key="group.id">
              <div class="group-header" :style="{ borderLeftColor: group.color }">
                <NTag :color="{ color: group.color + '20', textColor: group.color }" size="medium">{{ group.name }}</NTag>
                <span class="group-count">{{ page.t('labels.entryCount', { count: entriesByGroup[group.id]?.length || 0 }) }}</span>
              </div>
              <NList v-if="entriesByGroup[group.id]?.length" class="group-list">
                <NListItem v-for="entry in entriesByGroup[group.id]" :key="entry.id">
                  <NThing :title="entry.hostname" :description="entry.ip">
                    <template #header-extra>
                      <NSwitch :value="entry.enabled" size="small" @update:value="confirmToggle(entry)" />
                    </template>
                  </NThing>
                </NListItem>
              </NList>
              <NEmpty v-else :description="page.t('empty.groupEntries')" :show-icon="false" class="group-empty" />
            </div>
            <div class="group-section" v-if="entriesByGroup.ungrouped?.length">
              <div class="group-header" style="border-left-color: #8E8E93">
                <NTag size="medium">{{ page.t('labels.ungrouped') }}</NTag>
                <span class="group-count">{{ page.t('labels.entryCount', { count: entriesByGroup.ungrouped.length }) }}</span>
              </div>
              <NList class="group-list">
                <NListItem v-for="entry in entriesByGroup.ungrouped" :key="entry.id">
                  <NThing :title="entry.hostname" :description="entry.ip" />
                </NListItem>
              </NList>
            </div>
          </div>
        </NTabPane>
        
        <NTabPane name="schemes" :tab="page.t('tabs.schemes')">
          <div class="scheme-toolbar">
            <div class="scheme-input-row">
              <NInput
                v-model:value="schemeInput"
                :placeholder="page.t('placeholders.schemeName')"
                style="flex: 1"
                @keyup.enter="handleSaveScheme"
              />
              <NButton type="primary" @click="handleSaveScheme">{{ page.t('buttons.saveScheme') }}</NButton>
            </div>
            <NSpace>
              <NButton @click="handleExportSchemes">{{ page.t('buttons.exportAll') }}</NButton>
              <NButton @click="triggerImportSchemes">{{ page.t('buttons.importSchemes') }}</NButton>
            </NSpace>
          </div>
          <NList v-if="schemes.length > 0" class="scheme-list">
            <NListItem v-for="scheme in schemes" :key="scheme.id">
              <NThing
                :title="scheme.name"
                :description="page.t('labels.schemeMeta', { count: scheme.count, date: formatDate(scheme.timestamp) })"
              >
                <template #header-extra>
                  <NSpace>
                    <NButton size="small" @click="confirmLoadScheme(scheme)">{{ page.t('buttons.load') }}</NButton>
                    <NButton size="small" type="error" @click="confirmDeleteScheme(scheme)">{{ page.t('buttons.delete') }}</NButton>
                  </NSpace>
                </template>
              </NThing>
            </NListItem>
          </NList>
          <NEmpty v-else :description="page.t('empty.schemes')" />
        </NTabPane>
      </NTabs>
    </div>

    <NModal 
      v-model:show="showEditModal" 
      :title="isNewEntry ? page.t('modals.addTitle') : page.t('modals.editTitle')" 
      preset="card" 
      style="width: 500px"
    >
      <NForm v-if="editingEntry" label-placement="left" label-width="80">
        <NFormItem :label="page.t('columns.ip')">
          <NInput v-model:value="editingEntry.ip" :placeholder="page.t('placeholders.ip')" />
        </NFormItem>
        <NFormItem :label="page.t('columns.hostname')">
          <NInput v-model:value="editingEntry.hostname" :placeholder="page.t('placeholders.hostname')" />
        </NFormItem>
        <NFormItem :label="page.t('labels.groupSelect')">
          <NSelect v-model:value="editingEntry.group" :options="groupOptions" :placeholder="page.t('placeholders.group')" clearable />
        </NFormItem>
        <NFormItem :label="page.t('columns.comment')">
          <NInput v-model:value="editingEntry.comment" :placeholder="page.t('placeholders.comment')" />
        </NFormItem>
        <NFormItem :label="page.t('labels.enabled')">
          <NSwitch v-model:value="editingEntry.enabled" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showEditModal = false">{{ page.t('buttons.cancel') }}</NButton>
          <NButton type="primary" @click="handleSave">{{ page.t('buttons.save') }}</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showDiffModal"
      preset="card"
      :title="pendingScheme ? page.t('labels.schemeCompare', { name: pendingScheme.name }) : page.t('labels.schemeCompareDefault')"
      style="width: 640px"
    >
      <div class="diff-summary">
        <NTag size="small" type="success">{{ page.t('diff.addedCount', { count: diffSummary.added }) }}</NTag>
        <NTag size="small" type="error">{{ page.t('diff.removedCount', { count: diffSummary.removed }) }}</NTag>
        <NTag size="small" type="warning">{{ page.t('diff.modifiedCount', { count: diffSummary.modified }) }}</NTag>
        <NTag size="small">{{ page.t('diff.unchangedCount', { count: diffSummary.unchanged }) }}</NTag>
      </div>
      <NList v-if="visibleDiffChanges.length" class="scheme-diff-list">
        <NListItem v-for="change in visibleDiffChanges" :key="`${change.type}-${change.hostname}`">
          <NThing>
            <template #header>
              <div class="diff-item-header">
                <NTag size="small" :type="change.type === 'added' ? 'success' : change.type === 'removed' ? 'error' : 'warning'">
                  {{ diffTypeLabel(change.type) }}
                </NTag>
                <span>{{ change.hostname }}</span>
              </div>
            </template>
            <template #description>
              <div v-if="change.type === 'added' && change.after">{{ page.t('labels.ipPrefix', { ip: change.after.ip }) }}</div>
              <div v-else-if="change.type === 'removed' && change.before">{{ page.t('labels.ipPrefix', { ip: change.before.ip }) }}</div>
              <div v-else-if="change.details.length">{{ change.details.join(' · ') }}</div>
            </template>
          </NThing>
        </NListItem>
      </NList>
      <NEmpty v-else :description="page.t('diff.identical')" />
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showDiffModal = false">{{ page.t('buttons.cancel') }}</NButton>
          <NButton type="primary" @click="confirmApplyScheme">{{ page.t('buttons.confirmLoad') }}</NButton>
        </NSpace>
      </template>
    </NModal>
  </PageLayout>
</template>

<style scoped>
.hosts-editor-view {
  max-width: var(--content-max-width, 1200px);
  margin: 0 auto;
}

.search-area {
  flex: 1;
  display: flex;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: var(--space-3);
}

.info-alert {
  margin-bottom: var(--space-4);
  border-radius: var(--radius-lg);
}

.content-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.groups-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.group-section {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-left: var(--space-3);
  border-left: 3px solid;
  margin-bottom: var(--space-3);
}

.group-count {
  color: var(--color-text-secondary);
  font-size: var(--font-size-footnote);
}

.group-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.group-empty {
  padding: var(--space-4);
}

.scheme-toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.scheme-input-row {
  display: flex;
  gap: var(--space-3);
}

.hidden-input {
  display: none;
}

.diff-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: var(--space-3);
}

.scheme-diff-list {
  max-height: 360px;
  overflow-y: auto;
}

.diff-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scheme-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
</style>

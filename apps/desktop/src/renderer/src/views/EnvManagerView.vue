<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  NDataTable, NButton, NSpace, NInput, NModal, NForm, 
  NFormItem, NPopconfirm, useMessage, useDialog, NTabs, NTabPane,
  NEmpty, NButtonGroup, NList, NListItem, NThing, NAlert, NTag
} from 'naive-ui'
import { useIpc } from '../composables/useIpc'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { logError } from '../utils/error-handler'
import { translateToolError } from '../utils/translateToolError'
import {
  type EnvVariable,
  type PathEntry,
  type BackupInfo,
  isEnvVariableArray,
  isPathEntryArray,
  isBackupInfoArray,
  isOperationResult,
  validateArray,
  validateOptional
} from '../utils/type-guards'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'

const message = useMessage()
const { t } = useI18n()
const page = useToolI18n('envManager')
const dialog = useDialog()
const { invoke } = useIpc()
const { copy } = useCopyToClipboard()
const activeTab = ref('user')
const platformSupported = ref(true)
const readOnly = ref(false)
const writeMode = ref<'registry' | 'shell' | 'none'>('none')
const platformName = ref('')
const variables = ref<EnvVariable[]>([])
const pathEntries = ref<PathEntry[]>([])
const backups = ref<BackupInfo[]>([])
const loading = ref(false)

const showEditModal = ref(false)
const editingVar = ref<EnvVariable | null>(null)
const isNewVar = ref(false)

const pathInput = ref('')

const showBackupModal = ref(false)
const backupName = ref('')

const showImportModal = ref(false)
const importContent = ref('')
const importLoading = ref(false)

const showDiffModal = ref(false)
const diffConfigFile = ref('')
const diffLines = ref<Array<{ type: 'add' | 'remove' | 'unchanged'; line: string }>>([])
const pendingShellAction = ref<(() => Promise<void>) | null>(null)

const shellWriteMode = computed(() => writeMode.value === 'shell')

const userVars = computed(() => variables.value.filter(v => v.type === 'user'))
const systemVars = computed(() => variables.value.filter(v => v.type === 'system'))

const columns = computed(() => [
  { title: page.t('columns.name'), key: 'name', width: 200, ellipsis: { tooltip: true } },
  { title: page.t('columns.value'), key: 'value', ellipsis: { tooltip: true } },
  ...(readOnly.value ? [] : [{
    title: '', key: 'actions', width: 100, render: (row: EnvVariable) => {
      return h(NSpace, { size: 'small', noWrap: true }, {
        default: () => [
          h(NButton, { size: 'small', quaternary: true, onClick: () => openEditModal(row) }, { default: () => page.t('buttons.edit') }),
          h(NPopconfirm, { onPositiveClick: () => handleDelete(row.name) }, {
            trigger: () => h(NButton, { size: 'small', quaternary: true, type: 'error' }, { default: () => page.t('buttons.delete') })
          })
        ]
      })
    }
  }])
])

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString(page.locale.value)
}

function translateError(error: string | undefined, fallbackKey: string): string {
  return translateToolError(t, 'envManager', error) || page.t(fallbackKey)
}

async function fetchVariables() {
  loading.value = true
  try {
    const data = await invoke('env-manager:getAll')
    variables.value = validateArray(data, isEnvVariableArray, 'fetchVariables')
  } catch {
    message.error(page.t('errors.fetchFailed'))
  } finally {
    loading.value = false
  }
}

async function fetchPath() {
  try {
    const data = await invoke('env-manager:getPath')
    pathEntries.value = validateArray(data, isPathEntryArray, 'fetchPath')
  } catch {
    message.error(page.t('errors.fetchPathFailed'))
  }
}

async function fetchBackups() {
  try {
    const data = await invoke('env-manager:listBackups')
    backups.value = validateArray(data, isBackupInfoArray, 'fetchBackups')
  } catch (error) {
    logError('EnvManager:listBackups', error)
  }
}

function openEditModal(varEnv?: EnvVariable) {
  if (varEnv) {
    editingVar.value = { ...varEnv }
    isNewVar.value = false
  } else {
    editingVar.value = { name: '', value: '', type: 'user' }
    isNewVar.value = true
  }
  showEditModal.value = true
}

function diffTypeLabel(type: 'add' | 'remove' | 'unchanged'): string {
  if (type === 'add') return page.t('diff.added')
  if (type === 'remove') return page.t('diff.removed')
  return page.t('diff.unchanged')
}

function diffTagType(type: 'add' | 'remove' | 'unchanged'): 'success' | 'error' | 'default' {
  if (type === 'add') return 'success'
  if (type === 'remove') return 'error'
  return 'default'
}

async function previewShellChange(
  previewChannel: 'env-manager:previewSet' | 'env-manager:previewDelete' | 'env-manager:previewPath',
  ...args: unknown[]
): Promise<boolean> {
  const data = await invoke(previewChannel, ...args) as {
    success: boolean
    preview?: {
      configFile: string
      diff: Array<{ type: 'add' | 'remove' | 'unchanged'; line: string }>
    }
    error?: string
  }
  if (!data?.success || !data.preview) {
    message.error(translateError(data?.error, 'errors.saveFailed'))
    return false
  }
  diffConfigFile.value = data.preview.configFile
  diffLines.value = data.preview.diff.filter(line => line.type !== 'unchanged')
  showDiffModal.value = true
  return true
}

async function handleSave() {
  if (!editingVar.value?.name) {
    message.warning(page.t('messages.nameRequired'))
    return
  }
  if (shellWriteMode.value) {
    const ok = await previewShellChange(
      'env-manager:previewSet',
      editingVar.value.name,
      editingVar.value.value
    )
    if (!ok) return
    pendingShellAction.value = async () => {
      const data = await invoke('env-manager:set', editingVar.value!.name, editingVar.value!.value)
      const result = validateOptional(data, isOperationResult, 'handleSave')
      if (result?.success) {
        message.success(isNewVar.value ? page.t('messages.created') : page.t('messages.saved'))
        showEditModal.value = false
        await fetchVariables()
      } else {
        message.error(translateError(result?.error, 'errors.saveFailed'))
      }
    }
    return
  }
  await executeSave()
}

async function executeSave() {
  if (!editingVar.value?.name) return
  try {
    const data = await invoke('env-manager:set', editingVar.value.name, editingVar.value.value)
    const result = validateOptional(data, isOperationResult, 'handleSave')
    if (result?.success) {
      message.success(isNewVar.value ? page.t('messages.created') : page.t('messages.saved'))
      showEditModal.value = false
      await fetchVariables()
    } else {
      message.error(translateError(result?.error, 'errors.saveFailed'))
    }
  } catch {
    message.error(page.t('errors.saveFailed'))
  }
}

async function confirmShellDiff() {
  showDiffModal.value = false
  const action = pendingShellAction.value
  pendingShellAction.value = null
  if (action) await action()
}

async function handleDelete(name: string) {
  if (shellWriteMode.value) {
    const ok = await previewShellChange('env-manager:previewDelete', name)
    if (!ok) return
    pendingShellAction.value = async () => {
      const result = await invoke('env-manager:delete', name) as { success: boolean; error?: string }
      if (result?.success) {
        message.success(page.t('messages.deleted'))
        await fetchVariables()
      } else {
        message.error(translateError(result?.error, 'errors.deleteFailed'))
      }
    }
    return
  }
  await executeDelete(name)
}

async function executeDelete(name: string) {
  try {
    const result = await invoke('env-manager:delete', name) as { success: boolean; error?: string }
    if (result?.success) {
      message.success(page.t('messages.deleted'))
      await fetchVariables()
    } else {
      message.error(translateError(result?.error, 'errors.deleteFailed'))
    }
  } catch {
    message.error(page.t('errors.deleteFailed'))
  }
}

async function handleAddPath() {
  if (!pathInput.value.trim()) {
    message.warning(page.t('messages.pathRequired'))
    return
  }
  const newPaths = [...pathEntries.value.map(p => p.path), pathInput.value.trim()]
  if (shellWriteMode.value) {
    const ok = await previewShellChange('env-manager:previewPath', newPaths)
    if (!ok) return
    pendingShellAction.value = async () => {
      await applyPathChange(newPaths, page.t('messages.pathAdded'))
    }
    return
  }
  await applyPathChange(newPaths, page.t('messages.pathAdded'))
}

async function applyPathChange(newPaths: string[], successMessage: string) {
  try {
    const result = await invoke('env-manager:setPath', newPaths) as { success: boolean; error?: string }
    if (result?.success) {
      message.success(successMessage)
      pathInput.value = ''
      await fetchPath()
    } else {
      message.error(translateError(result?.error, 'errors.addFailed'))
    }
  } catch {
    message.error(page.t('errors.addFailed'))
  }
}

async function handleRemovePath(index: number) {
  const newPaths = pathEntries.value.filter((_, i) => i !== index).map(p => p.path)
  if (shellWriteMode.value) {
    const ok = await previewShellChange('env-manager:previewPath', newPaths)
    if (!ok) return
    pendingShellAction.value = async () => {
      await applyPathChange(newPaths, page.t('messages.pathRemoved'))
    }
    return
  }
  await applyPathChange(newPaths, page.t('messages.pathRemoved'))
}

async function handleMovePath(index: number, direction: 'up' | 'down') {
  const newPaths = [...pathEntries.value.map(p => p.path)]
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= newPaths.length) return
  
  const temp = newPaths[index]
  newPaths[index] = newPaths[targetIndex]
  newPaths[targetIndex] = temp

  if (shellWriteMode.value) {
    const ok = await previewShellChange('env-manager:previewPath', newPaths)
    if (!ok) return
    pendingShellAction.value = async () => {
      try {
        const data = await invoke('env-manager:setPath', newPaths)
        const result = validateOptional(data, isOperationResult, 'handleMovePath')
        if (result?.success) await fetchPath()
      } catch {
        message.error(page.t('errors.moveFailed'))
      }
    }
    return
  }

  try {
    const data = await invoke('env-manager:setPath', newPaths)
    const result = validateOptional(data, isOperationResult, 'handleMovePath')
    if (result?.success) {
      await fetchPath()
    }
  } catch {
    message.error(page.t('errors.moveFailed'))
  }
}

async function handleCreateBackup() {
  if (!backupName.value.trim()) {
    message.warning(page.t('messages.backupNameRequired'))
    return
  }
  try {
    const data = await invoke('env-manager:createBackup', backupName.value)
    const result = validateOptional(data, isOperationResult, 'handleCreateBackup')
    if (result?.success) {
      message.success(page.t('messages.backupSuccess'))
      backupName.value = ''
      showBackupModal.value = false
      await fetchBackups()
    } else {
      message.error(translateError(result?.error, 'errors.backupFailed'))
    }
  } catch {
    message.error(page.t('errors.backupFailed'))
  }
}

function confirmRestoreBackup(backup: { name: string; timestamp: string; count: number }) {
  dialog.warning({
    title: page.t('dialogs.restoreTitle'),
    content: page.t('dialogs.restoreContent', { name: backup.name }),
    positiveText: page.t('buttons.restore'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => handleRestoreBackup(backup.timestamp)
  })
}

function confirmDeleteBackup(backup: { name: string; timestamp: string; count: number }) {
  dialog.warning({
    title: page.t('dialogs.deleteBackupTitle'),
    content: page.t('dialogs.deleteBackupContent', { name: backup.name }),
    positiveText: page.t('buttons.delete'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => handleDeleteBackup(backup.timestamp)
  })
}

async function handleRestoreBackup(timestamp: string) {
  try {
    const data = await invoke('env-manager:restoreBackup', timestamp)
    const result = validateOptional(data, isOperationResult, 'handleRestoreBackup')
    if (result?.success) {
      message.success(page.t('messages.restoreSuccess'))
      await fetchVariables()
    } else {
      message.error(translateError(result?.error, 'errors.restoreFailed'))
    }
  } catch {
    message.error(page.t('errors.restoreFailed'))
  }
}

async function handleDeleteBackup(timestamp: string) {
  try {
    const data = await invoke('env-manager:deleteBackup', timestamp)
    const result = validateOptional(data, isOperationResult, 'handleDeleteBackup')
    if (result?.success) {
      message.success(page.t('messages.deleted'))
      await fetchBackups()
    }
  } catch {
    message.error(page.t('errors.deleteFailed'))
  }
}

async function handleExport() {
  try {
    const content = await invoke<string>('env-manager:export', userVars.value)
    if (content) {
      await copy(content, page.t('messages.exportCopied'))
    } else {
      message.warning(page.t('messages.noUserVars'))
    }
  } catch {
    message.error(page.t('errors.exportFailed'))
  }
}

function openImportModal() {
  importContent.value = ''
  showImportModal.value = true
}

async function handleImport() {
  if (!importContent.value.trim()) {
    message.warning(page.t('messages.importContentRequired'))
    return
  }
  importLoading.value = true
  try {
    const results = await invoke<Array<{ success: boolean; name: string; error?: string }>>(
      'env-manager:import',
      importContent.value
    )
    const list = results ?? []
    const ok = list.filter(r => r.success).length
    const fail = list.filter(r => !r.success).length
    if (ok > 0) {
      message.success(page.t('messages.importSuccess', {
        ok,
        failSuffix: fail > 0 ? page.t('messages.importFailSuffix', { fail }) : ''
      }))
      showImportModal.value = false
      await fetchVariables()
    } else if (list.length === 0) {
      message.warning(page.t('messages.noValidLines'))
    } else {
      message.error(page.t('errors.importFailed'))
    }
  } catch {
    message.error(page.t('errors.importFailed'))
  } finally {
    importLoading.value = false
  }
}

onMounted(async () => {
  try {
    const support = await invoke('env-manager:getSupport') as {
      supported: boolean
      platform?: string
      readOnly?: boolean
      writeMode?: 'registry' | 'shell' | 'none'
    } | undefined
    if (support) {
      platformSupported.value = support.supported
      platformName.value = support.platform ?? ''
      readOnly.value = support.readOnly ?? false
      writeMode.value = support.writeMode ?? (support.readOnly ? 'none' : 'registry')
    }
  } catch {
    platformSupported.value = false
  }

  if (!platformSupported.value) return

  await fetchVariables()
  await fetchPath()
  await fetchBackups()
})
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="env-manager-view"
  >
    <template #actions>
      <template v-if="platformSupported">
        <NButton v-if="!readOnly" @click="openEditModal()">{{ page.t('buttons.create') }}</NButton>
        <NButtonGroup>
          <NButton @click="handleExport">{{ page.t('buttons.export') }}</NButton>
          <NButton v-if="writeMode === 'registry'" @click="openImportModal">{{ page.t('buttons.import') }}</NButton>
          <NButton @click="showBackupModal = true">{{ page.t('buttons.backup') }}</NButton>
          <NButton @click="fetchBackups">{{ page.t('buttons.history') }}</NButton>
        </NButtonGroup>
      </template>
    </template>

    <NAlert
      v-if="!platformSupported"
      type="warning"
      :title="page.t('unsupported')"
      style="margin-bottom: 16px;"
    >
      {{ page.t('unsupportedAlert', { platform: platformName || page.t('unknownPlatform') }) }}
    </NAlert>

    <NAlert
      v-else-if="shellWriteMode"
      type="info"
      :title="page.t('shellWriteTitle')"
      style="margin-bottom: 16px;"
    >
      {{ page.t('shellWriteAlert') }}
    </NAlert>

    <NAlert
      v-else-if="readOnly"
      type="info"
      :title="page.t('readOnlyTitle')"
      style="margin-bottom: 16px;"
    >
      {{ page.t('readOnlyAlert') }}
    </NAlert>
    
    <div v-if="platformSupported" class="content-card">
      <NTabs v-model:value="activeTab" type="line" animated>
        <NTabPane name="user" :tab="page.t('tabs.user')">
          <NDataTable :columns="columns" :data="userVars" :loading="loading" :pagination="{ pageSize: 10 }" :bordered="false" striped />
          <NEmpty v-if="userVars.length === 0 && !loading" :description="page.t('empty.userVars')" />
        </NTabPane>
        
        <NTabPane name="system" :tab="page.t('tabs.system')">
          <NDataTable :columns="columns" :data="systemVars" :loading="loading" :pagination="{ pageSize: 10 }" :bordered="false" striped />
          <NEmpty v-if="systemVars.length === 0 && !loading" :description="page.t('empty.systemVars')" />
        </NTabPane>
        
        <NTabPane name="path" :tab="page.t('tabs.path')">
          <div class="path-section">
            <div v-if="!readOnly" class="path-input-row">
              <NInput v-model:value="pathInput" :placeholder="page.t('placeholders.pathInput')" @keyup.enter="handleAddPath" style="flex: 1" />
              <NButton type="primary" @click="handleAddPath" :disabled="!pathInput.trim()">{{ page.t('buttons.add') }}</NButton>
            </div>
            
            <NList class="path-list" v-if="pathEntries.length > 0">
              <NListItem v-for="(entry, index) in pathEntries" :key="index">
                <template #prefix>
                  <span class="path-index">{{ index + 1 }}</span>
                </template>
                <NThing
                  :title="entry.path"
                  :description="entry.exists ? page.t('labels.pathExists') : page.t('labels.pathNotExists')"
                  :description-style="{ color: entry.exists ? 'var(--color-success)' : 'var(--color-error)' }"
                >
                  <template #header-extra>
                    <NSpace v-if="!readOnly">
                      <NButton size="tiny" quaternary :disabled="index === 0" @click="handleMovePath(index, 'up')">↑</NButton>
                      <NButton size="tiny" quaternary :disabled="index === pathEntries.length - 1" @click="handleMovePath(index, 'down')">↓</NButton>
                      <NButton size="tiny" quaternary type="error" @click="handleRemovePath(index)">{{ page.t('buttons.remove') }}</NButton>
                    </NSpace>
                  </template>
                </NThing>
              </NListItem>
            </NList>
            <NEmpty v-else :description="page.t('empty.path')" />
          </div>
        </NTabPane>
        
        <NTabPane name="backup" :tab="page.t('tabs.backup')">
          <NList v-if="backups.length > 0">
            <NListItem v-for="backup in backups" :key="backup.timestamp">
              <NThing
                :title="backup.name"
                :description="page.t('labels.backupMeta', { count: backup.count, date: formatDate(backup.timestamp) })"
              >
                <template #header-extra>
                  <NSpace>
                    <NButton v-if="!readOnly" size="small" @click="confirmRestoreBackup(backup)">{{ page.t('buttons.restore') }}</NButton>
                    <NButton size="small" type="error" @click="confirmDeleteBackup(backup)">{{ page.t('buttons.delete') }}</NButton>
                  </NSpace>
                </template>
              </NThing>
            </NListItem>
          </NList>
          <NEmpty v-else :description="page.t('empty.backups')" />
        </NTabPane>
      </NTabs>
    </div>
    
    <NModal
      v-model:show="showEditModal"
      :title="isNewVar ? page.t('modals.createTitle') : page.t('modals.editTitle')"
      preset="card"
      style="width: 500px"
    >
      <NForm v-if="editingVar" label-placement="left" label-width="80">
        <NFormItem :label="page.t('labels.variableName')">
          <NInput v-model:value="editingVar.name" :disabled="!isNewVar" :placeholder="page.t('placeholders.variableName')" />
        </NFormItem>
        <NFormItem :label="page.t('labels.variableValue')">
          <NInput v-model:value="editingVar.value" type="textarea" :rows="3" :placeholder="page.t('placeholders.variableValue')" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showEditModal = false">{{ page.t('buttons.cancel') }}</NButton>
          <NButton type="primary" @click="handleSave">{{ page.t('buttons.save') }}</NButton>
        </NSpace>
      </template>
    </NModal>
    
    <NModal v-model:show="showBackupModal" preset="card" :title="page.t('modals.createBackupTitle')" style="width: 400px">
      <NAlert type="info" :bordered="false" style="margin-bottom: 12px; border-radius: 8px;">
        {{ page.t('hints.backupInfo') }}
      </NAlert>
      <NInput v-model:value="backupName" :placeholder="page.t('placeholders.backupName')" />
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showBackupModal = false">{{ page.t('buttons.cancel') }}</NButton>
          <NButton type="primary" @click="handleCreateBackup">{{ page.t('buttons.createBackup') }}</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showImportModal" preset="card" :title="page.t('modals.importTitle')" style="width: 520px">
      <NAlert type="info" :bordered="false" style="margin-bottom: 12px; border-radius: 8px;">
        {{ page.t('hints.importInfo') }}
      </NAlert>
      <NInput
        v-model:value="importContent"
        type="textarea"
        :rows="10"
        :placeholder="page.t('placeholders.importContent')"
      />
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showImportModal = false">{{ page.t('buttons.cancel') }}</NButton>
          <NButton type="primary" :loading="importLoading" @click="handleImport">{{ page.t('buttons.import') }}</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showDiffModal"
      preset="card"
      :title="page.t('modals.diffTitle')"
      style="width: 640px"
    >
      <NAlert type="info" :bordered="false" style="margin-bottom: 12px; border-radius: 8px;">
        {{ page.t('hints.diffInfo', { file: diffConfigFile }) }}
      </NAlert>
      <NList v-if="diffLines.length" class="shell-diff-list">
        <NListItem v-for="(line, index) in diffLines" :key="`${line.type}-${index}`">
          <NSpace align="center" :size="8">
            <NTag size="small" :type="diffTagType(line.type)">{{ diffTypeLabel(line.type) }}</NTag>
            <code class="diff-line">{{ line.line }}</code>
          </NSpace>
        </NListItem>
      </NList>
      <NEmpty v-else :description="page.t('diff.noChanges')" />
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showDiffModal = false">{{ page.t('buttons.cancel') }}</NButton>
          <NButton type="primary" @click="confirmShellDiff">{{ page.t('buttons.confirmWrite') }}</NButton>
        </NSpace>
      </template>
    </NModal>
  </PageLayout>
</template>

<style scoped>
.env-manager-view {
  max-width: 1200px;
  margin: 0 auto;
}

.content-card { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); }

.path-section { padding: var(--space-2) 0; }
.path-input-row { display: flex; gap: var(--space-3); margin-bottom: var(--space-4); }
.path-list { border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.path-index { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: var(--color-bg-tertiary); font-size: var(--font-size-caption1); color: var(--color-text-secondary); margin-right: var(--space-3); }
.shell-diff-list { max-height: 360px; overflow-y: auto; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.diff-line { font-family: var(--font-family-mono); font-size: var(--font-size-footnote); word-break: break-all; }
</style>

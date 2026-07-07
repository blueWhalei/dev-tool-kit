<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NButton, NSpace, NInput, NSelect, NModal,
  NForm, NFormItem, NProgress, NEmpty, NAlert,
  NCard, NList, NListItem, NCheckbox, NTag, NDivider, useMessage
} from 'naive-ui'
import { showError } from '../utils/error-handler'
import PageLayout from '../components/PageLayout.vue'
import { useIpc } from '../composables/useIpc'
import { useToolI18n } from '../composables/useToolI18n'
import { useI18n } from 'vue-i18n'
import {
  type FileEntry,
  type RenamePreview,
  type RenameResult,
  type SavedRenameRule,
  isFileEntryArray,
  isRenamePreviewArray,
  isRenameResultArray,
  isOperationResult,
  validateArray,
  validateOptional
} from '../utils/type-guards'

const message = useMessage()
const { invoke } = useIpc()
const page = useToolI18n('fileRenamer')
const { t, locale } = useI18n()

interface RenameRule {
  type: 'prefix' | 'suffix' | 'replace' | 'regex' | 'number' | 'case' | 'date'
  value?: string
  replaceWith?: string
  pattern?: string
  startNumber?: number
  padding?: number
  caseType?: 'upper' | 'lower' | 'title'
}

const folderPath = ref('')
const files = ref<FileEntry[]>([])
const selectedFiles = ref<string[]>([])
const loading = ref(false)
const rules = ref<RenameRule[]>([{ type: 'number', startNumber: 1, padding: 3 }])
const previews = ref<RenamePreview[]>([])
const executing = ref(false)
const undoing = ref(false)
const results = ref<RenameResult[]>([])
const showResultModal = ref(false)
const sourceType = ref<'folder' | 'files' | ''>('')
const savedRules = ref<SavedRenameRule[]>([])
const ruleNameInput = ref('')
const showSaveRuleModal = ref(false)
const lastUndoOps = ref<{ oldPath: string; newPath: string }[]>([])

let isFetchingPreview = false
let pendingFetch = false

const ruleTypes = computed(() => {
  void locale.value
  return ([
    'number',
    'prefix',
    'suffix',
    'replace',
    'regex',
    'case',
    'date'
  ] as const).map(value => ({
    label: page.t(`ruleTypes.${value}`),
    value
  }))
})

const caseOptions = computed(() => {
  void locale.value
  return (['upper', 'lower', 'title'] as const).map(value => ({
    label: page.t(`caseTypes.${value}`),
    value
  }))
})

const savedRuleOptions = computed(() =>
  savedRules.value.map(item => ({ label: item.name, value: item.name }))
)

const allSelected = computed({
  get: () => files.value.length > 0 && selectedFiles.value.length === files.value.length,
  set: (value: boolean) => {
    selectedFiles.value = value ? files.value.map(file => file.path) : []
  }
})

const conflictCount = computed(() => previews.value.filter(item => item.conflict).length)
const hasConflicts = computed(() => conflictCount.value > 0)
const canExecute = computed(() => previews.value.length > 0 && !hasConflicts.value)

const canUndo = computed(() => lastUndoOps.value.length > 0)

function addRule() {
  rules.value.push({ type: 'prefix', value: '' })
}

function removeRule(index: number) {
  if (rules.value.length <= 1) return
  rules.value.splice(index, 1)
}

async function loadSavedRules() {
  try {
    const data = await invoke<SavedRenameRule[]>('file-renamer:listRules')
    savedRules.value = Array.isArray(data) ? data : []
  } catch {
    savedRules.value = []
  }
}

async function selectFolder() {
  try {
    const path = await invoke<string | null>('file-renamer:selectFolder')
    if (path) {
      folderPath.value = path
      sourceType.value = 'folder'
      await loadFiles()
    }
  } catch (error) {
    showError(error, page.t('messages.selectFolderFailed'))
  }
}

async function selectFiles() {
  try {
    const data = await invoke('file-renamer:selectFiles')
    const validated = validateArray(data, isFileEntryArray, 'selectFiles')
    if (validated.length > 0) {
      files.value = validated
      selectedFiles.value = validated.map(file => file.path)
      folderPath.value = ''
      sourceType.value = 'files'
      await fetchPreview()
    }
  } catch (error) {
    showError(error, page.t('messages.selectFilesFailed'))
  }
}

async function loadFiles() {
  if (!folderPath.value) return
  loading.value = true
  try {
    const data = await invoke('file-renamer:listFiles', folderPath.value)
    files.value = validateArray(data, isFileEntryArray, 'loadFiles')
    selectedFiles.value = files.value.map(file => file.path)
    await fetchPreview()
  } catch (error) {
    showError(error, page.t('messages.loadFilesFailed'))
  } finally {
    loading.value = false
  }
}

async function fetchPreview() {
  if (isFetchingPreview) {
    pendingFetch = true
    return
  }

  isFetchingPreview = true
  pendingFetch = false

  try {
    if (selectedFiles.value.length > 0 && files.value.length > 0) {
      const selectedFileEntries = files.value.filter(file => selectedFiles.value.includes(file.path))
      try {
        const data = await invoke('file-renamer:preview', selectedFileEntries, rules.value)
        previews.value = validateArray(data, isRenamePreviewArray, 'fetchPreview')
      } catch {
        previews.value = []
      }
    } else {
      previews.value = []
    }
  } finally {
    isFetchingPreview = false
    if (pendingFetch) {
      pendingFetch = false
      await fetchPreview()
    }
  }
}

function toggleFile(path: string, checked: boolean) {
  if (checked) {
    if (!selectedFiles.value.includes(path)) {
      selectedFiles.value = [...selectedFiles.value, path]
    }
    return
  }
  selectedFiles.value = selectedFiles.value.filter(item => item !== path)
}

async function saveCurrentRule() {
  if (!ruleNameInput.value.trim()) {
    message.warning(page.t('messages.ruleNameRequired'))
    return
  }
  try {
    const data = await invoke('file-renamer:saveRule', ruleNameInput.value.trim(), rules.value[0])
    const result = validateOptional(data, isOperationResult, 'saveCurrentRule')
    if (result?.success) {
      message.success(page.t('messages.ruleSaved'))
      showSaveRuleModal.value = false
      ruleNameInput.value = ''
      await loadSavedRules()
    } else {
      message.error(result?.error || page.t('messages.saveFailed'))
    }
  } catch (error) {
    showError(error, page.t('messages.saveFailed'))
  }
}

function applySavedRule(name: string | null) {
  if (!name) return
  const saved = savedRules.value.find(item => item.name === name)
  if (!saved) return
  rules.value = [{ ...saved.rule }]
}

async function deleteSavedRule(name: string) {
  try {
    const data = await invoke('file-renamer:deleteRule', name)
    const result = validateOptional(data, isOperationResult, 'deleteSavedRule')
    if (result?.success) {
      message.success(page.t('messages.ruleDeleted'))
      await loadSavedRules()
    } else {
      message.error(result?.error || page.t('messages.deleteFailed'))
    }
  } catch (error) {
    showError(error, page.t('messages.deleteFailed'))
  }
}

watch(selectedFiles, async () => {
  await fetchPreview()
}, { deep: true })

watch(rules, async () => {
  await fetchPreview()
}, { deep: true })

async function executeRename() {
  if (!canExecute.value) return
  executing.value = true
  try {
    const data = await invoke('file-renamer:execute', previews.value)
    results.value = validateArray(data, isRenameResultArray, 'executeRename')
    lastUndoOps.value = results.value
      .filter(item => item.success && item.oldPath && item.newPath)
      .map(item => ({ oldPath: item.oldPath!, newPath: item.newPath! }))
    showResultModal.value = true
    if (folderPath.value) {
      await loadFiles()
    } else if (sourceType.value === 'files') {
      selectedFiles.value = []
      previews.value = []
    }
  } catch (error) {
    showError(error, page.t('messages.executeFailed'))
  } finally {
    executing.value = false
  }
}

async function undoRename() {
  if (!canUndo.value) return
  undoing.value = true
  try {
    const data = await invoke('file-renamer:undo', lastUndoOps.value)
    results.value = validateArray(data, isRenameResultArray, 'undoRename')
    lastUndoOps.value = []
    showResultModal.value = true
    if (folderPath.value) {
      await loadFiles()
    }
  } catch (error) {
    showError(error, page.t('messages.undoFailed'))
  } finally {
    undoing.value = false
  }
}

const successCount = computed(() => results.value.filter(item => item.success).length)
const failCount = computed(() => results.value.filter(item => !item.success).length)

onMounted(() => {
  void loadSavedRules()
})
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="file-renamer-view"
  >
    <template #actions>
      <NSpace>
        <NButton
          type="primary"
          @click="selectFolder"
        >
          {{ page.t('selectFolder') }}
        </NButton>
        <NButton @click="selectFiles">
          {{ page.t('selectFiles') }}
        </NButton>
      </NSpace>
    </template>

    <div
      v-if="folderPath"
      class="folder-bar"
    >
      <span class="folder-label">{{ page.t('currentFolder') }}</span>
      <span class="folder-path">{{ folderPath }}</span>
    </div>

    <div
      v-else-if="sourceType === 'files'"
      class="folder-bar"
    >
      <span class="folder-label">{{ page.t('selectedFiles') }}</span>
      <span class="folder-path">{{ page.t('filesCount', { count: files.length }) }}</span>
    </div>

    <template v-if="files.length > 0">
      <div class="renamer-layout">
        <!-- 左栏：文件选择与规则 -->
        <NCard
          :title="page.t('filesAndRules')"
          class="panel-card panel-left"
          :bordered="false"
        >
          <section class="panel-section">
            <div class="section-head">
              <span class="section-title">{{ page.t('fileList') }}</span>
              <NSpace :size="8">
                <NCheckbox v-model:checked="allSelected">
                  {{ page.t('selectAll') }}
                </NCheckbox>
                <span class="preview-count">{{ selectedFiles.length }} / {{ files.length }}</span>
              </NSpace>
            </div>
            <NList class="files-list">
              <NListItem
                v-for="file in files"
                :key="file.path"
              >
                <div class="file-row">
                  <NCheckbox
                    :checked="selectedFiles.includes(file.path)"
                    @update:checked="(checked) => toggleFile(file.path, checked)"
                  />
                  <span
                    class="file-name"
                    :title="file.path"
                  >{{ file.name }}</span>
                </div>
              </NListItem>
            </NList>
          </section>

          <NDivider />

          <section class="panel-section">
            <div class="section-head">
              <span class="section-title">{{ page.t('renameRules') }}</span>
              <NButton
                size="tiny"
                quaternary
                @click="showSaveRuleModal = true"
              >
                {{ page.t('saveRule') }}
              </NButton>
            </div>
            <NForm
              label-placement="top"
              size="small"
            >
              <NFormItem :label="page.t('savedRules')">
                <NSpace
                  vertical
                  style="width: 100%"
                >
                  <NSelect
                    :options="savedRuleOptions"
                    :placeholder="page.t('loadSavedRule')"
                    clearable
                    @update:value="applySavedRule"
                  />
                  <NList
                    v-if="savedRules.length"
                    class="saved-rules-list"
                  >
                    <NListItem
                      v-for="item in savedRules"
                      :key="item.name"
                    >
                      <div class="saved-rule-row">
                        <button
                          type="button"
                          class="saved-rule-name"
                          @click="applySavedRule(item.name)"
                        >
                          {{ item.name }}
                        </button>
                        <NButton
                          size="tiny"
                          quaternary
                          type="error"
                          @click="deleteSavedRule(item.name)"
                        >
                          {{ t('common.delete') }}
                        </NButton>
                      </div>
                    </NListItem>
                  </NList>
                </NSpace>
              </NFormItem>

              <NFormItem :label="page.t('ruleChain')">
                <NSpace
                  vertical
                  style="width: 100%"
                >
                  <div
                    v-for="(rule, index) in rules"
                    :key="index"
                    class="rule-chain-item"
                  >
                    <div class="rule-chain-head">
                      <NTag
                        size="small"
                        type="info"
                      >
                        {{ page.t('ruleStep', { step: index + 1 }) }}
                      </NTag>
                      <NButton
                        v-if="rules.length > 1"
                        size="tiny"
                        quaternary
                        type="error"
                        @click="removeRule(index)"
                      >
                        {{ t('common.delete') }}
                      </NButton>
                    </div>
                    <NFormItem :label="page.t('ruleType')">
                      <NSelect
                        v-model:value="rule.type"
                        :options="ruleTypes"
                      />
                    </NFormItem>

                    <NFormItem
                      v-if="rule.type === 'prefix'"
                      :label="page.t('prefix')"
                    >
                      <NInput
                        v-model:value="rule.value"
                        :placeholder="page.t('prefix')"
                      />
                    </NFormItem>

                    <NFormItem
                      v-if="rule.type === 'suffix'"
                      :label="page.t('suffix')"
                    >
                      <NInput
                        v-model:value="rule.value"
                        :placeholder="page.t('suffix')"
                      />
                    </NFormItem>

                    <template v-if="rule.type === 'replace'">
                      <NFormItem :label="page.t('findText')">
                        <NInput
                          v-model:value="rule.value"
                          :placeholder="page.t('findText')"
                        />
                      </NFormItem>
                      <NFormItem :label="page.t('replaceWith')">
                        <NInput
                          v-model:value="rule.replaceWith"
                          :placeholder="page.t('replaceWith')"
                        />
                      </NFormItem>
                    </template>

                    <template v-if="rule.type === 'regex'">
                      <NFormItem :label="page.t('regexPattern')">
                        <NInput
                          v-model:value="rule.pattern"
                          :placeholder="page.t('regexPattern')"
                        />
                      </NFormItem>
                      <NFormItem :label="page.t('replaceWith')">
                        <NInput
                          v-model:value="rule.replaceWith"
                          :placeholder="page.t('replaceWith')"
                        />
                      </NFormItem>
                    </template>

                    <NFormItem
                      v-if="rule.type === 'number'"
                      :label="page.t('startNumber')"
                    >
                      <NInput
                        v-model:value="rule.startNumber"
                        type="number"
                        :min="1"
                      />
                    </NFormItem>

                    <NFormItem
                      v-if="rule.type === 'number'"
                      :label="page.t('padding')"
                    >
                      <NInput
                        v-model:value="rule.padding"
                        type="number"
                        :min="1"
                        :max="10"
                      />
                    </NFormItem>

                    <NFormItem
                      v-if="rule.type === 'case'"
                      :label="page.t('caseType')"
                    >
                      <NSelect
                        v-model:value="rule.caseType"
                        :options="caseOptions"
                      />
                    </NFormItem>
                  </div>
                  <NButton
                    size="small"
                    dashed
                    block
                    @click="addRule"
                  >
                    {{ page.t('addRule') }}
                  </NButton>
                </NSpace>
              </NFormItem>
            </NForm>
          </section>
        </NCard>

        <!-- 右栏：并排预览 -->
        <NCard
          :title="page.t('preview')"
          class="panel-card panel-right"
          :bordered="false"
        >
          <template #header-extra>
            <NSpace
              align="center"
              :size="12"
            >
              <span
                v-if="previews.length > 0"
                class="preview-count"
              >{{ previews.length }}</span>
              <NTag
                v-if="hasConflicts"
                type="warning"
                size="small"
              >
                {{ page.t('conflictWarning', { count: conflictCount }) }}
              </NTag>
              <NButton
                v-if="canUndo"
                :loading="undoing"
                @click="undoRename"
              >
                {{ page.t('undo') }}
              </NButton>
              <NButton
                type="primary"
                :loading="executing"
                :disabled="!canExecute"
                @click="executeRename"
              >
                {{ page.t('execute') }}
              </NButton>
            </NSpace>
          </template>

          <NAlert
            v-if="hasConflicts"
            type="warning"
            :bordered="false"
            class="conflict-alert"
            :title="page.t('conflictWarning', { count: conflictCount })"
          />

          <div
            v-if="previews.length > 0"
            class="preview-table-wrap"
          >
            <div class="preview-table">
              <div class="preview-table-head">
                <span class="col-original">{{ page.t('originalName') }}</span>
                <span
                  class="col-arrow"
                  aria-hidden="true"
                />
                <span class="col-preview">{{ page.t('newName') }}</span>
              </div>
              <div
                v-for="preview in previews"
                :key="preview.path"
                class="preview-table-row"
                :class="{ conflict: !!preview.conflict }"
              >
                <span
                  class="col-original"
                  :title="preview.original"
                >{{ preview.original }}</span>
                <span
                  class="col-arrow"
                  aria-hidden="true"
                >→</span>
                <span class="col-preview">
                  <span
                    class="preview-name"
                    :class="{ conflict: preview.conflict }"
                  >{{ preview.preview }}</span>
                  <NTag
                    v-if="preview.conflict"
                    size="tiny"
                    type="error"
                  >{{ preview.conflict }}</NTag>
                </span>
              </div>
            </div>
          </div>
          <NEmpty
            v-else
            :description="page.t('previewEmpty')"
            class="preview-empty"
          />
        </NCard>
      </div>
    </template>

    <NEmpty
      v-else
      :description="page.t('empty')"
      class="empty-state"
    />

    <NModal
      v-model:show="showSaveRuleModal"
      preset="dialog"
      :title="page.t('saveRuleTitle')"
      :positive-text="t('common.save')"
      @positive-click="saveCurrentRule"
    >
      <NInput
        v-model:value="ruleNameInput"
        :placeholder="page.t('saveRulePlaceholder')"
      />
    </NModal>

    <NModal
      v-model:show="showResultModal"
      preset="card"
      :title="page.t('resultTitle')"
      style="width: 500px"
    >
      <div class="result-summary">
        <NProgress
          type="line"
          :percentage="results.length > 0 ? Math.round(successCount / results.length * 100) : 0"
          :indicator="false"
          :status="failCount > 0 ? 'warning' : 'success'"
        />
        <div class="result-stats">
          <span class="success">✓ {{ page.t('resultSuccess', { count: successCount }) }}</span>
          <span
            v-if="failCount > 0"
            class="fail"
          >✕ {{ page.t('resultFail', { count: failCount }) }}</span>
        </div>
      </div>
      <div class="result-list">
        <div
          v-for="result in results"
          :key="result.original"
          class="result-item"
          :class="{ error: !result.success }"
        >
          <span>{{ result.original }}</span>
          <span v-if="result.success">→ {{ result.renamed }}</span>
          <span
            v-else
            class="error-msg"
          >{{ result.error }}</span>
        </div>
      </div>
    </NModal>
  </PageLayout>
</template>

<style scoped>
.file-renamer-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.folder-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
}

.folder-label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-footnote);
}

.folder-path {
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-footnote);
  word-break: break-all;
}

.renamer-layout {
  display: grid;
  grid-template-columns: minmax(280px, 360px) 1fr;
  gap: var(--space-4);
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

@media (max-width: 900px) {
  .renamer-layout {
    grid-template-columns: 1fr;
  }
}

.panel-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  min-height: 480px;
  max-height: calc(100vh - 220px);
}

.panel-card :deep(.n-card-header) {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.panel-card :deep(.n-card__content) {
  padding: var(--space-4) var(--space-5);
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.panel-left {
  min-width: 0;
}

.panel-right {
  min-width: 0;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.section-title {
  font-size: var(--font-size-subhead);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.rule-chain-item {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}

.rule-chain-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.files-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.file-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.file-name {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-footnote);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-count {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.conflict-alert {
  margin-bottom: var(--space-3);
  flex-shrink: 0;
}

.preview-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.preview-table {
  width: 100%;
  min-width: 420px;
}

.preview-table-head,
.preview-table-row {
  display: grid;
  grid-template-columns: 1fr 28px 1fr;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2) var(--space-3);
}

.preview-table-head {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-caption1);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.preview-table-row {
  border-bottom: 1px solid var(--color-border);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-footnote);
}

.preview-table-row:last-child {
  border-bottom: none;
}

.preview-table-row:hover {
  background: var(--color-bg-secondary);
}

.preview-table-row.conflict {
  background: color-mix(in srgb, var(--color-error) 8%, transparent);
}

.col-original {
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-arrow {
  text-align: center;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.col-preview {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.preview-name {
  color: var(--color-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-name.conflict {
  color: var(--color-error);
}

.preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}

.result-summary {
  margin-bottom: var(--space-4);
}

.result-stats {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-2);
  font-size: var(--font-size-footnote);
}

.success {
  color: var(--color-success);
}

.fail {
  color: var(--color-error);
}

.result-list {
  max-height: 300px;
  overflow-y: auto;
}

.result-item {
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-footnote);
}

.result-item.error {
  color: var(--color-error);
}

.error-msg {
  display: block;
  font-size: var(--font-size-caption1);
  opacity: 0.7;
}

.saved-rules-list {
  max-height: 100px;
  overflow-y: auto;
}

.saved-rule-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.saved-rule-name {
  border: none;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  font-size: var(--font-size-footnote);
}

.empty-state {
  padding: var(--space-10) 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

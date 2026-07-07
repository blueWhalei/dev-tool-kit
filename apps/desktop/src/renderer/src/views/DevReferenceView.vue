<script setup lang="ts">
import { ref, computed, watch, onMounted, h } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NCard, NInput, NSelect, NTabs, NTabPane, NTag, NButton, NDataTable, type DataTableColumns
} from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import {
  DEV_REFERENCE_TAB_STORAGE_KEY,
  filterMimeTypes,
  filterGitCommands,
  filterHttpMethods,
  buildGitCommand,
  GIT_COMMAND_CATEGORIES,
  type GitCommandCategory,
  type GitCommandTemplate,
  type MimeTypeEntry,
  type HttpMethodEntry
} from '@dev-tool-kit/shared'

const VALID_TABS = ['mime', 'git', 'http-methods'] as const
type TabName = (typeof VALID_TABS)[number]

const route = useRoute()
const { t, locale } = useI18n()
const page = useToolI18n('devReference')
const { copy } = useCopyToClipboard()

const activeTab = ref<TabName>('mime')
const mimeQuery = ref('')
const gitQuery = ref('')
const gitCategory = ref<GitCommandCategory | 'all'>('all')
const httpQuery = ref('')
const gitParamValues = ref<Record<string, Record<string, string>>>({})

const localeKey = computed<'zh' | 'en'>(() => (locale.value.startsWith('zh') ? 'zh' : 'en'))

function resolveTab(tab: unknown): TabName | null {
  if (typeof tab === 'string' && (VALID_TABS as readonly string[]).includes(tab)) {
    return tab as TabName
  }
  return null
}

function applyRouteQuery() {
  const queryTab = resolveTab(route.query.tab)
  if (queryTab) activeTab.value = queryTab
}

onMounted(() => {
  applyRouteQuery()
  const saved = localStorage.getItem(DEV_REFERENCE_TAB_STORAGE_KEY)
  const savedTab = resolveTab(saved)
  if (!route.query.tab && savedTab) activeTab.value = savedTab
})

watch(() => route.query.tab, (tab) => {
  const resolved = resolveTab(tab)
  if (resolved) activeTab.value = resolved
})

watch(activeTab, (tab) => {
  localStorage.setItem(DEV_REFERENCE_TAB_STORAGE_KEY, tab)
})

const filteredMime = computed(() => filterMimeTypes(mimeQuery.value, localeKey.value))

const mimeColumns = computed((): DataTableColumns<MimeTypeEntry> => [
  { title: page.t('labels.extension'), key: 'extension', width: 100 },
  { title: page.t('labels.mime'), key: 'mime', minWidth: 200 },
  {
    title: page.t('labels.description'),
    key: 'description',
    render: (row) => localeKey.value === 'zh' ? row.descriptionZh : row.descriptionEn
  },
  {
    title: '',
    key: 'actions',
    width: 80,
    render: (row) => h(NButton, {
      size: 'small',
      quaternary: true,
      onClick: () => { void copy(row.mime, page.t('messages.copiedMime')) }
    }, { default: () => t('common.copy') })
  }
])

const filteredGit = computed(() =>
  filterGitCommands(gitQuery.value, gitCategory.value, localeKey.value)
)

const gitCategoryOptions = computed(() => [
  { label: page.t('labels.allCategories'), value: 'all' as const },
  ...GIT_COMMAND_CATEGORIES.map(cat => ({
    label: page.t(`gitCategories.${cat}`),
    value: cat
  }))
])

function ensureGitParams(template: GitCommandTemplate): Record<string, string> {
  if (!gitParamValues.value[template.id]) {
    const defaults: Record<string, string> = {}
    for (const p of template.params) {
      if (p.defaultValue) defaults[p.key] = p.defaultValue
    }
    gitParamValues.value[template.id] = defaults
  }
  return gitParamValues.value[template.id]
}

function setGitParam(templateId: string, key: string, value: string) {
  if (!gitParamValues.value[templateId]) {
    gitParamValues.value[templateId] = {}
  }
  gitParamValues.value[templateId][key] = value
}

function builtGitCommand(template: GitCommandTemplate): string {
  return buildGitCommand(template, ensureGitParams(template))
}

function gitTitle(template: GitCommandTemplate): string {
  return localeKey.value === 'zh' ? template.titleZh : template.titleEn
}

function gitDescription(template: GitCommandTemplate): string {
  return localeKey.value === 'zh' ? template.descriptionZh : template.descriptionEn
}

const filteredHttp = computed(() => filterHttpMethods(httpQuery.value, localeKey.value))

function httpDescription(entry: HttpMethodEntry): string {
  return localeKey.value === 'zh' ? entry.descriptionZh : entry.descriptionEn
}

function httpTypicalUse(entry: HttpMethodEntry): string {
  return localeKey.value === 'zh' ? entry.typicalUseZh : entry.typicalUseEn
}
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="dev-reference-view"
  >
    <NTabs
      v-model:value="activeTab"
      type="line"
      animated
    >
      <NTabPane
        name="mime"
        :tab="page.t('tabs.mime')"
      >
        <NCard
          class="filter-card"
          :bordered="false"
        >
          <span class="field-label">{{ page.t('labels.search') }}</span>
          <NInput
            v-model:value="mimeQuery"
            :placeholder="page.t('placeholders.searchMime')"
            clearable
          />
        </NCard>
        <NDataTable
          :columns="mimeColumns"
          :data="filteredMime"
          :bordered="false"
          size="small"
          :max-height="520"
          class="ref-table"
        />
        <p
          v-if="filteredMime.length === 0"
          class="empty-hint"
        >
          {{ page.t('labels.noResults') }}
        </p>
      </NTabPane>

      <NTabPane
        name="git"
        :tab="page.t('tabs.git')"
      >
        <NCard
          class="filter-card"
          :bordered="false"
        >
          <div class="filter-row">
            <div class="filter-field">
              <span class="field-label">{{ page.t('labels.search') }}</span>
              <NInput
                v-model:value="gitQuery"
                :placeholder="page.t('placeholders.searchGit')"
                clearable
              />
            </div>
            <div class="filter-field category-field">
              <span class="field-label">{{ page.t('labels.category') }}</span>
              <NSelect
                v-model:value="gitCategory"
                :options="gitCategoryOptions"
              />
            </div>
          </div>
        </NCard>
        <div
          v-if="filteredGit.length === 0"
          class="empty-hint"
        >
          {{ page.t('labels.noResults') }}
        </div>
        <NCard
          v-for="template in filteredGit"
          :key="template.id"
          class="git-card"
          :bordered="false"
        >
          <div class="git-header">
            <div>
              <div class="git-title">
                {{ gitTitle(template) }}
              </div>
              <div class="git-desc">
                {{ gitDescription(template) }}
              </div>
            </div>
            <NTag
              size="small"
              :bordered="false"
            >
              {{ page.t(`gitCategories.${template.category}`) }}
            </NTag>
          </div>
          <div
            v-if="template.params.length"
            class="git-params"
          >
            <span class="field-label">{{ page.t('labels.params') }}</span>
            <div
              v-for="param in template.params"
              :key="param.key"
              class="param-row"
            >
              <span class="param-label">{{ localeKey === 'zh' ? param.labelZh : param.labelEn }}</span>
              <NInput
                :value="ensureGitParams(template)[param.key] ?? ''"
                :placeholder="param.placeholder"
                size="small"
                @update:value="(v: string) => setGitParam(template.id, param.key, v)"
              />
            </div>
          </div>
          <div class="command-row">
            <code class="command-text">{{ builtGitCommand(template) }}</code>
            <NButton
              size="small"
              @click="copy(builtGitCommand(template), page.t('messages.copiedCommand'))"
            >
              {{ t('common.copy') }}
            </NButton>
          </div>
        </NCard>
      </NTabPane>

      <NTabPane
        name="http-methods"
        :tab="page.t('tabs.httpMethods')"
      >
        <NCard
          class="filter-card"
          :bordered="false"
        >
          <span class="field-label">{{ page.t('labels.search') }}</span>
          <NInput
            v-model:value="httpQuery"
            :placeholder="page.t('placeholders.searchHttp')"
            clearable
          />
        </NCard>
        <div
          v-if="filteredHttp.length === 0"
          class="empty-hint"
        >
          {{ page.t('labels.noResults') }}
        </div>
        <NCard
          v-for="entry in filteredHttp"
          :key="entry.method"
          class="http-card"
          :bordered="false"
        >
          <div class="http-header">
            <NTag
              type="info"
              size="medium"
            >
              {{ entry.method }}
            </NTag>
            <NTag
              size="small"
              :bordered="false"
            >
              {{ page.t('labels.safe') }}: {{ entry.safe ? page.t('bool.yes') : page.t('bool.no') }}
            </NTag>
            <NTag
              size="small"
              :bordered="false"
            >
              {{ page.t('labels.idempotent') }}: {{ entry.idempotent ? page.t('bool.yes') : page.t('bool.no') }}
            </NTag>
          </div>
          <p class="http-desc">
            {{ httpDescription(entry) }}
          </p>
          <p class="http-use">
            <strong>{{ page.t('labels.typicalUse') }}:</strong> {{ httpTypicalUse(entry) }}
          </p>
        </NCard>
      </NTabPane>
    </NTabs>
  </PageLayout>
</template>

<style scoped>
.dev-reference-view {
  max-width: 900px;
  margin: 0 auto;
}

.filter-card,
.git-card,
.http-card {
  background: var(--color-bg-primary);
  margin-bottom: var(--space-4);
}

.filter-row {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.filter-field {
  flex: 1;
  min-width: 200px;
}

.category-field {
  max-width: 220px;
}

.field-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.ref-table {
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
}

.git-header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.git-title {
  font-weight: 600;
  color: var(--color-text-primary);
}

.git-desc {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.git-params {
  margin-bottom: var(--space-3);
}

.param-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.param-label {
  min-width: 100px;
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.command-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.command-text {
  flex: 1;
  font-family: var(--font-family-mono);
  font-size: 13px;
  word-break: break-all;
}

.http-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  flex-wrap: wrap;
}

.http-desc {
  margin: 0 0 var(--space-2);
  color: var(--color-text-primary);
}

.http-use {
  margin: 0;
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.empty-hint {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-6);
}
</style>

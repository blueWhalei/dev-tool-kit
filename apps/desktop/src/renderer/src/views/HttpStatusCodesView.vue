<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NInput, NCard, NSelect, NTag } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import {
  HTTP_STATUS_CATEGORIES,
  filterAndGroupHttpStatusCodes,
  formatHttpStatusLine,
  type HttpStatusCategory,
  type HttpStatusCode
} from '@dev-tool-kit/shared'

const page = useToolI18n('httpStatusCodes')
const { locale } = useI18n()
const { copy } = useCopyToClipboard()

const searchQuery = ref('')
const selectedCategory = ref<HttpStatusCategory | 'all'>('all')

const categoryLabels: Record<HttpStatusCategory, string> = {
  '1xx': page.t('labels.informational'),
  '2xx': page.t('labels.success'),
  '3xx': page.t('labels.redirection'),
  '4xx': page.t('labels.clientError'),
  '5xx': page.t('labels.serverError')
}

const categoryOptions = computed(() => [
  { label: page.t('labels.allCategories'), value: 'all' as const },
  ...HTTP_STATUS_CATEGORIES.map(cat => ({ label: categoryLabels[cat], value: cat }))
])

const groupedCodes = computed(() =>
  filterAndGroupHttpStatusCodes({
    query: searchQuery.value,
    category: selectedCategory.value,
    locale: locale.value.startsWith('zh') ? 'zh' : 'en'
  })
)

const visibleCategories = computed(() =>
  HTTP_STATUS_CATEGORIES.filter(cat => groupedCodes.value[cat].length > 0)
)

const totalVisible = computed(() =>
  visibleCategories.value.reduce((sum, cat) => sum + groupedCodes.value[cat].length, 0)
)

const categoryTagType: Record<HttpStatusCategory, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  '1xx': 'default',
  '2xx': 'success',
  '3xx': 'info',
  '4xx': 'warning',
  '5xx': 'error'
}

function descriptionFor(entry: HttpStatusCode): string {
  return locale.value.startsWith('zh') ? entry.descriptionZh : entry.descriptionEn
}

async function copyCode(entry: HttpStatusCode, event: Event) {
  event.stopPropagation()
  await copy(String(entry.code), page.t('messages.copiedCode'))
}

async function copyLine(entry: HttpStatusCode) {
  await copy(formatHttpStatusLine(entry), page.t('messages.copiedLine'))
}
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="http-status-codes-view"
  >
    <NCard
      class="filter-card"
      :bordered="false"
    >
      <div class="filter-row">
        <div class="filter-field search-field">
          <span class="field-label">{{ page.t('labels.search') }}</span>
          <NInput
            v-model:value="searchQuery"
            :placeholder="page.t('placeholders.search')"
            clearable
          />
        </div>
        <div class="filter-field category-field">
          <span class="field-label">{{ page.t('labels.category') }}</span>
          <NSelect
            v-model:value="selectedCategory"
            :options="categoryOptions"
          />
        </div>
      </div>
    </NCard>

    <p
      v-if="totalVisible === 0"
      class="empty-hint"
    >
      {{ page.t('labels.noResults') }}
    </p>

    <section
      v-for="category in visibleCategories"
      :key="category"
      class="category-section"
    >
      <div class="category-header">
        <NTag
          size="small"
          :type="categoryTagType[category]"
        >
          {{ categoryLabels[category] }}
        </NTag>
        <span class="category-count">{{ groupedCodes[category].length }}</span>
      </div>

      <NCard
        class="codes-card"
        :bordered="false"
      >
        <button
          v-for="entry in groupedCodes[category]"
          :key="entry.code"
          type="button"
          class="code-row"
          @click="copyLine(entry)"
        >
          <span
            class="code-badge"
            @click="copyCode(entry, $event)"
          >{{ entry.code }}</span>
          <span class="code-name">{{ entry.name }}</span>
          <span class="code-desc">{{ descriptionFor(entry) }}</span>
        </button>
      </NCard>
    </section>
  </PageLayout>
</template>

<style scoped>
.http-status-codes-view {
  max-width: 840px;
  margin: 0 auto;
}

.filter-card,
.codes-card {
  background: var(--color-bg-primary);
  margin-bottom: var(--space-4);
}

.filter-row {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.search-field {
  flex: 1;
  min-width: 220px;
}

.category-field {
  width: 220px;
}

.field-label {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.empty-hint {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--space-6) 0;
}

.category-section {
  margin-bottom: var(--space-4);
}

.category-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.category-count {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.codes-card {
  padding: 0;
  overflow: hidden;
}

.code-row {
  display: grid;
  grid-template-columns: 64px 1fr;
  grid-template-rows: auto auto;
  gap: var(--space-1) var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.code-row:last-child {
  border-bottom: none;
}

.code-row:hover {
  background: var(--color-bg-secondary);
}

.code-badge {
  grid-row: 1 / span 2;
  align-self: center;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--color-text-primary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.code-badge:hover {
  color: var(--color-primary);
}

.code-name {
  font-size: var(--font-size-body);
  font-weight: 500;
  color: var(--color-text-primary);
}

.code-desc {
  grid-column: 2;
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
  line-height: 1.4;
}
</style>

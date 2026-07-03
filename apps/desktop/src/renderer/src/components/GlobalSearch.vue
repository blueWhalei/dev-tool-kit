<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { routes } from '../router'
import type { TabKeywordMapping } from '../router'
import { usePreferences } from '../stores/preferences'
import { useRouteLabels } from '../composables/useRouteLabels'
import ToolIcon from '../components/ToolIcon.vue'

interface SearchItem {
  id: string
  name: string
  route: string
  category: string
  icon: string
  keywords: string[]
  deepLinkTab?: string
  tabKeywords?: TabKeywordMapping[]
}

interface DisplayGroup {
  label?: string
  items: SearchItem[]
}

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'close'): void
}>()

const router = useRouter()
const { t, locale } = useI18n()
const { routeTitle, categoryLabel } = useRouteLabels()
const { recentTools } = usePreferences()

const searchQuery = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const searchItems = computed((): SearchItem[] => {
  void locale.value
  return routes
    .filter(r => r.name && r.meta?.titleKey && r.meta?.category && !r.meta?.hidden)
    .map(r => ({
      id: r.name as string,
      name: routeTitle(r),
      route: r.name as string,
      category: categoryLabel(r.meta!.category),
      icon: r.meta!.icon,
      keywords: r.meta!.keywords || [],
      deepLinkTab: r.meta!.deepLinkTab,
      tabKeywords: r.meta!.tabKeywords
    }))
})

function resolveTabForItem(item: SearchItem, query: string): string | undefined {
  const trimmed = query.trim().toLowerCase()
  if (item.tabKeywords && trimmed) {
    for (const { tab, keywords } of item.tabKeywords) {
      if (keywords.some(kw => {
        const lower = kw.toLowerCase()
        return lower.includes(trimmed) || trimmed.includes(lower)
      })) {
        return tab
      }
    }
  }
  return item.deepLinkTab
}

const filteredItems = computed(() => {
  const items = searchItems.value
  if (!searchQuery.value.trim()) {
    return items
  }

  const query = searchQuery.value.toLowerCase()
  return items.filter(item => {
    const nameMatch = item.name.toLowerCase().includes(query)
    const keywordMatch = item.keywords.some(kw => kw.toLowerCase().includes(query))
    const tabKeywordMatch = item.tabKeywords?.some(({ keywords }) =>
      keywords.some(kw => kw.toLowerCase().includes(query))
    )
    return nameMatch || keywordMatch || tabKeywordMatch
  })
})

const displayGroups = computed((): DisplayGroup[] => {
  const items = filteredItems.value
  if (searchQuery.value.trim()) {
    return [{ items }]
  }

  const allItems = searchItems.value
  const recentIds = new Set(recentTools.value)
  const recent = recentTools.value
    .map(name => allItems.find(item => item.id === name))
    .filter((item): item is SearchItem => Boolean(item))
  const rest = items.filter(item => !recentIds.has(item.id))

  if (recent.length === 0) {
    return [{ items: rest }]
  }

  return [
    { label: t('search.recent'), items: recent },
    { label: t('search.all'), items: rest }
  ]
})

const flatDisplayItems = computed(() =>
  displayGroups.value.flatMap(group => group.items)
)

watch(flatDisplayItems, () => {
  selectedIndex.value = 0
})

function handleKeydown(e: KeyboardEvent) {
  const items = flatDisplayItems.value
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, items.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (items.length > 0) {
      selectItem(items[selectedIndex.value])
    }
  } else if (e.key === 'Escape') {
    closeSearch()
  }
}

function selectItem(item: SearchItem) {
  const tab = resolveTabForItem(item, searchQuery.value)
  if (tab) {
    router.push({ name: item.route, query: { tab } })
  } else {
    router.push({ name: item.route })
  }
  closeSearch()
}

function getFlatIndex(item: SearchItem): number {
  return flatDisplayItems.value.findIndex(i => i.id === item.id)
}

function closeSearch() {
  searchQuery.value = ''
  selectedIndex.value = 0
  emit('update:show', false)
  emit('close')
}

function handleOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('search-overlay')) {
    closeSearch()
  }
}

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    window.addEventListener('keydown', handleKeydown)
    nextTick(() => inputRef.value?.focus())
  } else {
    window.removeEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="search-fade">
      <div
        v-if="show"
        class="search-overlay"
        @click="handleOverlayClick"
      >
        <div class="search-container">
          <div class="search-input-wrapper">
            <span class="search-icon"><ToolIcon name="search" :size="20" /></span>
            <input
              ref="inputRef"
              v-model="searchQuery"
              type="text"
              class="search-input"
              :placeholder="t('nav.searchPlaceholder')"
              autofocus
            />
            <span class="search-shortcut">⌘K</span>
          </div>
          
          <div v-if="flatDisplayItems.length > 0" class="search-results">
            <template v-for="(group, groupIndex) in displayGroups" :key="group.label ?? groupIndex">
              <div v-if="group.label" class="search-group-label">{{ group.label }}</div>
              <div
                v-for="item in group.items"
                :key="item.id"
                class="search-result-item"
                :class="{ 'selected': getFlatIndex(item) === selectedIndex }"
                @click="selectItem(item)"
                @mouseenter="selectedIndex = getFlatIndex(item)"
              >
                <span class="result-icon"><ToolIcon :name="item.icon" :size="22" /></span>
                <div class="result-content">
                  <span class="result-name">{{ item.name }}</span>
                  <span class="result-category">{{ item.category }}</span>
                </div>
              </div>
            </template>
          </div>
          
          <div v-else class="search-empty">
            <span class="empty-icon"><ToolIcon name="search" :size="28" /></span>
            <span class="empty-text">{{ t('search.empty') }}</span>
          </div>
          
          <div class="search-footer">
            <span class="footer-hint">
              <kbd>↑</kbd><kbd>↓</kbd> {{ t('search.navigate') }}
              <kbd>Enter</kbd> {{ t('search.select') }}
              <kbd>Esc</kbd> {{ t('search.close') }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 9999;
}

.dark .search-overlay {
  background: rgba(0, 0, 0, 0.6);
}

.search-container {
  width: 100%;
  max-width: 560px;
  background: var(--color-bg-primary);
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.dark .search-container {
  background: var(--color-bg-primary);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  gap: 12px;
}

.search-icon {
  font-size: 20px;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 18px;
  font-weight: 500;
  background: transparent;
  color: var(--color-text-primary);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-shortcut {
  font-size: 12px;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.search-results {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}

.search-group-label {
  padding: 8px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  gap: 12px;
  transition: background 0.15s ease;
}

.search-result-item:hover,
.search-result-item.selected {
  background: rgba(0, 122, 255, 0.1);
}

.search-result-item.selected {
  background: rgba(0, 122, 255, 0.15);
}

.result-icon {
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.result-category {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
}

.empty-icon {
  opacity: 0.5;
  color: var(--color-text-tertiary);
}

.empty-text {
  font-size: 14px;
  color: var(--color-text-tertiary);
}

.search-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: center;
}

.footer-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.footer-hint kbd {
  background: var(--color-bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.search-fade-enter-active,
.search-fade-leave-active {
  transition: opacity 0.2s ease;
}

.search-fade-enter-active .search-container,
.search-fade-leave-active .search-container {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
}

.search-fade-enter-from .search-container,
.search-fade-leave-to .search-container {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}
</style>

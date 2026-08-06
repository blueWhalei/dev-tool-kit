import { ref, watch, onMounted, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { safeStorageGet, safeStorageSet } from '../utils/safeStorage'

export interface TabNavigationConfig<TTab extends string, TCategory extends string> {
  validTabs: readonly TTab[]
  tabCategories: Record<TCategory, readonly TTab[]>
  defaultCategory: TCategory
  storageKey: string
}

export interface TabNavigationReturn<TTab extends string, TCategory extends string> {
  activeTab: Ref<TTab>
  activeCategory: Ref<TCategory>
  categoryForTab: (tab: TTab) => TCategory
  showTab: (tab: TTab) => boolean
  syncCategoryFromTab: (tab: TTab) => void
  ensureTabInCategory: () => void
  resolveTab: (tab: unknown) => TTab | null
}

/**
 * 工具页 tab/分类状态机：路由深链（?tab=）、localStorage 记忆、分类联动。
 * 在 ImageToolsView / CodeConverterView / DevReferenceView / JWTGeneratorView
 * 等含多 tab 的工具页间复用，消除逐字重复的状态机代码。
 */
export function useTabNavigation<TTab extends string, TCategory extends string>(
  config: TabNavigationConfig<TTab, TCategory>
): TabNavigationReturn<TTab, TCategory> {
  const route = useRoute()
  const activeTab = ref<TTab>(config.validTabs[0])
  const activeCategory = ref<TCategory>(config.defaultCategory)

  function categoryForTab(tab: TTab): TCategory {
    const entries = Object.entries(config.tabCategories) as [TCategory, readonly TTab[]][]
    const found = entries.find(([, tabs]) => tabs.includes(tab))
    return found ? found[0] : config.defaultCategory
  }

  function showTab(tab: TTab): boolean {
    return (config.tabCategories as Record<string, readonly TTab[]>)[activeCategory.value].includes(tab)
  }

  function syncCategoryFromTab(tab: TTab): void {
    activeCategory.value = categoryForTab(tab)
  }

  function ensureTabInCategory(): void {
    const tabs = (config.tabCategories as Record<string, readonly TTab[]>)[activeCategory.value]
    if (!tabs.includes(activeTab.value)) {
      activeTab.value = tabs[0]
    }
  }

  function resolveTab(tab: unknown): TTab | null {
    if (typeof tab === 'string' && (config.validTabs as readonly string[]).includes(tab)) {
      return tab as TTab
    }
    return null
  }

  onMounted(() => {
    const queryTab = resolveTab(route.query.tab)
    if (queryTab) {
      activeTab.value = queryTab
    } else {
      const saved = safeStorageGet(config.storageKey)
      const savedTab = resolveTab(saved)
      if (savedTab) activeTab.value = savedTab
    }
    syncCategoryFromTab(activeTab.value)
  })

  watch(activeTab, (tab) => {
    safeStorageSet(config.storageKey, tab)
    syncCategoryFromTab(tab)
  })

  watch(activeCategory, () => {
    ensureTabInCategory()
  })

  watch(
    () => route.query.tab,
    (tab) => {
      const resolved = resolveTab(tab)
      if (resolved) {
        activeTab.value = resolved
        syncCategoryFromTab(resolved)
      }
    }
  )

  return {
    // 泛型场景下 Vue 的 UnwrapRef 与声明类型存在推断差，显式断言收敛
    activeTab: activeTab as Ref<TTab>,
    activeCategory: activeCategory as Ref<TCategory>,
    categoryForTab,
    showTab,
    syncCategoryFromTab,
    ensureTabInCategory,
    resolveTab
  }
}

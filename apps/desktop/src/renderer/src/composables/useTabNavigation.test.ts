import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp, defineComponent, h, nextTick, type App } from 'vue'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { useTabNavigation, type TabNavigationReturn } from './useTabNavigation'

const VALID_TABS = ['a', 'b', 'c'] as const
const TAB_CATEGORIES = {
  basic: ['a', 'b'],
  advanced: ['c']
} as const
const STORAGE_KEY = 'test-tab-nav-key'

interface Harness {
  app: App
  router: Router
  nav: TabNavigationReturn<typeof VALID_TABS[number], keyof typeof TAB_CATEGORIES>
  unmount: () => void
}

async function mountHarness(query: Record<string, string> = {}): Promise<Harness> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div/>' } }]
  })
  await router.push({ path: '/', query })
  await router.isReady()

  let nav: TabNavigationReturn<typeof VALID_TABS[number], keyof typeof TAB_CATEGORIES> | null = null
  const Comp = defineComponent({
    setup() {
      nav = useTabNavigation({
        validTabs: VALID_TABS,
        tabCategories: TAB_CATEGORIES,
        defaultCategory: 'basic',
        storageKey: STORAGE_KEY
      })
      return () => h('div')
    }
  })

  const app = createApp(Comp)
  app.use(router)
  const root = document.createElement('div')
  document.body.appendChild(root)
  app.mount(root)
  await nextTick()
  await nextTick()

  return {
    app,
    router,
    nav: nav!,
    unmount: () => {
      app.unmount()
      root.remove()
    }
  }
}

beforeEach(() => {
  window.localStorage.removeItem(STORAGE_KEY)
})

afterEach(() => {
  window.localStorage.removeItem(STORAGE_KEY)
})

describe('useTabNavigation', () => {
  it('defaults to first tab in default category', async () => {
    const { nav, unmount } = await mountHarness()
    expect(nav.activeTab.value).toBe('a')
    expect(nav.activeCategory.value).toBe('basic')
    expect(nav.showTab('a')).toBe(true)
    expect(nav.showTab('b')).toBe(true)
    expect(nav.showTab('c')).toBe(false)
    unmount()
  })

  it('restores tab from localStorage when no deep link is present', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'c')
    const { nav, unmount } = await mountHarness()
    expect(nav.activeTab.value).toBe('c')
    expect(nav.activeCategory.value).toBe('advanced')
    unmount()
  })

  it('deep link query.tab wins over localStorage', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'a')
    const { nav, unmount } = await mountHarness({ tab: 'b' })
    expect(nav.activeTab.value).toBe('b')
    expect(nav.activeCategory.value).toBe('basic')
    unmount()
  })

  it('persists tab changes and syncs category', async () => {
    const { nav, unmount } = await mountHarness()
    nav.activeTab.value = 'c'
    await nextTick()
    expect(nav.activeCategory.value).toBe('advanced')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('c')
    unmount()
  })

  it('switching category re-anchors active tab into that category', async () => {
    const { nav, unmount } = await mountHarness()
    nav.activeTab.value = 'c'
    await nextTick()
    // 切回 basic 分类：当前 tab 'c' 不在该分类，回退到分类首 tab
    ;(nav.activeCategory as { value: 'basic' | 'advanced' }).value = 'basic'
    await nextTick()
    expect(nav.activeTab.value).toBe('a')
    unmount()
  })

  it('resolveTab validates against known tabs', async () => {
    const { nav, unmount } = await mountHarness()
    expect(nav.resolveTab('a')).toBe('a')
    expect(nav.resolveTab('unknown')).toBeNull()
    expect(nav.resolveTab(42)).toBeNull()
    unmount()
  })
})

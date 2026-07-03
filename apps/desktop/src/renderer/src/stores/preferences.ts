import { useLocalStorage } from '@vueuse/core'
import {
  PINNED_TOOLS_STORAGE_KEY,
  CODE_CONVERTER_TAB_STORAGE_KEY,
  PREFERENCES_EXPORT_VERSION,
  type AppPreferencesExport
} from '@dev-tool-kit/shared/constants'
import {
  LOCALE_STORAGE_KEY,
  resolveAppLocale,
  type AppLocale,
  type LocalePreference
} from '../utils/locale'

export type ThemePreference = 'light' | 'dark' | 'system'
export type { LocalePreference, AppLocale }
export type PreferencesImportError = 'invalidConfig' | 'unsupportedVersion'

const THEME_STORAGE_KEY = 'dev-toolkit-theme'
const RECENT_TOOLS_KEY = 'dev-toolkit-recent-tools'
const DEFAULT_HOME_KEY = 'dev-toolkit-default-home'
const MAX_RECENT_TOOLS = 5

const themePreference = useLocalStorage<ThemePreference>(THEME_STORAGE_KEY, 'system')
const localePreference = useLocalStorage<LocalePreference>(LOCALE_STORAGE_KEY, 'system')
const recentTools = useLocalStorage<string[]>(RECENT_TOOLS_KEY, [])
const defaultHomeRoute = useLocalStorage<string>(DEFAULT_HOME_KEY, 'PortManager')
const pinnedTools = useLocalStorage<string[]>(PINNED_TOOLS_STORAGE_KEY, [])

export { resolveAppLocale }

export function getDefaultHomeRoute(): string {
  return defaultHomeRoute.value || 'PortManager'
}

export function pushRecentTool(routeName: string) {
  if (!routeName || routeName === 'NotFound' || routeName === 'About' || routeName === 'Settings') return
  const filtered = recentTools.value.filter(name => name !== routeName)
  recentTools.value = [routeName, ...filtered].slice(0, MAX_RECENT_TOOLS)
}

export function usePreferences() {
  function resolveDark(preference: ThemePreference): boolean {
    if (preference === 'dark') return true
    if (preference === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  function setThemePreference(preference: ThemePreference) {
    themePreference.value = preference
  }

  function setLocalePreference(preference: LocalePreference) {
    localePreference.value = preference
  }

  function setDefaultHomeRoute(routeName: string) {
    defaultHomeRoute.value = routeName
  }

  function clearRecentTools() {
    recentTools.value = []
  }

  function toggleThemePreference(): ThemePreference {
    const next: ThemePreference = resolveDark(themePreference.value) ? 'light' : 'dark'
    themePreference.value = next
    return next
  }

  function setPinnedTools(tools: string[]) {
    pinnedTools.value = tools
  }

  function togglePinnedTool(routeName: string) {
    if (pinnedTools.value.includes(routeName)) {
      pinnedTools.value = pinnedTools.value.filter(name => name !== routeName)
    } else {
      pinnedTools.value = [...pinnedTools.value, routeName]
    }
  }

  function movePinnedTool(routeName: string, direction: 'up' | 'down') {
    const list = [...pinnedTools.value]
    const index = list.indexOf(routeName)
    if (index === -1) return
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= list.length) return
    ;[list[index], list[target]] = [list[target], list[index]]
    pinnedTools.value = list
  }

  function exportPreferencesData(): AppPreferencesExport {
    return {
      version: PREFERENCES_EXPORT_VERSION,
      themePreference: themePreference.value,
      localePreference: localePreference.value,
      defaultHomeRoute: defaultHomeRoute.value,
      pinnedTools: [...pinnedTools.value],
      recentTools: [...recentTools.value],
      codeConverterTab: localStorage.getItem(CODE_CONVERTER_TAB_STORAGE_KEY) ?? undefined
    }
  }

  function importPreferencesData(data: unknown): { success: boolean; error?: PreferencesImportError } {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'invalidConfig' }
    }
    const payload = data as Partial<AppPreferencesExport>
    if (payload.version !== PREFERENCES_EXPORT_VERSION) {
      return { success: false, error: 'unsupportedVersion' }
    }
    if (payload.themePreference && ['light', 'dark', 'system'].includes(payload.themePreference)) {
      themePreference.value = payload.themePreference
    }
    if (payload.localePreference && ['zh-CN', 'en-US', 'system'].includes(payload.localePreference)) {
      localePreference.value = payload.localePreference
    }
    if (typeof payload.defaultHomeRoute === 'string' && payload.defaultHomeRoute) {
      defaultHomeRoute.value = payload.defaultHomeRoute
    }
    if (Array.isArray(payload.pinnedTools)) {
      pinnedTools.value = payload.pinnedTools.filter((item): item is string => typeof item === 'string')
    }
    if (Array.isArray(payload.recentTools)) {
      recentTools.value = payload.recentTools
        .filter((item): item is string => typeof item === 'string')
        .slice(0, MAX_RECENT_TOOLS)
    }
    if (typeof payload.codeConverterTab === 'string') {
      localStorage.setItem(CODE_CONVERTER_TAB_STORAGE_KEY, payload.codeConverterTab)
    }
    return { success: true }
  }

  function clearAllPreferences() {
    themePreference.value = 'system'
    localePreference.value = 'system'
    defaultHomeRoute.value = 'PortManager'
    pinnedTools.value = []
    recentTools.value = []
    localStorage.removeItem(CODE_CONVERTER_TAB_STORAGE_KEY)
  }

  return {
    themePreference,
    localePreference,
    recentTools,
    defaultHomeRoute,
    pinnedTools,
    resolveDark,
    resolveAppLocale,
    setThemePreference,
    setLocalePreference,
    setDefaultHomeRoute,
    clearRecentTools,
    toggleThemePreference,
    pushRecentTool,
    setPinnedTools,
    togglePinnedTool,
    movePinnedTool,
    exportPreferencesData,
    importPreferencesData,
    clearAllPreferences
  }
}

export type LocalePreference = 'zh-CN' | 'en-US' | 'system'
export type AppLocale = 'zh-CN' | 'en-US'

export const LOCALE_STORAGE_KEY = 'dev-toolkit-locale'

export function readStoredLocalePreference(): LocalePreference {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (raw === 'zh-CN' || raw === 'en-US' || raw === 'system') {
      return raw
    }
  } catch {
    // localStorage may be unavailable during early module init
  }
  return 'system'
}

export function resolveAppLocale(preference: LocalePreference): AppLocale {
  if (preference === 'zh-CN' || preference === 'en-US') {
    return preference
  }
  const lang = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'zh-cn'
  return lang.startsWith('zh') ? 'zh-CN' : 'en-US'
}

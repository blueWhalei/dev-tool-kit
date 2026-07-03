<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  lightTheme,
  darkTheme,
  zhCN,
  enUS,
  dateZhCN,
  dateEnUS,
  type GlobalThemeOverrides
} from 'naive-ui'
import AppLayout from './components/AppLayout.vue'
import { setupGlobalErrorHandler } from './utils/error-handler'
import { updateMessageTheme } from './utils/discrete'
import { usePreferences, type ThemePreference, type LocalePreference } from './stores/preferences'

const isDark = ref(false)
const theme = ref(lightTheme)
const { themePreference, localePreference, resolveDark, resolveAppLocale, setThemePreference, setLocalePreference } = usePreferences()
const { locale } = useI18n()

const themeOverrides = ref<GlobalThemeOverrides>({
  common: {
    primaryColor: '#007AFF',
    primaryColorHover: '#0A84FF',
    primaryColorPressed: '#0056B3',
    borderRadius: '8px',
    borderRadiusSmall: '6px'
  }
})

const naiveLocale = computed(() => (locale.value === 'zh-CN' ? zhCN : enUS))
const naiveDateLocale = computed(() => (locale.value === 'zh-CN' ? dateZhCN : dateEnUS))

function applyTheme(dark: boolean) {
  isDark.value = dark
  theme.value = dark ? darkTheme : lightTheme
  document.body.classList.toggle('dark', dark)
  document.documentElement.classList.toggle('dark', dark)
}

function applyLocale(preference: LocalePreference) {
  locale.value = resolveAppLocale(preference)
  document.documentElement.lang = locale.value
}

function selectThemePreference(preference: ThemePreference) {
  setThemePreference(preference)
  applyTheme(resolveDark(preference))
}

function selectLocalePreference(preference: LocalePreference) {
  setLocalePreference(preference)
  applyLocale(preference)
}

provide('isDark', isDark)
provide('themePreference', themePreference)
provide('localePreference', localePreference)
provide('selectThemePreference', selectThemePreference)
provide('selectLocalePreference', selectLocalePreference)

watch(isDark, (dark) => {
  updateMessageTheme(dark)
})

watch(themePreference, (preference) => {
  applyTheme(resolveDark(preference))
})

watch(localePreference, (preference) => {
  applyLocale(preference)
}, { immediate: true })

let cleanupThemeListener: (() => void) | null = null
let cleanupMediaQuery: (() => void) | null = null

onMounted(async () => {
  setupGlobalErrorHandler()
  applyTheme(resolveDark(themePreference.value))
  applyLocale(localePreference.value)

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemThemeChange = () => {
    if (themePreference.value === 'system') {
      applyTheme(resolveDark('system'))
    }
  }
  mediaQuery.addEventListener('change', onSystemThemeChange)
  cleanupMediaQuery = () => mediaQuery.removeEventListener('change', onSystemThemeChange)

  if (window.electronAPI) {
    cleanupThemeListener = window.electronAPI.on('theme:changed', (dark: unknown) => {
      if (themePreference.value === 'system') {
        applyTheme(typeof dark === 'boolean' ? dark : resolveDark('system'))
      }
    })
  }
})

onUnmounted(() => {
  cleanupThemeListener?.()
  cleanupMediaQuery?.()
})
</script>

<template>
  <NConfigProvider
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
  >
    <NMessageProvider>
      <NDialogProvider>
        <AppLayout />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>

<script setup lang="ts">
import { computed, inject, ref, onMounted, onUnmounted, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { NLayout, NLayoutSider, NLayoutContent, NMenu, NButton, NDropdown } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import GlobalSearch from './GlobalSearch.vue'
import ToolIcon from './ToolIcon.vue'
import AppLogo from './AppLogo.vue'
import { useMenuOptions } from '../composables/useMenuOptions'
import { usePreferences, type ThemePreference, type LocalePreference } from '../stores/preferences'

const isMac = navigator.platform.toUpperCase().includes('MAC')
const searchShortcut = isMac ? '⌘K' : 'Ctrl+K'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const isDark = inject<Ref<boolean>>('isDark', ref(false))
const themePreference = inject<Ref<ThemePreference>>('themePreference', ref('system'))
const localePreference = inject<Ref<LocalePreference>>('localePreference', ref('system'))
const selectThemePreference = inject<(preference: ThemePreference) => void>('selectThemePreference', () => {})
const selectLocalePreference = inject<(preference: LocalePreference) => void>('selectLocalePreference', () => {})

const showSearch = ref(false)

const themeOptions = computed<DropdownOption[]>(() => [
  { label: t('theme.light'), key: 'light' },
  { label: t('theme.dark'), key: 'dark' },
  { label: t('theme.system'), key: 'system' }
])

const localeOptions = computed<DropdownOption[]>(() => [
  { label: t('locale.zhCN'), key: 'zh-CN' },
  { label: t('locale.enUS'), key: 'en-US' },
  { label: t('locale.system'), key: 'system' }
])

const themeIconName = computed(() => {
  if (themePreference.value === 'system') return 'theme-system'
  return isDark.value ? 'theme-light' : 'theme-dark'
})

const themeTitle = computed(() => {
  const mode = themePreference.value === 'system'
    ? t('theme.system')
    : themePreference.value === 'dark'
      ? t('theme.dark')
      : t('theme.light')
  return t('theme.label', { mode })
})

const localeShortLabel = computed(() => {
  if (localePreference.value === 'system') return t('locale.system')
  if (localePreference.value === 'en-US') return 'EN'
  return '中'
})

function handleThemeSelect(key: string | number) {
  selectThemePreference(key as ThemePreference)
}

function handleLocaleSelect(key: string | number) {
  selectLocalePreference(key as LocalePreference)
}

function openSearch() {
  showSearch.value = true
}

function closeSearch() {
  showSearch.value = false
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    showSearch.value = !showSearch.value
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

const menuOptions = useMenuOptions()
const { pinnedTools } = usePreferences()

const activeKey = computed(() => {
  const name = route.name as string
  if (pinnedTools.value.includes(name)) {
    return `pinned-${name}`
  }
  return name
})

function handleMenuSelect(key: string) {
  const routeName = key.startsWith('pinned-') ? key.slice('pinned-'.length) : key
  router.push({ name: routeName })
}
</script>

<template>
  <NLayout class="app-layout" has-sider position="absolute">
    <NLayoutSider
      bordered
      :width="220"
      :native-scrollbar="false"
      class="sidebar"
    >
      <div class="sidebar-header">
        <div class="sidebar-brand">
          <AppLogo :size="24" class="sidebar-logo-img" />
          <span class="sidebar-logo-text">DevToolkit</span>
        </div>
        <button
          type="button"
          class="sidebar-search-trigger"
          :title="t('nav.searchTitle', { shortcut: searchShortcut })"
          @click="openSearch"
        >
          <ToolIcon name="search" :size="16" class="sidebar-search-icon" />
          <span class="sidebar-search-label">{{ t('nav.searchPlaceholder') }}</span>
          <kbd class="sidebar-search-kbd">{{ searchShortcut }}</kbd>
        </button>
      </div>

      <div class="sidebar-body">
        <div class="sidebar-menu">
          <NMenu
            :options="menuOptions"
            :value="activeKey"
            :indent="24"
            @update:value="handleMenuSelect"
          />
        </div>
        <div class="sidebar-footer">
          <NButton
            quaternary
            block
            size="small"
            :type="activeKey === 'Settings' ? 'primary' : 'default'"
            @click="router.push({ name: 'Settings' })"
          >
            <template #icon>
              <ToolIcon name="settings" :size="16" />
            </template>
            {{ t('common.settings') }}
          </NButton>
          <NButton
            quaternary
            block
            size="small"
            :type="activeKey === 'About' ? 'primary' : 'default'"
            @click="router.push({ name: 'About' })"
          >
            <template #icon>
              <ToolIcon name="info" :size="16" />
            </template>
            {{ t('common.about') }}
          </NButton>
          <div class="sidebar-preferences">
            <NDropdown trigger="click" :options="localeOptions" @select="handleLocaleSelect">
              <button
                type="button"
                class="sidebar-pref-btn"
                :title="localePreference === 'system' ? t('locale.system') : localePreference === 'en-US' ? t('locale.enUS') : t('locale.zhCN')"
              >
                <ToolIcon name="convert" :size="14" />
                <span>{{ localeShortLabel }}</span>
              </button>
            </NDropdown>
            <NDropdown trigger="click" :options="themeOptions" @select="handleThemeSelect">
              <button
                type="button"
                class="sidebar-pref-btn"
                :title="themeTitle"
              >
                <ToolIcon :name="themeIconName" :size="14" />
              </button>
            </NDropdown>
          </div>
        </div>
      </div>
    </NLayoutSider>

    <NLayout>
      <NLayoutContent
        class="app-content"
        :content-style="{ padding: '16px' }"
      >
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </NLayoutContent>
    </NLayout>

    <GlobalSearch v-model:show="showSearch" @close="closeSearch" />
  </NLayout>
</template>

<style scoped>
.sidebar {
  background: var(--color-bg-secondary) !important;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.sidebar :deep(.n-layout-sider-scroll-container) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-header {
  padding: var(--space-3) var(--space-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.sidebar-logo-img {
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.sidebar-logo-text {
  font-family: var(--font-family-display);
  font-size: var(--font-size-title2);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.sidebar-search-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.sidebar-search-trigger:hover {
  background: var(--color-bg-tertiary);
  border-color: var(--color-border-strong, var(--color-border));
  color: var(--color-text-primary);
}

.sidebar-search-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.sidebar-search-label {
  flex: 1;
  min-width: 0;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-search-kbd {
  flex-shrink: 0;
  font-family: var(--font-family-mono, ui-monospace, monospace);
  font-size: 10px;
  line-height: 1;
  padding: 2px 5px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
}

.sidebar-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sidebar-footer {
  padding: var(--space-3) var(--space-md);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  background: var(--color-bg-secondary);
  position: relative;
  z-index: 1;
}

.sidebar-preferences {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-1);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.sidebar-pref-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  flex: 1;
  min-height: 28px;
  padding: var(--space-1) var(--space-2);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.sidebar-pref-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.sidebar-menu {
  padding: var(--space-2) 0;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
}

.sidebar-menu :deep(.n-menu-item-content) {
  color: var(--color-text-primary) !important;
}

.sidebar-menu :deep(.n-menu-item) {
  color: var(--color-text-primary);
}

.sidebar-menu :deep(.n-menu-item-content__header) {
  color: var(--color-text-primary) !important;
}

.sidebar-menu :deep(.n-menu-item-content__icon) {
  color: var(--color-text-primary) !important;
}

.sidebar-menu :deep(.n-menu-item-content__arrow) {
  color: var(--color-text-primary) !important;
}

.sidebar-menu :deep(.n-menu-item-content:hover) {
  background: var(--color-bg-tertiary) !important;
}

.sidebar-menu :deep(.n-menu-item-content--selected) {
  background: var(--color-primary-light) !important;
  color: var(--color-primary) !important;
}

.sidebar-menu :deep(.n-menu-item-content--selected .n-menu-item-content__header) {
  color: var(--color-primary) !important;
}

.sidebar-menu :deep(.n-menu-item-content--selected .n-menu-item-content__icon) {
  color: var(--color-primary) !important;
}

.sidebar-menu :deep(.n-menu-item-content--selected .n-menu-item-content__arrow) {
  color: var(--color-primary) !important;
}

.dark .sidebar-menu :deep(.n-menu-item-content:hover) {
  background: var(--color-bg-tertiary) !important;
}

.dark .sidebar-menu :deep(.n-menu-item-content--selected) {
  background: rgba(0, 122, 255, 0.15) !important;
  color: var(--color-primary) !important;
}

.dark .sidebar-menu :deep(.n-menu-item-content--selected .n-menu-item-content__header) {
  color: var(--color-primary) !important;
}

.dark .sidebar-menu :deep(.n-menu-item-content--selected .n-menu-item-content__icon) {
  color: var(--color-primary) !important;
}

.dark .sidebar-menu :deep(.n-menu-item-content--selected .n-menu-item-content__arrow) {
  color: var(--color-primary) !important;
}

.app-content {
  transition: margin-left var(--transition-normal);
  background: var(--color-bg-primary);
  overflow-y: auto;
}

.page-enter-active,
.page-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

<script setup lang="ts">
import { computed, h, inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NSelect, NButton, NList, NListItem, NThing, NPopconfirm, useMessage } from 'naive-ui'
import type { SelectOption, SelectRenderOption } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import SettingsSection from '../components/SettingsSection.vue'
import SettingsRow from '../components/SettingsRow.vue'
import ToolIcon from '../components/ToolIcon.vue'
import { routes } from '../router'
import { useRouteLabels } from '../composables/useRouteLabels'
import {
  usePreferences,
  type ThemePreference,
  type LocalePreference,
  type PreferencesImportError
} from '../stores/preferences'

const router = useRouter()
const message = useMessage()
const { t, locale } = useI18n()
const { routeTitle } = useRouteLabels()
const importInputRef = ref<HTMLInputElement | null>(null)
const {
  themePreference,
  localePreference,
  recentTools,
  defaultHomeRoute,
  setThemePreference,
  setLocalePreference,
  setDefaultHomeRoute,
  clearRecentTools,
  pinnedTools,
  setPinnedTools,
  movePinnedTool,
  exportPreferencesData,
  importPreferencesData,
  clearAllPreferences
} = usePreferences()

const selectThemePreference = inject<(preference: ThemePreference) => void>('selectThemePreference', (p) => {
  setThemePreference(p)
})

const selectLocalePreference = inject<(preference: LocalePreference) => void>('selectLocalePreference', (p) => {
  setLocalePreference(p)
})

const themeOptions = computed(() => [
  { value: 'light' as const, label: t('theme.light'), icon: 'theme-light' },
  { value: 'dark' as const, label: t('theme.dark'), icon: 'theme-dark' },
  { value: 'system' as const, label: t('theme.system'), icon: 'theme-system' }
])

const localeOptions = computed(() => [
  { value: 'zh-CN' as const, label: t('locale.zhCN'), icon: 'convert' },
  { value: 'en-US' as const, label: t('locale.enUS'), icon: 'convert' },
  { value: 'system' as const, label: t('locale.system'), icon: 'theme-system' }
])

const homeOptions = computed(() => {
  void locale.value
  return routes
    .filter(r => r.name && r.meta?.titleKey && r.meta?.category && !r.meta?.hidden)
    .map(r => ({
      label: routeTitle(r),
      value: r.name as string,
      icon: r.meta!.icon as string
    }))
})

const routeIconMap = computed(() =>
  Object.fromEntries(homeOptions.value.map(o => [o.value, o.icon]))
)

const recentItems = computed(() => {
  void locale.value
  return recentTools.value
    .map(name => {
      const route = routes.find(r => r.name === name)
      if (!route?.meta?.titleKey) return null
      return {
        name: routeTitle(route),
        icon: route.meta.icon,
        routeName: name as string
      }
    })
    .filter(Boolean) as Array<{ name: string; icon: string; routeName: string }>
})

function renderHomeLabel(option: SelectOption) {
  const icon = routeIconMap.value[option.value as string] ?? 'unknown'
  return h('div', { class: 'home-option' }, [
    h(ToolIcon, { name: icon, size: 16 }),
    h('span', null, option.label as string)
  ])
}

const renderHomeOption: SelectRenderOption = ({ node, option }) => {
  const icon = routeIconMap.value[option.value as string] ?? 'unknown'
  return h('div', { class: 'home-option' }, [
    h(ToolIcon, { name: icon, size: 16 }),
    node
  ])
}

function handleThemeChange(value: ThemePreference) {
  selectThemePreference(value)
}

function handleLocaleChange(value: LocalePreference) {
  selectLocalePreference(value)
}

function handleHomeChange(value: string) {
  setDefaultHomeRoute(value)
  message.success(t('settings.defaultHomeUpdated'))
}

function handlePinnedChange(value: string[]) {
  setPinnedTools(value)
}

function handleClearRecent() {
  clearRecentTools()
  message.success(t('settings.recentCleared'))
}

function openRecentTool(routeName: string) {
  router.push({ name: routeName })
}

const pinnedItems = computed(() => {
  void locale.value
  return pinnedTools.value
    .map(name => {
      const route = routes.find(r => r.name === name)
      if (!route?.meta?.titleKey) return null
      return {
        routeName: name as string,
        title: routeTitle(route),
        icon: route.meta.icon as string
      }
    })
    .filter(Boolean) as Array<{ routeName: string; title: string; icon: string }>
})

function importErrorMessage(error?: PreferencesImportError) {
  if (error === 'invalidConfig') return t('settings.invalidConfig')
  if (error === 'unsupportedVersion') return t('settings.unsupportedVersion')
  return t('settings.importFailed')
}

function handleExportPreferences() {
  const data = exportPreferencesData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dev-toolkit-settings-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  message.success(t('settings.exportSuccess'))
}

function triggerImport() {
  importInputRef.value?.click()
}

async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const result = importPreferencesData(data)
    if (result.success) {
      message.success(t('settings.importSuccess'))
    } else {
      message.error(importErrorMessage(result.error))
    }
  } catch {
    message.error(t('settings.importReadError'))
  }
}

function handleClearAll() {
  clearAllPreferences()
  selectThemePreference('system')
  selectLocalePreference('system')
  message.success(t('settings.resetSuccess'))
}
</script>

<template>
  <PageLayout
    :title="t('settings.title')"
    :description="t('settings.description')"
    container-class="settings-view"
  >
    <input
      ref="importInputRef"
      type="file"
      accept="application/json,.json"
      class="hidden-input"
      @change="handleImportFile"
    >
    <div class="settings-list">
      <SettingsSection
        :title="t('settings.appearance')"
        icon="theme-system"
      >
        <SettingsRow
          :label="t('settings.theme')"
          :description="t('settings.themeDescription')"
        >
          <div class="theme-cards">
            <button
              v-for="option in themeOptions"
              :key="option.value"
              type="button"
              class="theme-card"
              :class="{ active: themePreference === option.value }"
              @click="handleThemeChange(option.value)"
            >
              <ToolIcon
                :name="option.icon"
                :size="24"
              />
              <span>{{ option.label }}</span>
            </button>
          </div>
        </SettingsRow>
        <SettingsRow
          :label="t('settings.language')"
          :description="t('settings.languageDescription')"
        >
          <div class="theme-cards">
            <button
              v-for="option in localeOptions"
              :key="option.value"
              type="button"
              class="theme-card"
              :class="{ active: localePreference === option.value }"
              @click="handleLocaleChange(option.value)"
            >
              <ToolIcon
                :name="option.icon"
                :size="24"
              />
              <span>{{ option.label }}</span>
            </button>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        :title="t('settings.startup')"
        icon="port"
      >
        <SettingsRow
          :label="t('settings.defaultHome')"
          :description="t('settings.defaultHomeDescription')"
        >
          <NSelect
            :value="defaultHomeRoute"
            :options="homeOptions"
            :render-label="renderHomeLabel"
            :render-option="renderHomeOption"
            to="body"
            style="width: 240px"
            @update:value="handleHomeChange"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        :title="t('settings.sidebarPins')"
        icon="key"
      >
        <SettingsRow
          :label="t('settings.pinnedTools')"
          :description="t('settings.pinnedToolsDescription')"
        >
          <NSelect
            :value="pinnedTools"
            :options="homeOptions"
            :render-label="renderHomeLabel"
            :render-option="renderHomeOption"
            multiple
            filterable
            :placeholder="t('settings.pinnedToolsPlaceholder')"
            consistent-menu-width
            to="body"
            class="pinned-select"
            @update:value="handlePinnedChange"
          />
        </SettingsRow>
        <SettingsRow
          v-if="pinnedItems.length > 0"
          :label="t('settings.pinOrder')"
          :description="t('settings.pinOrderDescription')"
        >
          <NList class="pinned-order-list">
            <NListItem
              v-for="(item, index) in pinnedItems"
              :key="item.routeName"
              class="pinned-order-item"
            >
              <NThing>
                <template #avatar>
                  <ToolIcon
                    :name="item.icon"
                    :size="20"
                  />
                </template>
                <template #header>
                  {{ item.title }}
                </template>
                <template #description>
                  <div class="pinned-order-actions">
                    <NButton
                      size="tiny"
                      quaternary
                      :disabled="index === 0"
                      @click="movePinnedTool(item.routeName, 'up')"
                    >
                      {{ t('common.moveUp') }}
                    </NButton>
                    <NButton
                      size="tiny"
                      quaternary
                      :disabled="index === pinnedItems.length - 1"
                      @click="movePinnedTool(item.routeName, 'down')"
                    >
                      {{ t('common.moveDown') }}
                    </NButton>
                  </div>
                </template>
              </NThing>
            </NListItem>
          </NList>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        :title="t('settings.dataManagement')"
        icon="folder"
      >
        <SettingsRow
          :label="t('settings.exportConfig')"
          :description="t('settings.exportConfigDescription')"
        >
          <NButton @click="handleExportPreferences">
            {{ t('settings.exportJson') }}
          </NButton>
        </SettingsRow>
        <SettingsRow
          :label="t('settings.importConfig')"
          :description="t('settings.importConfigDescription')"
        >
          <NButton @click="triggerImport">
            {{ t('settings.chooseFile') }}
          </NButton>
        </SettingsRow>
        <SettingsRow
          :label="t('settings.resetDefaults')"
          :description="t('settings.resetDefaultsDescription')"
        >
          <NPopconfirm @positive-click="handleClearAll">
            <template #trigger>
              <NButton
                type="error"
                quaternary
              >
                {{ t('settings.clearLocalSettings') }}
              </NButton>
            </template>
            {{ t('settings.resetConfirm') }}
          </NPopconfirm>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        :title="t('settings.recent')"
        icon="clock"
      >
        <template #extra>
          <NButton
            size="small"
            quaternary
            :disabled="recentItems.length === 0"
            @click="handleClearRecent"
          >
            {{ t('common.clear') }}
          </NButton>
        </template>
        <NList
          v-if="recentItems.length > 0"
          class="recent-list"
        >
          <NListItem
            v-for="item in recentItems"
            :key="item.routeName"
            class="recent-item"
            @click="openRecentTool(item.routeName)"
          >
            <NThing>
              <template #avatar>
                <ToolIcon
                  :name="item.icon"
                  :size="20"
                />
              </template>
              <template #header>
                {{ item.name }}
              </template>
              <template #description>
                {{ t('common.open') }}
              </template>
            </NThing>
          </NListItem>
        </NList>
        <div
          v-else
          class="empty-state"
        >
          <ToolIcon
            name="search"
            :size="32"
            class="empty-icon"
          />
          <p class="empty-title">
            {{ t('settings.recentEmptyTitle') }}
          </p>
          <p class="empty-hint">
            {{ t('settings.recentEmptyHint') }}
          </p>
        </div>
      </SettingsSection>
    </div>
  </PageLayout>
</template>

<style scoped>
.settings-view {
  max-width: 720px;
  margin: 0 auto;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.theme-cards {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  min-width: 88px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: var(--font-size-footnote);
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}

.theme-card:hover {
  border-color: var(--color-primary);
  color: var(--color-text-primary);
}

.theme-card.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.recent-list {
  margin: calc(-1 * var(--space-2)) 0;
}

.recent-item {
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.recent-item:hover {
  background: var(--color-bg-tertiary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-4) 0;
}

.empty-icon {
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
}

.empty-title {
  margin: 0 0 var(--space-1) 0;
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
}

.empty-hint {
  margin: 0;
  font-size: var(--font-size-footnote);
  color: var(--color-text-tertiary);
  max-width: 280px;
}

:deep(.home-option) {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.pinned-select {
  width: 320px;
  min-width: 320px;
}

.hidden-input {
  display: none;
}

.pinned-order-list {
  width: 100%;
  max-width: 360px;
}

.pinned-order-item {
  border-radius: var(--radius-md);
}

.pinned-order-actions {
  display: flex;
  gap: var(--space-1);
}
</style>

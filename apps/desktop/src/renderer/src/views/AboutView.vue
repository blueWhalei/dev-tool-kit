<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { NTag, NButton, NTable, NDescriptions, NDescriptionsItem } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import ToolIcon from '../components/ToolIcon.vue'
import AppLogo from '../components/AppLogo.vue'
import { useIpc } from '../composables/useIpc'
import { usePlatform } from '../composables/usePlatform'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import {
  APP_NAME,
  APP_SHORTCUTS,
  GLOBAL_SHORTCUTS,
  OVERLAY_SHORTCUTS,
  PAGE_SHORTCUTS
} from '@dev-tool-kit/shared'

const { t } = useI18n()
const { invoke } = useIpc()
const { copy } = useCopyToClipboard()
const { platform, loadPlatform } = usePlatform()
const appVersion = ref('—')
const appName = ref(APP_NAME)
const runtimeInfo = ref({ electron: '—', node: '—', chrome: '—' })

const shortcutSections = computed(() => [
  { scopeKey: 'about.shortcutsGlobal', scope: 'global' as const, items: GLOBAL_SHORTCUTS },
  { scopeKey: 'about.shortcutsOverlay', scope: 'overlay' as const, items: OVERLAY_SHORTCUTS },
  { scopeKey: 'about.shortcutsPage', scope: 'page' as const, items: PAGE_SHORTCUTS }
])

function shortcutLabel(id: string, field: 'action' | 'page') {
  const value = t(`shortcuts.${id}.${field}`)
  return value === `shortcuts.${id}.${field}` ? '' : value
}

onMounted(async () => {
  await loadPlatform()
  appVersion.value = (await invoke<string>('app:getVersion')) ?? '—'
  appName.value = (await invoke<string>('app:getName')) ?? APP_NAME
  const runtime = await invoke<{ electron: string; node: string; chrome: string }>('app:getRuntimeInfo')
  if (runtime) runtimeInfo.value = runtime
})

async function copyVersion() {
  if (appVersion.value === '—') return
  await copy(`v${appVersion.value}`, t('about.versionCopied'))
}
</script>

<template>
  <PageLayout
    :title="t('about.title')"
    :description="t('about.description')"
    container-class="about-view"
  >
    <div class="about-card">
      <div class="about-hero">
        <AppLogo :size="64" class="about-logo" />
        <div class="about-hero-text">
          <h2 class="about-name">{{ appName }}</h2>
          <div class="about-version-row">
            <NTag type="info" size="small" round>v{{ appVersion }}</NTag>
            <NButton size="tiny" quaternary :disabled="appVersion === '—'" @click="copyVersion">
              <template #icon>
                <ToolIcon name="convert" :size="14" />
              </template>
              {{ t('about.copyVersion') }}
            </NButton>
          </div>
        </div>
      </div>

      <NDescriptions :column="1" label-placement="left" class="about-meta">
        <NDescriptionsItem>
          <template #label>
            <span class="meta-label"><ToolIcon name="info" :size="14" /> {{ t('about.runtime') }}</span>
          </template>
          {{ t('about.runtimeDescription') }}
        </NDescriptionsItem>
        <NDescriptionsItem>
          <template #label>
            <span class="meta-label"><ToolIcon name="port" :size="14" /> {{ t('about.platform') }}</span>
          </template>
          {{ platform || '—' }}
        </NDescriptionsItem>
        <NDescriptionsItem>
          <template #label>
            <span class="meta-label"><ToolIcon name="convert" :size="14" /> {{ t('about.electron') }}</span>
          </template>
          {{ runtimeInfo.electron }}
        </NDescriptionsItem>
        <NDescriptionsItem>
          <template #label>
            <span class="meta-label"><ToolIcon name="convert" :size="14" /> {{ t('about.node') }}</span>
          </template>
          {{ runtimeInfo.node }}
        </NDescriptionsItem>
        <NDescriptionsItem>
          <template #label>
            <span class="meta-label"><ToolIcon name="convert" :size="14" /> {{ t('about.chromium') }}</span>
          </template>
          {{ runtimeInfo.chrome }}
        </NDescriptionsItem>
        <NDescriptionsItem>
          <template #label>
            <span class="meta-label"><ToolIcon name="lock" :size="14" /> {{ t('about.license') }}</span>
          </template>
          MIT
        </NDescriptionsItem>
      </NDescriptions>

      <section
        v-for="section in shortcutSections"
        :key="section.scope"
        class="shortcuts-section"
      >
        <h3 class="section-title">
          <ToolIcon name="key" :size="18" />
          {{ t('about.shortcutsTitle', { scope: t(section.scopeKey) }) }}
        </h3>
        <NTable :bordered="false" :single-line="false" size="small" class="shortcuts-table">
          <thead>
            <tr>
              <th>{{ t('about.shortcutAction') }}</th>
              <th>{{ t('about.shortcutKeys') }}</th>
              <th v-if="section.scope === 'page'">{{ t('about.shortcutPage') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in section.items" :key="item.id">
              <td>{{ shortcutLabel(item.id, 'action') }}</td>
              <td class="shortcut-keys">
                <template v-for="(key, index) in item.keys" :key="key">
                  <span v-if="index > 0" class="key-sep">+</span>
                  <kbd>{{ key }}</kbd>
                </template>
              </td>
              <td v-if="section.scope === 'page'">{{ shortcutLabel(item.id, 'page') }}</td>
            </tr>
          </tbody>
        </NTable>
      </section>

      <div class="about-footer">
        <p class="about-tagline">{{ t('about.tagline') }}</p>
        <p class="about-shortcut-count">{{ t('about.shortcutCount', { count: APP_SHORTCUTS.length }) }}</p>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.about-view {
  max-width: 640px;
  margin: 0 auto;
}

.about-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.about-hero {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.about-logo {
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.about-hero-text {
  min-width: 0;
}

.about-name {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--font-size-title1);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.about-version-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.about-meta {
  margin-bottom: var(--space-4);
}

.meta-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.shortcuts-section {
  margin-bottom: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-3) 0;
  font-size: var(--font-size-subheadline);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.shortcuts-table {
  --n-th-color: transparent;
  --n-td-color: transparent;
}

.shortcuts-table th {
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  text-align: left;
  padding: var(--space-2) var(--space-3) var(--space-2) 0;
}

.shortcuts-table td {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  padding: var(--space-2) var(--space-3) var(--space-2) 0;
  vertical-align: middle;
}

.shortcut-keys {
  font-family: var(--font-family-mono);
}

.shortcut-keys kbd {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-primary);
}

.key-sep {
  margin: 0 4px;
  color: var(--color-text-tertiary);
}

.about-footer {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.about-tagline {
  margin: 0 0 var(--space-1) 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
}

.about-shortcut-count {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-footnote);
}
</style>

<template>
  <div
    class="action-bar"
    style="margin-top: 0; border-top: none; padding-top: 0"
  >
    <NButton
      type="primary"
      :loading="imageLoading"
      @click="pickImageForFavicon"
    >
      {{ page.t('actions.pickImage') }}
    </NButton>
  </div>

  <template v-if="pickedImage">
    <NCard
      class="editor-card"
      :bordered="false"
      style="margin-top: 16px"
    >
      <template #header>
        <span class="card-title">{{ page.t('labels.iconPreset') }}</span>
      </template>
      <div class="favicon-options">
        <div class="option-row">
          <span class="section-label">{{ page.t('labels.iconPreset') }}</span>
          <NSelect
            v-model:value="faviconPreset"
            :options="faviconPresetOptions"
            style="min-width: 200px"
          />
        </div>
        <div class="option-row">
          <span class="section-label">{{ page.t('labels.includeIco') }}</span>
          <NSwitch v-model:value="faviconIncludeIco" />
        </div>
      </div>
    </NCard>

    <div class="action-bar">
      <NButton
        type="primary"
        :loading="faviconLoading"
        @click="handleGenerateIcons"
      >
        {{ page.t('actions.generateIcons') }}
      </NButton>
    </div>

    <template v-if="faviconResult">
      <NCard
        class="editor-card"
        :bordered="false"
        style="margin-top: 16px"
      >
        <template #header>
          <span class="card-title">{{ page.t('labels.generatedIcons') }} ({{ faviconResult.icons.length }})</span>
        </template>
        <div class="icon-grid">
          <div
            v-for="(icon, i) in faviconResult.icons"
            :key="i"
            class="icon-item"
          >
            <img
              :src="`data:image/png;base64,${icon.data}`"
              :alt="icon.fileName"
              class="icon-preview"
            >
            <span class="icon-label">{{ icon.width }}×{{ icon.height }}</span>
            <span class="icon-filename">{{ icon.fileName }}</span>
          </div>
        </div>

        <div
          v-if="faviconResult.ico"
          style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border)"
        >
          <div class="info-item">
            <span class="result-label">{{ page.t('labels.icoFile') }}</span>
            <NTag
              size="small"
              :bordered="false"
            >
              {{ faviconResult.ico.fileName }}
            </NTag>
            <span class="info-value">{{ formatBytes(faviconResult.ico.size) }}</span>
          </div>
        </div>
      </NCard>

      <div class="action-bar">
        <NButton @click="saveFaviconIcons">
          {{ page.t('actions.saveAll') }}
        </NButton>
      </div>
    </template>
  </template>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NCard, NTag, NSelect, NSwitch, useMessage } from 'naive-ui'
import { formatBytes, type IconGenerateResult } from '@dev-tool-kit/shared'
import { useToolI18n } from '../../composables/useToolI18n'
import { useIpc } from '../../composables/useIpc'
import { useSharedImageState } from '../../composables/useSharedImageState'

const message = useMessage()
const page = useToolI18n('imageTools')
const { invoke } = useIpc()
const { pickedImage, imageLoading, pickImage } = useSharedImageState()

const faviconPreset = ref<'webFavicon' | 'appIcon' | 'pwa' | 'allSizes'>('webFavicon')
const faviconIncludeIco = ref(true)
const faviconResult = ref<IconGenerateResult | null>(null)
const faviconLoading = ref(false)

const ICON_PRESET_CONFIG: Record<string, { sizes: number[]; includeIco: boolean }> = {
  webFavicon: { sizes: [16, 32, 48], includeIco: true },
  appIcon: { sizes: [57, 60, 72, 76, 114, 120, 144, 152, 180], includeIco: false },
  pwa: { sizes: [72, 96, 128, 144, 152, 192, 384, 512], includeIco: false },
  allSizes: { sizes: [16, 32, 48, 57, 60, 72, 76, 96, 114, 120, 128, 144, 152, 180, 192, 384, 512], includeIco: true }
}

const faviconPresetOptions = computed(() => [
  { label: page.t('iconPresets.webFavicon'), value: 'webFavicon' },
  { label: page.t('iconPresets.appIcon'), value: 'appIcon' },
  { label: page.t('iconPresets.pwa'), value: 'pwa' },
  { label: page.t('iconPresets.allSizes'), value: 'allSizes' }
])

async function pickImageForFavicon() {
  faviconResult.value = null
  await pickImage()
}

async function handleGenerateIcons() {
  if (!pickedImage.value) {
    message.warning(page.t('messages.noImageSelected'))
    return
  }
  faviconLoading.value = true
  try {
    const preset = ICON_PRESET_CONFIG[faviconPreset.value]
    const result = await invoke<IconGenerateResult | null>('image-tools:generateIcons',
      pickedImage.value.filePath,
      preset.sizes,
      faviconIncludeIco.value && preset.includeIco
    )
    if (result) {
      faviconResult.value = result
      message.success(page.t('messages.iconGenerateSuccess'))
    } else {
      message.error(page.t('messages.iconGenerateFailed'))
    }
  } catch {
    message.error(page.t('messages.iconGenerateFailed'))
  } finally {
    faviconLoading.value = false
  }
}

async function saveFaviconIcons() {
  if (!faviconResult.value) return
  const images: Array<{ data: string; fileName: string }> = faviconResult.value.icons.map(icon => ({
    data: icon.data,
    fileName: icon.fileName
  }))
  if (faviconResult.value.ico) {
    images.push({ data: faviconResult.value.ico.data, fileName: faviconResult.value.ico.fileName })
  }
  try {
    const result = await invoke<{ success: boolean }>('image-tools:saveImages', images)
    if (result?.success) {
      message.success(page.t('messages.batchSaveSuccess'))
    } else {
      message.error(page.t('messages.batchSaveFailed'))
    }
  } catch {
    message.error(page.t('messages.batchSaveFailed'))
  }
}
</script>

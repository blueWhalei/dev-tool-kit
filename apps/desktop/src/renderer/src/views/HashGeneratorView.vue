<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import { NButton, NSelect, useMessage } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import ToolDualPanel from '../components/ToolDualPanel.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { computeHash, type HashAlgorithm } from '@dev-tool-kit/shared'

const message = useMessage()
const page = useToolI18n('hashGenerator')
const { t } = useI18n()

const inputText = ref('')
const hashOutput = ref('')
const selectedAlgorithm = ref<HashAlgorithm>('SHA-256')

const SAMPLE_TEXT = 'Hello, DevToolkit!'

const algorithmOptions = [
  { label: 'MD5', value: 'MD5' },
  { label: 'SHA-1', value: 'SHA-1' },
  { label: 'SHA-256', value: 'SHA-256' },
  { label: 'SHA-512', value: 'SHA-512' }
]

async function calculateHash() {
  if (!inputText.value) {
    hashOutput.value = ''
    return
  }

  try {
    hashOutput.value = await computeHash(selectedAlgorithm.value, inputText.value)
  } catch {
    message.error(page.t('hashFailed'))
    hashOutput.value = ''
  }
}

function fillSample() {
  inputText.value = SAMPLE_TEXT
}

watchDebounced([inputText, selectedAlgorithm], calculateHash, { debounce: 300 })
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="hash-generator-view"
  >
    <template #actions>
      <NButton size="small" quaternary @click="fillSample">{{ t('common.fillSample') }}</NButton>
      <NSelect
        v-model:value="selectedAlgorithm"
        :options="algorithmOptions"
        style="width: 160px"
      />
    </template>

    <ToolDualPanel
      v-model:input="inputText"
      v-model:output="hashOutput"
      :input-label="page.t('input')"
      :output-label="page.t('output')"
      :input-placeholder="page.t('inputPlaceholder')"
      :output-placeholder="page.t('outputPlaceholder')"
      :input-rows="6"
      :output-rows="6"
    />
  </PageLayout>
</template>

<style scoped>
.hash-generator-view {
  max-width: 1200px;
  margin: 0 auto;
}
</style>

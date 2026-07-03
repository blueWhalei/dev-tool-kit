<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NGrid, NGridItem, NCard, NInput, NButton } from 'naive-ui'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { useKeyboardShortcut, isModKey } from '../composables/useKeyboardShortcut'

const input = defineModel<string>('input', { default: '' })
const output = defineModel<string>('output', { default: '' })

const props = withDefaults(defineProps<{
  inputPlaceholder?: string
  outputPlaceholder?: string
  inputRows?: number
  outputRows?: number
  inputLabel?: string
  outputLabel?: string
  outputReadonly?: boolean
  showCopy?: boolean
}>(), {
  inputRows: 8,
  outputRows: 8,
  outputReadonly: true,
  showCopy: true
})

const { t } = useI18n()

const inputLabelText = computed(() => props.inputLabel ?? t('common.input'))
const outputLabelText = computed(() => props.outputLabel ?? t('common.output'))
const inputPlaceholderText = computed(() => props.inputPlaceholder ?? t('common.inputPlaceholder'))
const outputPlaceholderText = computed(() => props.outputPlaceholder ?? t('common.outputPlaceholder'))
const copyTitle = computed(() => t('common.copyWithShortcut', { shortcut: 'Ctrl+Shift+C' }))

const { copy } = useCopyToClipboard()

async function copyOutput() {
  if (output.value) await copy(output.value)
}

useKeyboardShortcut((event) => {
  if (isModKey(event) && event.shiftKey && event.key.toLowerCase() === 'c') {
    event.preventDefault()
    void copyOutput()
  }
})
</script>

<template>
  <NGrid cols="1 768:2" :x-gap="16" :y-gap="16">
    <NGridItem>
      <NCard class="tool-panel-card" :bordered="false">
        <template #header>
          <span class="card-title">{{ inputLabelText }}</span>
        </template>
        <NInput
          v-model:value="input"
          type="textarea"
          :rows="props.inputRows"
          :placeholder="inputPlaceholderText"
          class="code-input"
        />
      </NCard>
    </NGridItem>
    <NGridItem>
      <NCard class="tool-panel-card" :bordered="false">
        <template #header>
          <div class="card-header-flex">
            <span class="card-title">{{ outputLabelText }}</span>
            <NButton
              v-if="props.showCopy"
              size="small"
              :disabled="!output"
              :title="copyTitle"
              @click="copyOutput"
            >
              {{ t('common.copy') }}
            </NButton>
          </div>
        </template>
        <NInput
          v-model:value="output"
          type="textarea"
          :rows="props.outputRows"
          :placeholder="outputPlaceholderText"
          :readonly="props.outputReadonly"
          class="code-input"
        />
      </NCard>
    </NGridItem>
  </NGrid>
</template>

<style scoped>
.tool-panel-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
}

.tool-panel-card :deep(.n-card-header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.tool-panel-card :deep(.n-card__content) {
  padding: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.code-input {
  font-family: var(--font-family-mono);
  font-size: 14px;
}

.code-input :deep(.n-input__textarea-el) {
  font-family: var(--font-family-mono);
}
</style>

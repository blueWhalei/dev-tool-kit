<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NInput, NButton, NCard, NGrid, NGridItem, useMessage } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { translateToolError } from '../utils/translateToolError'
import { parseCidr, type SubnetInfo } from '@dev-tool-kit/shared'

const message = useMessage()
const { t } = useI18n()
const page = useToolI18n('subnetCalculator')
const { copy } = useCopyToClipboard()

const cidrInput = ref('192.168.1.0/24')
const result = ref<SubnetInfo | null>(null)

const resultRows = computed(() => {
  if (!result.value) return []
  const r = result.value
  return [
    { label: page.t('labels.cidr'), value: r.cidr },
    { label: page.t('labels.network'), value: r.network },
    { label: page.t('labels.broadcast'), value: r.broadcast },
    { label: page.t('labels.subnetMask'), value: r.subnetMask },
    { label: page.t('labels.wildcardMask'), value: r.wildcardMask },
    { label: page.t('labels.firstHost'), value: r.firstHost },
    { label: page.t('labels.lastHost'), value: r.lastHost },
    { label: page.t('labels.totalHosts'), value: String(r.totalHosts) },
    { label: page.t('labels.usableHosts'), value: String(r.usableHosts) }
  ]
})

function calculate() {
  const parsed = parseCidr(cidrInput.value)
  if (!parsed.success) {
    result.value = null
    const errorMsg = translateToolError(t, 'subnetCalculator', parsed.error) || page.t('errors.calculateFailed')
    message.warning(errorMsg)
    return
  }
  result.value = parsed.result ?? null
}

async function copyResult() {
  if (!result.value) return
  const text = resultRows.value.map(r => `${r.label}: ${r.value}`).join('\n')
  await copy(text, page.t('messages.copied'))
}

calculate()
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="subnet-calculator-view"
  >
    <NCard class="input-card" :bordered="false">
      <div class="input-row">
        <NInput
          v-model:value="cidrInput"
          :placeholder="page.t('placeholders.cidr')"
          class="cidr-input"
          @keyup.enter="calculate"
        />
        <NButton type="primary" @click="calculate">{{ page.t('buttons.calculate') }}</NButton>
        <NButton @click="copyResult" :disabled="!result">{{ page.t('buttons.copyResult') }}</NButton>
      </div>
    </NCard>

    <NCard v-if="result" class="result-card" :bordered="false">
      <NGrid :cols="2" :x-gap="16" :y-gap="12">
        <NGridItem v-for="row in resultRows" :key="row.label">
          <div class="result-row">
            <span class="result-label">{{ row.label }}</span>
            <code class="result-value">{{ row.value }}</code>
          </div>
        </NGridItem>
      </NGrid>
    </NCard>
  </PageLayout>
</template>

<style scoped>
.subnet-calculator-view {
  max-width: 720px;
  margin: 0 auto;
}

.input-card,
.result-card {
  background: var(--color-bg-primary);
  margin-bottom: var(--space-4);
}

.input-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.cidr-input {
  flex: 1;
  font-family: var(--font-family-mono);
}

.result-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.result-label {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.result-value {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
  word-break: break-all;
}
</style>

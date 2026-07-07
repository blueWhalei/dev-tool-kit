<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NInput, NButton, NCard, NCheckbox, NGrid, NGridItem, useMessage } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { translateToolError } from '../utils/translateToolError'
import {
  chmodFromPermissions,
  parseChmodOctal,
  parseChmodSymbolic,
  DEFAULT_CHMOD_PERMISSIONS,
  type ChmodPermissions,
  type PermissionBits
} from '@dev-tool-kit/shared'

const message = useMessage()
const { t } = useI18n()
const page = useToolI18n('chmodCalculator')
const { copy } = useCopyToClipboard()

type Subject = 'owner' | 'group' | 'other'
type Bit = keyof PermissionBits

const permissions = ref<ChmodPermissions>(structuredClone(DEFAULT_CHMOD_PERMISSIONS))
const octalInput = ref('755')
const symbolicInput = ref('rwxr-xr-x')

let syncSource: 'octal' | 'symbolic' | 'bits' | null = null

const info = computed(() => chmodFromPermissions(permissions.value))

const breakdownRows = computed(() => {
  const p = permissions.value
  const fmt = (bits: PermissionBits) =>
    `${bits.read ? 'r' : '-'}${bits.write ? 'w' : '-'}${bits.execute ? 'x' : '-'}`
  return [
    { label: page.t('labels.owner'), value: fmt(p.owner), octal: String((p.owner.read ? 4 : 0) + (p.owner.write ? 2 : 0) + (p.owner.execute ? 1 : 0)) },
    { label: page.t('labels.group'), value: fmt(p.group), octal: String((p.group.read ? 4 : 0) + (p.group.write ? 2 : 0) + (p.group.execute ? 1 : 0)) },
    { label: page.t('labels.other'), value: fmt(p.other), octal: String((p.other.read ? 4 : 0) + (p.other.write ? 2 : 0) + (p.other.execute ? 1 : 0)) }
  ]
})

const subjects: { key: Subject; label: string }[] = [
  { key: 'owner', label: page.t('labels.owner') },
  { key: 'group', label: page.t('labels.group') },
  { key: 'other', label: page.t('labels.other') }
]

const bits: { key: Bit; label: string }[] = [
  { key: 'read', label: page.t('labels.read') },
  { key: 'write', label: page.t('labels.write') },
  { key: 'execute', label: page.t('labels.execute') }
]

watch(
  permissions,
  () => {
    if (syncSource === 'octal' || syncSource === 'symbolic') return
    syncSource = 'bits'
    octalInput.value = info.value.octal
    symbolicInput.value = info.value.symbolic
    syncSource = null
  },
  { deep: true }
)

function applyOctal() {
  if (syncSource) return
  const parsed = parseChmodOctal(octalInput.value)
  if (!parsed.success) {
    const errorMsg = translateToolError(t, 'chmodCalculator', parsed.error) || page.t('errors.parseFailed')
    message.warning(errorMsg)
    octalInput.value = info.value.octal
    return
  }
  syncSource = 'octal'
  permissions.value = structuredClone(parsed.result!.permissions)
  symbolicInput.value = parsed.result!.symbolic
  syncSource = null
}

function applySymbolic() {
  if (syncSource) return
  const parsed = parseChmodSymbolic(symbolicInput.value)
  if (!parsed.success) {
    const errorMsg = translateToolError(t, 'chmodCalculator', parsed.error) || page.t('errors.parseFailed')
    message.warning(errorMsg)
    symbolicInput.value = info.value.symbolic
    return
  }
  syncSource = 'symbolic'
  permissions.value = structuredClone(parsed.result!.permissions)
  octalInput.value = parsed.result!.octal
  syncSource = null
}

function toggleBit(subject: Subject, bit: Bit, checked: boolean) {
  permissions.value = {
    ...permissions.value,
    [subject]: { ...permissions.value[subject], [bit]: checked }
  }
}

function toggleSpecial(key: 'setuid' | 'setgid' | 'sticky', checked: boolean) {
  permissions.value = {
    ...permissions.value,
    special: { ...permissions.value.special, [key]: checked }
  }
}

async function copyResult() {
  const lines = [
    `${page.t('labels.octal')}: ${info.value.octal}`,
    `${page.t('labels.symbolic')}: ${info.value.symbolic}`,
    ...breakdownRows.value.map(r => `${r.label}: ${r.value} (${r.octal})`)
  ]
  if (permissions.value.special.setuid || permissions.value.special.setgid || permissions.value.special.sticky) {
    const s = permissions.value.special
    const parts: string[] = []
    if (s.setuid) parts.push(page.t('labels.setuid'))
    if (s.setgid) parts.push(page.t('labels.setgid'))
    if (s.sticky) parts.push(page.t('labels.sticky'))
    lines.push(`${page.t('labels.special')}: ${parts.join(', ')}`)
  }
  await copy(lines.join('\n'), page.t('messages.copied'))
}
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="chmod-calculator-view"
  >
    <NCard
      class="input-card"
      :bordered="false"
    >
      <div class="input-row">
        <div class="input-field">
          <span class="field-label">{{ page.t('labels.octal') }}</span>
          <NInput
            v-model:value="octalInput"
            :placeholder="page.t('placeholders.octal')"
            class="mono-input"
            @blur="applyOctal"
            @keyup.enter="applyOctal"
          />
        </div>
        <div class="input-field">
          <span class="field-label">{{ page.t('labels.symbolic') }}</span>
          <NInput
            v-model:value="symbolicInput"
            :placeholder="page.t('placeholders.symbolic')"
            class="mono-input"
            @blur="applySymbolic"
            @keyup.enter="applySymbolic"
          />
        </div>
        <NButton @click="copyResult">
          {{ page.t('buttons.copyResult') }}
        </NButton>
      </div>
    </NCard>

    <NCard
      class="matrix-card"
      :bordered="false"
    >
      <div class="matrix-header">
        <span class="matrix-corner" />
        <span
          v-for="bit in bits"
          :key="bit.key"
          class="matrix-col-label"
        >{{ bit.label }}</span>
      </div>
      <div
        v-for="subject in subjects"
        :key="subject.key"
        class="matrix-row"
      >
        <span class="matrix-row-label">{{ subject.label }}</span>
        <NCheckbox
          v-for="bit in bits"
          :key="`${subject.key}-${bit.key}`"
          :checked="permissions[subject.key][bit.key]"
          @update:checked="toggleBit(subject.key, bit.key, $event)"
        />
      </div>
      <div class="special-row">
        <span class="matrix-row-label">{{ page.t('labels.special') }}</span>
        <NCheckbox
          :checked="permissions.special.setuid"
          @update:checked="toggleSpecial('setuid', $event)"
        >
          {{ page.t('labels.setuid') }}
        </NCheckbox>
        <NCheckbox
          :checked="permissions.special.setgid"
          @update:checked="toggleSpecial('setgid', $event)"
        >
          {{ page.t('labels.setgid') }}
        </NCheckbox>
        <NCheckbox
          :checked="permissions.special.sticky"
          @update:checked="toggleSpecial('sticky', $event)"
        >
          {{ page.t('labels.sticky') }}
        </NCheckbox>
      </div>
    </NCard>

    <NCard
      class="result-card"
      :bordered="false"
    >
      <NGrid
        :cols="2"
        :x-gap="16"
        :y-gap="12"
      >
        <NGridItem
          v-for="row in breakdownRows"
          :key="row.label"
        >
          <div class="result-row">
            <span class="result-label">{{ row.label }}</span>
            <code class="result-value">{{ row.value }} ({{ row.octal }})</code>
          </div>
        </NGridItem>
      </NGrid>
    </NCard>
  </PageLayout>
</template>

<style scoped>
.chmod-calculator-view {
  max-width: 720px;
  margin: 0 auto;
}

.input-card,
.matrix-card,
.result-card {
  background: var(--color-bg-primary);
  margin-bottom: var(--space-4);
}

.input-row {
  display: flex;
  gap: var(--space-3);
  align-items: flex-end;
  flex-wrap: wrap;
}

.input-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  min-width: 140px;
}

.field-label {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.mono-input {
  font-family: var(--font-family-mono);
}

.matrix-header,
.matrix-row {
  display: grid;
  grid-template-columns: 80px repeat(3, 48px);
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.matrix-col-label {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
  text-align: center;
}

.matrix-row-label {
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
}

.special-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
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
}
</style>

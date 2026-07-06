<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NButton, NInputNumber, NCard, NList, NListItem, NThing, NSelect } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'

const { t } = useI18n()
const router = useRouter()
const { copy } = useCopyToClipboard()
const page = useToolI18n('uuidGenerator')

type UuidVersion = 'v1' | 'v4' | 'v7'
type UuidFormat = 'standard' | 'uppercase' | 'noHyphens' | 'braces'

const generatedUuids = ref<string[]>([])
const count = ref(1)
const selectedVersion = ref<UuidVersion>('v4')
const selectedFormat = ref<UuidFormat>('standard')

const versionOptions = computed(() => [
  { label: page.t('versions.v1'), value: 'v1' },
  { label: page.t('versions.v4'), value: 'v4' },
  { label: page.t('versions.v7'), value: 'v7' }
])

const formatOptions = computed(() => [
  { label: page.t('formats.standard'), value: 'standard' },
  { label: page.t('formats.uppercase'), value: 'uppercase' },
  { label: page.t('formats.noHyphens'), value: 'noHyphens' },
  { label: page.t('formats.braces'), value: 'braces' }
])

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function formatUuid(uuid: string, format: UuidFormat): string {
  switch (format) {
    case 'uppercase': return uuid.toUpperCase()
    case 'noHyphens': return uuid.replace(/-/g, '')
    case 'braces': return `{${uuid}}`
    default: return uuid
  }
}

// UUID v1: timestamp + node
let v1LastTimestamp = 0
let v1ClockSeq: number | null = null
const v1Node = new Uint8Array(6)
crypto.getRandomValues(v1Node)
v1Node[0] |= 0x01 // multicast bit

function generateUuidv1(): string {
  const now = Date.now()
  const perfNow = performance.now()
  // 100-ns intervals since 1582-10-15
  const uuidEpoch = 122192928000000000
  const timestamp100ns = Math.floor(now * 10000 + (perfNow % 1) * 10000) + uuidEpoch

  // Ensure monotonic increment
  let ts = timestamp100ns
  if (ts <= v1LastTimestamp) {
    ts = v1LastTimestamp + 1
  }
  v1LastTimestamp = ts

  if (v1ClockSeq === null) {
    const csBytes = new Uint8Array(2)
    crypto.getRandomValues(csBytes)
    v1ClockSeq = ((csBytes[0] & 0x3f) << 8) | csBytes[1]
  }

  const bytes = new Uint8Array(16)

  // time_low (4 bytes)
  bytes[0] = (ts >>> 24) & 0xff
  bytes[1] = (ts >>> 16) & 0xff
  bytes[2] = (ts >>> 8) & 0xff
  bytes[3] = ts & 0xff
  // time_mid (2 bytes)
  bytes[4] = (ts >>> 40) & 0xff
  bytes[5] = (ts >>> 32) & 0xff
  // time_hi_and_version (2 bytes)
  bytes[6] = (ts >>> 56) & 0x0f | 0x10 // version 1
  bytes[7] = (ts >>> 48) & 0xff
  // clock_seq_hi_and_reserved
  bytes[8] = (v1ClockSeq >>> 8) & 0x3f | 0x80 // variant
  // clock_seq_low
  bytes[9] = v1ClockSeq & 0xff
  // node (6 bytes)
  bytes[10] = v1Node[0]
  bytes[11] = v1Node[1]
  bytes[12] = v1Node[2]
  bytes[13] = v1Node[3]
  bytes[14] = v1Node[4]
  bytes[15] = v1Node[5]

  return bytesToUuid(bytes)
}

// UUID v4: random
function generateUuidv4(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return bytesToUuid(bytes)
}

// UUID v7: millisecond timestamp + random
function generateUuidv7(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  const now = Date.now()
  // unix_ts_ms (48 bits, big-endian)
  bytes[0] = (now / 2 ** 40) & 0xff
  bytes[1] = (now / 2 ** 32) & 0xff
  bytes[2] = (now / 2 ** 24) & 0xff
  bytes[3] = (now / 2 ** 16) & 0xff
  bytes[4] = (now / 2 ** 8) & 0xff
  bytes[5] = now & 0xff
  // version = 0111
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  // variant = 10xx
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  return bytesToUuid(bytes)
}

function generateRaw(): string {
  switch (selectedVersion.value) {
    case 'v1': return generateUuidv1()
    case 'v4': return generateUuidv4()
    case 'v7': return generateUuidv7()
  }
}

function generate() {
  const uuids: string[] = []
  for (let i = 0; i < count.value; i++) {
    uuids.push(formatUuid(generateRaw(), selectedFormat.value))
  }
  generatedUuids.value = uuids
}

async function copyAll() {
  if (generatedUuids.value.length === 0) return
  await copy(generatedUuids.value.join('\n'), page.t('messages.copiedAll'))
}

function openInMockData() {
  if (generatedUuids.value.length === 0) {
    return
  }
  void router.push({
    name: 'MockData',
    query: { addField: 'uuid', count: String(generatedUuids.value.length) }
  })
}

async function copyOne(uuid: string) {
  await copy(uuid)
}

generate()
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="uuid-generator-view"
  >
    <template #actions>
      <NSelect
        v-model:value="selectedVersion"
        :options="versionOptions"
        style="width: 200px"
      />
      <NSelect
        v-model:value="selectedFormat"
        :options="formatOptions"
        style="width: 160px"
      />
      <div class="count-control">
        <span class="control-label">{{ page.t('labels.count') }}</span>
        <NInputNumber
          v-model:value="count"
          :min="1"
          :max="10"
          size="medium"
        />
      </div>
      <NButton type="primary" @click="generate">{{ page.t('buttons.generate') }}</NButton>
      <NButton @click="copyAll" :disabled="generatedUuids.length === 0">{{ page.t('buttons.copyAll') }}</NButton>
      <NButton v-if="generatedUuids.length > 0" quaternary @click="openInMockData">{{ page.t('buttons.openInMockData') }}</NButton>
    </template>

    <NCard class="result-card" :bordered="false" v-if="generatedUuids.length > 0">
      <NList hoverable clickable>
        <NListItem v-for="(uuid, index) in generatedUuids" :key="index" @click="copyOne(uuid)">
          <NThing>
            <template #header>
              <span class="uuid-value">{{ uuid }}</span>
            </template>
          </NThing>
          <template #suffix>
            <NButton size="small" @click.stop="copyOne(uuid)">{{ t('common.copy') }}</NButton>
          </template>
        </NListItem>
      </NList>
    </NCard>
  </PageLayout>
</template>

<style scoped>
.uuid-generator-view {
  max-width: 960px;
  margin: 0 auto;
}

.count-control {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.control-label {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.result-card {
  background: var(--color-bg-primary);
}

.uuid-value {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
  letter-spacing: 0.5px;
}

.result-card :deep(.n-list-item) {
  padding: var(--space-4) var(--space-5);
}

.result-card :deep(.n-list-item:hover) {
  background: var(--color-bg-secondary);
}

.result-card :deep(.n-thing) {
  flex: 1;
}

.result-card :deep(.n-thing__header) {
  font-family: var(--font-family-mono);
}
</style>

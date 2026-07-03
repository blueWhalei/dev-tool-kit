<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NInputNumber, NCard, NList, NListItem, NThing } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'

const { t } = useI18n()
const { copy } = useCopyToClipboard()
const page = useToolI18n('uuidGenerator')

const generatedUuids = ref<string[]>([])
const count = ref(1)

function generateUuidv4(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function generate() {
  const uuids: string[] = []
  for (let i = 0; i < count.value; i++) {
    uuids.push(generateUuidv4())
  }
  generatedUuids.value = uuids
}

async function copyAll() {
  if (generatedUuids.value.length === 0) return
  await copy(generatedUuids.value.join('\n'), page.t('messages.copiedAll'))
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

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NCard, NSelect, NButton, NInput, NTag, NSpace, useMessage } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useIpc } from '../composables/useIpc'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { translateToolError } from '../utils/translateToolError'
import {
  KEY_PAIR_ALGORITHMS,
  type KeyPairAlgorithm,
  type KeyPairGenerateResult
} from '@dev-tool-kit/shared'

const message = useMessage()
const router = useRouter()
const { t } = useI18n()
const page = useToolI18n('keyPairGenerator')
const { invoke } = useIpc()
const { copy } = useCopyToClipboard()

const algorithm = ref<KeyPairAlgorithm>('rsa-2048')
const loading = ref(false)
const publicKey = ref('')
const privateKey = ref('')
const keyType = ref('')

const algorithmOptions = computed(() =>
  KEY_PAIR_ALGORITHMS.map(alg => ({
    label: page.t(`algorithms.${alg}`),
    value: alg
  }))
)

async function generate() {
  loading.value = true
  try {
    const result = await invoke<KeyPairGenerateResult>('key-pair-generator:generate', algorithm.value)
    if (!result.success) {
      const err = translateToolError(t, 'keyPairGenerator', result.error) || page.t('messages.generateFailed')
      message.error(err)
      return
    }
    publicKey.value = result.publicKey
    privateKey.value = result.privateKey
    keyType.value = result.keyType
  } finally {
    loading.value = false
  }
}

async function copyKey(value: string) {
  if (!value) return
  await copy(value, page.t('messages.copied'))
}

function usePublicKeyInJwt() {
  if (!publicKey.value.trim()) {
    message.warning(page.t('messages.noKeys'))
    return
  }
  void router.push({
    name: 'JWTGenerator',
    query: { tab: 'decode', publicKey: publicKey.value }
  })
}
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="key-pair-generator-view"
  >
    <NCard class="setting-card" :bordered="false">
      <div class="setting-row">
        <span class="field-label">{{ page.t('labels.algorithm') }}</span>
        <NSelect v-model:value="algorithm" :options="algorithmOptions" style="max-width: 240px" />
      </div>
      <NButton type="primary" block size="large" :loading="loading" @click="generate">
        {{ publicKey ? page.t('buttons.regenerate') : page.t('buttons.generate') }}
      </NButton>
    </NCard>

    <template v-if="publicKey">
      <NCard class="result-card" :bordered="false">
        <div class="key-header">
          <span class="field-label">{{ page.t('labels.publicKey') }}</span>
          <NSpace>
            <NTag v-if="keyType" size="small" :bordered="false">{{ keyType }}</NTag>
            <NButton size="small" @click="copyKey(publicKey)">{{ t('common.copy') }}</NButton>
            <NButton size="small" @click="usePublicKeyInJwt">{{ page.t('buttons.useInJwt') }}</NButton>
          </NSpace>
        </div>
        <NInput :value="publicKey" type="textarea" readonly :rows="6" class="key-textarea" />
      </NCard>

      <NCard class="result-card" :bordered="false">
        <div class="key-header">
          <span class="field-label">{{ page.t('labels.privateKey') }}</span>
          <NButton size="small" @click="copyKey(privateKey)">{{ t('common.copy') }}</NButton>
        </div>
        <NInput :value="privateKey" type="textarea" readonly :rows="8" class="key-textarea" />
      </NCard>
    </template>

    <p v-else class="empty-hint">{{ page.t('empty') }}</p>
  </PageLayout>
</template>

<style scoped>
.key-pair-generator-view {
  max-width: 800px;
  margin: 0 auto;
}

.setting-card,
.result-card {
  background: var(--color-bg-primary);
  margin-bottom: var(--space-4);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.field-label {
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
}

.key-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.key-textarea :deep(textarea) {
  font-family: var(--font-family-mono);
  font-size: 13px;
}

.empty-hint {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8);
}
</style>

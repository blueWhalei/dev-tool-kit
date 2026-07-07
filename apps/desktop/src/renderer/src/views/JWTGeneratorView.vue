<script setup lang="ts">
/**
 * Dev Tool Kit — offline feature phases (internal tracking)
 * Phase 1: [1] JWT token sign | [2] File hash | [3] env macOS/Linux | [4] Cron editor | [5] Unix process kill
 * Phase 2: JSON tree, mock data SQL, text diff files, IPv6 subnet, regex replace preview
 * Phase 3: chmod, HTTP status ref, cert PEM parser, QR code
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import { NSelect, NInput, NButton, NCard, NTabs, NTabPane, NTag, NAlert } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { translateToolError } from '../utils/translateToolError'
import {
  decodeJwt,
  formatJwtJson,
  getJwtTimeInfo,
  verifyJwtHmac,
  verifyJwtRsa,
  parseJwtPartJson,
  signJwtHmac,
  JWT_HMAC_ALGORITHMS,
  type JwtHmacAlgorithm,
  type JwtTimeInfo
} from '@dev-tool-kit/shared'


const { t } = useI18n()
const route = useRoute()
const page = useToolI18n('jwtGenerator')
const { copy } = useCopyToClipboard()

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
const SAMPLE_SECRET = 'your-256-bit-secret'
const SAMPLE_SIGN_HEADER = '{\n  "typ": "JWT"\n}'
const SAMPLE_SIGN_PAYLOAD = '{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}'

const activeTab = ref<'generate' | 'sign' | 'decode'>('generate')

const VALID_TABS = ['generate', 'sign', 'decode'] as const

function resolveJwtTab(tab: unknown): typeof VALID_TABS[number] | null {
  if (typeof tab === 'string' && (VALID_TABS as readonly string[]).includes(tab)) {
    return tab as typeof VALID_TABS[number]
  }
  return null
}

const secretLength = ref(256)
const secretLengthOptions = computed(() => [
  { label: page.t('secretLengths.hs128'), value: 128 },
  { label: page.t('secretLengths.hs256'), value: 256 },
  { label: page.t('secretLengths.hs512'), value: 512 }
])

const recommendedAlgorithm = computed(() => {
  switch (secretLength.value) {
    case 128: return 'HS128'
    case 256: return 'HS256'
    case 512: return 'HS512'
    default: return 'HS256'
  }
})

const generatedSecret = ref('')
const copied = ref(false)

function generateSecret() {
  const bytes = new Uint8Array(secretLength.value / 8)
  crypto.getRandomValues(bytes)
  const base64Url = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  generatedSecret.value = base64Url
}

async function copySecret() {
  if (!generatedSecret.value) return
  await copy(generatedSecret.value, page.t('messages.copied'))
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

watch(secretLength, () => {
  if (generatedSecret.value) generateSecret()
})

const signAlgorithm = ref<JwtHmacAlgorithm>('HS256')
const signAlgorithmOptions = computed(() =>
  JWT_HMAC_ALGORITHMS.map(alg => ({
    label: page.t(`algorithms.${alg.toLowerCase()}`),
    value: alg
  }))
)
const signHeaderJson = ref(SAMPLE_SIGN_HEADER)
const signPayloadJson = ref(SAMPLE_SIGN_PAYLOAD)
const signSecret = ref('')
const signedToken = ref('')
const signError = ref('')
const signCopied = ref(false)

function applyRouteQuery() {
  const queryTab = resolveJwtTab(route.query.tab)
  if (queryTab) activeTab.value = queryTab
  const secret = route.query.secret
  if (typeof secret === 'string' && secret.trim()) {
    signSecret.value = secret
    activeTab.value = 'sign'
  }
  const publicKey = route.query.publicKey
  if (typeof publicKey === 'string' && publicKey.trim()) {
    verifyPublicKey.value = publicKey
    activeTab.value = 'decode'
  }
}

onMounted(applyRouteQuery)

watch(() => route.query.tab, (tab) => {
  const resolved = resolveJwtTab(tab)
  if (resolved) activeTab.value = resolved
})

watch(() => route.query.secret, (secret) => {
  if (typeof secret === 'string' && secret.trim()) {
    signSecret.value = secret
    activeTab.value = 'sign'
  }
})

watch(() => route.query.publicKey, (publicKey) => {
  if (typeof publicKey === 'string' && publicKey.trim()) {
    verifyPublicKey.value = publicKey
    activeTab.value = 'decode'
  }
})

async function signToken() {
  signError.value = ''
  signedToken.value = ''

  const headerResult = parseJwtPartJson(signHeaderJson.value, 'Header')
  if (!headerResult.success) {
    signError.value = translateToolError(t, 'jwtGenerator', headerResult.error) || page.t('errors.signFailed')
    return
  }

  const payloadResult = parseJwtPartJson(signPayloadJson.value, 'Payload')
  if (!payloadResult.success) {
    signError.value = translateToolError(t, 'jwtGenerator', payloadResult.error) || page.t('errors.signFailed')
    return
  }

  const result = await signJwtHmac(
    headerResult.result!,
    payloadResult.result!,
    signSecret.value,
    signAlgorithm.value
  )
  if (!result.success || !result.result) {
    signError.value = translateToolError(t, 'jwtGenerator', result.error) || page.t('errors.signFailed')
    return
  }

  signedToken.value = result.result
}

function fillSignSample() {
  signHeaderJson.value = SAMPLE_SIGN_HEADER
  signPayloadJson.value = SAMPLE_SIGN_PAYLOAD
  signSecret.value = SAMPLE_SECRET
  signAlgorithm.value = 'HS256'
}

async function copySignedToken() {
  if (!signedToken.value) return
  await copy(signedToken.value, page.t('messages.copied'))
  signCopied.value = true
  setTimeout(() => { signCopied.value = false }, 2000)
}

function useGeneratedSecretForSign() {
  if (generatedSecret.value) signSecret.value = generatedSecret.value
}

const jwtToken = ref('')
const verifySecret = ref('')
const verifyPublicKey = ref('')
const headerJson = ref('')
const payloadJson = ref('')
const timeInfo = ref<JwtTimeInfo | null>(null)
const verifyResult = ref<{ valid: boolean; algorithm: string } | null>(null)
const decodeError = ref('')

function decodeToken() {
  decodeError.value = ''
  verifyResult.value = null
  timeInfo.value = null
  headerJson.value = ''
  payloadJson.value = ''

  if (!jwtToken.value.trim()) return

  const result = decodeJwt(jwtToken.value)
  if (!result.success || !result.result) {
    decodeError.value = translateToolError(t, 'jwtGenerator', result.error) || page.t('errors.decodeFailed')
    return
  }

  headerJson.value = formatJwtJson(result.result.header)
  payloadJson.value = formatJwtJson(result.result.payload)
  timeInfo.value = getJwtTimeInfo(result.result.payload)
}

async function verifySignature() {
  if (!jwtToken.value.trim()) {
    verifyResult.value = null
    return
  }

  if (verifyPublicKey.value.trim()) {
    const result = await verifyJwtRsa(jwtToken.value, verifyPublicKey.value)
    if (!result.success) {
      verifyResult.value = null
      return
    }
    verifyResult.value = result.result ?? null
    return
  }

  if (!verifySecret.value) {
    verifyResult.value = null
    return
  }
  const result = await verifyJwtHmac(jwtToken.value, verifySecret.value)
  if (!result.success) {
    verifyResult.value = null
    return
  }
  verifyResult.value = result.result ?? null
}

function fillSampleToken() {
  jwtToken.value = SAMPLE_JWT
  verifySecret.value = SAMPLE_SECRET
}

watchDebounced(jwtToken, decodeToken, { debounce: 400 })
watchDebounced(verifySecret, verifySignature, { debounce: 400 })
watchDebounced(verifyPublicKey, verifySignature, { debounce: 400 })

async function copyDecoded(part: 'header' | 'payload') {
  const text = part === 'header' ? headerJson.value : payloadJson.value
  if (text) await copy(text, page.t('messages.copiedPart'))
}

const signatureStatusText = computed(() => {
  if (!verifyResult.value) return ''
  const status = verifyResult.value.valid
    ? page.t('messages.signatureValid')
    : page.t('messages.signatureInvalid')
  return `${status} (${verifyResult.value.algorithm})`
})
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="jwt-tool-view"
  >
    <NTabs v-model:value="activeTab" type="line" animated class="jwt-tabs">
      <NTabPane name="generate" :tab="page.t('tabs.generate')">
        <div class="tab-actions">
          <div class="setting-control">
            <span class="control-label">{{ page.t('labels.secretLength') }}</span>
            <NSelect
              v-model:value="secretLength"
              :options="secretLengthOptions"
              style="width: 180px"
            />
            <span class="recommended">{{ page.t('labels.recommended', { algorithm: recommendedAlgorithm }) }}</span>
          </div>
          <div class="action-buttons">
            <NButton type="primary" @click="generateSecret">{{ page.t('buttons.generateSecret') }}</NButton>
            <NButton @click="copySecret" :disabled="!generatedSecret">
              {{ copied ? page.t('buttons.copied') : page.t('buttons.copy') }}
            </NButton>
          </div>
        </div>

        <NCard class="result-card" :bordered="false">
          <div class="result-section">
            <div class="result-label">{{ page.t('labels.generatedSecret') }}</div>
            <div class="secret-display" v-if="generatedSecret">
              <NInput
                :value="generatedSecret"
                readonly
                type="textarea"
                :rows="3"
                class="secret-input"
              />
            </div>
            <div class="secret-placeholder" v-else>
              {{ page.t('empty.secret') }}
            </div>
          </div>
        </NCard>
      </NTabPane>

      <NTabPane name="sign" :tab="page.t('tabs.sign')">
        <div class="tab-actions">
          <div class="setting-control">
            <span class="control-label">{{ page.t('labels.algorithm') }}</span>
            <NSelect
              v-model:value="signAlgorithm"
              :options="signAlgorithmOptions"
              style="width: 140px"
            />
          </div>
          <div class="action-buttons">
            <NButton quaternary @click="fillSignSample">{{ page.t('buttons.fillSignSample') }}</NButton>
            <NButton
              v-if="generatedSecret"
              quaternary
              @click="useGeneratedSecretForSign"
            >
              {{ page.t('buttons.useGeneratedSecret') }}
            </NButton>
            <NButton type="primary" @click="signToken">{{ page.t('buttons.signToken') }}</NButton>
          </div>
        </div>

        <NAlert v-if="signError" type="error" :title="signError" class="status-alert" />

        <div class="decode-panels">
          <NCard class="result-card" :bordered="false">
            <div class="result-label">{{ page.t('labels.header') }}</div>
            <NInput
              v-model:value="signHeaderJson"
              type="textarea"
              :rows="6"
              :placeholder="page.t('placeholders.signHeader')"
              class="secret-input"
            />
          </NCard>
          <NCard class="result-card" :bordered="false">
            <div class="result-label">{{ page.t('labels.payload') }}</div>
            <NInput
              v-model:value="signPayloadJson"
              type="textarea"
              :rows="6"
              :placeholder="page.t('placeholders.signPayload')"
              class="secret-input"
            />
          </NCard>
        </div>

        <NCard class="result-card" :bordered="false">
          <div class="result-label">{{ page.t('labels.signSecret') }}</div>
          <NInput
            v-model:value="signSecret"
            type="password"
            show-password-on="click"
            :placeholder="page.t('placeholders.signSecret')"
            class="secret-input"
          />
        </NCard>

        <NCard class="result-card" :bordered="false">
          <div class="result-section">
            <div class="result-label">{{ page.t('labels.signedToken') }}</div>
            <div class="secret-display" v-if="signedToken">
              <NInput
                :value="signedToken"
                readonly
                type="textarea"
                :rows="4"
                class="secret-input"
              />
              <NButton @click="copySignedToken">
                {{ signCopied ? page.t('buttons.copied') : page.t('buttons.copy') }}
              </NButton>
            </div>
            <div class="secret-placeholder" v-else>
              {{ page.t('empty.signedToken') }}
            </div>
          </div>
        </NCard>
      </NTabPane>

      <NTabPane name="decode" :tab="page.t('tabs.decode')">
        <NCard class="result-card" :bordered="false">
          <div class="decode-section">
            <div class="result-label">{{ page.t('labels.jwtToken') }}</div>
            <NInput
              v-model:value="jwtToken"
              type="textarea"
              :rows="4"
              :placeholder="page.t('placeholders.jwtToken')"
              class="secret-input"
            />
            <div class="action-buttons decode-actions">
              <NButton quaternary @click="fillSampleToken">{{ page.t('buttons.fillSample') }}</NButton>
              <NButton type="primary" @click="decodeToken">{{ page.t('buttons.decodeNow') }}</NButton>
            </div>
          </div>
        </NCard>

        <NAlert v-if="decodeError" type="error" :title="decodeError" class="status-alert" />

        <template v-if="headerJson">
          <NAlert
            v-if="timeInfo?.isExpired"
            type="warning"
            :title="page.t('messages.tokenExpired')"
            class="status-alert"
          >
            <template v-if="timeInfo.expDate">{{ page.t('messages.expiredAt', { date: timeInfo.expDate }) }}</template>
          </NAlert>

          <div v-if="timeInfo" class="time-info">
            <NTag v-if="timeInfo.iatDate" size="small">{{ page.t('labels.issuedAt', { date: timeInfo.iatDate }) }}</NTag>
            <NTag v-if="timeInfo.expDate" size="small" :type="timeInfo.isExpired ? 'error' : 'success'">
              {{ page.t('labels.expiresAt', { date: timeInfo.expDate }) }}
            </NTag>
            <NTag v-if="timeInfo.expiresInSeconds !== undefined && !timeInfo.isExpired" size="small">
              {{ page.t('labels.remainingDays', { days: Math.floor(timeInfo.expiresInSeconds / 86400) }) }}
            </NTag>
          </div>

          <div class="decode-panels">
            <NCard class="result-card" :bordered="false">
              <template #header>
                <div class="panel-header">
                  <span>{{ page.t('labels.header') }}</span>
                  <NButton size="small" @click="copyDecoded('header')">{{ page.t('buttons.copy') }}</NButton>
                </div>
              </template>
              <pre class="json-display">{{ headerJson }}</pre>
            </NCard>
            <NCard class="result-card" :bordered="false">
              <template #header>
                <div class="panel-header">
                  <span>{{ page.t('labels.payload') }}</span>
                  <NButton size="small" @click="copyDecoded('payload')">{{ page.t('buttons.copy') }}</NButton>
                </div>
              </template>
              <pre class="json-display">{{ payloadJson }}</pre>
            </NCard>
          </div>

          <NCard class="result-card verify-card" :bordered="false">
            <div class="result-label">{{ page.t('labels.hmacVerify') }}</div>
            <div class="verify-row">
              <NInput
                v-model:value="verifySecret"
                type="password"
                show-password-on="click"
                :placeholder="page.t('placeholders.verifySecret')"
                class="verify-input"
              />
              <NButton type="primary" @click="verifySignature">{{ page.t('buttons.verify') }}</NButton>
            </div>
            <div class="result-label rsa-label">{{ page.t('labels.rsaVerify') }}</div>
            <NInput
              v-model:value="verifyPublicKey"
              type="textarea"
              :rows="4"
              :placeholder="page.t('placeholders.verifyPublicKey')"
              class="verify-input"
            />
            <div v-if="verifyResult" class="verify-result">
              <NTag :type="verifyResult.valid ? 'success' : 'error'">
                {{ signatureStatusText }}
              </NTag>
              <span v-if="verifySecret && verifyResult.valid" class="verify-hint">{{ page.t('labels.secretMatch') }}</span>
            </div>
          </NCard>
        </template>
      </NTabPane>
    </NTabs>
  </PageLayout>
</template>

<style scoped>
.jwt-tool-view {
  max-width: 960px;
  margin: 0 auto;
}

.jwt-tabs {
  margin-top: var(--space-4);
}

.tab-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  align-items: center;
  margin-bottom: var(--space-4);
}

.setting-control {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.control-label {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.recommended {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  padding: 2px 8px;
  border-radius: 4px;
}

.action-buttons {
  display: flex;
  gap: var(--space-3);
}

.result-card {
  background: var(--color-bg-primary);
  margin-bottom: var(--space-4);
}

.result-section {
  margin-bottom: 0;
}

.result-label {
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.secret-display {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.secret-input {
  flex: 1;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-footnote);
}

.secret-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-body);
}

.decode-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.decode-actions {
  justify-content: flex-start;
}

.status-alert {
  margin-bottom: var(--space-4);
}

.time-info {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.decode-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

@media (max-width: 768px) {
  .decode-panels {
    grid-template-columns: 1fr;
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.json-display {
  margin: 0;
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-footnote);
  color: var(--color-text-primary);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.verify-card .verify-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.verify-input {
  flex: 1;
}

.verify-result {
  margin-top: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.verify-hint {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}
</style>

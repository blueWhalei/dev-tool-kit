<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import {
  NButton,
  NCard,
  NInput,
  NTag,
  NAlert,
  NDescriptions,
  NDescriptionsItem,
  NSpin,
  NSpace,
  useMessage
} from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useIpc } from '../composables/useIpc'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { translateToolError } from '../utils/translateToolError'
import type {
  CertificateFileReadResult,
  CertificateParseResult,
  ParsedCertificateInfo
} from '@dev-tool-kit/shared'

const SAMPLE_PEM = `-----BEGIN CERTIFICATE-----
MIID6DCCAtCgAwIBAgIUFH02wcL3Qgben6tfIibXitsApCYwDQYJKoZIhvcNAQEL
BQAwejELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNBMQswCQYDVQQHDAJTRjEPMA0G
A1UECgwGSm95ZW50MRAwDgYDVQQLDAdOb2RlLmpzMQwwCgYDVQQDDANjYTExIDAe
BgkqhkiG9w0BCQEWEXJ5QHRpbnljbG91ZHMub3JnMCAXDTIyMDkwMzIxNDAzN1oY
DzIyOTYwNjE3MjE0MDM3WjB9MQswCQYDVQQGEwJVUzELMAkGA1UECAwCQ0ExCzAJ
BgNVBAcMAlNGMQ8wDQYDVQQKDAZKb3llbnQxEDAOBgNVBAsMB05vZGUuanMxDzAN
BgNVBAMMBmFnZW50MTEgMB4GCSqGSIb3DQEJARYRcnlAdGlueWNsb3Vkcy5vcmcw
ggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDUVjIK+yDTgnCT3CxChO0E
37q9VuHdrlKeKLeQzUJW2yczSfNzX/0zfHpjY+zKWie39z3HCJqWxtiG2wxiOI8c
3WqWOvzVmdWADlh6EfkIlg+E7VC6JaKDA+zabmhPvnuu3JzogBMnsWl68lCXzuPx
deQAmEwNtqjrh74DtM+Ud0ulb//Ixjxo1q3rYKu+aaexSramuee6qJta2rjrB4l8
B/bU+j1mDf9XQQfSjo9jRnp4hiTFdBl2k+lZzqE2L/rhu6EMjA2IhAq/7xA2MbLo
9cObVUin6lfoo5+JKRgT9Fp2xEgDOit+2EA/S6oUfPNeLSVUqmXOSWlXlwlb9Nxr
AgMBAAGjYTBfMF0GCCsGAQUFBwEBBFEwTzAjBggrBgEFBQcwAYYXaHR0cDovL29j
c3Aubm9kZWpzLm9yZy8wKAYIKwYBBQUHMAKGHGh0dHA6Ly9jYS5ub2RlanMub3Jn
L2NhLmNlcnQwDQYJKoZIhvcNAQELBQADggEBAMM0mBBjLMt9pYXePtUeNO0VTw9y
FWCM8nAcAO2kRNwkJwcsispNpkcsHZ5o8Xf5mpCotdvziEWG1hyxwU6nAWyNOLcN
G0a0KUfbMO3B6ZYe1GwPDjXaQnv75SkAdxgX5zOzca3xnhITcjUUGjQ0fbDfwFV5
ix8mnzvfXjDONdEznVa7PFcN6QliFUMwR/h8pCRHtE5+a10OSPeJSrGG+FtrGnRW
G1IJUv6oiGF/MvWCr84REVgc1j78xomGANJIu2hN7bnD1nEMON6em8IfnDOUtynV
9wfWTqiQYD5Zifj6WcGa0aAHMuetyFG4lIfMAHmd3gaKpks7j9l26LwRPvI=
-----END CERTIFICATE-----`

const message = useMessage()
const router = useRouter()
const { t } = useI18n()
const page = useToolI18n('certificateParser')
const { invoke } = useIpc()
const { copy } = useCopyToClipboard()

const pemText = ref('')
const fileName = ref('')
const loading = ref(false)
const fileLoading = ref(false)
const parseResult = ref<CertificateParseResult | null>(null)

const certificates = computed(() =>
  parseResult.value?.success ? parseResult.value.certificates : []
)

const parseError = computed(() => {
  if (!parseResult.value || parseResult.value.success) return ''
  return translateToolError(t, 'certificateParser', parseResult.value.error)
})

function formatDn(attrs: ParsedCertificateInfo['subject']): string {
  return attrs.map((attr) => `${attr.shortName}=${attr.value}`).join(', ')
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}

function validityTagType(cert: ParsedCertificateInfo): 'error' | 'warning' | 'success' | 'default' {
  if (cert.isExpired || cert.isNotYetValid) return 'error'
  if (cert.daysUntilExpiry <= 30) return 'warning'
  return 'success'
}

function validityLabel(cert: ParsedCertificateInfo): string {
  if (cert.isExpired) return page.t('labels.expired')
  if (cert.isNotYetValid) return page.t('labels.notYetValid')
  if (cert.daysUntilExpiry <= 30) return page.t('labels.expiringSoon')
  return page.t('labels.valid')
}

function daysLabel(cert: ParsedCertificateInfo): string {
  if (cert.isExpired) return String(cert.daysUntilExpiry)
  return String(cert.daysUntilExpiry)
}

function publicKeyLabel(cert: ParsedCertificateInfo): string {
  const { type, bits, curve } = cert.publicKey
  const parts = [type.toUpperCase()]
  if (bits) parts.push(`${bits} bits`)
  if (curve) parts.push(curve)
  return parts.join(' · ')
}

async function parsePem() {
  if (!pemText.value.trim()) {
    parseResult.value = null
    return
  }

  loading.value = true
  try {
    const result = await invoke<CertificateParseResult>('cert-parser:parsePem', pemText.value)
    parseResult.value = result
    if (!result.success) {
      message.error(translateToolError(t, 'certificateParser', result.error))
    }
  } catch {
    message.error(page.t('messages.parseFailed'))
    parseResult.value = null
  } finally {
    loading.value = false
  }
}

async function loadFile() {
  fileLoading.value = true
  try {
    const data = await invoke<CertificateFileReadResult | null>('cert-parser:readFile')
    if (!data) return

    pemText.value = data.content
    fileName.value = data.fileName
    await parsePem()
  } catch {
    message.error(page.t('messages.loadFileFailed'))
  } finally {
    fileLoading.value = false
  }
}

function fillSample() {
  pemText.value = SAMPLE_PEM
  fileName.value = ''
}

async function copyValue(value: string) {
  await copy(value, page.t('messages.copied'))
}

function usePublicKeyInJwt(cert: ParsedCertificateInfo) {
  if (!cert.publicKeyPem?.trim()) {
    message.warning(page.t('messages.noPublicKey'))
    return
  }
  void router.push({
    name: 'JWTGenerator',
    query: { tab: 'decode', publicKey: cert.publicKeyPem }
  })
}

watchDebounced(pemText, parsePem, { debounce: 400 })
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="certificate-parser-view"
  >
    <template #actions>
      <NButton size="small" quaternary @click="fillSample">{{ t('common.fillSample') }}</NButton>
      <NButton size="small" :loading="fileLoading" @click="loadFile">{{ page.t('buttons.loadFile') }}</NButton>
    </template>

    <NCard class="input-card" :bordered="false">
      <div class="input-header">
        <span class="field-label">{{ page.t('input') }}</span>
        <NTag v-if="fileName" size="small" :bordered="false">{{ fileName }}</NTag>
      </div>
      <NInput
        v-model:value="pemText"
        type="textarea"
        :placeholder="page.t('inputPlaceholder')"
        :rows="10"
        class="pem-input"
      />
    </NCard>

    <NAlert v-if="parseError" type="error" :bordered="false" class="error-alert">
      {{ parseError }}
    </NAlert>

    <NSpin :show="loading">
      <div v-if="certificates.length > 0" class="cert-list">
        <NCard
          v-for="(cert, index) in certificates"
          :key="`${cert.serialNumber}-${index}`"
          class="cert-card"
          :bordered="false"
          :title="`${page.t('labels.certificate')} ${certificates.length > 1 ? index + 1 : ''}`"
        >
          <template #header-extra>
            <NSpace :size="8">
              <NButton
                v-if="cert.publicKeyPem"
                size="small"
                quaternary
                type="primary"
                @click="usePublicKeyInJwt(cert)"
              >
                {{ page.t('buttons.useInJwt') }}
              </NButton>
              <NTag :type="validityTagType(cert)" size="small">{{ validityLabel(cert) }}</NTag>
            </NSpace>
          </template>

          <NDescriptions :column="1" label-placement="left" bordered size="small">
            <NDescriptionsItem :label="page.t('labels.subject')">
              <span class="copyable" @click="copyValue(formatDn(cert.subject))">{{ formatDn(cert.subject) }}</span>
            </NDescriptionsItem>
            <NDescriptionsItem :label="page.t('labels.issuer')">
              <span class="copyable" @click="copyValue(formatDn(cert.issuer))">{{ formatDn(cert.issuer) }}</span>
            </NDescriptionsItem>
            <NDescriptionsItem :label="page.t('labels.validFrom')">
              {{ formatDate(cert.validFrom) }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="page.t('labels.validTo')">
              {{ formatDate(cert.validTo) }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="page.t('labels.daysUntilExpiry')">
              {{ daysLabel(cert) }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="page.t('labels.serialNumber')">
              <span class="copyable mono" @click="copyValue(cert.serialNumber)">{{ cert.serialNumber }}</span>
            </NDescriptionsItem>
            <NDescriptionsItem :label="page.t('labels.subjectAltNames')">
              <template v-if="cert.subjectAltNames.length > 0">
                <NTag
                  v-for="san in cert.subjectAltNames"
                  :key="san"
                  size="small"
                  :bordered="false"
                  class="san-tag"
                >
                  {{ san }}
                </NTag>
              </template>
              <span v-else class="muted">{{ page.t('labels.noSan') }}</span>
            </NDescriptionsItem>
            <NDescriptionsItem :label="page.t('labels.signatureAlgorithm')">
              {{ cert.signatureAlgorithm }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="page.t('labels.publicKeyType')">
              {{ publicKeyLabel(cert) }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="page.t('labels.fingerprint')">
              <span class="copyable mono" @click="copyValue(cert.fingerprint)">{{ cert.fingerprint }}</span>
            </NDescriptionsItem>
            <NDescriptionsItem :label="page.t('labels.fingerprint256')">
              <span class="copyable mono" @click="copyValue(cert.fingerprint256)">{{ cert.fingerprint256 }}</span>
            </NDescriptionsItem>
          </NDescriptions>
        </NCard>
      </div>
    </NSpin>
  </PageLayout>
</template>

<style scoped>
.input-card {
  margin-bottom: 16px;
}

.input-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--n-text-color-2);
}

.pem-input {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
}

.error-alert {
  margin-bottom: 16px;
}

.cert-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cert-card :deep(.n-card-header) {
  padding-bottom: 8px;
}

.copyable {
  cursor: pointer;
}

.copyable:hover {
  color: var(--n-primary-color);
}

.mono {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  word-break: break-all;
}

.muted {
  color: var(--n-text-color-3);
}

.san-tag {
  margin-right: 6px;
  margin-bottom: 4px;
}
</style>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NCard, NSlider, NInput, NButton, NSpace, NCheckbox,
  NProgress, NRadioGroup, NRadioButton, useMessage
} from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useCopyToClipboard } from '../composables/useCopyToClipboard'
import { generatePassphrase } from '@dev-tool-kit/shared'

const message = useMessage()
const { t } = useI18n()
const page = useToolI18n('passwordGenerator')
const { copy } = useCopyToClipboard()

type PasswordMode = 'random' | 'passphrase'

const mode = ref<PasswordMode>('random')
const length = ref(16)
const lengthInput = ref('16')
const wordCount = ref(5)
const separator = ref('-')
const useUppercase = ref(true)
const useLowercase = ref(true)
const useNumbers = ref(true)
const useSpecial = ref(true)
const customChars = ref('')
const generatedPassword = ref('')
const copied = ref(false)

function onLengthInput(value: string) {
  const num = parseInt(value, 10)
  if (isNaN(num)) {
    lengthInput.value = String(length.value)
    return
  }
  if (num < 8) {
    length.value = 8
    lengthInput.value = '8'
  } else if (num > 256) {
    length.value = 256
    lengthInput.value = '256'
  } else {
    length.value = num
    lengthInput.value = String(num)
  }
}

function onLengthChange(value: number) {
  length.value = value
  lengthInput.value = String(value)
}

const charSets = computed(() => {
  let chars = ''
  if (useUppercase.value) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (useLowercase.value) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (useNumbers.value) chars += '0123456789'
  if (useSpecial.value) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'
  if (customChars.value) chars += customChars.value
  return chars
})

const passwordStrength = computed(() => {
  const pwd = generatedPassword.value
  if (!pwd) return { level: 0, label: '', color: '' }

  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (pwd.length >= 16) score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (mode.value === 'passphrase' && pwd.split(separator.value).length >= 4) score += 2

  if (score <= 2) return { level: 1, label: page.t('strength.weak'), color: '#ef4444' }
  if (score <= 4) return { level: 2, label: page.t('strength.medium'), color: '#f59e0b' }
  return { level: 3, label: page.t('strength.strong'), color: '#22c55e' }
})

function generatePassword() {
  if (mode.value === 'passphrase') {
    generatedPassword.value = generatePassphrase(wordCount.value, separator.value || '-')
    copied.value = false
    return
  }

  if (charSets.value.length === 0) {
    message.warning(page.t('messages.charTypeRequired'))
    return
  }

  const chars = charSets.value
  let password = ''
  const array = new Uint32Array(length.value)
  crypto.getRandomValues(array)

  for (let i = 0; i < length.value; i++) {
    password += chars[array[i] % chars.length]
  }

  generatedPassword.value = password
  copied.value = false
}

async function copyPassword() {
  if (!generatedPassword.value) return
  await copy(generatedPassword.value, page.t('messages.copied'))
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function regenerate() {
  generatePassword()
}

watch([length, useUppercase, useLowercase, useNumbers, useSpecial, customChars, mode, wordCount, separator], () => {
  if (generatedPassword.value) {
    generatePassword()
  }
})
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="password-generator-view"
  >
    <NCard
      class="setting-card"
      :bordered="false"
    >
      <NRadioGroup
        v-model:value="mode"
        class="mode-switch"
      >
        <NRadioButton value="random">
          {{ page.t('modes.random') }}
        </NRadioButton>
        <NRadioButton value="passphrase">
          {{ page.t('modes.passphrase') }}
        </NRadioButton>
      </NRadioGroup>

      <template v-if="mode === 'random'">
        <div class="setting-item">
          <div class="setting-label">
            <span>{{ page.t('labels.length') }}</span>
            <NInput
              :value="lengthInput"
              type="text"
              size="small"
              style="width: 80px; text-align: center;"
              @update:value="onLengthInput"
              @blur="onLengthInput(lengthInput)"
            />
          </div>
          <NSlider
            v-model:value="length"
            :min="8"
            :max="256"
            :step="1"
            @update:value="onLengthChange"
          />
        </div>

        <div class="setting-item">
          <div class="setting-label">
            {{ page.t('labels.charTypes') }}
          </div>
          <div class="checkbox-group">
            <NSpace vertical>
              <NCheckbox v-model:checked="useUppercase">
                {{ page.t('labels.uppercase') }}
              </NCheckbox>
              <NCheckbox v-model:checked="useLowercase">
                {{ page.t('labels.lowercase') }}
              </NCheckbox>
              <NCheckbox v-model:checked="useNumbers">
                {{ page.t('labels.numbers') }}
              </NCheckbox>
              <NCheckbox v-model:checked="useSpecial">
                {{ page.t('labels.special') }}
              </NCheckbox>
            </NSpace>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span>{{ page.t('labels.customChars') }}</span>
            <span class="char-count">{{ page.t('labels.charCount', { count: customChars.length }) }}</span>
          </div>
          <NInput
            v-model:value="customChars"
            :placeholder="page.t('placeholders.customChars')"
            :maxlength="16"
            clearable
          />
        </div>
      </template>

      <template v-else>
        <div class="setting-item">
          <div class="setting-label">
            <span>{{ page.t('labels.wordCount') }}</span>
            <span>{{ wordCount }}</span>
          </div>
          <NSlider
            v-model:value="wordCount"
            :min="3"
            :max="12"
            :step="1"
          />
        </div>
        <div class="setting-item">
          <div class="setting-label">
            {{ page.t('labels.separator') }}
          </div>
          <NInput
            v-model:value="separator"
            :maxlength="3"
            style="max-width: 120px"
          />
        </div>
      </template>

      <NButton
        type="primary"
        block
        size="large"
        @click="generatePassword"
      >
        {{ page.t('buttons.generate') }}
      </NButton>
    </NCard>

    <NCard
      class="result-card"
      :bordered="false"
    >
      <div class="result-section">
        <div
          v-if="generatedPassword"
          class="password-display"
        >
          <div class="password-text">
            {{ generatedPassword }}
          </div>
          <NButton
            :type="copied ? 'success' : 'primary'"
            @click="copyPassword"
          >
            {{ copied ? page.t('buttons.copied') : t('common.copy') }}
          </NButton>
        </div>
        <div
          v-else
          class="password-placeholder"
        >
          {{ page.t('empty') }}
        </div>
      </div>

      <div
        v-if="generatedPassword"
        class="strength-section"
      >
        <div class="strength-label">
          <span>{{ page.t('labels.strength') }}</span>
          <span :style="{ color: passwordStrength.color }">{{ passwordStrength.label }}</span>
        </div>
        <NProgress
          type="line"
          :percentage="passwordStrength.level * 33"
          :color="passwordStrength.color"
          :show-indicator="false"
          :height="8"
          :border-radius="4"
        />
      </div>

      <div
        v-if="generatedPassword"
        class="action-buttons"
      >
        <NButton
          block
          @click="regenerate"
        >
          {{ page.t('buttons.regenerate') }}
        </NButton>
      </div>
    </NCard>
  </PageLayout>
</template>

<style scoped>
.password-generator-view {
  padding: var(--space-lg) 0;
}

.setting-card {
  margin-bottom: var(--space-md);
  background: var(--color-bg-primary);
}

.result-card {
  background: var(--color-bg-primary);
}

.mode-switch {
  margin-bottom: var(--space-5);
}

.setting-item {
  margin-bottom: var(--space-5);
}

.setting-item:last-of-type {
  margin-bottom: var(--space-5);
}

.setting-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
}

.checkbox-group {
  background: var(--color-bg-secondary);
  padding: var(--space-3);
  border-radius: var(--radius-md);
}

.char-count {
  font-size: var(--font-size-footnote);
  color: var(--color-text-tertiary);
  font-family: var(--font-family-mono);
}

.result-section {
  margin-bottom: var(--space-5);
}

.password-display {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.password-text {
  flex: 1;
  font-family: var(--font-family-mono);
  font-size: 16px;
  word-break: break-all;
  color: var(--color-text-primary);
}

.password-placeholder {
  text-align: center;
  padding: var(--space-8);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-body);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.strength-section {
  margin-bottom: var(--space-4);
}

.strength-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
}

.action-buttons {
  margin-top: var(--space-4);
}
</style>

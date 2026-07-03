<script setup lang="ts">
import { ref, computed } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { NInput, NButton, NSpace, NCard, NEmpty, NTag, NAlert, NTabs, NTabPane, NSelect, NList, NListItem, NThing } from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useIpc } from '../composables/useIpc'
import {
  type RegexResult,
  type CommonRegex,
  isRegexResult,
  isReplaceResult,
  isCommonRegexArray,
  validateOptional,
  validateArray
} from '../utils/type-guards'

const { invoke } = useIpc()
const page = useToolI18n('regexTester')

const SAMPLE_PATTERN = '\\d+'
const SAMPLE_TEXT = 'Order #12345 costs $67.89 on 2024-01-01'

const REGEX_I18N_KEY_BY_NAME: Record<string, string> = {
  '邮箱': 'email',
  '手机号': 'phone',
  'URL': 'url',
  'IP 地址': 'ipv4',
  '日期': 'date',
  '中文': 'chinese',
  '用户名': 'username',
  '密码强度': 'passwordStrength'
}

const pattern = ref('')
const flags = ref('g')
const testString = ref('')
const replacement = ref('')
const result = ref<RegexResult | null>(null)
const commonRegexes = ref<CommonRegex[]>([])
const replaceResult = ref('')

const flagsOptions = computed(() => [
  { label: page.t('flags.g'), value: 'g' },
  { label: page.t('flags.i'), value: 'i' },
  { label: page.t('flags.m'), value: 'm' },
  { label: page.t('flags.gi'), value: 'gi' },
  { label: page.t('flags.gm'), value: 'gm' }
])

const matchesTabLabel = computed(() =>
  page.t('tabs.matchesWithCount', { count: matchCount.value })
)

function commonRegexLabel(regex: CommonRegex, field: 'name' | 'description'): string {
  const key = REGEX_I18N_KEY_BY_NAME[regex.name]
  if (key) return page.t(`commonRegex.${key}.${field}`)
  return field === 'name' ? regex.name : regex.description
}

async function testRegex() {
  if (!pattern.value || !testString.value) {
    result.value = null
    return
  }
  try {
    const data = await invoke<RegexResult>('regex:test', pattern.value, flags.value, testString.value)
    const validated = validateOptional(data, isRegexResult, 'testRegex')
    if (validated) {
      result.value = validated
    } else {
      result.value = { isValid: false, matches: [], error: page.t('errors.invalidResponse') }
    }
  } catch (error) {
    result.value = { isValid: false, matches: [], error: String(error) }
  }
}

async function testReplace() {
  if (!pattern.value || !testString.value) return
  try {
    const data = await invoke<{ result: string }>('regex:replace', pattern.value, flags.value, testString.value, replacement.value)
    const validated = validateOptional(data, isReplaceResult, 'testReplace')
    replaceResult.value = validated?.result || ''
  } catch {
    replaceResult.value = ''
  }
}

function useCommonRegex(regex: CommonRegex) {
  pattern.value = regex.pattern
  testRegex()
}

function fillSample() {
  pattern.value = SAMPLE_PATTERN
  flags.value = 'g'
  testString.value = SAMPLE_TEXT
}

async function loadCommonRegexes() {
  const data = await invoke<CommonRegex[]>('regex:getCommon')
  commonRegexes.value = validateArray(data, isCommonRegexArray, 'loadCommonRegexes')
}

loadCommonRegexes()

watchDebounced([pattern, flags, testString], () => {
  testRegex()
  if (replacement.value) testReplace()
}, { debounce: 300 })

watchDebounced(replacement, () => {
  if (pattern.value && testString.value) testReplace()
}, { debounce: 300 })

const matchCount = computed(() => result.value?.matches?.length || 0)
</script>

<template>
  <PageLayout
    :title="page.title"
    :description="page.description"
    container-class="regex-tester-view"
  >
    <template #actions>
      <NButton size="small" quaternary @click="fillSample">{{ page.t('buttons.fillSample') }}</NButton>
    </template>

    <NCard :title="page.t('labels.pattern')" class="regex-card">
      <div class="regex-input-row">
        <NInput 
          v-model:value="pattern" 
          :placeholder="page.t('placeholders.pattern')" 
          class="regex-input"
        />
        <NSelect 
          v-model:value="flags" 
          :options="flagsOptions" 
          class="flags-select"
        />
      </div>
    </NCard>

    <NCard :title="page.t('labels.testText')" class="test-card">
      <NInput 
        v-model:value="testString" 
        type="textarea" 
        :rows="6" 
        :placeholder="page.t('placeholders.testText')"
        class="test-textarea"
      />
    </NCard>

    <NTabs type="line" animated class="result-tabs">
      <NTabPane name="matches" :tab="matchesTabLabel">
        <NCard class="result-card">
          <NAlert v-if="result && !result.isValid" type="error" :bordered="false">
            {{ result.error }}
          </NAlert>
          <NEmpty v-else-if="!result || matchCount === 0" :description="page.t('empty.matches')" />
          <NList v-else class="matches-list">
            <NListItem v-for="(m, i) in result?.matches || []" :key="i">
              <NThing>
                <template #header>
                  <div class="match-header">
                    <NTag type="primary" size="small">#{{ i + 1 }}</NTag>
                    <span class="match-text">"{{ m.match }}"</span>
                  </div>
                </template>
                <template #description>
                  <div class="match-info">
                    <span class="match-index">{{ page.t('labels.matchIndex', { index: m.index }) }}</span>
                    <div v-if="m.groups.length > 0" class="match-groups">
                      <NTag v-for="(g, gi) in m.groups" :key="gi" size="small" :type="g ? 'success' : 'default'">
                        {{ page.t('labels.groupLabel', { index: gi + 1, value: g || page.t('labels.groupEmpty') }) }}
                      </NTag>
                    </div>
                  </div>
                </template>
              </NThing>
            </NListItem>
          </NList>
        </NCard>
      </NTabPane>

      <NTabPane name="common" :tab="page.t('tabs.common')">
        <NCard class="result-card">
          <NList class="common-list">
            <NListItem v-for="r in commonRegexes" :key="r.name" class="common-item" @click="useCommonRegex(r)">
              <NThing>
                <template #header>
                  <span class="common-name">{{ commonRegexLabel(r, 'name') }}</span>
                </template>
                <template #description>
                  <div class="common-pattern">{{ r.pattern }}</div>
                  <div class="common-desc">{{ commonRegexLabel(r, 'description') }}</div>
                </template>
              </NThing>
            </NListItem>
          </NList>
        </NCard>
      </NTabPane>

      <NTabPane name="replace" :tab="page.t('tabs.replace')">
        <NCard class="result-card">
          <NSpace vertical :size="16">
            <div class="replace-input-wrapper">
              <div class="input-label">{{ page.t('labels.replacement') }}</div>
              <NInput 
                v-model:value="replacement" 
                :placeholder="page.t('placeholders.replacement')" 
                class="replace-input"
              />
            </div>
            <div v-if="replaceResult" class="replace-preview">
              <div class="input-label">{{ page.t('labels.replaceResult') }}</div>
              <NInput 
                :value="replaceResult" 
                type="textarea" 
                :rows="4" 
                readonly 
                class="replace-result"
              />
            </div>
          </NSpace>
        </NCard>
      </NTabPane>
    </NTabs>
  </PageLayout>
</template>

<style scoped>
.regex-tester-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.regex-card {
  margin-bottom: var(--space-md);
}

.regex-input-row {
  display: flex;
  gap: var(--space-2);
}

.regex-input {
  flex: 1;
  font-family: var(--font-family-mono);
}

.flags-select {
  width: 140px;
  flex-shrink: 0;
}

.test-card {
  margin-bottom: var(--space-md);
}

.test-textarea {
  font-family: var(--font-family-mono);
}

.result-tabs {
  flex: 1;
}

.result-card {
  margin-top: var(--space-md);
}

.matches-list {
  max-height: 400px;
  overflow-y: auto;
}

.match-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.match-text {
  font-family: var(--font-family-mono);
  color: var(--color-primary);
  font-weight: 500;
}

.match-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.match-index {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-caption1);
}

.match-groups {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.common-list {
  max-height: 400px;
  overflow-y: auto;
}

.common-item {
  cursor: pointer;
  transition: background 0.15s;
  border-radius: var(--radius-sm);
}

.common-item:hover {
  background: var(--color-bg-secondary);
}

.common-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.common-pattern {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-footnote);
  color: var(--color-primary);
  margin-bottom: var(--space-1);
}

.common-desc {
  font-size: var(--font-size-caption1);
  color: var(--color-text-secondary);
}

.replace-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.input-label {
  font-size: var(--font-size-footnote);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.replace-input {
  font-family: var(--font-family-mono);
}

.replace-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.replace-result {
  font-family: var(--font-family-mono);
}
</style>

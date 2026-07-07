<script setup lang="ts">
import { ref, computed } from 'vue'
import { watchDebounced } from '@vueuse/core'
import {
  NInput, NButton, NSpace, NCard, NEmpty, NTag, NAlert, NTabs, NTabPane,
  NList, NListItem, NThing, NButtonGroup
} from 'naive-ui'
import PageLayout from '../components/PageLayout.vue'
import { useToolI18n } from '../composables/useToolI18n'
import { useIpc } from '../composables/useIpc'
import {
  type RegexResult,
  type CommonRegex,
  isRegexResult,
  isCommonRegexArray,
  validateOptional,
  validateArray
} from '../utils/type-guards'
import { buildFlagsString, buildMatchHighlights } from '@dev-tool-kit/shared'

const { invoke } = useIpc()
const page = useToolI18n('regexTester')

const SAMPLE_PATTERN = '(\\d+)'
const SAMPLE_TEXT = 'Order #12345 costs $67.89 on 2024-01-01'
const SAMPLE_REPLACEMENT = '[$1]'

const REGEX_I18N_KEY_BY_NAME: Record<string, string> = {
  '邮箱': 'email',
  '手机号': 'phone',
  'URL': 'url',
  'IP 地址': 'ipv4',
  '日期': 'date',
  '中文': 'chinese',
  '用户名': 'username',
  '密码强度': 'passwordStrength',
  'UUID': 'uuid',
  '十六进制颜色': 'hexColor',
  '整数': 'integer',
  'MAC 地址': 'macAddress',
  'HTML 标签': 'htmlTag',
  '信用卡号': 'creditCard'
}

const pattern = ref('')
const flagG = ref(true)
const flagI = ref(false)
const flagM = ref(false)
const flagS = ref(false)
const testString = ref('')
const replacement = ref('')
const result = ref<RegexResult | null>(null)
const commonRegexes = ref<CommonRegex[]>([])
const replaceResult = ref('')
const replaceError = ref('')

const flags = computed(() =>
  buildFlagsString({ g: flagG.value, i: flagI.value, m: flagM.value, s: flagS.value })
)

const activeFlags = computed(() => {
  const list: string[] = []
  if (flagG.value) list.push('g')
  if (flagI.value) list.push('i')
  if (flagM.value) list.push('m')
  if (flagS.value) list.push('s')
  return list
})

const matchesTabLabel = computed(() =>
  page.t('tabs.matchesWithCount', { count: matchCount.value })
)

const highlightSegments = computed(() => {
  if (!testString.value || !result.value?.matches?.length) return []
  return buildMatchHighlights(testString.value, result.value.matches)
})

function commonRegexLabel(regex: CommonRegex, field: 'name' | 'description'): string {
  const key = REGEX_I18N_KEY_BY_NAME[regex.name]
  if (key) return page.t(`commonRegex.${key}.${field}`)
  return field === 'name' ? regex.name : regex.description
}

function flagLabel(flag: 'g' | 'i' | 'm' | 's'): string {
  return page.t(`flags.${flag}`)
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
  replaceError.value = ''
  if (!pattern.value || !testString.value) {
    replaceResult.value = ''
    return
  }
  try {
    const data = await invoke<{ success: boolean; result?: string; error?: string }>(
      'regex:replace',
      pattern.value,
      flags.value,
      testString.value,
      replacement.value
    )
    if (data && typeof data === 'object' && 'success' in data) {
      if (data.success && typeof data.result === 'string') {
        replaceResult.value = data.result
      } else {
        replaceResult.value = ''
        replaceError.value = typeof data.error === 'string' ? data.error : page.t('errors.invalidResponse')
      }
    } else {
      replaceResult.value = ''
      replaceError.value = page.t('errors.invalidResponse')
    }
  } catch (error) {
    replaceResult.value = ''
    replaceError.value = String(error)
  }
}

function useCommonRegex(regex: CommonRegex) {
  pattern.value = regex.pattern
  testRegex()
}

function fillSample() {
  pattern.value = SAMPLE_PATTERN
  flagG.value = true
  flagI.value = false
  flagM.value = false
  flagS.value = false
  testString.value = SAMPLE_TEXT
  replacement.value = SAMPLE_REPLACEMENT
  void testRegex()
}

async function loadCommonRegexes() {
  const data = await invoke<CommonRegex[]>('regex:getCommon')
  commonRegexes.value = validateArray(data, isCommonRegexArray, 'loadCommonRegexes')
}

loadCommonRegexes()

watchDebounced([pattern, flags, testString], () => {
  testRegex()
  testReplace()
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
        <div class="flags-panel">
          <NButtonGroup size="small" class="flags-toggle">
            <NButton
              :type="flagG ? 'primary' : 'default'"
              :title="flagLabel('g')"
              @click="flagG = !flagG"
            >g</NButton>
            <NButton
              :type="flagI ? 'primary' : 'default'"
              :title="flagLabel('i')"
              @click="flagI = !flagI"
            >i</NButton>
            <NButton
              :type="flagM ? 'primary' : 'default'"
              :title="flagLabel('m')"
              @click="flagM = !flagM"
            >m</NButton>
            <NButton
              :type="flagS ? 'primary' : 'default'"
              :title="flagLabel('s')"
              @click="flagS = !flagS"
            >s</NButton>
          </NButtonGroup>
          <div v-if="activeFlags.length" class="active-flags">
            <NTag
              v-for="f in activeFlags"
              :key="f"
              size="small"
              type="info"
              :bordered="false"
            >/{{ f }}</NTag>
          </div>
          <span v-else class="no-flags">{{ page.t('labels.noFlags') }}</span>
        </div>
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
      <div v-if="highlightSegments.length" class="highlight-panel">
        <div class="input-label">{{ page.t('labels.highlightPreview') }}</div>
        <pre class="highlight-text" aria-label="match highlight preview"><span
          v-for="(seg, si) in highlightSegments"
          :key="si"
          :class="{
            'hl-match': seg.kind === 'match',
            'hl-group': seg.kind === 'group'
          }"
          :style="seg.kind === 'group' && seg.groupIndex !== undefined
            ? { background: `var(--regex-group-${(seg.groupIndex % 4) + 1})` }
            : undefined"
        >{{ seg.text }}</span></pre>
      </div>
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
                      <NTag
                        v-for="(g, gi) in m.groups"
                        :key="gi"
                        size="small"
                        :type="g ? 'success' : 'default'"
                        :style="g ? { borderColor: `var(--regex-group-${(gi % 4) + 1})` } : undefined"
                      >
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
              <div class="replace-hint">{{ page.t('labels.replacementHint') }}</div>
            </div>
            <NAlert v-if="replaceError" type="error" :bordered="false">{{ replaceError }}</NAlert>
            <div class="replace-preview">
              <div class="input-label">{{ page.t('labels.replaceResult') }}</div>
              <NInput
                v-if="replaceResult || (pattern && testString)"
                :value="replaceResult"
                type="textarea"
                :rows="4"
                readonly
                class="replace-result"
              />
              <NEmpty
                v-else
                :description="page.t('empty.replacePreview')"
                class="replace-empty"
              />
            </div>
          </NSpace>
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
    </NTabs>
  </PageLayout>
</template>

<style scoped>
.regex-tester-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  --regex-group-1: #c8e6c9;
  --regex-group-2: #bbdefb;
  --regex-group-3: #ffe0b2;
  --regex-group-4: #f8bbd0;
}

.regex-card {
  margin-bottom: var(--space-md);
}

.regex-input-row {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
}

.regex-input {
  flex: 1;
  font-family: var(--font-family-mono);
}

.flags-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
  flex-shrink: 0;
}

.flags-toggle {
  flex-shrink: 0;
}

.active-flags {
  display: flex;
  gap: var(--space-1);
}

.no-flags {
  font-size: var(--font-size-caption1);
  color: var(--color-text-tertiary);
}

.test-card {
  margin-bottom: var(--space-md);
}

.test-textarea {
  font-family: var(--font-family-mono);
}

.highlight-panel {
  margin-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.highlight-text {
  margin: 0;
  padding: var(--space-2);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-footnote);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.hl-match {
  background: rgba(var(--color-primary-rgb, 24, 160, 88), 0.2);
  border-radius: 2px;
  padding: 0 1px;
}

.hl-group {
  border-radius: 2px;
  padding: 0 1px;
  outline: 1px solid rgba(0, 0, 0, 0.1);
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

.replace-hint {
  font-size: var(--font-size-caption1);
  color: var(--color-text-tertiary);
}

.replace-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.replace-result {
  font-family: var(--font-family-mono);
}

.replace-empty {
  padding: var(--space-md) 0;
}
</style>

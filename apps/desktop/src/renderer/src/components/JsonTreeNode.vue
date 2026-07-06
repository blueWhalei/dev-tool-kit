<script setup lang="ts">
import { computed, ref } from 'vue'

defineOptions({ name: 'JsonTreeNode' })

const props = defineProps<{
  name?: string
  value: unknown
  depth?: number
}>()

const depth = computed(() => props.depth ?? 0)
const expanded = ref(depth.value < 2)

const isObject = computed(
  () => props.value !== null && typeof props.value === 'object' && !Array.isArray(props.value)
)
const isArray = computed(() => Array.isArray(props.value))
const isExpandable = computed(() => isObject.value || isArray.value)

const entries = computed((): [string, unknown][] => {
  if (isObject.value) {
    return Object.entries(props.value as Record<string, unknown>)
  }
  if (isArray.value) {
    return (props.value as unknown[]).map((item, index) => [String(index), item])
  }
  return []
})

const summary = computed(() => {
  if (isArray.value) return `[${(props.value as unknown[]).length}]`
  if (isObject.value) return `{${entries.value.length}}`
  return ''
})

function formatPrimitive(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  return String(value)
}

function primitiveClass(value: unknown): string {
  if (value === null) return 'json-null'
  return `json-${typeof value}`
}

function toggle() {
  if (isExpandable.value) expanded.value = !expanded.value
}
</script>

<template>
  <div class="json-tree-node" :style="{ paddingLeft: depth > 0 ? '14px' : undefined }">
    <div class="json-tree-row" @click="toggle">
      <span v-if="isExpandable" class="json-tree-toggle">{{ expanded ? '▾' : '▸' }}</span>
      <span v-else class="json-tree-toggle json-tree-toggle--empty" />
      <span v-if="name !== undefined" class="json-tree-key">{{ name }}:</span>
      <span v-if="isExpandable && !expanded" class="json-tree-summary">{{ summary }}</span>
      <span v-else-if="!isExpandable" :class="['json-tree-value', primitiveClass(value)]">
        {{ formatPrimitive(value) }}
      </span>
    </div>
    <div v-if="isExpandable && expanded" class="json-tree-children">
      <JsonTreeNode
        v-for="[childName, childValue] in entries"
        :key="childName"
        :name="childName"
        :value="childValue"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<style scoped>
.json-tree-node {
  font-family: var(--font-family-mono);
  font-size: 13px;
  line-height: 1.5;
}

.json-tree-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  cursor: default;
  user-select: text;
  padding: 1px 0;
}

.json-tree-row:hover {
  background: var(--color-bg-secondary);
  border-radius: 4px;
}

.json-tree-toggle {
  width: 12px;
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  font-size: 11px;
}

.json-tree-toggle--empty {
  visibility: hidden;
}

.json-tree-key {
  color: var(--color-text-secondary);
}

.json-tree-summary {
  color: var(--color-text-tertiary);
}

.json-tree-value.json-string {
  color: #0a7c42;
}

.json-tree-value.json-number {
  color: #0550ae;
}

.json-tree-value.json-boolean {
  color: #8250df;
}

.json-tree-value.json-null {
  color: var(--color-text-tertiary);
  font-style: italic;
}
</style>

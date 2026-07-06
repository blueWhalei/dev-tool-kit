<script setup lang="ts">
import JsonTreeNode from './JsonTreeNode.vue'

defineProps<{
  value: unknown
}>()
</script>

<template>
  <div class="json-tree-view">
    <JsonTreeNode :value="value" />
  </div>
</template>

<style scoped>
.json-tree-view {
  max-height: 280px;
  overflow: auto;
  padding: 8px 12px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
}
</style>

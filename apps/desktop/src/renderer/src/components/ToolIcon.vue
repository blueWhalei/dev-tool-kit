<script setup lang="ts">
import { computed } from 'vue'
import { TOOL_ICON_PATHS, resolveToolIcon, type ToolIconName } from './icons/tool-icons'

const props = withDefaults(defineProps<{
  name: string
  size?: number
  strokeWidth?: number
}>(), {
  size: 18,
  strokeWidth: 1.75
})

const iconName = computed((): ToolIconName => resolveToolIcon(props.name))
const path = computed(() => TOOL_ICON_PATHS[iconName.value])
</script>

<template>
  <svg
    class="tool-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="path" />
  </svg>
</template>

<style scoped>
.tool-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>

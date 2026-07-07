<script setup lang="ts">
defineProps<{
  label?: string
  description?: string
}>()
</script>

<template>
  <div class="settings-row">
    <div
      v-if="label || description"
      class="settings-row-label"
    >
      <span
        v-if="label"
        class="settings-row-title"
      >{{ label }}</span>
      <span
        v-if="description"
        class="settings-row-desc"
      >{{ description }}</span>
    </div>
    <div class="settings-row-control">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.settings-row + .settings-row {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-secondary);
}

.settings-row-label {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.settings-row-title {
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
}

.settings-row-desc {
  font-size: var(--font-size-footnote);
  color: var(--color-text-tertiary);
}

.settings-row-control {
  flex-shrink: 0;
  min-width: 0;
}
</style>

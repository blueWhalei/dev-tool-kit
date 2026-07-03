<script setup lang="ts">
import ToolIcon from './ToolIcon.vue'

defineProps<{
  title: string
  icon?: string
}>()
</script>

<template>
  <section class="settings-section">
    <div class="settings-section-header">
      <ToolIcon v-if="icon" :name="icon" :size="18" class="settings-section-icon" />
      <h3 class="settings-section-title">{{ title }}</h3>
      <div v-if="$slots.extra" class="settings-section-extra">
        <slot name="extra" />
      </div>
    </div>
    <div class="settings-section-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.settings-section {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.settings-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.settings-section-icon {
  color: var(--color-text-secondary);
}

.settings-section-title {
  margin: 0;
  flex: 1;
  font-size: var(--font-size-subheadline);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.settings-section-extra {
  flex-shrink: 0;
}

.settings-section-body {
  padding: var(--space-4) var(--space-5);
}
</style>

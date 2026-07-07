<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  containerClass?: string
}>()
</script>

<template>
  <div
    class="page-container animate-fadeIn"
    :class="containerClass"
  >
    <div class="page-header">
      <h1 class="page-title">
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="page-description"
      >
        {{ description }}
      </p>
    </div>
    <div
      v-if="$slots.actions"
      class="page-actions"
    >
      <slot name="actions" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
import PageLayout from '../components/PageLayout.vue'

const router = useRouter()
const { t } = useI18n()

function goHome() {
  router.push({ name: 'PortManager' })
}
</script>

<template>
  <PageLayout
    :title="t('notFound.title')"
    :description="t('notFound.description')"
  >
    <div class="not-found-body">
      <div class="error-code">
        404
      </div>
      <NButton
        type="primary"
        @click="goHome"
      >
        {{ t('notFound.goHome') }}
      </NButton>
    </div>
  </PageLayout>
</template>

<style scoped>
.not-found-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) 0;
  text-align: center;
}

.error-code {
  font-size: 96px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-tertiary);
  line-height: 1;
  margin-bottom: var(--space-6);
}
</style>

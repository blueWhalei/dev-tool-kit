<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { NAlert, NButton, NInput, NPopconfirm, NSpace } from 'naive-ui'
import {
  parsePortDiagnosisInput,
  type OperationResult,
  type PortInfo,
  type PortTarget
} from '@dev-tool-kit/shared'
import { useIpc } from '../composables/useIpc'
import { useToolI18n } from '../composables/useToolI18n'

defineProps<{ isWindows: boolean }>()
const emit = defineEmits<{ failed: [pid: number, result: OperationResult] }>()
const page = useToolI18n('portManager')
const { invoke } = useIpc()
const input = ref('')
const target = ref<PortTarget | null>(null)
const owners = ref<PortInfo[]>([])
type Status =
  | 'invalid'
  | 'scanFailed'
  | 'occupied'
  | 'absent'
  | 'released'
  | 'unavailable'
  | 'unconfirmed'
  | 'unidentified'
  | 'stillOccupied'
  | 'otherOwner'
const status = ref<Status | null>(null)
const busy = ref(false)
let active = true
onBeforeUnmount(() => {
  active = false
})
watch(
  input,
  () => {
    status.value = null
    owners.value = []
    target.value = null
  },
  { flush: 'sync' }
)

async function diagnose() {
  if (busy.value) return
  const endpoint = parsePortDiagnosisInput(input.value)
  target.value = endpoint
  owners.value = []
  if (endpoint === null) {
    status.value = 'invalid'
    return
  }
  busy.value = true
  status.value = null
  try {
    const result = await invoke('port-manager:diagnose', endpoint)
    if (!active) return
    owners.value = result?.listeners ?? []
    status.value =
      result?.status === 'listening'
        ? 'occupied'
        : result?.status === 'bindable'
          ? 'absent'
          : result?.status === 'unavailable'
            ? 'unavailable'
            : 'scanFailed'
  } finally {
    busy.value = false
  }
}

async function terminate(row: PortInfo) {
  const endpoint = target.value
  if (!endpoint || !row.instanceId || busy.value || !active || !owners.value.includes(row)) return
  busy.value = true
  try {
    const result = await invoke('port-manager:killProcess', {
      port: row.port,
      pid: row.pid,
      localAddress: row.localAddress,
      instanceId: row.instanceId
    })
    if (!active) return
    if (!result?.success) emit('failed', row.pid, result ?? { success: false })
    // A signal can return before the socket closes. Never signal a second time.
    let consecutiveAvailable = 0
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise(resolve => setTimeout(resolve, 500))
      if (!active) return
      const check = await invoke('port-manager:diagnose', endpoint)
      if (!active) return
      owners.value = check?.listeners ?? []
      if (!check || check.status === 'unknown') {
        status.value = 'scanFailed'
        return
      }
      if (check.status === 'bindable') {
        consecutiveAvailable++
        status.value = 'unconfirmed'
        if (consecutiveAvailable >= 2) {
          status.value = result?.success ? 'released' : 'absent'
          return
        }
        continue
      }
      consecutiveAvailable = 0
      if (check.status === 'unavailable') status.value = 'unavailable'
      else if (
        check.listeners.some(owner => owner.pid === row.pid && owner.instanceId === row.instanceId)
      )
        status.value = 'stillOccupied'
      else if (check.listeners.some(owner => !owner.instanceId)) status.value = 'unidentified'
      else status.value = 'otherOwner'
      if (!result?.success) return
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <NSpace vertical class="port-diagnosis" :size="12">
    <NInput
      v-model:value="input"
      type="textarea"
      :rows="3"
      :disabled="busy"
      :placeholder="page.t('diagnosis.input')"
      :aria-label="page.t('diagnosis.input')"
    />
    <NButton type="primary" :loading="busy" :disabled="!input.trim() || busy" @click="diagnose">{{
      page.t('diagnosis.run')
    }}</NButton>
    <div aria-live="polite">
      <NAlert
        v-if="status"
        :type="
          status === 'scanFailed' || status === 'invalid'
            ? 'error'
            : status === 'released' || status === 'absent'
              ? 'success'
              : 'info'
        "
      >
        {{ page.t('diagnosis.' + status, { port: target?.port }) }}
      </NAlert>
    </div>
    <NSpace
      v-for="row in owners"
      :key="row.port + '/' + row.localAddress + '/' + row.pid + '/' + (row.instanceId ?? '')"
      align="center"
    >
      <strong>{{ row.service || page.t('diagnosis.unknownProcess') }}</strong>
      <code>PID {{ row.pid || '—' }} · TCP {{ row.localAddress }} · {{ row.port }}</code>
      <small v-if="!row.instanceId">{{ page.t('diagnosis.readOnly') }}</small>
      <NPopconfirm
        :positive-text="page.t('buttons.confirm')"
        :negative-text="page.t('buttons.cancel')"
        @positive-click="terminate(row)"
      >
        <template #trigger
          ><NButton size="small" type="error" secondary :disabled="busy || !row.instanceId">{{
            page.t('buttons.kill')
          }}</NButton></template
        >
        {{
          page.t('diagnosis.confirm', {
            name: row.service || page.t('diagnosis.unknownProcess'),
            pid: row.pid,
            port: row.port,
            address: row.localAddress
          })
        }}
        {{ isWindows ? page.t('diagnosis.forceWindows') : '' }}
      </NPopconfirm>
    </NSpace>
  </NSpace>
</template>

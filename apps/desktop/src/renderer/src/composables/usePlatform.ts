import { ref } from 'vue'
import { useIpc } from './useIpc'

export type AppPlatform = 'win32' | 'darwin' | 'linux' | string

export function usePlatform() {
  const { invoke } = useIpc()
  const platform = ref<AppPlatform>('')
  const loaded = ref(false)

  async function loadPlatform() {
    if (loaded.value) return platform.value
    const value = await invoke<string>('app:getPlatform')
    platform.value = value ?? ''
    loaded.value = true
    return platform.value
  }

  return {
    platform,
    loaded,
    loadPlatform,
    isWindows: () => platform.value === 'win32',
    isMac: () => platform.value === 'darwin',
    isLinux: () => platform.value === 'linux'
  }
}

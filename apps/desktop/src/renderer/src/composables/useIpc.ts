import type { IpcInvokeChannel } from '@dev-tool-kit/shared'
import { useI18n } from 'vue-i18n'
import { logError, showError } from '../utils/error-handler'

/** Strip Vue reactive proxies before IPC (structured clone rejects proxies). */
function serializeForIpc(value: unknown): unknown {
  if (value === undefined || value === null) return value
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint') {
    return value
  }
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

export function useIpc() {
  const { t } = useI18n()

  async function invoke<T>(
    channel: IpcInvokeChannel,
    ...args: unknown[]
  ): Promise<T | undefined> {
    if (!window.electronAPI) {
      showError(t('common.electronApiUnavailable'))
      return undefined
    }
    try {
      const plainArgs = args.map(serializeForIpc)
      return (await window.electronAPI.invoke(channel, ...plainArgs)) as T
    } catch (error) {
      logError(`IPC:${channel}`, error)
      showError(error)
      return undefined
    }
  }

  return { invoke }
}

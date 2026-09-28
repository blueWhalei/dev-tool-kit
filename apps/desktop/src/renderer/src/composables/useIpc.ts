import type { TypedIpcChannel, IpcArgs, IpcResult } from '@dev-tool-kit/shared'
import { useI18n } from 'vue-i18n'
import { logError, showError } from '../utils/error-handler'

/** Strip Vue reactive proxies before IPC (structured clone rejects proxies). */
export function serializeForIpc(value: unknown): unknown {
  if (value === undefined || value === null) return value
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint') {
    return value
  }
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    // 循环引用/不可序列化数据：明确报错而非把坏对象传给 ipcRenderer（会静默失败）
    throw new Error('IPC 参数包含无法序列化的数据（循环引用或非结构化克隆类型）')
  }
}

export function useIpc() {
  const { t } = useI18n()

  async function invoke<C extends TypedIpcChannel>(
    channel: C,
    ...args: IpcArgs<C>
  ): Promise<IpcResult<C> | undefined> {
    if (!window.electronAPI) {
      showError(t('common.electronApiUnavailable'))
      return undefined
    }
    try {
      const plainArgs = args.map(serializeForIpc) as IpcArgs<C>
      return await window.electronAPI.invoke(channel, ...plainArgs)
    } catch (error) {
      logError(`IPC:${channel}`, error)
      showError(error)
      return undefined
    }
  }

  return { invoke }
}

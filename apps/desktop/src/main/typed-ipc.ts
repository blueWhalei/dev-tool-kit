import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { TypedIpcChannel, IpcArgs, IpcResult } from '@dev-tool-kit/shared'

/** Compile-time contract; handlers still validate untrusted renderer input at runtime. */
export function handleIpc<C extends TypedIpcChannel>(
  channel: C,
  handler: (event: IpcMainInvokeEvent, ...args: IpcArgs<C>) => IpcResult<C> | Promise<IpcResult<C>>
): void {
  ipcMain.handle(channel, handler)
}

import { describe, it, expect } from 'vitest'
import { IPC_INVOKE_CHANNELS, IPC_RECEIVE_CHANNELS } from '../ipc/channels'
import { APP_SHORTCUTS } from '../constants/shortcuts'
import { PLATFORM_CAPABILITIES } from '../constants/platform-capabilities'

describe('ipc channels smoke', () => {
  it('invoke channels are unique', () => {
    expect(new Set(IPC_INVOKE_CHANNELS).size).toBe(IPC_INVOKE_CHANNELS.length)
  })

  it('receive channels are unique', () => {
    expect(new Set(IPC_RECEIVE_CHANNELS).size).toBe(IPC_RECEIVE_CHANNELS.length)
  })

  it('includes newly added app and hosts channels', () => {
    expect(IPC_INVOKE_CHANNELS).toContain('app:getRuntimeInfo')
    expect(IPC_INVOKE_CHANNELS).toContain('hosts:exportSchemes')
    expect(IPC_INVOKE_CHANNELS).toContain('file-renamer:listRules')
    expect(IPC_INVOKE_CHANNELS).toContain('image-base64:pickImage')
  })
})

describe('shortcuts registry smoke', () => {
  it('shortcut ids are unique', () => {
    const ids = APP_SHORTCUTS.map(item => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes global search shortcut', () => {
    expect(APP_SHORTCUTS.some(item => item.id === 'global-search')).toBe(true)
  })
})

describe('platform capabilities smoke', () => {
  it('defines matrix rows for system tools', () => {
    const features = PLATFORM_CAPABILITIES.map(row => row.feature)
    expect(features).toContain('端口扫描')
    expect(features).toContain('环境变量管理')
  })
})

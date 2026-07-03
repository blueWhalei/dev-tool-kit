export type ShortcutScope = 'global' | 'page' | 'overlay'

export interface AppShortcut {
  id: string
  action: string
  keys: string[]
  scope: ShortcutScope
  page?: string
}

/** Keyboard shortcuts — single source for About page and docs */
export const APP_SHORTCUTS: AppShortcut[] = [
  { id: 'global-search', action: '打开/关闭全局搜索', keys: ['Ctrl', 'K'], scope: 'global' },
  { id: 'search-up', action: '搜索列表上移', keys: ['↑'], scope: 'overlay', page: '全局搜索' },
  { id: 'search-down', action: '搜索列表下移', keys: ['↓'], scope: 'overlay', page: '全局搜索' },
  { id: 'search-enter', action: '打开选中工具', keys: ['Enter'], scope: 'overlay', page: '全局搜索' },
  { id: 'search-escape', action: '关闭搜索', keys: ['Esc'], scope: 'overlay', page: '全局搜索' },
  { id: 'copy-output', action: '复制双栏面板输出', keys: ['Ctrl', 'Shift', 'C'], scope: 'page', page: '双栏工具页' },
  { id: 'converter-run', action: '执行当前 Tab 主操作', keys: ['Ctrl', 'Enter'], scope: 'page', page: '编码与格式转换' },
  { id: 'port-refresh', action: '刷新端口列表', keys: ['R'], scope: 'page', page: '端口管理' }
]

export const GLOBAL_SHORTCUTS = APP_SHORTCUTS.filter(item => item.scope === 'global')
export const OVERLAY_SHORTCUTS = APP_SHORTCUTS.filter(item => item.scope === 'overlay')
export const PAGE_SHORTCUTS = APP_SHORTCUTS.filter(item => item.scope === 'page')

export function formatShortcutKeys(keys: string[]): string {
  return keys.join(' + ')
}

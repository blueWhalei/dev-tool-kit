import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), writeText: vi.fn() }))
vi.mock('naive-ui', () => ({ useMessage: () => mocks }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
import { useCopyToClipboard } from './useCopyToClipboard'
beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: mocks.writeText }
  })
})
it('copies through the clipboard API', async () => {
  mocks.writeText.mockResolvedValue(undefined)
  expect(await useCopyToClipboard().copy('sample')).toBe(true)
  expect(mocks.writeText).toHaveBeenCalledWith('sample')
  expect(mocks.success).toHaveBeenCalledWith('common.copied')
})
it('reports clipboard failure without creating temporary DOM elements', async () => {
  mocks.writeText.mockRejectedValue(new Error('denied'))
  const createElement = vi.spyOn(document, 'createElement')
  try {
    expect(await useCopyToClipboard().copy('sample')).toBe(false)
    expect(mocks.error).toHaveBeenCalledWith('common.copyFailed')
    expect(createElement).not.toHaveBeenCalled()
  } finally {
    createElement.mockRestore()
  }
})

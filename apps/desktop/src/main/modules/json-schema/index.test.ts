import { EventEmitter } from 'events'
import { beforeEach, expect, it, vi } from 'vitest'
import type { IpcArgs, IpcResult } from '@dev-tool-kit/shared'
class Sender extends EventEmitter {
  constructor(readonly id: number) {
    super()
  }
}
type Handler = (
  event: { sender: Sender },
  payload: IpcArgs<'json-schema:validate'>[0]
) => Promise<IpcResult<'json-schema:validate'>>
const mocks = vi.hoisted(() => ({ handlers: new Map<string, Handler>(), worker: vi.fn() }))
vi.mock('../../typed-ipc', () => ({
  handleIpc: (channel: string, handler: Handler) => mocks.handlers.set(channel, handler)
}))
vi.mock('../worker-task', () => ({ runWorkerTask: mocks.worker }))
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }))
import { setupJsonSchemaIPC } from './index'
const payload = { data: {}, schemaText: '{}' }
beforeEach(() => {
  vi.clearAllMocks()
  setupJsonSchemaIPC()
})
it('checks byte limits before allocating a worker and removes listeners', async () => {
  const sender = new Sender(1)
  expect(
    await mocks.handlers.get('json-schema:validate')!(
      { sender },
      { data: {}, schemaText: '中'.repeat(100000) }
    )
  ).toMatchObject({ error: 'schemaInputTooLarge' })
  expect(mocks.worker).not.toHaveBeenCalled()
  expect(sender.listenerCount('destroyed')).toBe(0)
})
it('cancels only the previous request from the same window and cleans up on destruction', async () => {
  const signals: AbortSignal[] = []
  mocks.worker.mockImplementation(
    (_file: string, _data: unknown, _time: number, signal: AbortSignal) =>
      new Promise((_resolve, reject) => {
        signals.push(signal)
        signal.addEventListener('abort', () => reject(new Error('workerCancelled')), { once: true })
      })
  )
  const first = new Sender(1),
    second = new Sender(2)
  const invoke = mocks.handlers.get('json-schema:validate')!
  const a = invoke({ sender: first }, payload),
    b = invoke({ sender: second }, payload),
    replacement = invoke({ sender: first }, payload)
  expect(signals.map(signal => signal.aborted)).toEqual([true, false, false])
  first.emit('destroyed')
  second.emit('destroyed')
  await Promise.all([a, b, replacement])
  expect(first.listenerCount('destroyed')).toBe(0)
  expect(second.listenerCount('destroyed')).toBe(0)
})

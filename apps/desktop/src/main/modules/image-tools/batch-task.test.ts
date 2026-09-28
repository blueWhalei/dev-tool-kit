import { afterEach, expect, it } from 'vitest'
import { BatchTask, isBatchTaskRequest } from './batch-task'
import type { BatchProgress, BatchTaskRequest } from '@dev-tool-kit/shared'
const tasks: BatchTask[] = []
afterEach(async () => {
  await Promise.all(tasks.splice(0).map(task => task.release()))
})
const request = (count = 5): BatchTaskRequest => ({
  taskId: 'test',
  items: Array.from({ length: count }, (_, i) => ({ fileName: i + '.png', filePath: '/' + i })),
  config: { operation: 'compress', compressOptions: { format: 'png', quality: 80 } }
})
const result = {
  fileName: 'output.png',
  size: 1,
  width: 1,
  height: 1,
  format: 'png',
  mimeType: 'image/png'
}
it('bounds concurrency and cancels queued items while finishing active items', async () => {
  let active = 0
  let peak = 0
  const finish: (() => void)[] = []
  const updates: BatchProgress[] = []
  const task = await BatchTask.create(
    request(),
    () => true,
    event => updates.push(event),
    async () => {
      active++
      peak = Math.max(active, peak)
      await new Promise<void>(resolve => finish.push(resolve))
      active--
      return result
    }
  )
  tasks.push(task)
  const running = task.run()
  expect(active).toBe(2)
  task.cancel()
  finish.forEach(resolve => resolve())
  await running
  expect(peak).toBe(2)
  expect(task.items.map(item => item.status)).toEqual([
    'done',
    'done',
    'cancelled',
    'cancelled',
    'cancelled'
  ])
  expect(updates.at(-1)?.finished).toBe(true)
  expect(updates.every(event => !('data' in (event.item.result ?? {})))).toBe(true)
})
it('continues failures, rejects unauthorized paths, and retries only unfinished files', async () => {
  let authorized = false
  let calls = 0
  const task = await BatchTask.create(
    request(2),
    file => file !== '/0' || authorized,
    () => {},
    async () => {
      calls++
      return result
    }
  )
  tasks.push(task)
  await task.run()
  expect(task.items.map(item => item.status)).toEqual(['error', 'done'])
  expect(calls).toBe(1)
  authorized = true
  expect(task.retry()).toBe(true)
  await task.run()
  expect(task.items.every(item => item.status === 'done')).toBe(true)
  expect(calls).toBe(2)
})
it('rejects malformed, unbounded and invalid configurations before processing', () => {
  expect(isBatchTaskRequest(request())).toBe(true)
  expect(isBatchTaskRequest(request(501))).toBe(false)
  expect(isBatchTaskRequest({ ...request(), taskId: '../escape' })).toBe(false)
  expect(
    isBatchTaskRequest({
      ...request(),
      config: { operation: 'compress', compressOptions: { quality: -1, format: 'png' } }
    })
  ).toBe(false)
  expect(
    isBatchTaskRequest({
      ...request(),
      config: { operation: 'resize', resizeOptions: { width: Infinity } }
    })
  ).toBe(false)
})

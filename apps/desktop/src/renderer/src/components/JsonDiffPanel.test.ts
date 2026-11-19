import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive, type App } from 'vue'
import { JSON_DIFF_MAX_LENGTH, type JsonDiffResult } from '@dev-tool-kit/shared'
import JsonDiffPanel from './JsonDiffPanel.vue'

const workers = vi.hoisted(() => {
  const instances: WorkerStub[] = []
  class WorkerStub {
    onmessage: ((event: MessageEvent<JsonDiffResult>) => void) | null = null
    onerror: (() => void) | null = null
    onmessageerror: (() => void) | null = null
    postMessage = vi.fn()
    terminate = vi.fn()
    constructor() {
      instances.push(this)
    }
    respond(result: JsonDiffResult) {
      this.onmessage?.({ data: result } as MessageEvent<JsonDiffResult>)
    }
  }
  return { instances, WorkerStub }
})
vi.mock('../workers/json-diff?worker', () => ({ default: workers.WorkerStub }))
vi.mock('../composables/useToolI18n', () => ({
  useToolI18n: () => ({ t: (key: string) => key })
}))
vi.mock('../composables/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({ copy: vi.fn() })
}))
vi.mock('naive-ui', async () => {
  const { defineComponent, h } = await import('vue')
  const Container = defineComponent({
    setup(_, { slots }) {
      return () => h('div', [slots.header?.(), slots.default?.()])
    }
  })
  return {
    NAlert: Container,
    NButton: Container,
    NCard: Container,
    NSpin: Container,
    NTag: Container,
    NDataTable: defineComponent({
      props: ['data'],
      setup: props => () => h('pre', JSON.stringify(props.data))
    })
  }
})

let app: App | undefined
let container: HTMLDivElement
beforeEach(() => {
  vi.useFakeTimers()
  workers.instances.length = 0
  container = document.createElement('div')
  document.body.appendChild(container)
})
afterEach(() => {
  unmount()
  container.remove()
  vi.useRealTimers()
})
function unmount() {
  app?.unmount()
  app = undefined
}
function mount(textA = '{}', textB = '{}') {
  const props = reactive({ textA, textB })
  app = createApp(() => h(JsonDiffPanel, props))
  app.mount(container)
  return props
}

it('rejects oversized inputs on either side before creating or messaging a worker', async () => {
  const oversized = ' '.repeat(JSON_DIFF_MAX_LENGTH + 1)
  const props = mount(oversized, '{}')
  expect(container.textContent).toContain('labels.textA · json.errors.size')
  props.textA = '{}'
  props.textB = oversized
  await nextTick()
  expect(container.textContent).toContain('labels.textB · json.errors.size')
  await vi.advanceTimersByTimeAsync(400)
  expect(workers.instances).toHaveLength(0)
})

it('clears old results immediately and ignores terminated workers after rapid input edits', async () => {
  const props = mount()
  await vi.advanceTimersByTimeAsync(300)
  const first = workers.instances[0]
  first.respond({ success: true, changes: [] })
  await nextTick()
  expect(container.textContent).toContain('json.equal')
  props.textB = '1'
  await nextTick()
  expect(container.textContent).not.toContain('json.equal')
  await vi.advanceTimersByTimeAsync(300)
  const second = workers.instances[1]
  props.textB = '2'
  await nextTick()
  expect(second.terminate).toHaveBeenCalledOnce()
  second.respond({ success: true, changes: [] })
  await nextTick()
  expect(container.textContent).not.toContain('json.equal')
  await vi.advanceTimersByTimeAsync(300)
  expect(workers.instances[2].postMessage).toHaveBeenCalledWith({ textA: '{}', textB: '2' })
  workers.instances[2].respond({ success: false, error: 'precision', side: 'B' })
  await nextTick()
  expect(container.textContent).toContain('labels.textB · json.errors.precision')
})

it('terminates a timed-out worker and recovers on the next input', async () => {
  const props = mount()
  await vi.advanceTimersByTimeAsync(3300)
  expect(workers.instances[0].terminate).toHaveBeenCalledOnce()
  expect(container.textContent).toContain('json.workerFailed')
  workers.instances[0].respond({ success: true, changes: [] })
  await nextTick()
  expect(container.textContent).toContain('json.workerFailed')
  props.textA = 'null'
  props.textB = 'null'
  await nextTick()
  await vi.advanceTimersByTimeAsync(300)
  workers.instances[1].respond({ success: true, changes: [] })
  await nextTick()
  expect(container.textContent).toContain('json.equal')
  expect(container.textContent).not.toContain('json.workerFailed')
})

it('cancels pending and running work when the panel is unmounted', async () => {
  mount()
  unmount()
  await vi.advanceTimersByTimeAsync(400)
  expect(workers.instances).toHaveLength(0)
  mount()
  await vi.advanceTimersByTimeAsync(300)
  unmount()
  expect(workers.instances[0].terminate).toHaveBeenCalledOnce()
  expect(vi.getTimerCount()).toBe(0)
})

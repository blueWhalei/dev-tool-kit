import { compareJson } from '@dev-tool-kit/shared'
self.onmessage = (event: MessageEvent<{ textA: string; textB: string }>) => {
  self.postMessage(compareJson(event.data.textA, event.data.textB))
}

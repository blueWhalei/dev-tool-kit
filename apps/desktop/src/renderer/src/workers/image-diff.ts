import { comparePixels } from '../utils/image-diff'

self.onmessage = (event: MessageEvent<{ a: Uint8ClampedArray; b: Uint8ClampedArray }>) => {
  const result = comparePixels(event.data.a, event.data.b)
  self.postMessage(result, { transfer: [result.buffer] })
}

import { describe, expect, it } from 'vitest'
import { comparePixels } from './image-diff'
describe('image pixel comparison', () => {
  it('fades matching pixels', () => {
    expect([...comparePixels([10, 20, 30, 255], [10, 20, 30, 255])]).toEqual([10, 20, 30, 80])
  })
  it('uses a strict threshold and highlights differences', () => {
    expect([...comparePixels([0, 0, 0, 255], [40, 0, 0, 255])]).toEqual([0, 0, 0, 80])
    expect([...comparePixels([0, 0, 0, 255], [41, 0, 0, 255])]).toEqual([255, 14, 0, 200])
  })
  it('compares images padded to the maximum canvas dimensions', () => {
    const result = comparePixels([1, 2, 3, 255, 0, 0, 0, 0], [1, 2, 3, 255, 255, 0, 0, 255])
    expect([...result]).toEqual([1, 2, 3, 80, 255, 85, 0, 200])
  })
  it('rejects inconsistent buffers', () => {
    expect(() => comparePixels([0], [])).toThrow()
  })
})

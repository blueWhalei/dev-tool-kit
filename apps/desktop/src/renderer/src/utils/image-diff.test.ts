import { describe, expect, it } from 'vitest'
import { comparePixels, comparisonSize, MAX_COMPARE_PIXELS } from './image-diff'
it('keeps extremely wide images inside the pixel budget after rounding', () => {
  const result = comparisonSize(MAX_COMPARE_PIXELS * 10, 1)
  expect(result.width * result.height).toBeLessThanOrEqual(MAX_COMPARE_PIXELS)
})
describe('image pixel comparison', () => {
  it('includes opacity changes and ignores invisible RGB differences', () => {
    expect(comparePixels([0, 0, 0, 0], [0, 0, 0, 255])[3]).toBe(200)
    expect(comparePixels([0, 0, 0, 0], [255, 255, 255, 0])[3]).toBe(80)
  })
  it('bounds the comparison canvas while preserving aspect ratio', () => {
    const size = comparisonSize(8192, 4096)
    expect(size.width * size.height).toBeLessThanOrEqual(MAX_COMPARE_PIXELS)
    expect(size.width / size.height).toBeCloseTo(2, 2)
  })
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

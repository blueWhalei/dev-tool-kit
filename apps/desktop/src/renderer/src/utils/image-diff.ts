/** Compare RGBA buffers already padded to the same canvas size. */
export const MAX_COMPARE_PIXELS = 4 * 1024 * 1024
export const MAX_COMPARE_DIMENSION = 8192

export function comparisonSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error('Invalid image dimensions')
  const scale = Math.min(
    1,
    Math.sqrt(MAX_COMPARE_PIXELS / (width * height)),
    MAX_COMPARE_DIMENSION / width,
    MAX_COMPARE_DIMENSION / height
  )
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    scale
  }
}

export function comparePixels(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  threshold = 40
): Uint8ClampedArray {
  if (a.length !== b.length || a.length % 4 !== 0 || a.length > MAX_COMPARE_PIXELS * 4)
    throw new Error('Invalid pixel buffer sizes')
  const output = new Uint8ClampedArray(a.length)
  for (let i = 0; i < a.length; i += 4) {
    const dr = Math.abs(a[i] - b[i])
    const dg = Math.abs(a[i + 1] - b[i + 1])
    const db = Math.abs(a[i + 2] - b[i + 2])
    const da = Math.abs(a[i + 3] - b[i + 3])
    const different =
      da > threshold ||
      (Math.max(a[i + 3], b[i + 3]) > 0 && (dr > threshold || dg > threshold || db > threshold))
    output[i] = different ? 255 : a[i]
    output[i + 1] = different ? Math.min(255, (dr + dg + db) / 3) : a[i + 1]
    output[i + 2] = different ? 0 : a[i + 2]
    output[i + 3] = different ? 200 : 80
  }
  return output
}

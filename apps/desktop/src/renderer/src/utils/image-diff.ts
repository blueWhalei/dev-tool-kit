/** Compare RGBA buffers already padded to the same canvas size. */
export function comparePixels(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  threshold = 40
): Uint8ClampedArray {
  if (a.length !== b.length || a.length % 4 !== 0) throw new Error('Invalid pixel buffer sizes')
  const output = new Uint8ClampedArray(a.length)
  for (let i = 0; i < a.length; i += 4) {
    const dr = Math.abs(a[i] - b[i])
    const dg = Math.abs(a[i + 1] - b[i + 1])
    const db = Math.abs(a[i + 2] - b[i + 2])
    const different = dr > threshold || dg > threshold || db > threshold
    output[i] = different ? 255 : a[i]
    output[i + 1] = different ? Math.min(255, (dr + dg + db) / 3) : a[i + 1]
    output[i + 2] = different ? 0 : a[i + 2]
    output[i + 3] = different ? 200 : 80
  }
  return output
}

// @vitest-environment node
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { compressImage } from './compression'
describe('compression metadata and orientation', () => {
  it.each(['jpeg', 'png', 'webp'] as const)(
    'strips metadata and rotates %s output',
    async format => {
      const input = await sharp({ create: { width: 3, height: 2, channels: 3, background: 'red' } })
        .withMetadata({ orientation: 6 })
        .withExifMerge({ IFD0: { Artist: 'private marker' } })
        .jpeg()
        .toBuffer()
      expect((await sharp(input).metadata()).exif).toBeDefined()
      const output = await compressImage(input, { format, quality: 80 }).toBuffer()
      const meta = await sharp(output).metadata()
      expect(meta.width).toBe(2)
      expect(meta.height).toBe(3)
      expect(meta.exif).toBeUndefined()
      expect(meta.xmp).toBeUndefined()
      expect(meta.icc).toBeUndefined()
      expect(meta.orientation).toBeUndefined()
    }
  )
})

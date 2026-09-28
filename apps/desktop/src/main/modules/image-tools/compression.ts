import sharp, { type Sharp } from 'sharp'
import type { CompressOptions } from '@dev-tool-kit/shared'

/** Apply orientation before Sharp strips EXIF/XMP/ICC on output. */
export function compressImage(buffer: Buffer | string, options: CompressOptions): Sharp {
  const pipeline = sharp(buffer).rotate()
  switch (options.format) {
    case 'jpeg':
      return pipeline.jpeg({ quality: options.quality, mozjpeg: true })
    case 'webp':
      return pipeline.webp({ quality: options.quality, effort: options.effort ?? 4 })
    case 'png':
      return pipeline.png({
        quality: options.quality,
        palette: options.palette ?? false,
        effort: options.effort ?? 7
      })
    default:
      throw new Error('Unsupported compression format')
  }
}

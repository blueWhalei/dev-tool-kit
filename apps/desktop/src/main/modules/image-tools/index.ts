import { handleIpc } from '../../typed-ipc'
import { setupBatchIPC } from './batch-ipc'
import { dialog, BrowserWindow, clipboard } from 'electron'
import { readFile, writeFile, mkdir, stat } from 'fs/promises'
import { basename, extname, join } from 'path'
import sharp from 'sharp'
import { compressImage } from './compression'
import exifr from 'exifr'
import { logger } from '../../logger'
import { authorizePath, isPathAuthorized } from '../path-guard'
import type {
  ImageInfo,
  ExifData,
  CompressOptions,
  ResizeOptions,
  ImageConvertOptions,
  ProcessedImage,
  SvgOptimizeOptions,
  SvgOptimizeResult,
  ExtractedColor,
  IconGenerateResult
} from '@dev-tool-kit/shared'

const IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'svg',
  'ico',
  'tiff',
  'tif',
  'avif'
]

const MIME_BY_FORMAT: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  tiff: 'image/tiff',
  avif: 'image/avif'
}

function getMimeType(format: string): string {
  return MIME_BY_FORMAT[format] || `image/${format}`
}

/** 仅保留最末路径段并拒绝危险字符，防止文件名路径穿越 */
function sanitizeOutputFileName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const base = basename(name.trim())
  if (!base || base === '.' || base === '..') return null
  if (/[<>:"|?*]/.test(base) || /[\0\r\n]/.test(base)) return null
  return base
}

async function parseExif(filePath: string): Promise<ExifData | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await exifr.parse(filePath)
    if (!data) return null

    const exif: ExifData = {}
    if (data.Make) exif.make = String(data.Make)
    if (data.Model) exif.model = String(data.Model)
    if (data.DateTimeOriginal) {
      exif.dateTime =
        data.DateTimeOriginal instanceof Date
          ? data.DateTimeOriginal.toISOString()
          : String(data.DateTimeOriginal)
    } else if (data.DateTime) {
      exif.dateTime =
        data.DateTime instanceof Date ? data.DateTime.toISOString() : String(data.DateTime)
    }
    if (data.ExposureTime) exif.exposureTime = String(data.ExposureTime)
    if (data.FNumber) exif.fNumber = Number(data.FNumber)
    if (data.ISO) exif.iso = Number(data.ISO)
    if (data.FocalLength) exif.focalLength = Number(data.FocalLength)
    if (data.latitude !== undefined && data.longitude !== undefined) {
      exif.gps = {
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        ...(data.GPSAltitude !== undefined ? { altitude: Number(data.GPSAltitude) } : {})
      }
    }
    return Object.keys(exif).length > 0 ? exif : null
  } catch {
    return null
  }
}

export function setupImageToolsIPC(): void {
  setupBatchIPC()
  logger.info('Setting up Image Tools IPC handlers')

  // Pick single image
  handleIpc('image-tools:pickImage', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }]
      })
      if (result.canceled || result.filePaths.length === 0) return null

      const filePath = result.filePaths[0]
      authorizePath(filePath)
      const buffer = await readFile(filePath)
      const fileName = basename(filePath)
      const ext = extname(filePath).toLowerCase().slice(1)
      const mimeType = getMimeType(ext)

      return {
        fileName,
        filePath,
        mimeType,
        base64: buffer.toString('base64'),
        size: buffer.length
      }
    } catch (error) {
      logger.error('image-tools:pickImage failed:', error)
      return null
    }
  })

  // Pick multiple images
  handleIpc('image-tools:pickImages', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }]
      })
      if (result.canceled || result.filePaths.length === 0) return []

      const images = []
      for (const filePath of result.filePaths) {
        authorizePath(filePath)
        const metadata = await stat(filePath)
        const fileName = basename(filePath)
        const ext = extname(filePath).toLowerCase().slice(1)
        const mimeType = getMimeType(ext)
        images.push({
          fileName,
          filePath,
          mimeType,
          size: metadata.size
        })
      }
      return images
    } catch (error) {
      logger.error('image-tools:pickImages failed:', error)
      return []
    }
  })

  // Get image info + EXIF
  handleIpc('image-tools:getInfo', async (_event, filePath: string) => {
    if (!isPathAuthorized(filePath)) {
      logger.warn('Blocked image-tools:getInfo for unauthorized path:', filePath)
      return null
    }
    try {
      const buffer = await readFile(filePath)
      const fileName = basename(filePath)
      const ext = extname(filePath).toLowerCase().slice(1)
      const mimeType = getMimeType(ext)

      const metadata = await sharp(buffer).metadata()
      const exif = await parseExif(filePath)

      const info: ImageInfo = {
        fileName,
        filePath,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        format: metadata.format ?? ext,
        size: buffer.length,
        mimeType,
        hasAlpha: metadata.hasAlpha ?? false,
        density: metadata.density ?? null,
        exif
      }
      return info
    } catch (error) {
      logger.error('image-tools:getInfo failed:', error)
      return null
    }
  })

  // Compress image
  handleIpc('image-tools:compress', async (_event, filePath: string, options: CompressOptions) => {
    if (!isPathAuthorized(filePath)) {
      logger.warn('Blocked image-tools:compress for unauthorized path:', filePath)
      return null
    }
    try {
      const buffer = await readFile(filePath)
      const fileName = basename(filePath)
      const pipeline = compressImage(buffer, options)

      const outputBuffer = await pipeline.toBuffer()
      const outputMetadata = await sharp(outputBuffer).metadata()

      const result: ProcessedImage = {
        fileName,
        data: outputBuffer.toString('base64'),
        size: outputBuffer.length,
        width: outputMetadata.width ?? 0,
        height: outputMetadata.height ?? 0,
        format: options.format,
        mimeType: getMimeType(options.format)
      }
      return result
    } catch (error) {
      logger.error('image-tools:compress failed:', error)
      return null
    }
  })

  // Resize image
  handleIpc('image-tools:resize', async (_event, filePath: string, options: ResizeOptions) => {
    if (!isPathAuthorized(filePath)) {
      logger.warn('Blocked image-tools:resize for unauthorized path:', filePath)
      return null
    }
    try {
      const buffer = await readFile(filePath)
      const fileName = basename(filePath)
      const inputMetadata = await sharp(buffer).metadata()
      const format = inputMetadata.format ?? 'png'

      let pipeline = sharp(buffer)

      if (options.width || options.height) {
        pipeline = pipeline.resize(options.width || undefined, options.height || undefined, {
          fit: options.fit,
          withoutEnlargement: options.withoutEnlargement ?? false,
          position: (options.position as keyof typeof sharp.gravity) ?? 'centre'
        })
      }

      // Preserve original format (normalize jpg → jpeg)
      const normalizedFormat = (format as string) === 'jpg' ? 'jpeg' : format
      if (normalizedFormat === 'jpeg') {
        pipeline = pipeline.jpeg({ quality: 90 })
      } else if (normalizedFormat === 'webp') {
        pipeline = pipeline.webp({ quality: 90 })
      } else {
        pipeline = pipeline.png()
      }

      const outputBuffer = await pipeline.toBuffer()
      const outputMetadata = await sharp(outputBuffer).metadata()

      const result: ProcessedImage = {
        fileName,
        data: outputBuffer.toString('base64'),
        size: outputBuffer.length,
        width: outputMetadata.width ?? 0,
        height: outputMetadata.height ?? 0,
        format: outputMetadata.format ?? format,
        mimeType: getMimeType(outputMetadata.format ?? format)
      }
      return result
    } catch (error) {
      logger.error('image-tools:resize failed:', error)
      return null
    }
  })

  // Convert image format
  handleIpc(
    'image-tools:convert',
    async (_event, filePath: string, options: ImageConvertOptions) => {
      if (!isPathAuthorized(filePath)) {
        logger.warn('Blocked image-tools:convert for unauthorized path:', filePath)
        return null
      }
      try {
        const buffer = await readFile(filePath)
        const fileName = basename(filePath, extname(filePath))
        const inputMetadata = await sharp(buffer).metadata()

        let pipeline = sharp(buffer)

        // Handle alpha → non-alpha format conversion
        if (options.format === 'jpeg' && inputMetadata.hasAlpha) {
          const bg = options.background ?? '#ffffff'
          pipeline = pipeline.flatten({ background: bg })
        }

        switch (options.format) {
          case 'jpeg':
            pipeline = pipeline.jpeg({ quality: options.quality ?? 90, mozjpeg: true })
            break
          case 'webp':
            pipeline = pipeline.webp({ quality: options.quality ?? 90 })
            break
          case 'png':
            pipeline = pipeline.png()
            break
        }

        const outputBuffer = await pipeline.toBuffer()
        const outputMetadata = await sharp(outputBuffer).metadata()

        const result: ProcessedImage = {
          fileName: `${fileName}.${options.format}`,
          data: outputBuffer.toString('base64'),
          size: outputBuffer.length,
          width: outputMetadata.width ?? 0,
          height: outputMetadata.height ?? 0,
          format: options.format,
          mimeType: getMimeType(options.format)
        }
        return result
      } catch (error) {
        logger.error('image-tools:convert failed:', error)
        return null
      }
    }
  )

  // Save single image
  handleIpc(
    'image-tools:saveImage',
    async (_event, data: string, fileName: string, _mimeType: string) => {
      try {
        const win = BrowserWindow.getFocusedWindow()
        if (!win) return { success: false, error: 'No active window' }

        const result = await dialog.showSaveDialog(win, {
          defaultPath: fileName,
          filters: [{ name: 'Images', extensions: [extname(fileName).replace('.', '')] }]
        })
        if (result.canceled || !result.filePath) return { success: false, error: 'Cancelled' }

        const buffer = Buffer.from(data, 'base64')
        authorizePath(result.filePath)
        await writeFile(result.filePath, buffer)
        return { success: true, path: result.filePath }
      } catch (error) {
        logger.error('image-tools:saveImage failed:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // Save multiple images to directory
  handleIpc(
    'image-tools:saveImages',
    async (_event, images: Array<{ data: string; fileName: string }>, targetDir?: string) => {
      try {
        let outputDir = targetDir
        if (outputDir !== undefined && !isPathAuthorized(outputDir)) {
          logger.warn('Blocked image-tools:saveImages for unauthorized targetDir:', outputDir)
          return { success: false, error: '未授权的保存目录' }
        }
        if (outputDir === undefined) {
          const win = BrowserWindow.getFocusedWindow()
          if (!win) return { success: false, error: 'No active window' }
          const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select output directory'
          })
          if (result.canceled || result.filePaths.length === 0) {
            return { success: false, error: 'Cancelled' }
          }
          outputDir = result.filePaths[0]
          authorizePath(outputDir)
        }

        await mkdir(outputDir, { recursive: true })
        const results = []

        for (const img of images) {
          const fileName = sanitizeOutputFileName(img.fileName)
          if (!fileName) {
            results.push({ fileName: img.fileName, path: '', success: false, error: '非法文件名' })
            continue
          }
          const filePath = join(outputDir, fileName)
          const buffer = Buffer.from(img.data, 'base64')
          await writeFile(filePath, buffer)
          results.push({ fileName, path: filePath, success: true })
        }

        return { success: true, results, outputDir }
      } catch (error) {
        logger.error('image-tools:saveImages failed:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // Pick SVG file
  handleIpc('image-tools:pickSvgFile', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'SVG', extensions: ['svg'] }]
      })
      if (result.canceled || result.filePaths.length === 0) return null

      const filePath = result.filePaths[0]
      authorizePath(filePath)
      const content = await readFile(filePath, 'utf-8')
      const fileName = basename(filePath)
      const stats = await import('fs/promises').then(m => m.stat(filePath))

      return {
        fileName,
        filePath,
        content,
        size: stats.size
      }
    } catch (error) {
      logger.error('image-tools:pickSvgFile failed:', error)
      return null
    }
  })

  // Optimize SVG
  handleIpc(
    'image-tools:optimizeSvg',
    async (_event, svgText: string, options: SvgOptimizeOptions) => {
      try {
        const { optimize } = await import('svgo')

        const plugins: string[] = []

        if (options.removeComments) plugins.push('removeComments')
        if (options.removeMetadata) plugins.push('removeMetadata')
        if (options.removeEditorsNSData) plugins.push('removeEditorsNSData')
        if (options.cleanupAttrs) plugins.push('cleanupAttrs')
        if (options.removeEmptyAttrs) plugins.push('removeEmptyAttrs')
        if (options.removeHiddenElems) plugins.push('removeHiddenElems')
        if (options.removeEmptyText) plugins.push('removeEmptyText')
        if (options.removeEmptyContainers) plugins.push('removeEmptyContainers')
        if (options.removeUnusedNS) plugins.push('removeUnusedNS')
        if (options.collapseGroups) plugins.push('collapseGroups')
        if (options.convertShapeToPath) plugins.push('convertShapeToPath')
        if (options.minifyStyles) plugins.push('minifyStyles')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = optimize(svgText, { plugins: plugins as any })

        const originalSize = Buffer.byteLength(svgText, 'utf-8')
        const optimizedSize = Buffer.byteLength(result.data, 'utf-8')
        const savings =
          originalSize > 0 ? Math.round((1 - optimizedSize / originalSize) * 100 * 10) / 10 : 0

        const svgResult: SvgOptimizeResult = {
          original: svgText,
          optimized: result.data,
          originalSize,
          optimizedSize,
          savings
        }
        return svgResult
      } catch (error) {
        logger.error('image-tools:optimizeSvg failed:', error)
        return null
      }
    }
  )

  // Extract dominant colors
  handleIpc(
    'image-tools:extractColors',
    async (_event, filePath: string, maxColors: number = 8) => {
      if (!isPathAuthorized(filePath)) {
        logger.warn('Blocked image-tools:extractColors for unauthorized path:', filePath)
        return null
      }
      try {
        const buffer = await readFile(filePath)
        // Resize to small image for faster processing
        const { data, info } = await sharp(buffer)
          .resize(64, 64, { fit: 'inside' })
          .raw()
          .toBuffer({ resolveWithObject: true })

        const pixelCount = info.width * info.height
        const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>()

        for (let i = 0; i < data.length; i += info.channels) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          // Quantize to reduce color count (group similar colors)
          const qr = Math.round(r / 32) * 32
          const qg = Math.round(g / 32) * 32
          const qb = Math.round(b / 32) * 32
          const key = `${qr},${qg},${qb}`

          const existing = colorMap.get(key)
          if (existing) {
            existing.r += r
            existing.g += g
            existing.b += b
            existing.count += 1
          } else {
            colorMap.set(key, { r, g, b, count: 1 })
          }
        }

        // Sort by count and take top N
        const sorted = [...colorMap.values()].sort((a, b) => b.count - a.count).slice(0, maxColors)

        const colors: ExtractedColor[] = sorted.map(c => {
          const avgR = Math.round(c.r / c.count)
          const avgG = Math.round(c.g / c.count)
          const avgB = Math.round(c.b / c.count)
          const hex = '#' + [avgR, avgG, avgB].map(v => v.toString(16).padStart(2, '0')).join('')
          const ratio = Math.round((c.count / pixelCount) * 1000) / 10

          // Convert RGB to HSL
          const rn = avgR / 255,
            gn = avgG / 255,
            bn = avgB / 255
          const max = Math.max(rn, gn, bn),
            min = Math.min(rn, gn, bn)
          const l = (max + min) / 2
          let h = 0,
            s = 0
          if (max !== min) {
            const d = max - min
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
            if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
            else if (max === gn) h = ((bn - rn) / d + 2) / 6
            else h = ((rn - gn) / d + 4) / 6
          }

          return {
            hex,
            rgb: { r: avgR, g: avgG, b: avgB },
            hsl: {
              h: Math.round(h * 360),
              s: Math.round(s * 100),
              l: Math.round(l * 100)
            },
            ratio
          }
        })

        return colors
      } catch (error) {
        logger.error('image-tools:extractColors failed:', error)
        return null
      }
    }
  )

  // Read image from clipboard
  handleIpc('image-tools:readClipboardImage', async () => {
    try {
      const image = clipboard.readImage()
      if (image.isEmpty()) return null

      const buffer = image.toPNG()
      const base64 = buffer.toString('base64')
      const size = buffer.length
      const metadata = await sharp(buffer).metadata()

      return {
        base64,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        size,
        mimeType: 'image/png'
      }
    } catch (error) {
      logger.error('image-tools:readClipboardImage failed:', error)
      return null
    }
  })

  // Generate icons (favicon + app icons)
  handleIpc(
    'image-tools:generateIcons',
    async (_event, filePath: string, sizes: number[], includeIco: boolean) => {
      if (!isPathAuthorized(filePath)) {
        logger.warn('Blocked image-tools:generateIcons for unauthorized path:', filePath)
        return null
      }
      try {
        const buffer = await readFile(filePath)
        const fileName = basename(filePath, extname(filePath))
        const result: IconGenerateResult = { icons: [] }

        for (const size of sizes) {
          const resized = await sharp(buffer).resize(size, size, { fit: 'cover' }).png().toBuffer()

          result.icons.push({
            fileName: `${fileName}-${size}x${size}.png`,
            size: resized.length,
            width: size,
            height: size,
            data: resized.toString('base64')
          })
        }

        // Generate ICO file (16, 32, 48 packed together)
        if (includeIco) {
          const icoSizes = [16, 32, 48]
          const icoBuffers: Buffer[] = []
          for (const s of icoSizes) {
            const png = await sharp(buffer).resize(s, s, { fit: 'cover' }).png().toBuffer()
            icoBuffers.push(png)
          }

          // Build ICO format
          const imageCount = icoBuffers.length
          const headerSize = 6
          const dirEntrySize = 16
          const dirSize = dirEntrySize * imageCount
          let dataOffset = headerSize + dirSize

          const dirEntries: Buffer[] = []
          const imageData: Buffer[] = []

          for (let i = 0; i < imageCount; i++) {
            const s = icoSizes[i]
            const pngData = icoBuffers[i]
            const entry = Buffer.alloc(dirEntrySize)
            entry.writeUInt8(s, 0) // width
            entry.writeUInt8(s, 1) // height
            entry.writeUInt8(0, 2) // color palette
            entry.writeUInt8(0, 3) // reserved
            entry.writeUInt16LE(1, 4) // color planes
            entry.writeUInt16LE(32, 6) // bits per pixel
            entry.writeUInt32LE(pngData.length, 8) // size
            entry.writeUInt32LE(dataOffset, 12) // offset
            dirEntries.push(entry)
            imageData.push(pngData)
            dataOffset += pngData.length
          }

          const header = Buffer.alloc(headerSize)
          header.writeUInt16LE(0, 0) // reserved
          header.writeUInt16LE(1, 2) // type: ICO
          header.writeUInt16LE(imageCount, 4) // count

          const icoBuffer = Buffer.concat([header, ...dirEntries, ...imageData])
          result.ico = {
            fileName: `${fileName}.ico`,
            data: icoBuffer.toString('base64'),
            size: icoBuffer.length
          }
        }

        return result
      } catch (error) {
        logger.error('image-tools:generateIcons failed:', error)
        return null
      }
    }
  )
}

export interface ImageInfo {
  fileName: string
  filePath: string
  width: number
  height: number
  format: string
  size: number
  mimeType: string
  hasAlpha: boolean
  density: number | null
  exif: ExifData | null
}

export interface ExifData {
  make?: string
  model?: string
  dateTime?: string
  exposureTime?: string
  fNumber?: number
  iso?: number
  focalLength?: number
  gps?: { latitude: number; longitude: number; altitude?: number }
  [key: string]: unknown
}

export interface CompressOptions {
  format: 'jpeg' | 'webp' | 'png'
  quality: number
  effort?: number
  palette?: boolean
}

export interface ResizeOptions {
  width?: number
  height?: number
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  position?: string
  withoutEnlargement?: boolean
}

export interface ImageConvertOptions {
  format: 'png' | 'jpeg' | 'webp'
  quality?: number
  background?: string
}

export interface ProcessedImage {
  fileName: string
  data: string
  size: number
  width: number
  height: number
  format: string
  mimeType: string
}

export interface DataUrlParseResult {
  mimeType: string
  charset: string | null
  isBase64: boolean
  data: string
  rawText: string
  size: number
  decodedSize: number
}

export interface SvgOptimizeOptions {
  removeComments: boolean
  removeMetadata: boolean
  removeEditorsNSData: boolean
  cleanupAttrs: boolean
  removeEmptyAttrs: boolean
  removeHiddenElems: boolean
  removeEmptyText: boolean
  removeEmptyContainers: boolean
  removeUnusedNS: boolean
  collapseGroups: boolean
  convertShapeToPath: boolean
  minifyStyles: boolean
}

export interface SvgOptimizeResult {
  original: string
  optimized: string
  originalSize: number
  optimizedSize: number
  savings: number
}

export interface ExtractedColor {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
  ratio: number
}

export interface IconSizePreset {
  name: string
  sizes: number[]
  includeIco: boolean
}

export interface IconGenerateResult {
  icons: Array<{
    fileName: string
    size: number
    width: number
    height: number
    data: string
  }>
  ico?: {
    fileName: string
    data: string
    size: number
  }
}

export type BatchOperation = 'compress' | 'resize' | 'convert'

export interface BatchItem {
  fileName: string
  filePath: string
  status: 'pending' | 'processing' | 'done' | 'error'
  result?: ProcessedImage
  error?: string
}

export interface BatchConfig {
  operation: BatchOperation
  compressOptions?: CompressOptions
  resizeOptions?: ResizeOptions
  convertOptions?: ImageConvertOptions
}

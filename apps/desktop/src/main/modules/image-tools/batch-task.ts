import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join, basename, extname, dirname, resolve } from 'path'
import sharp from 'sharp'
import type {
  BatchTaskRequest,
  BatchTaskItem,
  BatchProgress,
  BatchConfig,
  BatchSource
} from '@dev-tool-kit/shared'
import { compressImage } from './compression'

const formats = ['jpeg', 'webp', 'png']
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object'
const integer = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max

export function isBatchTaskRequest(value: unknown): value is BatchTaskRequest {
  if (
    !object(value) ||
    typeof value.taskId !== 'string' ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(value.taskId)
  )
    return false
  if (!Array.isArray(value.items) || value.items.length === 0 || value.items.length > 500)
    return false
  if (
    !value.items.every(
      item =>
        object(item) &&
        typeof item.fileName === 'string' &&
        typeof item.filePath === 'string' &&
        item.filePath.length > 0
    )
  )
    return false
  const config = value.config
  if (!object(config)) return false
  if (config.operation === 'resize') {
    const options = config.resizeOptions
    return (
      object(options) &&
      (options.width !== undefined || options.height !== undefined) &&
      (options.width === undefined || integer(options.width, 1, 16384)) &&
      (options.height === undefined || integer(options.height, 1, 16384)) &&
      (options.fit === undefined ||
        ['cover', 'contain', 'fill', 'inside', 'outside'].includes(String(options.fit))) &&
      (options.withoutEnlargement === undefined || typeof options.withoutEnlargement === 'boolean')
    )
  }
  if (config.operation !== 'compress' && config.operation !== 'convert') return false
  const options = config.operation === 'compress' ? config.compressOptions : config.convertOptions
  return (
    object(options) &&
    formats.includes(String(options.format)) &&
    ((config.operation === 'convert' && options.quality === undefined) ||
      integer(options.quality, 1, 100)) &&
    (options.effort === undefined ||
      integer(options.effort, 0, options.format === 'webp' ? 6 : 10)) &&
    (options.palette === undefined || typeof options.palette === 'boolean') &&
    (options.background === undefined || typeof options.background === 'string')
  )
}

export async function processBatchImage(
  source: BatchSource,
  config: BatchConfig,
  output: string
): Promise<NonNullable<BatchTaskItem['result']>> {
  let pipeline = sharp(source.filePath).rotate()
  if (config.operation === 'compress') {
    if (!config.compressOptions) throw new Error('invalid_options')
    pipeline = compressImage(source.filePath, config.compressOptions)
  } else if (config.operation === 'resize') {
    if (!config.resizeOptions) throw new Error('invalid_options')
    const options = config.resizeOptions
    pipeline = pipeline.resize(options.width, options.height, {
      fit: options.fit,
      withoutEnlargement: options.withoutEnlargement ?? false
    })
    const metadata = await sharp(source.filePath).metadata()
    pipeline =
      metadata.format === 'jpeg'
        ? pipeline.jpeg({ quality: 90 })
        : metadata.format === 'webp'
          ? pipeline.webp({ quality: 90 })
          : pipeline.png()
  } else {
    if (!config.convertOptions) throw new Error('invalid_options')
    const options = config.convertOptions
    if (options.format === 'jpeg')
      pipeline = pipeline
        .flatten({ background: options.background ?? '#ffffff' })
        .jpeg({ quality: options.quality ?? 90, mozjpeg: true })
    else if (options.format === 'webp') pipeline = pipeline.webp({ quality: options.quality ?? 90 })
    else pipeline = pipeline.png()
  }
  const info = await pipeline.toFile(output)
  const name = basename(source.fileName)
  const stem = name.slice(0, name.length - extname(name).length) || 'image'
  return {
    fileName: stem + '.' + info.format,
    size: info.size,
    width: info.width,
    height: info.height,
    format: info.format,
    mimeType: 'image/' + info.format
  }
}

type Processor = typeof processBatchImage
export class BatchTask {
  readonly items: BatchTaskItem[]
  readonly outputs = new Map<number, string>()
  private cancelled = false
  private released = false
  private completion: Promise<void> | undefined
  private constructor(
    readonly request: BatchTaskRequest,
    private directory: string,
    private authorized: (path: string) => boolean,
    private emit: (progress: BatchProgress) => void,
    private process: Processor
  ) {
    this.items = request.items.map(item => ({ ...item, status: 'pending' }))
  }
  static async create(
    request: BatchTaskRequest,
    authorized: (path: string) => boolean,
    emit: (progress: BatchProgress) => void,
    process: Processor = processBatchImage
  ): Promise<BatchTask> {
    return new BatchTask(
      request,
      await mkdtemp(join(tmpdir(), 'dev-toolkit-images-')),
      authorized,
      emit,
      process
    )
  }
  cancel(): void {
    this.cancelled = true
  }
  retry(): boolean {
    if (this.released || this.running) return false
    this.cancelled = false
    for (const item of this.items) {
      if (item.status === 'error' || item.status === 'cancelled') {
        item.status = 'pending'
        delete item.error
      }
    }
    this.completion = undefined
    return true
  }
  get running(): boolean {
    return this.items.some(item => item.status === 'pending' || item.status === 'processing')
  }
  run(): Promise<void> {
    if (!this.completion) this.completion = this.work()
    return this.completion
  }
  private notify(index: number, finished = false): void {
    if (!this.released)
      this.emit({ taskId: this.request.taskId, index, item: { ...this.items[index] }, finished })
  }
  private async work(): Promise<void> {
    let cursor = 0
    const worker = async () => {
      while (cursor < this.items.length) {
        const index = cursor++
        const item = this.items[index]
        if (item.status === 'done') continue
        if (this.cancelled) {
          item.status = 'cancelled'
          this.notify(index)
          continue
        }
        item.status = 'processing'
        this.notify(index)
        try {
          if (!this.authorized(item.filePath)) throw new Error('unauthorized_path')
          const output = join(this.directory, String(index))
          item.result = await this.process(item, this.request.config, output)
          this.outputs.set(index, output)
          item.status = 'done'
        } catch (error) {
          item.status = 'error'
          item.error = error instanceof Error ? error.message : String(error)
        }
        this.notify(index)
      }
    }
    await Promise.all([worker(), worker()])
    this.notify(this.items.length - 1, true)
  }
  async release(): Promise<void> {
    this.released = true
    this.cancel()
    await this.completion
    if (
      dirname(resolve(this.directory)) !== resolve(tmpdir()) ||
      !basename(this.directory).startsWith('dev-toolkit-images-')
    )
      throw new Error('invalid_temp_path')
    await rm(this.directory, { recursive: true, force: true, maxRetries: 3 })
  }
}

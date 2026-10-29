import { Worker } from 'worker_threads'

/** Every outcome settles once and tears down the worker and timer. */
export function runWorkerTask<T>(
  file: string,
  workerData: unknown,
  timeoutMs = 3000,
  signal?: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('workerCancelled'))
      return
    }
    const worker = new Worker(file, {
      workerData,
      resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 }
    })
    let settled = false
    const finish = (error: Error | null, value?: T) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      void worker.terminate().catch(() => {})
      if (error) reject(error)
      else resolve(value as T)
    }
    const timer = setTimeout(() => finish(new Error('workerTimeout')), timeoutMs)
    const abort = () => finish(new Error('workerCancelled'))
    signal?.addEventListener('abort', abort, { once: true })
    worker.once('message', (value: T) => finish(null, value))
    worker.once('error', () => finish(new Error('workerFailed')))
    worker.once('exit', () => finish(new Error('workerFailed')))
  })
}

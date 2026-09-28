import { Worker } from 'worker_threads'

/** Every outcome settles once and tears down the worker and timer. */
export function runWorkerTask<T>(file: string, workerData: unknown, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(file, { workerData })
    let settled = false
    const finish = (error: Error | null, value?: T) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      void worker.terminate().catch(() => {})
      if (error) reject(error)
      else resolve(value as T)
    }
    const timer = setTimeout(() => finish(new Error('workerTimeout')), timeoutMs)
    worker.once('message', (value: T) => finish(null, value))
    worker.once('error', () => finish(new Error('workerFailed')))
    worker.once('exit', () => finish(new Error('workerFailed')))
  })
}

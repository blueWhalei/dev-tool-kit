import { parentPort, workerData } from 'worker_threads'
import { generatePreviews } from './rules'

parentPort?.postMessage(generatePreviews(workerData.files, workerData.rules))

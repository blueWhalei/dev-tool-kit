import { parentPort, workerData } from 'worker_threads'
import { validateAgainstSchema, type IpcArgs } from '@dev-tool-kit/shared'

const payload = workerData as IpcArgs<'json-schema:validate'>[0]
parentPort?.postMessage(validateAgainstSchema(payload.data, payload.schemaText))

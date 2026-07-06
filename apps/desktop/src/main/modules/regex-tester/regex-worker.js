'use strict'

const { parentPort, workerData } = require('worker_threads')
const { pattern, flags, testString, mode, replacement } = workerData

const MAX_INPUT_LENGTH = 100_000
const MAX_MATCHES = 1000

if (testString.length > MAX_INPUT_LENGTH) {
  parentPort.postMessage({
    isValid: false,
    error: `输入文本超过 ${MAX_INPUT_LENGTH.toLocaleString()} 字符限制`
  })
} else {
  try {
    const regex = new RegExp(pattern, flags)

    if (mode === 'replace') {
      const result = testString.replace(regex, replacement || '')
      parentPort.postMessage({ isValid: true, result })
    } else {
      const matches = []
      let match
      while ((match = regex.exec(testString)) !== null) {
        matches.push({
          match: match[0],
          index: match.index,
          groups: match.slice(1)
        })
        if (!flags.includes('g')) break
        if (matches.length >= MAX_MATCHES) break
      }
      parentPort.postMessage({ isValid: true, matches })
    }
  } catch (error) {
    parentPort.postMessage({ isValid: false, error: error.message })
  }
}

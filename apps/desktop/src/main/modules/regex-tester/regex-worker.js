'use strict'

const { parentPort, workerData } = require('worker_threads')
const { pattern, flags, testString, mode, replacement } = workerData

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
      if (matches.length > 1000) break
    }
    parentPort.postMessage({ isValid: true, matches })
  }
} catch (error) {
  parentPort.postMessage({ isValid: false, error: error.message })
}

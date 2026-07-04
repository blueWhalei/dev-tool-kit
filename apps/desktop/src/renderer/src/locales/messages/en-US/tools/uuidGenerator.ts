export default {
  title: 'UUID Generator',
  description: 'Generate UUIDs with v1/v4/v7 version support',
  labels: {
    count: 'Count',
    version: 'UUID Version',
    format: 'Output Format'
  },
  versions: {
    v1: 'v1 (Time + Node)',
    v4: 'v4 (Random)',
    v7: 'v7 (Timestamp-based)'
  },
  formats: {
    standard: 'Standard (hyphens)',
    uppercase: 'Uppercase',
    noHyphens: 'No hyphens',
    braces: 'Braces'
  },
  buttons: {
    generate: 'Generate',
    copy: 'Copy',
    copyAll: 'Copy all'
  },
  messages: {
    copiedAll: 'All copied'
  }
}

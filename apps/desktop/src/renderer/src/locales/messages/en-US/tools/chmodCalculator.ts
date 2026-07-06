export default {
  title: 'Chmod Calculator',
  description: 'Convert Unix file permissions between octal and symbolic notation',
  labels: {
    octal: 'Octal',
    symbolic: 'Symbolic',
    owner: 'Owner',
    group: 'Group',
    other: 'Other',
    read: 'Read',
    write: 'Write',
    execute: 'Execute',
    special: 'Special bits',
    setuid: 'Setuid (4)',
    setgid: 'Setgid (2)',
    sticky: 'Sticky (1)'
  },
  placeholders: {
    octal: 'e.g. 755 or 4755',
    symbolic: 'e.g. rwxr-xr-x'
  },
  buttons: {
    copyResult: 'Copy result'
  },
  messages: {
    copied: 'Result copied'
  },
  errors: {
    parseFailed: 'Parse failed',
    octalEmpty: 'Enter octal permissions, e.g. 755',
    octalInvalid: 'Invalid octal; use 3 or 4 digits (0-7)',
    symbolicEmpty: 'Enter symbolic permissions, e.g. rwxr-xr-x',
    symbolicInvalid: 'Invalid symbolic format, e.g. rwxr-xr-x'
  }
}

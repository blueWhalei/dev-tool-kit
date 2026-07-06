export default {
    title: 'Hash Generator',
    description: 'Compute MD5, SHA-1, SHA-256, SHA-512 hashes',
    modes: {
      text: 'Text mode',
      file: 'File mode'
    },
    input: 'Input',
    output: 'Output',
    inputPlaceholder: 'Enter text...',
    outputPlaceholder: 'Hash result...',
    hashFailed: 'Hash computation failed',
    buttons: {
      useInJwt: 'Use in JWT sign'
    },
    fileArea: {
      selectFile: 'Select file',
      fileName: 'File name',
      fileSize: 'File size'
    },
    messages: {
      fileHashComplete: 'File hash computation complete',
      fileHashFailed: 'File hash computation failed',
      noFileSelected: 'Please select a file first',
      noHash: 'Compute a hash first'
    }
  }

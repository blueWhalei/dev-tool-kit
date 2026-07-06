export default {
    title: 'Text Diff',
    description: 'Compare two texts with optional ignore whitespace/case',
    buttons: {
      fillSample: 'Fill sample',
      copyResult: 'Copy result',
      copy: 'Copy',
      unifiedView: 'Unified',
      splitView: 'Split',
      loadFile: 'Open file',
      lineMode: 'Line',
      wordMode: 'Word'
    },
    labels: {
      textA: 'Text A',
      textB: 'Text B',
      result: 'Diff result',
      ignoreWhitespace: 'Ignore whitespace',
      ignoreCase: 'Ignore case',
      diffMode: 'Diff granularity',
      equal: 'Equal {count}',
      insert: 'Added {count}',
      delete: 'Removed {count}',
      loadedFile: 'Loaded: {name}'
    },
    placeholders: {
      textA: 'Paste or enter original text...',
      textB: 'Paste or enter new text...'
    },
    dialogs: {
      openTextFile: 'Select text file',
      textFiles: 'Text files',
      allFiles: 'All files'
    },
    messages: {
      copied: 'Diff copied',
      noResult: 'No diff result yet',
      loadFileFailed: 'Unable to read file'
    }
  }

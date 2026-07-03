export default {
    title: 'Text Diff',
    description: 'Compare two texts with optional ignore whitespace/case',
    buttons: {
      fillSample: 'Fill sample',
      copyResult: 'Copy result',
      copy: 'Copy',
      unifiedView: 'Unified',
      splitView: 'Split'
    },
    labels: {
      textA: 'Text A',
      textB: 'Text B',
      result: 'Diff result',
      ignoreWhitespace: 'Ignore whitespace',
      ignoreCase: 'Ignore case',
      equal: 'Equal {count}',
      insert: 'Added {count}',
      delete: 'Removed {count}'
    },
    placeholders: {
      textA: 'Paste or enter original text...',
      textB: 'Paste or enter new text...'
    },
    messages: {
      copied: 'Diff copied',
      noResult: 'No diff result yet'
    }
  }

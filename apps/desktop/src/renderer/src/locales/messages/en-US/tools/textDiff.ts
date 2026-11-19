export default {
  title: 'Text Diff',
  description: 'Compare text or JSON structure to find additions, removals and changes',
  json: {
    hint: 'Object key order is ignored. Arrays are compared by position. Whitespace and case inside strings are significant. Paths start at $.',
    kind: 'Change',
    path: 'Field path',
    added: 'Added',
    removed: 'Removed',
    changed: 'Changed',
    addedCount: 'Added {count}',
    removedCount: 'Removed {count}',
    changedCount: 'Changed {count}',
    equal: 'JSON structures and values are equal.',
    empty: 'Enter JSON on both sides or fill the sample to compare.',
    comparing: 'Comparing…',
    workerFailed: 'Comparison failed or timed out. Try smaller inputs.',
    truncated:
      'Long paths and values are shortened in the table. Copy result includes complete values.',
    errors: {
      output: 'The diff is too large to display. Try smaller inputs.',
      invalid: 'Enter valid JSON.',
      duplicate: 'An object contains duplicate keys. Remove duplicate keys before comparing.',
      size: 'Each JSON input is limited to 524,288 characters.',
      depth: 'JSON nesting exceeds 128 levels.',
      nodes: 'JSON exceeds 100,000 nodes.',
      precision:
        'A number exceeds the supported precision. Compare high-precision values as JSON strings.',
      changes: 'More than 5,000 changes. Try smaller inputs.'
    }
  },
  buttons: {
    jsonMode: 'JSON',
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

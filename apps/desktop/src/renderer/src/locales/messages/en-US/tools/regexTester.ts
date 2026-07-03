export default {
    title: 'Regex Tester',
    description: 'Test regex match and replace with built-in patterns',
    pattern: 'Regular expression',
    testText: 'Test text',
    buttons: {
      fillSample: 'Fill sample'
    },
    tabs: {
      matches: 'Matches',
      matchesWithCount: 'Matches ({count})',
      common: 'Common patterns',
      replace: 'Replace test'
    },
    labels: {
      pattern: 'Regular expression',
      testText: 'Test text',
      replacement: 'Replacement',
      replaceResult: 'Replace result',
      matchIndex: 'Index: {index}',
      groupEmpty: '(empty)',
      groupLabel: '${index}: {value}'
    },
    placeholders: {
      pattern: 'Enter regex, e.g. \\d+, [a-z]+, ^test.*',
      testText: 'Enter text to test...',
      replacement: 'Replacement (supports $1, $2 group refs)'
    },
    flags: {
      g: 'g (global)',
      i: 'i (ignore case)',
      m: 'm (multiline)',
      gi: 'gi',
      gm: 'gm'
    },
    commonRegex: {
      email: { name: 'Email', description: 'Match email addresses' },
      phone: { name: 'Phone (CN)', description: 'Match Chinese mobile numbers' },
      url: { name: 'URL', description: 'Match URLs' },
      ipv4: { name: 'IPv4', description: 'Match IPv4 addresses' },
      date: { name: 'Date', description: 'Match YYYY-MM-DD' },
      chinese: { name: 'Chinese', description: 'Match Chinese characters' },
      username: { name: 'Username', description: 'Match usernames' },
      passwordStrength: { name: 'Password strength', description: 'Strong password pattern' }
    },
    messages: {},
    errors: {
      invalidResponse: 'Invalid response format'
    },
    empty: {
      matches: 'No matches'
    }
  }

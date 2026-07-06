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
      replace: 'Replace preview'
    },
    labels: {
      pattern: 'Regular expression',
      testText: 'Test text',
      replacement: 'Replacement',
      replaceResult: 'Replace result',
      replacementHint: 'Supports $1, $2 for capture groups; $$ for a literal $',
      highlightPreview: 'Match highlight',
      noFlags: 'No flags',
      matchIndex: 'Index: {index}',
      groupEmpty: '(empty)',
      groupLabel: '${index}: {value}'
    },
    placeholders: {
      pattern: 'Enter regex, e.g. \\d+, [a-z]+, ^test.*',
      testText: 'Enter text to test...',
      replacement: 'Replacement, e.g. [$1] or prefix-$2'
    },
    flags: {
      g: 'Global — find all matches',
      i: 'Ignore case',
      m: 'Multiline — ^ and $ match line boundaries',
      s: 'Dotall — . matches newlines'
    },
    commonRegex: {
      email: { name: 'Email', description: 'Match email addresses' },
      phone: { name: 'Phone (CN)', description: 'Match Chinese mobile numbers' },
      url: { name: 'URL', description: 'Match URLs' },
      ipv4: { name: 'IPv4', description: 'Match IPv4 addresses' },
      date: { name: 'Date', description: 'Match YYYY-MM-DD' },
      chinese: { name: 'Chinese', description: 'Match Chinese characters' },
      username: { name: 'Username', description: 'Match usernames' },
      passwordStrength: { name: 'Password strength', description: 'Strong password pattern' },
      uuid: { name: 'UUID', description: 'Match UUID v1–v5' },
      hexColor: { name: 'Hex color', description: 'Match #RGB or #RRGGBB' },
      integer: { name: 'Integer', description: 'Match signed integers' },
      macAddress: { name: 'MAC address', description: 'Match MAC addresses' },
      htmlTag: { name: 'HTML tag', description: 'Match HTML tags' },
      creditCard: { name: 'Credit card', description: 'Match credit card number format' }
    },
    messages: {},
    errors: {
      invalidResponse: 'Invalid response format'
    },
    empty: {
      matches: 'No matches',
      replacePreview: 'Enter pattern and test text to preview replace'
    }
  }

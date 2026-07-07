export default {
    title: 'Password Generator',
    description: 'Generate secure random passwords or offline passphrase (Diceware)',
    modes: {
      random: 'Random characters',
      passphrase: 'Passphrase'
    },
    labels: {
      length: 'Password length',
      wordCount: 'Word count',
      separator: 'Separator',
      charTypes: 'Character types',
      customChars: 'Custom characters',
      charCount: '{count}/16',
      strength: 'Strength',
      uppercase: 'Uppercase (A-Z)',
      lowercase: 'Lowercase (a-z)',
      numbers: 'Numbers (0-9)',
      special: 'Special (!@#$%...)'
    },
    placeholders: {
      customChars: 'Extra characters, e.g. ①②③'
    },
    buttons: {
      generate: 'Generate password',
      copy: 'Copy',
      copied: 'Copied',
      regenerate: 'Regenerate'
    },
    strength: {
      weak: 'Weak',
      medium: 'Medium',
      strong: 'Strong'
    },
    messages: {
      copied: 'Copied to clipboard',
      charTypeRequired: 'Select at least one character type'
    },
    empty: 'Click "Generate password" to start'
  }

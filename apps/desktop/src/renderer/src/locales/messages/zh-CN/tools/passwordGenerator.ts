export default {
    title: '密码生成器',
    description: '生成安全随机密码或离线词组口令（Diceware）',
    modes: {
      random: '随机字符',
      passphrase: '词组口令'
    },
    labels: {
      length: '密码长度',
      wordCount: '词数',
      separator: '分隔符',
      charTypes: '字符类型',
      customChars: '自定义字符',
      charCount: '{count}/16',
      strength: '密码强度',
      uppercase: '大写字母 (A-Z)',
      lowercase: '小写字母 (a-z)',
      numbers: '数字 (0-9)',
      special: '特殊字符 (!@#$%...)'
    },
    placeholders: {
      customChars: '添加额外字符，如：①②③'
    },
    buttons: {
      generate: '生成密码',
      copy: '复制',
      copied: '已复制',
      regenerate: '重新生成'
    },
    strength: {
      weak: '弱',
      medium: '中等',
      strong: '强'
    },
    messages: {
      copied: '已复制到剪贴板',
      charTypeRequired: '请至少选择一种字符类型'
    },
    empty: '点击"生成密码"开始'
  }

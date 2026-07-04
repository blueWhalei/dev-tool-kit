export default {
  title: 'UUID 生成器',
  description: '生成 UUID 唯一标识符，支持 v1/v4/v7 版本',
  labels: {
    count: '生成数量',
    version: 'UUID 版本',
    format: '输出格式'
  },
  versions: {
    v1: 'v1（基于时间 + 节点）',
    v4: 'v4（随机）',
    v7: 'v7（基于时间戳）'
  },
  formats: {
    standard: '标准（带连字符）',
    uppercase: '大写',
    noHyphens: '无连字符',
    braces: '带花括号'
  },
  buttons: {
    generate: '生成',
    copy: '复制',
    copyAll: '复制全部'
  },
  messages: {
    copiedAll: '已复制全部'
  }
}

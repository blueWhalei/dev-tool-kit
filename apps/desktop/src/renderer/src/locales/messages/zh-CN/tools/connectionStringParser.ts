export default {
  title: '连接字符串解析',
  description: '解析 MySQL、PostgreSQL、Redis、MongoDB 等常见数据库连接 URI',
  labels: {
    input: '连接字符串',
    parsed: '解析结果',
    empty: '—'
  },
  placeholders: {
    input: '粘贴连接字符串，例如 mysql://user:pass@host:3306/db'
  },
  fields: {
    protocol: '协议',
    host: '主机',
    port: '端口',
    user: '用户名',
    password: '密码',
    database: '数据库',
    queryParam: '参数 {name}'
  },
  columns: {
    field: '字段',
    value: '值',
    actions: ''
  },
  buttons: {
    copy: '复制',
    copyJson: '复制 JSON',
    openInMockData: '用于 Mock 数据'
  },
  messages: {
    copiedField: '已复制',
    copiedJson: 'JSON 已复制',
    parseFirst: '请先输入有效的连接字符串'
  },
  errors: {
    empty: '请输入连接字符串',
    unsupported_protocol: '不支持的协议，目前支持 MySQL、PostgreSQL、Redis、MongoDB',
    invalid_format: '连接字符串格式无效',
    unknown: '解析失败'
  }
}

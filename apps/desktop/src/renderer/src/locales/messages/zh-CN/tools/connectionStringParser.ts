export default {
  title: '连接字符串解析',
  description: '解析与构建 MySQL、PostgreSQL、Redis、MongoDB 等常见数据库连接 URI',
  tabs: {
    parse: '解析',
    build: '构建'
  },
  labels: {
    input: '连接字符串',
    parsed: '解析结果',
    built: '构建结果',
    queryParams: '查询参数',
    empty: '—'
  },
  placeholders: {
    input: '粘贴连接字符串，例如 mysql://user:pass@host:3306/db',
    host: '例如 localhost',
    user: '可选',
    database: '数据库名或 Redis DB 索引',
    queryParams: '例如 charset=utf8mb4&ssl=true'
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
    copyBuilt: '复制连接串',
    openInMockData: '用于 Mock 数据',
    openInPortManager: '查看端口占用',
    fillBuilder: '填入构建表单',
    build: '生成连接串',
    parseBuilt: '解析生成结果'
  },
  messages: {
    copiedField: '已复制',
    copiedJson: 'JSON 已复制',
    copiedBuilt: '连接串已复制',
    parseFirst: '请先输入有效的连接字符串',
    buildFirst: '请先生成连接字符串',
    noPort: '当前连接串未包含端口信息'
  },
  errors: {
    empty: '请输入连接字符串',
    unsupported_protocol: '不支持的协议，目前支持 MySQL、PostgreSQL、Redis、MongoDB',
    invalid_format: '连接字符串格式无效',
    missing_host: '请填写主机地址',
    unknown: '解析失败'
  }
}

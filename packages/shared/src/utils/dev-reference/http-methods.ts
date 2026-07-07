export interface HttpMethodEntry {
  method: string
  safe: boolean
  idempotent: boolean
  descriptionEn: string
  descriptionZh: string
  typicalUseEn: string
  typicalUseZh: string
}

export const HTTP_METHODS: HttpMethodEntry[] = [
  {
    method: 'GET',
    safe: true,
    idempotent: true,
    descriptionEn: 'Retrieve a resource',
    descriptionZh: '获取资源',
    typicalUseEn: 'Read data, should not change server state',
    typicalUseZh: '读取数据，不应改变服务器状态'
  },
  {
    method: 'POST',
    safe: false,
    idempotent: false,
    descriptionEn: 'Submit data to create or process',
    descriptionZh: '提交数据以创建或处理',
    typicalUseEn: 'Create resources, form submit, RPC actions',
    typicalUseZh: '创建资源、表单提交、RPC 操作'
  },
  {
    method: 'PUT',
    safe: false,
    idempotent: true,
    descriptionEn: 'Replace a resource entirely',
    descriptionZh: '完整替换资源',
    typicalUseEn: 'Full update or create at known URI',
    typicalUseZh: '在已知 URI 上完整更新或创建'
  },
  {
    method: 'PATCH',
    safe: false,
    idempotent: false,
    descriptionEn: 'Partially update a resource',
    descriptionZh: '部分更新资源',
    typicalUseEn: 'Modify specific fields only',
    typicalUseZh: '仅修改部分字段'
  },
  {
    method: 'DELETE',
    safe: false,
    idempotent: true,
    descriptionEn: 'Remove a resource',
    descriptionZh: '删除资源',
    typicalUseEn: 'Delete entity by URI',
    typicalUseZh: '按 URI 删除实体'
  },
  {
    method: 'HEAD',
    safe: true,
    idempotent: true,
    descriptionEn: 'Like GET but returns headers only',
    descriptionZh: '类似 GET，仅返回响应头',
    typicalUseEn: 'Check existence, cache validation',
    typicalUseZh: '检查存在性、缓存验证'
  },
  {
    method: 'OPTIONS',
    safe: true,
    idempotent: true,
    descriptionEn: 'Describe communication options',
    descriptionZh: '描述通信选项',
    typicalUseEn: 'CORS preflight, discover allowed methods',
    typicalUseZh: 'CORS 预检、发现允许的方法'
  },
  {
    method: 'CONNECT',
    safe: false,
    idempotent: false,
    descriptionEn: 'Establish tunnel to server',
    descriptionZh: '建立到服务器的隧道',
    typicalUseEn: 'HTTPS proxy tunneling',
    typicalUseZh: 'HTTPS 代理隧道'
  },
  {
    method: 'TRACE',
    safe: true,
    idempotent: true,
    descriptionEn: 'Echo request for diagnostic',
    descriptionZh: '回显请求用于诊断',
    typicalUseEn: 'Loop-back test (rarely enabled)',
    typicalUseZh: '环路测试（很少启用）'
  }
]

export function filterHttpMethods(query: string, locale: 'zh' | 'en'): HttpMethodEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return HTTP_METHODS
  return HTTP_METHODS.filter((entry) => {
    const desc = locale === 'zh' ? entry.descriptionZh : entry.descriptionEn
    const use = locale === 'zh' ? entry.typicalUseZh : entry.typicalUseEn
    return (
      entry.method.toLowerCase().includes(q) ||
      desc.toLowerCase().includes(q) ||
      use.toLowerCase().includes(q)
    )
  })
}

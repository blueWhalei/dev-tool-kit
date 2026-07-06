export type HttpStatusCategory = '1xx' | '2xx' | '3xx' | '4xx' | '5xx'

export interface HttpStatusCode {
  code: number
  name: string
  descriptionEn: string
  descriptionZh: string
}

export const HTTP_STATUS_CATEGORIES: HttpStatusCategory[] = ['1xx', '2xx', '3xx', '4xx', '5xx']

export const HTTP_STATUS_CODES: HttpStatusCode[] = [
  { code: 100, name: 'Continue', descriptionEn: 'Client may continue with the request.', descriptionZh: '客户端可继续发送请求。' },
  { code: 101, name: 'Switching Protocols', descriptionEn: 'Server is switching protocols per Upgrade header.', descriptionZh: '服务器根据 Upgrade 头切换协议。' },
  { code: 102, name: 'Processing', descriptionEn: 'Request received; still processing (WebDAV).', descriptionZh: '已收到请求，仍在处理（WebDAV）。' },
  { code: 103, name: 'Early Hints', descriptionEn: 'Preload hints while the server prepares a response.', descriptionZh: '服务器准备响应时返回的预加载提示。' },

  { code: 200, name: 'OK', descriptionEn: 'Request succeeded.', descriptionZh: '请求成功。' },
  { code: 201, name: 'Created', descriptionEn: 'Resource created successfully.', descriptionZh: '资源创建成功。' },
  { code: 202, name: 'Accepted', descriptionEn: 'Request accepted for processing, not yet completed.', descriptionZh: '请求已接受，尚未处理完成。' },
  { code: 203, name: 'Non-Authoritative Information', descriptionEn: 'Success with metadata from a third party.', descriptionZh: '成功，但元数据来自第三方。' },
  { code: 204, name: 'No Content', descriptionEn: 'Success with no response body.', descriptionZh: '成功，无响应体。' },
  { code: 205, name: 'Reset Content', descriptionEn: 'Client should reset the document view.', descriptionZh: '客户端应重置文档视图。' },
  { code: 206, name: 'Partial Content', descriptionEn: 'Partial resource returned for range requests.', descriptionZh: '范围请求返回部分内容。' },
  { code: 207, name: 'Multi-Status', descriptionEn: 'Multiple status codes for batch operations (WebDAV).', descriptionZh: '批量操作返回多个状态（WebDAV）。' },
  { code: 208, name: 'Already Reported', descriptionEn: 'Members already listed in a previous response (WebDAV).', descriptionZh: '成员已在先前响应中列出（WebDAV）。' },
  { code: 226, name: 'IM Used', descriptionEn: 'Server fulfilled GET with instance manipulations.', descriptionZh: '服务器通过实例操作完成 GET 请求。' },

  { code: 300, name: 'Multiple Choices', descriptionEn: 'Multiple options for the requested resource.', descriptionZh: '请求资源有多个可选响应。' },
  { code: 301, name: 'Moved Permanently', descriptionEn: 'Resource permanently moved to a new URI.', descriptionZh: '资源已永久移动到新 URI。' },
  { code: 302, name: 'Found', descriptionEn: 'Resource temporarily at a different URI.', descriptionZh: '资源临时位于不同 URI。' },
  { code: 303, name: 'See Other', descriptionEn: 'Response at another URI; use GET to retrieve.', descriptionZh: '响应位于其他 URI，应使用 GET 获取。' },
  { code: 304, name: 'Not Modified', descriptionEn: 'Cached version is still valid.', descriptionZh: '缓存版本仍然有效。' },
  { code: 305, name: 'Use Proxy', descriptionEn: 'Must access resource through the given proxy (deprecated).', descriptionZh: '必须通过指定代理访问（已弃用）。' },
  { code: 307, name: 'Temporary Redirect', descriptionEn: 'Temporary redirect; method must not change.', descriptionZh: '临时重定向，请求方法不得改变。' },
  { code: 308, name: 'Permanent Redirect', descriptionEn: 'Permanent redirect; method must not change.', descriptionZh: '永久重定向，请求方法不得改变。' },

  { code: 400, name: 'Bad Request', descriptionEn: 'Malformed or invalid request.', descriptionZh: '请求格式错误或无效。' },
  { code: 401, name: 'Unauthorized', descriptionEn: 'Authentication required or failed.', descriptionZh: '需要身份验证或验证失败。' },
  { code: 402, name: 'Payment Required', descriptionEn: 'Reserved for future payment systems.', descriptionZh: '保留供未来支付系统使用。' },
  { code: 403, name: 'Forbidden', descriptionEn: 'Server refuses to authorize the request.', descriptionZh: '服务器拒绝授权该请求。' },
  { code: 404, name: 'Not Found', descriptionEn: 'Requested resource not found.', descriptionZh: '请求的资源不存在。' },
  { code: 405, name: 'Method Not Allowed', descriptionEn: 'HTTP method not supported for this resource.', descriptionZh: '该资源不支持此 HTTP 方法。' },
  { code: 406, name: 'Not Acceptable', descriptionEn: 'No acceptable representation per Accept headers.', descriptionZh: '无可接受的表示形式（Accept 头）。' },
  { code: 407, name: 'Proxy Authentication Required', descriptionEn: 'Proxy authentication required.', descriptionZh: '需要代理身份验证。' },
  { code: 408, name: 'Request Timeout', descriptionEn: 'Server timed out waiting for the request.', descriptionZh: '服务器等待请求超时。' },
  { code: 409, name: 'Conflict', descriptionEn: 'Request conflicts with current resource state.', descriptionZh: '请求与资源当前状态冲突。' },
  { code: 410, name: 'Gone', descriptionEn: 'Resource permanently removed and unavailable.', descriptionZh: '资源已永久删除且不可用。' },
  { code: 411, name: 'Length Required', descriptionEn: 'Content-Length header required.', descriptionZh: '需要 Content-Length 头。' },
  { code: 412, name: 'Precondition Failed', descriptionEn: 'Precondition in request headers failed.', descriptionZh: '请求头中的前置条件未满足。' },
  { code: 413, name: 'Payload Too Large', descriptionEn: 'Request body exceeds server limit.', descriptionZh: '请求体超过服务器限制。' },
  { code: 414, name: 'URI Too Long', descriptionEn: 'Request URI exceeds server limit.', descriptionZh: '请求 URI 超过服务器限制。' },
  { code: 415, name: 'Unsupported Media Type', descriptionEn: 'Media type not supported by the server.', descriptionZh: '服务器不支持该媒体类型。' },
  { code: 416, name: 'Range Not Satisfiable', descriptionEn: 'Requested range cannot be fulfilled.', descriptionZh: '无法满足请求的范围。' },
  { code: 417, name: 'Expectation Failed', descriptionEn: 'Expect header requirement cannot be met.', descriptionZh: '无法满足 Expect 头要求。' },
  { code: 418, name: "I'm a teapot", descriptionEn: 'April Fools\' joke status (RFC 2324).', descriptionZh: '愚人节玩笑状态码（RFC 2324）。' },
  { code: 421, name: 'Misdirected Request', descriptionEn: 'Request sent to a server unable to respond.', descriptionZh: '请求发往无法响应的服务器。' },
  { code: 422, name: 'Unprocessable Entity', descriptionEn: 'Well-formed request with semantic errors.', descriptionZh: '格式正确但语义错误的请求。' },
  { code: 423, name: 'Locked', descriptionEn: 'Resource is locked (WebDAV).', descriptionZh: '资源被锁定（WebDAV）。' },
  { code: 424, name: 'Failed Dependency', descriptionEn: 'Action failed due to a previous request (WebDAV).', descriptionZh: '因先前请求失败而无法执行（WebDAV）。' },
  { code: 425, name: 'Too Early', descriptionEn: 'Risk of replay attack; try again later.', descriptionZh: '存在重放攻击风险，请稍后重试。' },
  { code: 426, name: 'Upgrade Required', descriptionEn: 'Client must upgrade to a required protocol.', descriptionZh: '客户端需升级到要求的协议。' },
  { code: 428, name: 'Precondition Required', descriptionEn: 'Server requires conditional request.', descriptionZh: '服务器要求条件请求。' },
  { code: 429, name: 'Too Many Requests', descriptionEn: 'Rate limit exceeded; retry later.', descriptionZh: '请求过于频繁，请稍后重试。' },
  { code: 431, name: 'Request Header Fields Too Large', descriptionEn: 'Request headers exceed server limit.', descriptionZh: '请求头字段超过服务器限制。' },
  { code: 451, name: 'Unavailable For Legal Reasons', descriptionEn: 'Access denied for legal reasons.', descriptionZh: '因法律原因拒绝访问。' },

  { code: 500, name: 'Internal Server Error', descriptionEn: 'Unexpected server error.', descriptionZh: '服务器内部意外错误。' },
  { code: 501, name: 'Not Implemented', descriptionEn: 'Server does not support the functionality.', descriptionZh: '服务器不支持该功能。' },
  { code: 502, name: 'Bad Gateway', descriptionEn: 'Invalid response from upstream server.', descriptionZh: '上游服务器返回无效响应。' },
  { code: 503, name: 'Service Unavailable', descriptionEn: 'Server temporarily overloaded or down.', descriptionZh: '服务器暂时过载或不可用。' },
  { code: 504, name: 'Gateway Timeout', descriptionEn: 'Upstream server did not respond in time.', descriptionZh: '上游服务器未及时响应。' },
  { code: 505, name: 'HTTP Version Not Supported', descriptionEn: 'HTTP version not supported.', descriptionZh: '不支持的 HTTP 版本。' },
  { code: 506, name: 'Variant Also Negotiates', descriptionEn: 'Transparent content negotiation circular reference.', descriptionZh: '透明内容协商出现循环引用。' },
  { code: 507, name: 'Insufficient Storage', descriptionEn: 'Unable to store representation (WebDAV).', descriptionZh: '无法存储表示（WebDAV）。' },
  { code: 508, name: 'Loop Detected', descriptionEn: 'Infinite loop detected (WebDAV).', descriptionZh: '检测到无限循环（WebDAV）。' },
  { code: 510, name: 'Not Extended', descriptionEn: 'Further extensions required to fulfill request.', descriptionZh: '需要进一步扩展才能满足请求。' },
  { code: 511, name: 'Network Authentication Required', descriptionEn: 'Network access requires authentication.', descriptionZh: '网络访问需要身份验证。' }
]

export function getHttpStatusCategory(code: number): HttpStatusCategory {
  const hundred = Math.floor(code / 100)
  if (hundred >= 1 && hundred <= 5) {
    return `${hundred}xx` as HttpStatusCategory
  }
  return '5xx'
}

export function formatHttpStatusLine(entry: HttpStatusCode): string {
  return `${entry.code} ${entry.name}`
}

export interface FilterHttpStatusCodesOptions {
  query?: string
  category?: HttpStatusCategory | 'all'
  locale?: 'en' | 'zh'
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function filterHttpStatusCodes(
  codes: HttpStatusCode[] = HTTP_STATUS_CODES,
  options: FilterHttpStatusCodesOptions = {}
): HttpStatusCode[] {
  const { query = '', category = 'all', locale = 'en' } = options
  const normalized = normalizeQuery(query)

  return codes.filter(entry => {
    if (category !== 'all' && getHttpStatusCategory(entry.code) !== category) {
      return false
    }
    if (!normalized) return true

    const description = locale === 'zh' ? entry.descriptionZh : entry.descriptionEn
    const haystack = [
      String(entry.code),
      entry.name,
      description,
      entry.descriptionEn,
      entry.descriptionZh
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalized)
  })
}

export function groupHttpStatusCodes(
  codes: HttpStatusCode[] = HTTP_STATUS_CODES
): Record<HttpStatusCategory, HttpStatusCode[]> {
  const groups: Record<HttpStatusCategory, HttpStatusCode[]> = {
    '1xx': [],
    '2xx': [],
    '3xx': [],
    '4xx': [],
    '5xx': []
  }

  for (const entry of codes) {
    groups[getHttpStatusCategory(entry.code)].push(entry)
  }

  return groups
}

export function filterAndGroupHttpStatusCodes(
  options: FilterHttpStatusCodesOptions = {}
): Record<HttpStatusCategory, HttpStatusCode[]> {
  const filtered = filterHttpStatusCodes(HTTP_STATUS_CODES, options)
  return groupHttpStatusCodes(filtered)
}

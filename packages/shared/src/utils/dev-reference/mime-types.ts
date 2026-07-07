export interface MimeTypeEntry {
  extension: string
  mime: string
  descriptionEn: string
  descriptionZh: string
}

export const MIME_TYPES: MimeTypeEntry[] = [
  { extension: '.html', mime: 'text/html', descriptionEn: 'HTML document', descriptionZh: 'HTML 文档' },
  { extension: '.htm', mime: 'text/html', descriptionEn: 'HTML document', descriptionZh: 'HTML 文档' },
  { extension: '.css', mime: 'text/css', descriptionEn: 'CSS stylesheet', descriptionZh: 'CSS 样式表' },
  { extension: '.js', mime: 'text/javascript', descriptionEn: 'JavaScript', descriptionZh: 'JavaScript' },
  { extension: '.mjs', mime: 'text/javascript', descriptionEn: 'JavaScript module', descriptionZh: 'JavaScript 模块' },
  { extension: '.json', mime: 'application/json', descriptionEn: 'JSON data', descriptionZh: 'JSON 数据' },
  { extension: '.xml', mime: 'application/xml', descriptionEn: 'XML document', descriptionZh: 'XML 文档' },
  { extension: '.txt', mime: 'text/plain', descriptionEn: 'Plain text', descriptionZh: '纯文本' },
  { extension: '.csv', mime: 'text/csv', descriptionEn: 'CSV spreadsheet', descriptionZh: 'CSV 表格' },
  { extension: '.md', mime: 'text/markdown', descriptionEn: 'Markdown', descriptionZh: 'Markdown' },
  { extension: '.pdf', mime: 'application/pdf', descriptionEn: 'PDF document', descriptionZh: 'PDF 文档' },
  { extension: '.zip', mime: 'application/zip', descriptionEn: 'ZIP archive', descriptionZh: 'ZIP 压缩包' },
  { extension: '.gz', mime: 'application/gzip', descriptionEn: 'GZIP archive', descriptionZh: 'GZIP 压缩' },
  { extension: '.tar', mime: 'application/x-tar', descriptionEn: 'TAR archive', descriptionZh: 'TAR 归档' },
  { extension: '.7z', mime: 'application/x-7z-compressed', descriptionEn: '7-Zip archive', descriptionZh: '7-Zip 压缩包' },
  { extension: '.rar', mime: 'application/vnd.rar', descriptionEn: 'RAR archive', descriptionZh: 'RAR 压缩包' },
  { extension: '.png', mime: 'image/png', descriptionEn: 'PNG image', descriptionZh: 'PNG 图片' },
  { extension: '.jpg', mime: 'image/jpeg', descriptionEn: 'JPEG image', descriptionZh: 'JPEG 图片' },
  { extension: '.jpeg', mime: 'image/jpeg', descriptionEn: 'JPEG image', descriptionZh: 'JPEG 图片' },
  { extension: '.gif', mime: 'image/gif', descriptionEn: 'GIF image', descriptionZh: 'GIF 图片' },
  { extension: '.webp', mime: 'image/webp', descriptionEn: 'WebP image', descriptionZh: 'WebP 图片' },
  { extension: '.svg', mime: 'image/svg+xml', descriptionEn: 'SVG image', descriptionZh: 'SVG 矢量图' },
  { extension: '.ico', mime: 'image/x-icon', descriptionEn: 'Icon', descriptionZh: '图标' },
  { extension: '.bmp', mime: 'image/bmp', descriptionEn: 'BMP image', descriptionZh: 'BMP 图片' },
  { extension: '.mp3', mime: 'audio/mpeg', descriptionEn: 'MP3 audio', descriptionZh: 'MP3 音频' },
  { extension: '.wav', mime: 'audio/wav', descriptionEn: 'WAV audio', descriptionZh: 'WAV 音频' },
  { extension: '.ogg', mime: 'audio/ogg', descriptionEn: 'OGG audio', descriptionZh: 'OGG 音频' },
  { extension: '.mp4', mime: 'video/mp4', descriptionEn: 'MP4 video', descriptionZh: 'MP4 视频' },
  { extension: '.webm', mime: 'video/webm', descriptionEn: 'WebM video', descriptionZh: 'WebM 视频' },
  { extension: '.avi', mime: 'video/x-msvideo', descriptionEn: 'AVI video', descriptionZh: 'AVI 视频' },
  { extension: '.woff', mime: 'font/woff', descriptionEn: 'WOFF font', descriptionZh: 'WOFF 字体' },
  { extension: '.woff2', mime: 'font/woff2', descriptionEn: 'WOFF2 font', descriptionZh: 'WOFF2 字体' },
  { extension: '.ttf', mime: 'font/ttf', descriptionEn: 'TrueType font', descriptionZh: 'TrueType 字体' },
  { extension: '.otf', mime: 'font/otf', descriptionEn: 'OpenType font', descriptionZh: 'OpenType 字体' },
  { extension: '.wasm', mime: 'application/wasm', descriptionEn: 'WebAssembly', descriptionZh: 'WebAssembly' },
  { extension: '.form', mime: 'application/x-www-form-urlencoded', descriptionEn: 'Form URL encoded', descriptionZh: '表单 URL 编码' },
  { extension: '.multipart', mime: 'multipart/form-data', descriptionEn: 'Multipart form', descriptionZh: '多部分表单' },
  { extension: '.doc', mime: 'application/msword', descriptionEn: 'Word document', descriptionZh: 'Word 文档' },
  { extension: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', descriptionEn: 'Word document (OOXML)', descriptionZh: 'Word 文档 (OOXML)' },
  { extension: '.xls', mime: 'application/vnd.ms-excel', descriptionEn: 'Excel spreadsheet', descriptionZh: 'Excel 表格' },
  { extension: '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', descriptionEn: 'Excel spreadsheet (OOXML)', descriptionZh: 'Excel 表格 (OOXML)' },
  { extension: '.ppt', mime: 'application/vnd.ms-powerpoint', descriptionEn: 'PowerPoint', descriptionZh: 'PowerPoint' },
  { extension: '.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', descriptionEn: 'PowerPoint (OOXML)', descriptionZh: 'PowerPoint (OOXML)' },
  { extension: '.rtf', mime: 'application/rtf', descriptionEn: 'Rich Text Format', descriptionZh: 'RTF 富文本' },
  { extension: '.epub', mime: 'application/epub+zip', descriptionEn: 'EPUB ebook', descriptionZh: 'EPUB 电子书' },
  { extension: '.yaml', mime: 'text/yaml', descriptionEn: 'YAML', descriptionZh: 'YAML' },
  { extension: '.yml', mime: 'text/yaml', descriptionEn: 'YAML', descriptionZh: 'YAML' },
  { extension: '.toml', mime: 'application/toml', descriptionEn: 'TOML', descriptionZh: 'TOML' },
  { extension: '.sql', mime: 'application/sql', descriptionEn: 'SQL script', descriptionZh: 'SQL 脚本' },
  { extension: '.sh', mime: 'application/x-sh', descriptionEn: 'Shell script', descriptionZh: 'Shell 脚本' },
  { extension: '.bat', mime: 'application/x-bat', descriptionEn: 'Batch script', descriptionZh: '批处理脚本' },
  { extension: '.ps1', mime: 'application/x-powershell', descriptionEn: 'PowerShell script', descriptionZh: 'PowerShell 脚本' },
  { extension: '.pem', mime: 'application/x-pem-file', descriptionEn: 'PEM certificate/key', descriptionZh: 'PEM 证书/密钥' },
  { extension: '.crt', mime: 'application/x-x509-ca-cert', descriptionEn: 'X.509 certificate', descriptionZh: 'X.509 证书' },
  { extension: '.cer', mime: 'application/pkix-cert', descriptionEn: 'Certificate', descriptionZh: '证书' },
  { extension: '.p12', mime: 'application/x-pkcs12', descriptionEn: 'PKCS#12 keystore', descriptionZh: 'PKCS#12 密钥库' },
  { extension: '.pfx', mime: 'application/x-pkcs12', descriptionEn: 'PKCS#12 keystore', descriptionZh: 'PKCS#12 密钥库' },
  { extension: '.apk', mime: 'application/vnd.android.package-archive', descriptionEn: 'Android package', descriptionZh: 'Android 安装包' },
  { extension: '.dmg', mime: 'application/x-apple-diskimage', descriptionEn: 'macOS disk image', descriptionZh: 'macOS 磁盘映像' },
  { extension: '.exe', mime: 'application/vnd.microsoft.portable-executable', descriptionEn: 'Windows executable', descriptionZh: 'Windows 可执行文件' },
  { extension: '.deb', mime: 'application/vnd.debian.binary-package', descriptionEn: 'Debian package', descriptionZh: 'Debian 安装包' },
  { extension: '.rpm', mime: 'application/x-rpm', descriptionEn: 'RPM package', descriptionZh: 'RPM 安装包' }
]

export function filterMimeTypes(query: string, locale: 'zh' | 'en'): MimeTypeEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return MIME_TYPES
  return MIME_TYPES.filter((entry) => {
    const desc = locale === 'zh' ? entry.descriptionZh : entry.descriptionEn
    return (
      entry.extension.toLowerCase().includes(q) ||
      entry.mime.toLowerCase().includes(q) ||
      desc.toLowerCase().includes(q)
    )
  })
}

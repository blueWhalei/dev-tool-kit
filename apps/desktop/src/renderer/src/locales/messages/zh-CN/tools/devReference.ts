export default {
  title: '开发速查',
  description: 'MIME 类型、Git 命令模板与 HTTP 方法离线速查',
  tabs: {
    mime: 'MIME 类型',
    git: 'Git 命令',
    httpMethods: 'HTTP 方法'
  },
  labels: {
    search: '搜索',
    category: '分类',
    allCategories: '全部分类',
    extension: '扩展名',
    mime: 'MIME 类型',
    description: '说明',
    command: '命令',
    method: '方法',
    safe: '安全',
    idempotent: '幂等',
    typicalUse: '典型用途',
    noResults: '无匹配结果',
    params: '参数'
  },
  placeholders: {
    searchMime: '搜索扩展名或 MIME 类型...',
    searchGit: '搜索 Git 命令...',
    searchHttp: '搜索 HTTP 方法...'
  },
  gitCategories: {
    stash: 'Stash',
    branch: '分支',
    commit: '提交',
    rebase: 'Rebase',
    reset: 'Reset',
    remote: '远程',
    other: '其他'
  },
  messages: {
    copied: '已复制',
    copiedMime: '已复制 MIME 类型',
    copiedCommand: '已复制命令'
  },
  bool: {
    yes: '是',
    no: '否'
  }
}

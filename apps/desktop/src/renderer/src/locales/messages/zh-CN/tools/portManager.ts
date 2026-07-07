export default {
    title: '端口管理',
    description: '查看占用端口的进程，支持扫描与结束进程',
    buttons: {
      refresh: '刷新',
      scan: '扫描',
      scanAll: '全部扫描',
      scanCommon: '常用端口',
      kill: '终止',
      confirm: '确定',
      cancel: '取消',
      copyCommand: '复制命令'
    },
    placeholders: {
      searchPort: '端口',
      searchProcess: '进程名',
      searchPid: 'PID'
    },
    filters: {
      all: '全部',
      listening: '监听中',
      established: '已建立',
      allWithCount: '全部 ({count})',
      listeningWithCount: '监听 ({count})',
      establishedWithCount: '已建立 ({count})'
    },
    stats: {
      total: '共 {count} 条',
      listening: '监听 {count}',
      established: '已建立 {count}'
    },
    columns: {
      port: '端口',
      service: '进程名',
      pid: 'PID',
      localAddress: '本地地址',
      protocol: '协议',
      state: '状态',
      actions: ''
    },
    labels: {
      platform: '当前平台（{platform}）'
    },
    hints: {
      nonWindows: '非 Windows 平台仅显示监听端口，进程信息可能不完整',
      partialSupportTitle: '部分支持',
      unixKillHint: '当前平台（{platform}）可尝试终止用户进程。系统进程或他人进程可能需要 sudo 权限；若终止失败，可使用「复制命令」在终端执行。'
    },
    messages: {
      killConfirm: '确定终止进程 {pid}？',
      killConfirmUnix: '确定终止进程 {pid}？\n\n部分进程需要 sudo 权限，终止失败时可复制 kill 命令到终端执行。',
      processKilled: '进程 {pid} 已终止',
      commandCopied: '命令已复制到剪贴板'
    },
    dialogs: {
      killFailedTitle: '无法终止进程',
      killFailedContent: '{message}\n\n请在终端执行以下命令：\n{command}'
    },
    errors: {
      fetchFailed: '获取端口列表失败',
      killFailed: '终止进程失败',
      needSudo: '进程 {pid} 需要管理员权限，请在终端执行 sudo kill {pid}',
      invalid_pid: '无效的进程 ID',
      protected_pid: '无法终止系统关键进程',
      permission_denied: '进程 {pid} 权限不足，可能需要 sudo 权限',
      process_not_found: '进程 {pid} 不存在或已结束',
      access_denied: '进程 {pid} 访问被拒绝，可能需要管理员权限',
      unknown: '终止进程时发生未知错误'
    },
    empty: '暂无端口占用',
    refresh: '刷新',
    scan: '扫描',
    filterAll: '全部',
    filterListening: '监听中',
    filterEstablished: '已建立',
    nonWindowsHint: '非 Windows 平台仅显示监听端口，进程信息可能不完整'
  }

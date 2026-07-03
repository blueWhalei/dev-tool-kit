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
      cancel: '取消'
    },
    placeholders: {
      search: '搜索端口/PID/进程名'
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
      platformAlert: '当前平台（{platform}）支持端口扫描；「终止进程」仅 Windows 可用。',
      darwin: 'macOS：可使用「活动监视器」手动结束进程，或终端执行 kill <PID>。',
      linux: 'Linux：可使用 kill <PID> 或 kill -9 <PID> 结束进程。'
    },
    messages: {
      killConfirm: '确定终止进程 {pid}？',
      processKilled: '进程 {pid} 已终止'
    },
    errors: {
      fetchFailed: '获取端口列表失败',
      killFailed: '终止进程失败'
    },
    empty: '暂无端口占用',
    refresh: '刷新',
    scan: '扫描',
    filterAll: '全部',
    filterListening: '监听中',
    filterEstablished: '已建立',
    nonWindowsHint: '非 Windows 平台仅显示监听端口，进程信息可能不完整'
  }

export default {
  title: '端口管理',
  description: '查看占用端口的进程，支持扫描与结束进程',
  diagnosis: {
    title: '端口诊断',
    input: '粘贴 TCP listen EADDRINUSE 报错，或输入端口号（1–65535）',
    run: '检查监听进程',
    invalid: '请输入有效的 TCP 端口号，或只包含一个明确端口的 EADDRINUSE 报错。',
    scanFailed: '扫描失败，无法判断端口状态。',
    occupied: '以下进程正在本机监听 TCP 端口 {port}。',
    absent: '本次检查时 TCP 端口 {port} 可以绑定。',
    released: '复查完成，TCP 端口 {port} 连续两次可以绑定，可重试启动服务。',
    stillOccupied: '所选进程仍在监听端口 {port}。',
    otherOwner: '端口 {port} 现在由其他进程实例监听，请核对更新后的列表。',
    unidentified: '端口 {port} 仍有监听，无法核实当前进程身份。',
    unavailable: 'TCP 端口 {port} 绑定失败，未定位到可确认的监听进程。',
    unconfirmed: 'TCP 端口 {port} 的状态正在变化，请重新检查。',
    readOnly: '只读：无法安全终止此进程。',
    forceWindows: 'Windows 将强制结束此进程。',
    unknownProcess: '未知进程',
    confirm: '确定终止监听 {address} 端口 {port} 的 {name}（PID {pid}）？这会结束整个进程。'
  },
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
    searchPort: '端口',
    searchProcess: '进程名',
    searchPid: 'PID',
    searchAddress: '本地地址'
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
    unixKillHint: '在 {platform} 上，终止操作需要系统 Python 3、进程实例标识和相应权限。'
  },
  messages: {
    killConfirm: '强制结束监听 {address} 端口 {port} 的 {name}（PID {pid}）？',
    killConfirmUnix: '向监听 {address} 端口 {port} 的 {name}（PID {pid}）发送终止信号？',
    processKilled: '已向进程 {pid} 发出终止请求'
  },
  dialogs: {
    killFailedTitle: '无法终止进程',
    protectedPidContent:
      '进程 {pid} 为系统关键进程，无法通过应用终止。请确认是否需要该操作，并在了解风险后于终端手动处理。'
  },
  errors: {
    termination_pending: '此进程已有终止请求正在执行。',
    owner_changed: '所选进程已不再持有该监听地址。',
    scan_failed: '无法核实端口的监听进程。',
    fetchFailed: '获取端口列表失败',
    killFailed: '终止进程失败',
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

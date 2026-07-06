export default {
    title: 'Hosts 编辑器',
    description: '管理 hosts 条目与方案，支持导入导出与 DNS 刷新',
    buttons: {
      flushDns: '刷新 DNS',
      addEntry: '添加条目',
      edit: '编辑',
      delete: '删除',
      save: '保存',
      cancel: '取消',
      saveScheme: '保存方案',
      exportAll: '导出全部',
      importSchemes: '导入方案',
      load: '加载',
      confirmLoad: '确认加载',
      confirm: '确定',
      copyCommand: '复制命令'
    },
    tabs: {
      entries: '条目列表',
      groups: '分组视图',
      schemes: '配置方案'
    },
    columns: {
      status: '状态',
      group: '分组',
      ip: 'IP 地址',
      hostname: '主机名',
      comment: '备注',
      actions: ''
    },
    labels: {
      noGroup: '无分组',
      ungrouped: '未分组',
      enabled: '启用',
      groupSelect: '分组',
      schemeCompare: '方案对比：{name}',
      schemeCompareDefault: '方案对比',
      entryCount: '{count} 条',
      schemeMeta: '{count} 个条目 · {date}',
      ipPrefix: 'IP: {ip}'
    },
    placeholders: {
      search: '搜索 IP / 主机名 / 备注...',
      ip: '例如: 127.0.0.1',
      hostname: '例如: local.dev',
      group: '选择分组',
      comment: '可选备注',
      schemeName: '输入方案名称保存当前配置'
    },
    modals: {
      addTitle: '添加 Hosts 条目',
      editTitle: '编辑 Hosts 条目'
    },
    hints: {
      adminRequired: '修改 hosts 文件可能需要管理员权限{platformSuffix}。',
      platformSuffix: '（当前平台：{platform}）',
      noWriteAccess: '当前无法直接写入 {path}。保存失败时将提供 sudo/管理员命令，可先手动复制备份文件。'
    },
    dialogs: {
      permissionTitle: '需要管理员权限',
      permissionContent: '写入 hosts 失败。已自动创建备份，可在终端执行以下命令恢复：',
      disableTitle: '禁用条目',
      enableTitle: '启用条目',
      toggleContent: '确定{action} {hostname} 吗？',
      disable: '禁用',
      enable: '启用',
      deleteSchemeTitle: '删除方案',
      deleteSchemeContent: '确定删除方案「{name}」？此操作不可恢复。',
      flushDnsTitle: '刷新 DNS',
      flushDnsContent: '确定刷新 DNS 缓存吗？'
    },
    diff: {
      added: '新增',
      removed: '删除',
      modified: '修改',
      unchanged: '不变',
      addedCount: '新增 {count}',
      removedCount: '删除 {count}',
      modifiedCount: '修改 {count}',
      unchangedCount: '不变 {count}',
      identical: '方案与当前配置完全一致'
    },
    messages: {
      ipHostnameRequired: '请填写 IP 地址和主机名',
      schemeNameRequired: '请输入方案名称',
      added: '添加成功',
      saved: '保存成功',
      statusUpdated: '状态已更新',
      deleted: '删除成功',
      schemeSaved: '方案已保存',
      schemeLoaded: '方案已加载',
      schemeExported: '方案已导出',
      schemeImported: '方案已导入',
      dnsFlushed: 'DNS 缓存已刷新',
      commandCopied: '命令已复制'
    },
    errors: {
      fetchFailed: '获取 hosts 文件失败',
      operationFailed: '操作失败',
      updateFailed: '更新失败',
      deleteFailed: '删除失败',
      setGroupFailed: '设置分组失败',
      saveFailed: '保存失败',
      readSchemeFailed: '无法读取方案内容',
      loadSchemeFailed: '读取方案失败',
      loadFailed: '加载失败',
      exportFailed: '导出失败',
      importFailed: '导入失败',
      readFileFailed: '无法读取方案文件',
      flushDnsFailed: '刷新 DNS 失败',
      permissionDenied: '没有写入 hosts 文件的权限'
    },
    empty: {
      entries: '暂无 hosts 条目',
      groupEntries: '暂无条目',
      schemes: '暂无保存的方案'
    }
  }

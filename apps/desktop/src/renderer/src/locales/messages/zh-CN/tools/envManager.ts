export default {
    title: '环境变量管理',
    description: '查看与编辑用户/系统环境变量，支持备份与导入',
    unsupported: '当前平台不支持',
    unsupportedDesc: '环境变量管理仅在 Windows 上可用',
    unsupportedAlert: '环境变量管理仅支持 Windows 系统。当前平台：{platform}',
    unknownPlatform: '未知',
    buttons: {
      create: '新建',
      export: '导出',
      import: '导入',
      backup: '备份',
      history: '历史',
      edit: '编辑',
      delete: '删除',
      save: '保存',
      cancel: '取消',
      add: '添加',
      remove: '移除',
      restore: '恢复',
      createBackup: '创建备份'
    },
    tabs: {
      user: '用户变量',
      system: '系统变量',
      path: 'PATH',
      backup: '备份记录'
    },
    columns: {
      name: '变量名',
      value: '值',
      actions: ''
    },
    labels: {
      variableName: '变量名',
      variableValue: '变量值',
      backupName: '备份名称',
      pathExists: '存在',
      pathNotExists: '路径不存在',
      backupMeta: '{count} 个变量 · {date}'
    },
    placeholders: {
      variableName: '例如: NODE_ENV',
      variableValue: '变量值',
      pathInput: '输入新路径后回车添加',
      backupName: '输入备份名称 (例如: 2024-01-01)',
      importContent: 'NODE_ENV=development\nAPI_URL=http://localhost:3000'
    },
    modals: {
      createTitle: '新建环境变量',
      editTitle: '编辑环境变量',
      createBackupTitle: '创建备份',
      importTitle: '导入环境变量'
    },
    hints: {
      backupInfo: '备份将保存当前所有用户环境变量，最多保留 10 个备份。',
      importInfo: '粘贴 .env 格式内容（每行 KEY=VALUE），将写入用户环境变量。'
    },
    dialogs: {
      restoreTitle: '恢复备份',
      restoreContent: '确定恢复备份「{name}」？当前环境变量将被覆盖。',
      deleteBackupTitle: '删除备份',
      deleteBackupContent: '确定删除备份「{name}」？此操作不可恢复。'
    },
    messages: {
      nameRequired: '请输入变量名',
      pathRequired: '请输入路径',
      backupNameRequired: '请输入备份名称',
      importContentRequired: '请粘贴 .env 格式内容',
      created: '创建成功',
      saved: '保存成功',
      deleted: '删除成功',
      pathAdded: '路径已添加',
      pathRemoved: '路径已移除',
      backupSuccess: '备份成功',
      restoreSuccess: '恢复成功',
      exportCopied: '已复制 .env 格式到剪贴板',
      importSuccess: '成功导入 {ok} 个变量{failSuffix}',
      importFailSuffix: '，{fail} 个失败',
      noUserVars: '没有可导出的用户变量',
      noValidLines: '未识别到有效的环境变量行'
    },
    errors: {
      fetchFailed: '获取环境变量失败',
      fetchPathFailed: '获取 PATH 失败',
      saveFailed: '保存失败',
      deleteFailed: '删除失败',
      addFailed: '添加失败',
      removeFailed: '移除失败',
      moveFailed: '移动失败',
      backupFailed: '备份失败',
      restoreFailed: '恢复失败',
      exportFailed: '导出失败',
      importFailed: '导入失败'
    },
    empty: {
      userVars: '暂无用户变量',
      systemVars: '暂无系统变量',
      path: 'PATH 为空',
      backups: '暂无备份记录'
    }
  }

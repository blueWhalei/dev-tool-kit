export default {
    title: 'Environment Variables',
    description: 'View and edit user/system variables with backup and import',
    unsupported: 'Not supported on this platform',
    unsupportedDesc: 'Environment variable management is only available on Windows',
    unsupportedAlert: 'Environment variables are only supported on Windows. Current platform: {platform}',
    unknownPlatform: 'Unknown',
    buttons: {
      create: 'New',
      export: 'Export',
      import: 'Import',
      backup: 'Backup',
      history: 'History',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      add: 'Add',
      remove: 'Remove',
      restore: 'Restore',
      createBackup: 'Create backup'
    },
    tabs: {
      user: 'User variables',
      system: 'System variables',
      path: 'PATH',
      backup: 'Backups'
    },
    columns: {
      name: 'Name',
      value: 'Value',
      actions: ''
    },
    labels: {
      variableName: 'Name',
      variableValue: 'Value',
      backupName: 'Backup name',
      pathExists: 'Exists',
      pathNotExists: 'Path not found',
      backupMeta: '{count} variables · {date}'
    },
    placeholders: {
      variableName: 'e.g. NODE_ENV',
      variableValue: 'Variable value',
      pathInput: 'Enter a path and press Enter to add',
      backupName: 'Backup name (e.g. 2024-01-01)',
      importContent: 'NODE_ENV=development\nAPI_URL=http://localhost:3000'
    },
    modals: {
      createTitle: 'New environment variable',
      editTitle: 'Edit environment variable',
      createBackupTitle: 'Create backup',
      importTitle: 'Import environment variables'
    },
    hints: {
      backupInfo: 'Backups save all current user environment variables. Up to 10 backups are kept.',
      importInfo: 'Paste .env content (KEY=VALUE per line). Values are written to user environment variables.'
    },
    dialogs: {
      restoreTitle: 'Restore backup',
      restoreContent: 'Restore backup "{name}"? Current environment variables will be overwritten.',
      deleteBackupTitle: 'Delete backup',
      deleteBackupContent: 'Delete backup "{name}"? This cannot be undone.'
    },
    messages: {
      nameRequired: 'Enter a variable name',
      pathRequired: 'Enter a path',
      backupNameRequired: 'Enter a backup name',
      importContentRequired: 'Paste .env content',
      created: 'Created',
      saved: 'Saved',
      deleted: 'Deleted',
      pathAdded: 'Path added',
      pathRemoved: 'Path removed',
      backupSuccess: 'Backup created',
      restoreSuccess: 'Restored',
      exportCopied: '.env format copied to clipboard',
      importSuccess: 'Imported {ok} variable(s){failSuffix}',
      importFailSuffix: ', {fail} failed',
      noUserVars: 'No user variables to export',
      noValidLines: 'No valid environment variable lines found'
    },
    errors: {
      fetchFailed: 'Failed to fetch environment variables',
      fetchPathFailed: 'Failed to fetch PATH',
      saveFailed: 'Save failed',
      deleteFailed: 'Delete failed',
      addFailed: 'Add failed',
      removeFailed: 'Remove failed',
      moveFailed: 'Move failed',
      backupFailed: 'Backup failed',
      restoreFailed: 'Restore failed',
      exportFailed: 'Export failed',
      importFailed: 'Import failed'
    },
    empty: {
      userVars: 'No user variables',
      systemVars: 'No system variables',
      path: 'PATH is empty',
      backups: 'No backups'
    }
  }

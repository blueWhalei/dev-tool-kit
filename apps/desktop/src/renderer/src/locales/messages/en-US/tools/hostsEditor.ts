export default {
    title: 'Hosts Editor',
    description: 'Manage hosts entries and schemes with import/export and DNS flush',
    buttons: {
      flushDns: 'Flush DNS',
      addEntry: 'Add entry',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      saveScheme: 'Save scheme',
      exportAll: 'Export all',
      importSchemes: 'Import schemes',
      load: 'Load',
      confirmLoad: 'Confirm load',
      confirm: 'Confirm',
      copyCommand: 'Copy command'
    },
    tabs: {
      entries: 'Entries',
      groups: 'Groups',
      schemes: 'Schemes'
    },
    columns: {
      status: 'Status',
      group: 'Group',
      ip: 'IP address',
      hostname: 'Hostname',
      comment: 'Comment',
      actions: ''
    },
    labels: {
      noGroup: 'No group',
      ungrouped: 'Ungrouped',
      enabled: 'Enabled',
      groupSelect: 'Group',
      schemeCompare: 'Compare scheme: {name}',
      schemeCompareDefault: 'Scheme comparison',
      entryCount: '{count} entries',
      schemeMeta: '{count} entries · {date}',
      ipPrefix: 'IP: {ip}'
    },
    placeholders: {
      search: 'Search IP / hostname / comment...',
      ip: 'e.g. 127.0.0.1',
      hostname: 'e.g. local.dev',
      group: 'Select group',
      comment: 'Optional comment',
      schemeName: 'Enter scheme name to save current config'
    },
    modals: {
      addTitle: 'Add hosts entry',
      editTitle: 'Edit hosts entry'
    },
    hints: {
      adminRequired: 'Editing hosts may require administrator privileges{platformSuffix}.',
      platformSuffix: ' (platform: {platform})',
      noWriteAccess: 'Cannot write to {path} directly. If save fails, a sudo/admin command with the backup path will be shown.'
    },
    dialogs: {
      permissionTitle: 'Administrator privileges required',
      permissionContent: 'Failed to write hosts. A backup was created — run this command in a terminal:',
      disableTitle: 'Disable entry',
      enableTitle: 'Enable entry',
      toggleContent: '{action} {hostname}?',
      disable: 'Disable',
      enable: 'Enable',
      deleteSchemeTitle: 'Delete scheme',
      deleteSchemeContent: 'Delete scheme "{name}"? This cannot be undone.',
      flushDnsTitle: 'Flush DNS',
      flushDnsContent: 'Flush DNS cache?'
    },
    diff: {
      added: 'Added',
      removed: 'Removed',
      modified: 'Modified',
      unchanged: 'Unchanged',
      addedCount: 'Added {count}',
      removedCount: 'Removed {count}',
      modifiedCount: 'Modified {count}',
      unchangedCount: 'Unchanged {count}',
      identical: 'Scheme matches current configuration'
    },
    messages: {
      ipHostnameRequired: 'Enter IP address and hostname',
      schemeNameRequired: 'Enter a scheme name',
      added: 'Added',
      saved: 'Saved',
      statusUpdated: 'Status updated',
      deleted: 'Deleted',
      schemeSaved: 'Scheme saved',
      schemeLoaded: 'Scheme loaded',
      schemeExported: 'Schemes exported',
      schemeImported: 'Schemes imported',
      dnsFlushed: 'DNS cache flushed',
      commandCopied: 'Command copied'
    },
    errors: {
      fetchFailed: 'Failed to read hosts file',
      operationFailed: 'Operation failed',
      updateFailed: 'Update failed',
      deleteFailed: 'Delete failed',
      setGroupFailed: 'Failed to set group',
      saveFailed: 'Save failed',
      readSchemeFailed: 'Unable to read scheme',
      loadSchemeFailed: 'Failed to read scheme',
      loadFailed: 'Load failed',
      exportFailed: 'Export failed',
      importFailed: 'Import failed',
      readFileFailed: 'Unable to read scheme file',
      flushDnsFailed: 'Failed to flush DNS',
      permissionDenied: 'No permission to write the hosts file'
    },
    empty: {
      entries: 'No hosts entries',
      groupEntries: 'No entries',
      schemes: 'No saved schemes'
    }
  }

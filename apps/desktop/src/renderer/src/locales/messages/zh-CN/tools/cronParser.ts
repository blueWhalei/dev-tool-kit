export default {
    title: 'Cron 表达式解析',
    description: '解析 Cron 表达式并预览接下来执行时间',
    labels: {
      expression: 'Cron 表达式',
      includeSeconds: '含秒',
      format: '格式: {fields}',
      formatWithSeconds: '秒 分钟 小时 日期 月份 星期',
      formatWithoutSeconds: '分钟 小时 日期 月份 星期',
      visualEditor: '可视化字段编辑',
      presets: '常用模板',
      description: '自然语言说明',
      nextRuns: '接下来 5 次执行',
      timezone: '时区',
      localTimezone: '{zone}（本地）',
      runIndex: '#{index}'
    },
    placeholders: {
      expression: '* * * * * *',
      step: '间隔',
      list: '如 1,3,5'
    },
    patternTypes: {
      every: '每',
      step: '每 N',
      value: '指定值',
      range: '范围',
      list: '列表',
      custom: '自定义'
    },
    buttons: {
      copy: '复制'
    },
    fieldNames: {
      second: '秒',
      minute: '分钟',
      hour: '小时',
      day: '日期',
      month: '月份',
      week: '星期'
    },
    fieldRanges: {
      second: '0-59',
      minute: '0-59',
      hour: '0-23',
      day: '1-31',
      month: '1-12',
      week: '0-6'
    },
    presets: {
      everySecond: '每秒',
      everyMinute: '每分钟',
      everyHour: '每小时',
      dailyAt9: '每天 9:00',
      dailyMidnight: '每天午夜',
      weeklyMonday: '每周一',
      monthlyFirst: '每月第一天',
      every5Minutes: '每 5 分钟'
    },
    relative: {
      expired: '已过期',
      seconds: '{count} 秒后',
      minutes: '{count} 分钟后',
      hours: '{count} 小时后',
      days: '约 {count} 天后'
    },
    describe: {
      everySecond: '每秒执行一次',
      dailyAt9: '每天上午 9:00 执行',
      dailyMidnight: '每天午夜执行',
      weeklyMonday: '每周一凌晨执行',
      custom: '自定义定时任务'
    },
    errors: {
      invalidExpression: '无效的 Cron 表达式'
    }
  }

export default {
    title: 'Cron Parser',
    description: 'Parse cron expressions and preview next run times',
    labels: {
      expression: 'Cron expression',
      includeSeconds: 'Include seconds',
      format: 'Format: {fields}',
      formatWithSeconds: 'second minute hour day month weekday',
      formatWithoutSeconds: 'minute hour day month weekday',
      presets: 'Presets',
      description: 'Plain-language description',
      nextRuns: 'Next 5 runs',
      runIndex: '#{index}'
    },
    placeholders: {
      expression: '* * * * * *'
    },
    buttons: {
      copy: 'Copy'
    },
    fieldNames: {
      second: 'Second',
      minute: 'Minute',
      hour: 'Hour',
      day: 'Day',
      month: 'Month',
      week: 'Weekday'
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
      everySecond: 'Every second',
      everyMinute: 'Every minute',
      everyHour: 'Every hour',
      dailyAt9: 'Daily at 9:00',
      dailyMidnight: 'Daily at midnight',
      weeklyMonday: 'Every Monday',
      monthlyFirst: 'First day of month',
      every5Minutes: 'Every 5 minutes'
    },
    relative: {
      expired: 'Expired',
      seconds: 'in {count}s',
      minutes: 'in {count} min',
      hours: 'in {count} h',
      days: 'in ~{count} days'
    },
    describe: {
      everySecond: 'Runs every second',
      dailyAt9: 'Runs daily at 9:00 AM',
      dailyMidnight: 'Runs daily at midnight',
      weeklyMonday: 'Runs every Monday at midnight',
      custom: 'Custom schedule'
    },
    errors: {
      invalidExpression: 'Invalid cron expression'
    }
  }

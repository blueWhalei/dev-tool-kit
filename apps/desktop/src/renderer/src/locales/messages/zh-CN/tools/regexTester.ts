export default {
    title: '正则表达式测试',
    description: '测试正则匹配与替换，内置常用表达式',
    pattern: '正则表达式',
    testText: '测试文本',
    buttons: {
      fillSample: '填入示例'
    },
    tabs: {
      matches: '匹配结果',
      matchesWithCount: '匹配结果 ({count})',
      common: '常用正则',
      replace: '替换测试'
    },
    labels: {
      pattern: '正则表达式',
      testText: '测试文本',
      replacement: '替换文本',
      replaceResult: '替换结果',
      matchIndex: '位置: {index}',
      groupEmpty: '(空)',
      groupLabel: '${index}: {value}'
    },
    placeholders: {
      pattern: '输入正则表达式，如：\\d+、[a-z]+、^test.*',
      testText: '输入要测试的文本内容...',
      replacement: '替换文本 (支持 $1, $2 引用分组)'
    },
    flags: {
      g: 'g (全局)',
      i: 'i (忽略大小写)',
      m: 'm (多行)',
      gi: 'gi',
      gm: 'gm'
    },
    commonRegex: {
      email: { name: '邮箱', description: '匹配邮箱地址' },
      phone: { name: '手机号', description: '匹配中国手机号' },
      url: { name: 'URL', description: '匹配 URL' },
      ipv4: { name: 'IP 地址', description: '匹配 IPv4' },
      date: { name: '日期', description: '匹配 YYYY-MM-DD' },
      chinese: { name: '中文', description: '匹配中文字符' },
      username: { name: '用户名', description: '匹配用户名' },
      passwordStrength: { name: '密码强度', description: '强密码' }
    },
    messages: {},
    errors: {
      invalidResponse: '无效的响应格式'
    },
    empty: {
      matches: '暂无匹配结果'
    }
  }

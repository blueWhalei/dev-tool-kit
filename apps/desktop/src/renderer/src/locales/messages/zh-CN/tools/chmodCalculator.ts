export default {
  title: 'Chmod 权限计算器',
  description: '在八进制与符号表示之间转换 Unix 文件权限',
  labels: {
    octal: '八进制',
    symbolic: '符号',
    owner: '所有者',
    group: '用户组',
    other: '其他',
    read: '读',
    write: '写',
    execute: '执行',
    special: '特殊位',
    setuid: 'Setuid (4)',
    setgid: 'Setgid (2)',
    sticky: 'Sticky (1)'
  },
  placeholders: {
    octal: '例如 755 或 4755',
    symbolic: '例如 rwxr-xr-x'
  },
  buttons: {
    copyResult: '复制结果'
  },
  messages: {
    copied: '已复制结果'
  },
  errors: {
    parseFailed: '解析失败',
    octalEmpty: '请输入八进制权限，例如 755',
    octalInvalid: '八进制无效，应为 3 或 4 位数字（0-7）',
    symbolicEmpty: '请输入符号权限，例如 rwxr-xr-x',
    symbolicInvalid: '符号格式无效，例如 rwxr-xr-x'
  }
}

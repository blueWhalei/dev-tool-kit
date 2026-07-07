export default {
    title: 'IP 子网计算器',
    description: '根据 CIDR 计算 IPv4/IPv6 网络地址与地址范围，支持 VLSM 拆分',
    labels: {
      version: '协议',
      versionIpv4: 'IPv4',
      versionIpv6: 'IPv6',
      cidr: 'CIDR',
      network: '网络地址',
      broadcast: '广播地址',
      subnetMask: '子网掩码',
      wildcardMask: '通配符掩码',
      firstHost: '首个地址',
      lastHost: '末个地址',
      totalHosts: '地址总数',
      usableHosts: '可用地址数',
      vlsm: 'VLSM 拆分',
      hostCounts: '各子网主机数',
      vlsmResult: '拆分结果'
    },
    placeholders: {
      cidr: '例如 192.168.1.0/24 或 2001:db8::/32',
      hostCounts: '逗号分隔，例如 50, 20, 10'
    },
    buttons: {
      calculate: '计算',
      copyResult: '复制结果',
      splitVlsm: '拆分'
    },
    messages: {
      copied: '已复制结果'
    },
    errors: {
      calculateFailed: '计算失败',
      cidrEmpty: '请输入 CIDR，例如 192.168.1.0/24',
      cidrInvalid: 'CIDR 格式无效，应为 IP/前缀长度，例如 192.168.1.0/24',
      cidrPrefixInvalid: '前缀长度必须在 0-32 之间',
      cidrPrefixInvalidV6: '前缀长度必须在 0-128 之间',
      ipInvalid: 'IP 地址无效',
      ipv6Invalid: 'IPv6 地址无效',
      vlsmIpv6: 'VLSM 拆分仅支持 IPv4',
      vlsmEmpty: '请至少输入一个有效的主机数量',
      vlsmOverflow: '子网分配超出父网范围，请减少主机数量或子网数',
      vlsmHostOverflow: '主机数量超出父网可用范围'
    }
  }

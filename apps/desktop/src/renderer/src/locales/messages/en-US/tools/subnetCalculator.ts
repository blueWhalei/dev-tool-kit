export default {
    title: 'Subnet Calculator',
    description: 'Compute IPv4/IPv6 network from CIDR, with VLSM splitting',
    tabs: {
      single: 'CIDR calculator',
      vlsm: 'VLSM split'
    },
    labels: {
      version: 'Protocol',
      versionIpv4: 'IPv4',
      versionIpv6: 'IPv6',
      cidr: 'CIDR',
      network: 'Network address',
      broadcast: 'Broadcast address',
      subnetMask: 'Subnet mask',
      wildcardMask: 'Wildcard mask',
      firstHost: 'First address',
      lastHost: 'Last address',
      totalHosts: 'Total addresses',
      usableHosts: 'Usable addresses',
      vlsm: 'VLSM split',
      hostCounts: 'Hosts per subnet',
      vlsmResult: 'Split result'
    },
    placeholders: {
      cidr: 'e.g. 192.168.1.0/24 or 2001:db8::/32',
      hostCounts: 'Comma-separated, e.g. 50, 20, 10'
    },
    buttons: {
      calculate: 'Calculate',
      copyResult: 'Copy result',
      splitVlsm: 'Split'
    },
    messages: {
      copied: 'Result copied'
    },
    errors: {
      calculateFailed: 'Calculation failed',
      cidrEmpty: 'Enter CIDR, e.g. 192.168.1.0/24',
      cidrInvalid: 'Invalid CIDR format; use IP/prefix, e.g. 192.168.1.0/24',
      cidrPrefixInvalid: 'Prefix length must be between 0 and 32',
      cidrPrefixInvalidV6: 'Prefix length must be between 0 and 128',
      ipInvalid: 'Invalid IP address',
      ipv6Invalid: 'Invalid IPv6 address',
      vlsmIpv6: 'VLSM split supports IPv4 only',
      vlsmEmpty: 'Enter at least one valid host count',
      vlsmOverflow: 'Subnet allocation exceeds parent network',
      vlsmHostOverflow: 'Host count exceeds parent network capacity'
    }
  }

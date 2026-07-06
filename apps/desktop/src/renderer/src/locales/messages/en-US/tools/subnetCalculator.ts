export default {
    title: 'Subnet Calculator',
    description: 'Compute IPv4/IPv6 network and address range from CIDR',
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
      usableHosts: 'Usable addresses'
    },
    placeholders: {
      cidr: 'e.g. 192.168.1.0/24 or 2001:db8::/32'
    },
    buttons: {
      calculate: 'Calculate',
      copyResult: 'Copy result'
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
      ipv6Invalid: 'Invalid IPv6 address'
    }
  }

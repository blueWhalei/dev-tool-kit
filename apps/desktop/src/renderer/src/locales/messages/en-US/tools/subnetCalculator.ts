export default {
    title: 'Subnet Calculator',
    description: 'Compute network, broadcast, and host range from CIDR',
    labels: {
      cidr: 'CIDR',
      network: 'Network address',
      broadcast: 'Broadcast address',
      subnetMask: 'Subnet mask',
      wildcardMask: 'Wildcard mask',
      firstHost: 'First usable host',
      lastHost: 'Last usable host',
      totalHosts: 'Total addresses',
      usableHosts: 'Usable hosts'
    },
    placeholders: {
      cidr: 'e.g. 192.168.1.0/24'
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
      ipInvalid: 'Invalid IP address'
    }
  }

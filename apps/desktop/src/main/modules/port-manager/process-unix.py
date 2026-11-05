"""Inspect process instances and signal only the confirmed instance."""
import json
import os
import signal
import socket
import subprocess
import sys

if sys.platform == 'darwin':
    import ctypes
    import struct
    libproc = ctypes.CDLL('/usr/lib/libproc.dylib')


def inspect(pid):
    if sys.platform == 'linux':
        with open('/proc/%d/stat' % pid, 'rb') as stream:
            stat = stream.read()
        name, fields = stat.rsplit(b') ', 1)
        return fields.split()[19].decode(), os.fsdecode(name.split(b'(', 1)[1])
    # Darwin PROC_PIDUNIQIDENTIFIERINFO includes the process generation used by audit tokens.
    info = ctypes.create_string_buffer(56)
    if libproc.proc_pidinfo(pid, 17, 0, info, 56) != 56:
        raise ProcessLookupError()
    version = struct.unpack_from('=I', info.raw, 32)[0]
    name = ctypes.create_string_buffer(1024)
    libproc.proc_name(pid, name, len(name))
    return str(version), os.fsdecode(name.value)


def owns_listener(request):
    pid, port, address = request['pid'], request['port'], request['localAddress'].strip('[]')
    if sys.platform == 'darwin':
        # Let lsof filter by PID, TCP state and port. Its field output keeps process names out of addresses.
        output = subprocess.run(['/usr/sbin/lsof', '-nP', '-a', '-p', str(pid), '-iTCP:%d' % port,
                                 '-sTCP:LISTEN', '-Ftn'], capture_output=True, timeout=5)
        if output.returncode not in (0, 1) or output.stderr:
            raise RuntimeError('Incomplete listener scan')
        family = None
        for line in output.stdout.decode().splitlines():
            if line.startswith('t'):
                family = line[1:]
            if line.startswith('n'):
                host, _, service = line[1:].rpartition(':')
                if host == '*':
                    host = {'IPv4': '0.0.0.0', 'IPv6': '::'}.get(family, '*')
                if service == str(port) and host.strip('[]') == address:
                    return True
        return False

    links = set()
    for entry in os.scandir('/proc/%d/fd' % pid):
        try:
            links.add(os.readlink(entry.path))
        except FileNotFoundError:
            continue
    for table, family in [('tcp', socket.AF_INET), ('tcp6', socket.AF_INET6)]:
        try:
            stream = open('/proc/net/' + table, encoding='ascii')
        except FileNotFoundError:
            continue
        with stream:
            next(stream)
            for line in stream:
                fields = line.split()
                if fields[3] != '0A' or 'socket:[%s]' % fields[9] not in links:
                    continue
                raw_ip, raw_port = fields[1].split(':')
                if int(raw_port, 16) != port:
                    continue
                packed = b''.join(int(raw_ip[i:i+8], 16).to_bytes(4, sys.byteorder)
                                  for i in range(0, len(raw_ip), 8))
                host = socket.inet_ntop(family, packed)
                if host == address or (address == '*' and host in ('0.0.0.0', '::')):
                    return True
    return False


def terminate(request):
    pid = request['pid']
    if sys.platform == 'linux':
        fd = os.pidfd_open(pid)
        try:
            if inspect(pid)[0] != request['instanceId'] or not owns_listener(request):
                raise ProcessLookupError()
            signal.pidfd_send_signal(fd, signal.SIGTERM)
        finally:
            os.close(fd)
    else:
        if inspect(pid)[0] != request['instanceId'] or not owns_listener(request):
            raise ProcessLookupError()
        token = (ctypes.c_uint32 * 8)()
        token[5], token[7] = pid, int(request['instanceId'])
        error = libproc.proc_signal_with_audittoken(ctypes.byref(token), signal.SIGTERM)
        if error:
            raise OSError(error, os.strerror(error))


request = json.loads(os.environ['DEV_TOOLKIT_PROCESS_REQUEST'])
if request['action'] == 'inspect':
    if sys.platform == 'linux' and not (hasattr(os, 'pidfd_open') and hasattr(signal, 'pidfd_send_signal')):
        raise RuntimeError('pidfd support unavailable')
    if sys.platform == 'darwin' and not hasattr(libproc, 'proc_signal_with_audittoken'):
        raise RuntimeError('audit-token signalling unavailable')
    rows = []
    for pid in request['pids']:
        try:
            instance, name = inspect(pid)
            rows.append(dict(pid=pid, instanceId=instance, name=name))
        except (OSError, ValueError):
            continue
    print(json.dumps(rows))
else:
    try:
        terminate(request)
    except ProcessLookupError:
        sys.exit(3)
    except PermissionError:
        sys.exit(4)

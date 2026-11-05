$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$request = ConvertFrom-Json $env:DEV_TOOLKIT_PROCESS_REQUEST
if ($request.action -eq 'inspect') {
    $rows = foreach ($id in $request.pids) {
        $p = $null
        try {
            $p = [Diagnostics.Process]::GetProcessById($id)
            $null = $p.Handle
            @{ pid = $id; name = $p.ProcessName; instanceId = $p.StartTime.ToFileTimeUtc().ToString() }
        } catch {
            # Exited and inaccessible processes remain read-only.
        } finally {
            if ($p) { $p.Dispose() }
        }
    }
    ConvertTo-Json -Compress -InputObject @($rows | Where-Object { $_ })
    exit
}

$p = $null
try {
    $p = [Diagnostics.Process]::GetProcessById($request.pid)
    $null = $p.Handle
    if ($p.StartTime.ToFileTimeUtc().ToString() -ne $request.instanceId) { exit 3 }
    # Keep the process handle open while verifying the socket and terminating this instance.
    $rows = & "$env:SystemRoot\System32\netstat.exe" -ano
    if ($LASTEXITCODE -ne 0) { exit 5 }
    $endpoint = '{0}:{1}' -f $request.localAddress, $request.port
    $owns = foreach ($line in $rows) {
        $fields = $line.Trim() -split '\s+'
        if ($fields.Count -eq 5 -and $fields[0] -eq 'TCP' -and $fields[1] -eq $endpoint -and
            $fields[3] -eq 'LISTENING' -and $fields[4] -eq [string]$request.pid) { $true; break }
    }
    if (!$owns -or $p.HasExited) { exit 3 }
    $p.Kill()
} catch [ArgumentException] { exit 3 }
catch [ComponentModel.Win32Exception] {
    if ($_.Exception.NativeErrorCode -eq 5) { exit 4 }
    throw
} finally {
    if ($p) { $p.Dispose() }
}

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskPidFile = Join-Path $taskRoot 'data/servers.json'
if (-not (Test-Path -LiteralPath $taskPidFile)) {
    Write-Host 'No servers started by scripts/start.ps1 were recorded.'
    exit
}
$taskServers = Get-Content -LiteralPath $taskPidFile -Raw | ConvertFrom-Json
$taskProcesses = @(Get-CimInstance Win32_Process)
foreach ($taskProcessId in @($taskServers.backend, $taskServers.frontend)) {
    $taskProcess = $taskProcesses | Where-Object { $_.ProcessId -eq $taskProcessId } | Select-Object -First 1
    if ($taskProcess -and $taskProcess.CommandLine -and $taskProcess.CommandLine.Contains($taskRoot)) {
        $taskDescendants = [System.Collections.Generic.List[int]]::new()
        $taskDescendants.Add([int]$taskProcessId)
        for ($taskIndex = 0; $taskIndex -lt $taskDescendants.Count; $taskIndex++) {
            foreach ($taskChild in $taskProcesses | Where-Object { $_.ParentProcessId -eq $taskDescendants[$taskIndex] }) {
                $taskDescendants.Add([int]$taskChild.ProcessId)
            }
        }
        for ($taskIndex = $taskDescendants.Count - 1; $taskIndex -ge 0; $taskIndex--) {
            Stop-Process -Id $taskDescendants[$taskIndex] -ErrorAction SilentlyContinue
        }
    }
}
Remove-Item -LiteralPath $taskPidFile
Write-Host 'Recorded Meridian servers stopped.'

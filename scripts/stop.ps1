$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskPidFile = Join-Path $taskRoot 'data/servers.json'
if (-not (Test-Path -LiteralPath $taskPidFile)) {
    Write-Host 'No servers started by scripts/start.ps1 were recorded.'
    exit
}
$taskServers = Get-Content -LiteralPath $taskPidFile -Raw | ConvertFrom-Json
foreach ($taskProcessId in @($taskServers.backend, $taskServers.frontend)) {
    $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $taskProcessId" -ErrorAction SilentlyContinue
    if ($taskProcess -and $taskProcess.CommandLine -and $taskProcess.CommandLine.Contains($taskRoot)) {
        Stop-Process -Id $taskProcessId
    }
}
Remove-Item -LiteralPath $taskPidFile
Write-Host 'Recorded Meridian servers stopped.'

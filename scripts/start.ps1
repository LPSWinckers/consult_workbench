$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskData = Join-Path $taskRoot 'data'
$taskPython = Join-Path $taskRoot '.venv/Scripts/python.exe'
$taskNext = Join-Path $taskRoot 'frontend/node_modules/next/dist/bin/next'
if (-not (Test-Path -LiteralPath $taskPython) -or -not (Test-Path -LiteralPath $taskNext)) {
    throw 'Run ./scripts/setup.ps1 first.'
}
foreach ($taskPort in @(3000, 8000)) {
    if (Get-NetTCPConnection -LocalPort $taskPort -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $taskPort is already in use. Close its server or use the existing application."
    }
}
New-Item -ItemType Directory -Force -Path $taskData | Out-Null
$taskBackend = Start-Process -FilePath $taskPython -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000') -WorkingDirectory "$taskRoot/backend" -WindowStyle Hidden -RedirectStandardOutput "$taskData/backend.log" -RedirectStandardError "$taskData/backend-error.log" -PassThru
try {
    $taskFrontend = Start-Process -FilePath (Get-Command node).Source -ArgumentList @("`"$taskNext`"", 'dev', '--hostname', '127.0.0.1') -WorkingDirectory "$taskRoot/frontend" -WindowStyle Hidden -RedirectStandardOutput "$taskData/frontend.log" -RedirectStandardError "$taskData/frontend-error.log" -PassThru
} catch {
    Stop-Process -Id $taskBackend.Id -ErrorAction SilentlyContinue
    throw
}
@{ backend = $taskBackend.Id; frontend = $taskFrontend.Id } | ConvertTo-Json | Set-Content -LiteralPath "$taskData/servers.json"
Write-Host 'Meridian is starting at http://localhost:3000'
Write-Host 'Logs are in data/. Stop these servers with ./scripts/stop.ps1.'

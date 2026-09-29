$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Push-Location $taskRoot
try {
    if (-not (Test-Path -LiteralPath "$taskRoot/.venv/Scripts/python.exe")) {
        python -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw 'Creating the Python environment failed.' }
    }
    & "$taskRoot/.venv/Scripts/python.exe" -m pip install -r backend/requirements.lock.txt
    if ($LASTEXITCODE -ne 0) { throw 'Installing backend dependencies failed.' }
    Push-Location "$taskRoot/frontend"
    try {
        npm ci
        if ($LASTEXITCODE -ne 0) { throw 'Installing frontend dependencies failed.' }
    } finally { Pop-Location }
    Write-Host 'Setup complete. Run ./scripts/start.ps1 to open the local PoC.'
} finally { Pop-Location }

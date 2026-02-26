param(
    [string]$ProjectRoot = ''
)

$ErrorActionPreference = 'Stop'

function Resolve-ProjectRoot {
    param([string]$ProvidedRoot)

    if (-not [string]::IsNullOrWhiteSpace($ProvidedRoot)) {
        return (Resolve-Path -LiteralPath $ProvidedRoot).Path
    }

    $scriptsRoot = Split-Path -Path $PSScriptRoot -Parent
    return (Split-Path -Path $scriptsRoot -Parent)
}

$rootPath = Resolve-ProjectRoot -ProvidedRoot $ProjectRoot
$pidsFile = Join-Path $rootPath '.runtime\dev-hidden-pids.json'

if (-not (Test-Path -LiteralPath $pidsFile)) {
    Write-Host 'No hay procesos registrados para detener.'
    exit 0
}

$raw = Get-Content -LiteralPath $pidsFile -Raw
$pids = $raw | ConvertFrom-Json

$ids = @()
if ($null -ne $pids.backendPid) {
    $ids += [int]$pids.backendPid
}
if ($null -ne $pids.frontendPid) {
    $ids += [int]$pids.frontendPid
}

foreach ($id in $ids) {
    try {
        Stop-Process -Id $id -Force -ErrorAction Stop
    } catch {
        Write-Host "No se pudo detener PID ${id}: $($_.Exception.Message)"
    }
}

Remove-Item -LiteralPath $pidsFile -Force -ErrorAction SilentlyContinue
Write-Host 'Procesos detenidos.'

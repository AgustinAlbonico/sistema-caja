param(
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio',
    [switch]$InstallServices,
    [string]$NssmPath = ''
)

$ErrorActionPreference = 'Stop'

$scriptsRoot = Split-Path -Path $PSScriptRoot -Parent
$repoRoot = Split-Path -Path $scriptsRoot -Parent

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'bootstrap-runtime.ps1') -RuntimeRoot $RuntimeRoot

$currentPath = Join-Path $RuntimeRoot 'current'
$itemsToCopy = @('backend', 'frontend')

foreach ($item in $itemsToCopy) {
    $source = Join-Path $repoRoot $item
    $target = Join-Path $currentPath $item

    if (-not (Test-Path -LiteralPath $source)) {
        throw "No existe $source"
    }

    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }

    Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'sync-runtime-scripts.ps1') -RuntimeRoot $RuntimeRoot
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'sync-config-from-env.ps1') -RuntimeRoot $RuntimeRoot -AllowIncomplete
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'create-shortcuts.ps1') -RuntimeRoot $RuntimeRoot

if ($InstallServices) {
    $installServicesScript = Join-Path $PSScriptRoot 'install-nssm-services.ps1'
    $servicesArgs = @(
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        $installServicesScript,
        '-RuntimeRoot',
        $RuntimeRoot
    )

    if (-not [string]::IsNullOrWhiteSpace($NssmPath)) {
        $servicesArgs += @('-NssmPath', $NssmPath)
    }

    & powershell.exe @servicesArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Fallo la instalacion de servicios NSSM (exit code: $LASTEXITCODE)"
    }
}

Write-Host "Instalacion lista en $RuntimeRoot"
Write-Host "Configura variables en $RuntimeRoot\config\.env y luego inicia el sistema"

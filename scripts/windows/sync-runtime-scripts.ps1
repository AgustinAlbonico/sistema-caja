param(
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio',
    [string]$SourceScriptsDir = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'

$targetScriptsDir = Join-Path $RuntimeRoot 'scripts'

if (-not (Test-Path -LiteralPath $targetScriptsDir)) {
    New-Item -ItemType Directory -Path $targetScriptsDir -Force | Out-Null
}

$filesToCopy = @(
    'bootstrap-runtime.ps1',
    'runtime-env.ps1',
    'sync-config-from-env.ps1',
    'services-common.ps1',
    'install-nssm-services.ps1',
    'uninstall-nssm-services.ps1',
    'start-system.ps1',
    'stop-system.ps1',
    'get-services-status.ps1',
    'set-db-config.ps1',
    'test-db-connection.ps1',
    'test-db-popup.ps1',
    'open-db-config.ps1',
    'check-update.ps1',
    'apply-update.ps1',
    'run-update.ps1',
    'create-shortcuts.ps1'
)

foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $SourceScriptsDir $file
    if (-not (Test-Path -LiteralPath $sourcePath)) {
        continue
    }

    $targetPath = Join-Path $targetScriptsDir $file
    Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
}

Write-Host "Scripts sincronizados en $targetScriptsDir"

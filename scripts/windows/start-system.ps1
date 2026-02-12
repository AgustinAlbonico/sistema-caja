param(
    [string]$BackendServiceName = 'SistemaCajaBackend',
    [string]$FrontendServiceName = 'SistemaCajaFrontend',
    [string]$FrontendUrl = '',
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio'
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\runtime-env.ps1"

& (Join-Path $PSScriptRoot 'sync-config-from-env.ps1') -RuntimeRoot $RuntimeRoot

$envMap = Import-RuntimeEnv -RuntimeRoot $RuntimeRoot

$frontendPort = Get-RuntimeEnvValue -EnvMap $envMap -Key 'FRONTEND_PORT' -DefaultValue '5173'
if (-not $FrontendUrl) {
    $FrontendUrl = Get-RuntimeEnvValue -EnvMap $envMap -Key 'FRONTEND_URL' -DefaultValue "http://127.0.0.1:$frontendPort"
}

$updateOwner = Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_OWNER' -DefaultValue ''
$updateRepo = Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_REPO' -DefaultValue ''

if ($updateOwner -and $updateRepo) {
    $applyScript = Join-Path $PSScriptRoot 'apply-update.ps1'
    try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $applyScript -RuntimeRoot $RuntimeRoot | Out-Null
    } catch {
    }
}

Start-Service -Name $BackendServiceName
Start-Service -Name $FrontendServiceName

Start-Sleep -Seconds 2

Start-Process $FrontendUrl | Out-Null
Write-Host 'Sistema iniciado'

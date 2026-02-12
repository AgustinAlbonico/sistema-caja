param(
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio',
    [string]$Host,
    [int]$Port = 0,
    [string]$Username,
    [string]$Password,
    [string]$Database,
    [switch]$RestartBackend,
    [string]$BackendServiceName = 'SistemaCajaBackend'
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\runtime-env.ps1"

$envPath = Ensure-RuntimeEnvTemplate -RuntimeRoot $RuntimeRoot
$envMap = Import-RuntimeEnv -RuntimeRoot $RuntimeRoot

if ($Host) { $envMap['DB_HOST'] = $Host }
if ($Port -gt 0) { $envMap['DB_PORT'] = [string]$Port }
if ($Username) { $envMap['DB_USER'] = $Username }
if ($PSBoundParameters.ContainsKey('Password')) { $envMap['DB_PASSWORD'] = $Password }
if ($Database) { $envMap['DB_NAME'] = $Database }

$lines = @(
    '# Configuracion principal del runtime',
    "APP_HOST=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'APP_HOST' -DefaultValue '127.0.0.1')",
    "APP_PORT=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'APP_PORT' -DefaultValue '47832')",
    "FRONTEND_PORT=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'FRONTEND_PORT' -DefaultValue '5173')",
    "FRONTEND_URL=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'FRONTEND_URL' -DefaultValue 'http://127.0.0.1:5173')",
    '',
    '# Base de datos (completar manualmente)',
    "DB_HOST=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_HOST' -DefaultValue '')",
    "DB_PORT=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_PORT' -DefaultValue '5432')",
    "DB_USER=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_USER' -DefaultValue '')",
    "DB_PASSWORD=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_PASSWORD' -DefaultValue '')",
    "DB_NAME=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_NAME' -DefaultValue '')",
    '',
    '# JWT (completar manualmente)',
    "JWT_SECRET=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'JWT_SECRET' -DefaultValue '')",
    "JWT_EXPIRATION=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'JWT_EXPIRATION' -DefaultValue '24h')",
    '',
    '# Updater GitHub Releases',
    "UPDATE_OWNER=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_OWNER' -DefaultValue '')",
    "UPDATE_REPO=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_REPO' -DefaultValue '')",
    "UPDATE_ASSET_NAME=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_ASSET_NAME' -DefaultValue '')",
    "UPDATE_CHANNEL=$(Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_CHANNEL' -DefaultValue 'stable')"
)

Set-Content -LiteralPath $envPath -Encoding UTF8 -Value $lines

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'sync-config-from-env.ps1') -RuntimeRoot $RuntimeRoot

Write-Host "Variables DB actualizadas en $envPath"
Write-Host "Host: $(Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_HOST' -DefaultValue '')"
Write-Host "Puerto: $(Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_PORT' -DefaultValue '5432')"
Write-Host "Usuario: $(Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_USER' -DefaultValue '')"
Write-Host "Base: $(Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_NAME' -DefaultValue '')"

if ($RestartBackend) {
    Restart-Service -Name $BackendServiceName -Force
    Write-Host "Servicio reiniciado: $BackendServiceName"
}

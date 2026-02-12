param(
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio',
    [switch]$AllowIncomplete
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\runtime-env.ps1"

$envMap = Import-RuntimeEnv -RuntimeRoot $RuntimeRoot
$configPath = Join-Path $RuntimeRoot 'config\config.json'
$updateConfigPath = Join-Path $RuntimeRoot 'config\update-config.json'

$requiredKeys = @('DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET')
$missing = @()

foreach ($requiredKey in $requiredKeys) {
    $value = Get-RuntimeEnvValue -EnvMap $envMap -Key $requiredKey -DefaultValue ''
    if ([string]::IsNullOrWhiteSpace($value)) {
        $missing += $requiredKey
    }
}

if ($missing.Count -gt 0 -and -not $AllowIncomplete) {
    $joined = $missing -join ', '
    throw "Faltan variables en .env: $joined"
}

if ($missing.Count -eq 0) {
    $appHost = Get-RuntimeEnvValue -EnvMap $envMap -Key 'APP_HOST' -DefaultValue '127.0.0.1'
    $appPort = [int](Get-RuntimeEnvValue -EnvMap $envMap -Key 'APP_PORT' -DefaultValue '47832')
    $frontendPort = [int](Get-RuntimeEnvValue -EnvMap $envMap -Key 'FRONTEND_PORT' -DefaultValue '5173')
    $frontendUrl = Get-RuntimeEnvValue -EnvMap $envMap -Key 'FRONTEND_URL' -DefaultValue "http://127.0.0.1:$frontendPort"

    $dbPort = [int](Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_PORT' -DefaultValue '5432')
    $jwtExpiration = Get-RuntimeEnvValue -EnvMap $envMap -Key 'JWT_EXPIRATION' -DefaultValue '24h'

    $config = [ordered]@{
        port = $appPort
        host = $appHost
        database = [ordered]@{
            host = (Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_HOST' -DefaultValue '')
            port = $dbPort
            username = (Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_USER' -DefaultValue '')
            password = (Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_PASSWORD' -DefaultValue '')
            database = (Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_NAME' -DefaultValue '')
        }
        jwt = [ordered]@{
            secret = (Get-RuntimeEnvValue -EnvMap $envMap -Key 'JWT_SECRET' -DefaultValue '')
            expiration = $jwtExpiration
        }
        schemaVersion = '1.0.0'
        frontendUrl = $frontendUrl
    }

    $configJson = $config | ConvertTo-Json -Depth 10
    Set-Content -LiteralPath $configPath -Encoding UTF8 -Value $configJson
    Write-Host "config.json actualizado desde .env: $configPath"
} else {
    Write-Host "Variables incompletas en .env. No se regenero config.json. Faltan: $($missing -join ', ')"
}

$updateConfig = [ordered]@{
    owner = (Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_OWNER' -DefaultValue '')
    repo = (Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_REPO' -DefaultValue '')
    assetName = (Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_ASSET_NAME' -DefaultValue '')
    channel = (Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_CHANNEL' -DefaultValue 'stable')
    checkOnStart = $true
}

$updateJson = $updateConfig | ConvertTo-Json -Depth 6
Set-Content -LiteralPath $updateConfigPath -Encoding UTF8 -Value $updateJson
Write-Host "update-config.json sincronizado desde .env: $updateConfigPath"

param(
    [string]$ProjectRoot = '',
    [switch]$InstallDeps,
    [int]$BackendPort = 47832,
    [int]$FrontendPort = 5173,
    [int]$TimeoutSeconds = 90
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

function Test-PortListening {
    param([int]$Port)

    return [bool](Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet)
}

function Wait-Port {
    param(
        [int]$Port,
        [string]$Name,
        [int]$Timeout
    )

    $deadline = (Get-Date).AddSeconds($Timeout)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortListening -Port $Port) {
            Write-Host "$Name activo en 127.0.0.1:$Port"
            return
        }

        Start-Sleep -Seconds 1
    }

    throw "Timeout esperando $Name en puerto $Port"
}

function Ensure-Npm {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($null -eq $npm) {
        throw 'No se encontro npm en PATH. Instala Node.js primero.'
    }
}

function Ensure-Dependencies {
    param([string]$TargetPath)

    if ($InstallDeps -or -not (Test-Path -LiteralPath (Join-Path $TargetPath 'node_modules'))) {
        Write-Host "Instalando dependencias en $TargetPath"
        npm install --prefix "$TargetPath"
    }
}

function Import-EnvFile {
    param([string]$EnvPath)

    $values = @{}
    if (-not (Test-Path -LiteralPath $EnvPath)) {
        return $values
    }

    $content = Get-Content -LiteralPath $EnvPath
    foreach ($line in $content) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) {
            continue
        }

        $idx = $trimmed.IndexOf('=')
        if ($idx -lt 1) {
            continue
        }

        $key = $trimmed.Substring(0, $idx).Trim()
        $value = $trimmed.Substring($idx + 1).Trim()
        $values[$key] = $value
    }

    return $values
}

function Get-EnvValue {
    param(
        [hashtable]$EnvMap,
        [string]$Key,
        [string]$DefaultValue
    )

    if ($EnvMap.ContainsKey($Key) -and -not [string]::IsNullOrWhiteSpace($EnvMap[$Key])) {
        return [string]$EnvMap[$Key]
    }

    return $DefaultValue
}

function Ensure-BackendConfig {
    param(
        [string]$BackendPath,
        [string]$RuntimeRoot,
        [int]$ApiPort,
        [int]$WebPort
    )

    if (-not (Test-Path -LiteralPath $RuntimeRoot)) {
        New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
    }

    $logsPath = Join-Path $RuntimeRoot 'logs'
    if (-not (Test-Path -LiteralPath $logsPath)) {
        New-Item -ItemType Directory -Path $logsPath -Force | Out-Null
    }

    $envPath = Join-Path $BackendPath '.env'
    $envMap = Import-EnvFile -EnvPath $envPath

    $dbPortRaw = Get-EnvValue -EnvMap $envMap -Key 'DB_PORT' -DefaultValue '5432'
    $dbPort = 5432
    [void][int]::TryParse($dbPortRaw, [ref]$dbPort)

    $config = [ordered]@{
        port = $ApiPort
        host = '127.0.0.1'
        database = [ordered]@{
            host = (Get-EnvValue -EnvMap $envMap -Key 'DB_HOST' -DefaultValue '127.0.0.1')
            port = $dbPort
            username = (Get-EnvValue -EnvMap $envMap -Key 'DB_USER' -DefaultValue 'postgres')
            password = (Get-EnvValue -EnvMap $envMap -Key 'DB_PASSWORD' -DefaultValue '')
            database = (Get-EnvValue -EnvMap $envMap -Key 'DB_NAME' -DefaultValue 'db_sistema_recibos')
        }
        jwt = [ordered]@{
            secret = (Get-EnvValue -EnvMap $envMap -Key 'JWT_SECRET' -DefaultValue 'dev-secret-change-me')
            expiration = (Get-EnvValue -EnvMap $envMap -Key 'JWT_EXPIRATION' -DefaultValue '24h')
        }
        schemaVersion = '1.0.0'
        frontendUrl = (Get-EnvValue -EnvMap $envMap -Key 'FRONTEND_URL' -DefaultValue "http://127.0.0.1:$WebPort")
    }

    $configPath = Join-Path $BackendPath 'config.dev.json'
    $config | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $configPath -Encoding UTF8

    return [ordered]@{
        ConfigPath = $configPath
        RuntimeRoot = $RuntimeRoot
        LogsPath = $logsPath
    }
}

function Start-DevProcess {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$ScriptName,
        [string]$PreCommand = ''
    )

    $command = "Set-Location -LiteralPath '$WorkingDirectory'; npm run $ScriptName"
    if (-not [string]::IsNullOrWhiteSpace($PreCommand)) {
        $command = "$PreCommand; $command"
    }

    Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-NoExit', '-Command', $command) | Out-Null
    Write-Host "$Name iniciado en nueva ventana"
}

$rootPath = Resolve-ProjectRoot -ProvidedRoot $ProjectRoot
$backendPath = Join-Path $rootPath 'backend'
$frontendPath = Join-Path $rootPath 'frontend'

if (-not (Test-Path -LiteralPath $backendPath)) {
    throw "No existe backend en $backendPath"
}

if (-not (Test-Path -LiteralPath $frontendPath)) {
    throw "No existe frontend en $frontendPath"
}

Ensure-Npm
Ensure-Dependencies -TargetPath $backendPath
Ensure-Dependencies -TargetPath $frontendPath

$runtimeRoot = Join-Path $rootPath '.runtime'
$backendRuntime = Ensure-BackendConfig -BackendPath $backendPath -RuntimeRoot $runtimeRoot -ApiPort $BackendPort -WebPort $FrontendPort

Write-Host "Config backend generada: $($backendRuntime.ConfigPath)"

if (Test-PortListening -Port $BackendPort) {
    Write-Host "Aviso: el puerto $BackendPort ya esta en uso"
}

if (Test-PortListening -Port $FrontendPort) {
    Write-Host "Aviso: el puerto $FrontendPort ya esta en uso"
}

Start-DevProcess -Name 'Backend' -WorkingDirectory $backendPath -ScriptName 'start:dev' -PreCommand "`$env:APP_CONFIG_PATH='$($backendRuntime.ConfigPath)'; `$env:SISTEMA_CAJA_RUNTIME_ROOT='$($backendRuntime.RuntimeRoot)'; `$env:APP_LOGS_PATH='$($backendRuntime.LogsPath)'"
Start-DevProcess -Name 'Frontend' -WorkingDirectory $frontendPath -ScriptName 'dev'

Wait-Port -Port $BackendPort -Name 'Backend' -Timeout $TimeoutSeconds
Wait-Port -Port $FrontendPort -Name 'Frontend' -Timeout $TimeoutSeconds

$frontendUrl = "http://127.0.0.1:$FrontendPort"
Start-Process $frontendUrl | Out-Null
Write-Host "Sistema listo en $frontendUrl"

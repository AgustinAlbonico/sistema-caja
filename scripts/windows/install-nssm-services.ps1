param(
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio',
    [string]$NssmPath = '',
    [string]$BackendServiceName = 'SistemaCajaBackend',
    [string]$FrontendServiceName = 'SistemaCajaFrontend',
    [int]$BackendPort = 47832,
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = 'Stop'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Ejecuta install-nssm-services.ps1 en PowerShell como Administrador.'
}

. "$PSScriptRoot\services-common.ps1"
. "$PSScriptRoot\runtime-env.ps1"

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'sync-config-from-env.ps1') -RuntimeRoot $RuntimeRoot -AllowIncomplete

$envMap = Import-RuntimeEnv -RuntimeRoot $RuntimeRoot

$envBackendPort = Get-RuntimeEnvValue -EnvMap $envMap -Key 'APP_PORT' -DefaultValue ''
if ($envBackendPort) {
    $BackendPort = [int]$envBackendPort
}

$envFrontendPort = Get-RuntimeEnvValue -EnvMap $envMap -Key 'FRONTEND_PORT' -DefaultValue ''
if ($envFrontendPort) {
    $FrontendPort = [int]$envFrontendPort
}

$nssmExe = Resolve-NssmExecutable -RuntimeRoot $RuntimeRoot -NssmPath $NssmPath
$nssmExe = Resolve-NssmServiceBinaryPath -RuntimeRoot $RuntimeRoot -NssmExe $nssmExe
$nodeExe = Resolve-NodeExecutable -RuntimeRoot $RuntimeRoot

$backendDir = Join-Path $RuntimeRoot 'current\backend'
$frontendDir = Join-Path $RuntimeRoot 'current\frontend'
$logsDir = Join-Path $RuntimeRoot 'logs'

if (-not (Test-Path -LiteralPath $backendDir)) {
    throw "No existe $backendDir"
}

if (-not (Test-Path -LiteralPath $frontendDir)) {
    throw "No existe $frontendDir"
}

if (-not (Test-Path -LiteralPath $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Dar permisos de escritura al usuario del servicio (LocalService)
& icacls "$logsDir" /grant "NT AUTHORITY\LocalService:(OI)(CI)F" /T
& icacls "$RuntimeRoot" /grant "NT AUTHORITY\LocalService:(OI)(CI)RX"

$backendScript = Join-Path $backendDir 'dist\main.js'
$frontendScript = Join-Path $frontendDir 'node_modules\vite\bin\vite.js'

if (-not (Test-Path -LiteralPath $backendScript)) {
    throw "No existe backend compilado en $backendScript. Ejecuta bun run build en backend."
}

if (-not (Test-Path -LiteralPath $frontendScript)) {
    throw "No existe vite.js en $frontendScript. Verifica node_modules de frontend."
}

$backendArgs = "`"$backendScript`""
$frontendArgs = "`"$frontendScript`" preview --host 127.0.0.1 --port $FrontendPort --strictPort"

function Ensure-ServiceAbsent {
    param(
        [Parameter(Mandatory = $true)][string]$ServiceName,
        [Parameter(Mandatory = $true)][string]$NssmExePath
    )

    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($null -eq $service) {
        return
    }

    if ($service.Status -ne 'Stopped') {
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }

    Invoke-Nssm -NssmExe $NssmExePath -Arguments @('remove', $ServiceName, 'confirm')
}

Ensure-ServiceAbsent -ServiceName $BackendServiceName -NssmExePath $nssmExe
Ensure-ServiceAbsent -ServiceName $FrontendServiceName -NssmExePath $nssmExe

Invoke-Nssm -NssmExe $nssmExe -Arguments @('install', $BackendServiceName, $nodeExe, $backendArgs)
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $BackendServiceName, 'AppDirectory', $backendDir)
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $BackendServiceName, 'AppEnvironmentExtra', "NODE_ENV=production`nPORT=$BackendPort`nAPP_CONFIG_PATH=$RuntimeRoot\config\config.json`nAPP_LOGS_PATH=$RuntimeRoot\logs")
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $BackendServiceName, 'AppStdout', "$logsDir\backend-service.log")
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $BackendServiceName, 'AppStderr', "$logsDir\backend-service-error.log")
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $BackendServiceName, 'Start', 'SERVICE_DEMAND_START')
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $BackendServiceName, 'ObjectName', 'NT AUTHORITY\LocalService')
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $BackendServiceName, 'AppExit', 'Default', 'Restart')

Invoke-Nssm -NssmExe $nssmExe -Arguments @('install', $FrontendServiceName, $nodeExe, $frontendArgs)
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $FrontendServiceName, 'AppDirectory', $frontendDir)
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $FrontendServiceName, 'AppEnvironmentExtra', 'NODE_ENV=production')
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $FrontendServiceName, 'AppStdout', "$logsDir\frontend-service.log")
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $FrontendServiceName, 'AppStderr', "$logsDir\frontend-service-error.log")
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $FrontendServiceName, 'Start', 'SERVICE_DEMAND_START')
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $FrontendServiceName, 'ObjectName', 'NT AUTHORITY\LocalService')
Invoke-Nssm -NssmExe $nssmExe -Arguments @('set', $FrontendServiceName, 'AppExit', 'Default', 'Restart')

Write-Host "Servicios instalados: $BackendServiceName, $FrontendServiceName"
Write-Host "NSSM: $nssmExe"

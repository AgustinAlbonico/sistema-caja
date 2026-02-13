param(
    [string]$FrontendUrl = '',
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio'
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\runtime-env.ps1"

# Sincronizar configuracion
& (Join-Path $PSScriptRoot 'sync-config-from-env.ps1') -RuntimeRoot $RuntimeRoot

$envMap = Import-RuntimeEnv -RuntimeRoot $RuntimeRoot

$frontendPort = Get-RuntimeEnvValue -EnvMap $envMap -Key 'FRONTEND_PORT' -DefaultValue '5173'
$backendPort  = Get-RuntimeEnvValue -EnvMap $envMap -Key 'APP_PORT' -DefaultValue '47832'

if (-not $FrontendUrl) {
    $FrontendUrl = Get-RuntimeEnvValue -EnvMap $envMap -Key 'FRONTEND_URL' -DefaultValue "http://127.0.0.1:$frontendPort"
}

# Intentar actualizar si esta configurado
$updateOwner = Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_OWNER' -DefaultValue ''
$updateRepo = Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_REPO' -DefaultValue ''

if ($updateOwner -and $updateRepo) {
    $applyScript = Join-Path $PSScriptRoot 'apply-update.ps1'
    try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $applyScript -RuntimeRoot $RuntimeRoot | Out-Null
    } catch {
    }
}

# Rutas
$backendDir    = Join-Path $RuntimeRoot 'current\backend'
$frontendDir   = Join-Path $RuntimeRoot 'current\frontend'
$logsDir       = Join-Path $RuntimeRoot 'logs'
$configPath    = Join-Path $RuntimeRoot 'config\config.json'
$backendScript = Join-Path $backendDir 'dist\main.js'
$frontendScript = Join-Path $frontendDir 'node_modules\vite\bin\vite.js'

if (-not (Test-Path -LiteralPath $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Buscar node.exe
. "$PSScriptRoot\services-common.ps1"
$nodeExe = Resolve-NodeExecutable -RuntimeRoot $RuntimeRoot

# Matar procesos previos en esos puertos (si existen)
$portsToFree = @($backendPort, $frontendPort)
foreach ($p in $portsToFree) {
    $connections = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Milliseconds 500
    }
}

# Iniciar backend como proceso en background
$backendLogOut = Join-Path $logsDir 'backend-service.log'
$backendLogErr = Join-Path $logsDir 'backend-service-error.log'

$backendProcess = Start-Process -FilePath $nodeExe `
    -ArgumentList "`"$backendScript`"" `
    -WorkingDirectory $backendDir `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput $backendLogOut `
    -RedirectStandardError $backendLogErr

$env:NODE_ENV = 'production'
$env:PORT = $backendPort
$env:APP_CONFIG_PATH = $configPath
$env:APP_LOGS_PATH = $logsDir

# Necesitamos setear las variables de entorno ANTES de iniciar el proceso
# Start-Process no hereda $env, usamos cmd /c set para inyectarlas
Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

# Iniciar backend con variables de entorno correctas via cmd
$backendCmd = "set NODE_ENV=production&& set PORT=$backendPort&& set APP_CONFIG_PATH=$configPath&& set APP_LOGS_PATH=$logsDir&& `"$nodeExe`" `"$backendScript`""
$backendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", $backendCmd `
    -WorkingDirectory $backendDir `
    -WindowStyle Hidden `
    -PassThru

Write-Host "Backend iniciado (PID: $($backendProcess.Id)) en puerto $backendPort"

# Iniciar frontend como proceso en background
$frontendCmd = "set NODE_ENV=production&& `"$nodeExe`" `"$frontendScript`" preview --host 127.0.0.1 --port $frontendPort --strictPort"
$frontendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", $frontendCmd `
    -WorkingDirectory $frontendDir `
    -WindowStyle Hidden `
    -PassThru

Write-Host "Frontend iniciado (PID: $($frontendProcess.Id)) en puerto $frontendPort"

# Guardar PIDs para poder detenerlos despues
$pidFile = Join-Path $RuntimeRoot 'config\pids.json'
$pids = @{
    backend  = $backendProcess.Id
    frontend = $frontendProcess.Id
} | ConvertTo-Json
Set-Content -LiteralPath $pidFile -Value $pids -Encoding UTF8

# Esperar a que el backend este listo
Write-Host "Esperando a que el backend este listo..."
$maxWait = 15
$ready = $false
for ($i = 0; $i -lt $maxWait; $i++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$backendPort/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
    }
}

if ($ready) {
    Write-Host "Sistema listo! Abriendo navegador..."
} else {
    Write-Host "Backend no respondio al health check, abriendo navegador de todas formas..."
}

Start-Process $FrontendUrl | Out-Null
Write-Host "Sistema iniciado"

param(
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio'
)

$ErrorActionPreference = 'SilentlyContinue'

$pidFile = Join-Path $RuntimeRoot 'config\pids.json'

if (Test-Path -LiteralPath $pidFile) {
    $pids = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json

    if ($pids.backend) {
        Stop-Process -Id $pids.backend -Force -ErrorAction SilentlyContinue
        Write-Host "Backend detenido (PID: $($pids.backend))"
    }

    if ($pids.frontend) {
        Stop-Process -Id $pids.frontend -Force -ErrorAction SilentlyContinue
        Write-Host "Frontend detenido (PID: $($pids.frontend))"
    }

    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "No se encontro archivo de PIDs. Intentando detener por puerto..."

    . "$PSScriptRoot\runtime-env.ps1"
    $envMap = Import-RuntimeEnv -RuntimeRoot $RuntimeRoot

    $backendPort  = Get-RuntimeEnvValue -EnvMap $envMap -Key 'APP_PORT' -DefaultValue '47832'
    $frontendPort = Get-RuntimeEnvValue -EnvMap $envMap -Key 'FRONTEND_PORT' -DefaultValue '5173'

    foreach ($p in @($backendPort, $frontendPort)) {
        $connections = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "Proceso en puerto $p detenido (PID: $($conn.OwningProcess))"
            }
        }
    }
}

Write-Host "Sistema detenido"

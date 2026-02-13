param(
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio'
)

$ErrorActionPreference = 'SilentlyContinue'

$pidFile = Join-Path $RuntimeRoot 'config\pids.json'
$running = $false

if (Test-Path -LiteralPath $pidFile) {
    $pids = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
    
    foreach ($key in $pids.PSObject.Properties.Name) {
        $id = $pids.$key
        $process = Get-Process -Id $id -ErrorAction SilentlyContinue
        
        if ($process) {
            Write-Host "$key (PID: $id) => ✅ CORRIENDO" -ForegroundColor Green
            $running = $true
        } else {
            Write-Host "$key (PID: $id) => ❌ DETENIDO" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No se encontró archivo de PIDs ($pidFile)."
    Write-Host "El sistema podría no estar corriendo o haber sido cerrado bruscamente."
}

if (-not $running) {
    Write-Host "`nBusqueda manual de puertos:"
    
    $backendPort = 47832
    $frontendPort = 5173
    
    $conns = Get-NetTCPConnection -LocalPort $backendPort -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        Write-Host "Puerto $backendPort (Backend) => Ocupado por PID $($conns.OwningProcess)" -ForegroundColor Yellow
    } else {
        Write-Host "Puerto $backendPort (Backend) => LIBRE" -ForegroundColor Gray
    }
    
    $conns = Get-NetTCPConnection -LocalPort $frontendPort -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        Write-Host "Puerto $frontendPort (Frontend) => Ocupado por PID $($conns.OwningProcess)" -ForegroundColor Yellow
    } else {
        Write-Host "Puerto $frontendPort (Frontend) => LIBRE" -ForegroundColor Gray
    }
}

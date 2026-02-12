# ============================================
# SCRIPT: Levantar Sistema de Caja (web)
# ============================================

param(
    [string]$ProjectPath = $PSScriptRoot
)

$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"

function Write-Status {
    param(
        [string]$Message,
        [string]$Color = $Green
    )
    Write-Host "[$((Get-Date -Format 'HH:mm:ss'))] $Message" -ForegroundColor $Color
}

$BackendPath = Join-Path $ProjectPath "backend"
$FrontendPath = Join-Path $ProjectPath "frontend"
$BackendPort = 47832
$FrontendPort = 5173
$FrontendUrl = "http://127.0.0.1:$FrontendPort"

Write-Status "Iniciando Sistema de Caja (modo web)..." $Cyan

$runner = "npm"
if (Get-Command bun -ErrorAction SilentlyContinue) {
    $runner = "bun"
}

Write-Status "Levantando backend en puerto $BackendPort..." $Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendPath'; $runner run start:dev" -WindowStyle Normal

Write-Status "Levantando frontend en puerto $FrontendPort..." $Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendPath'; $runner run dev" -WindowStyle Normal

Write-Status "Abriendo navegador..." $Cyan
Start-Process $FrontendUrl

Write-Status "Listo. Frontend: $FrontendUrl" $Green
Write-Status "Backend API: http://127.0.0.1:$BackendPort/api" $Green

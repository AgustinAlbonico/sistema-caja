param([string]$RuntimeRoot = 'C:\SistemaCajaEstudio')

$ErrorActionPreference = 'Stop'

# Verificar permisos de admin
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Este script necesita permisos de Administrador para cambiar permisos de carpetas."
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$logsDir = Join-Path $RuntimeRoot 'logs'
if (-not (Test-Path -LiteralPath $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

Write-Host "Corrigiendo permisos para Logs..."
# Grant LocalService full control on logs
# (OI)(CI) = Object Inherit, Container Inherit -> Apply to files and subfolders
# F = Full Control
& icacls "$logsDir" /grant "NT AUTHORITY\LocalService:(OI)(CI)F" /T

Write-Host "Corrigiendo permisos de lectura para Runtime..."
# Grant LocalService Read & Execute on root
# RX = Read and Execute
& icacls "$RuntimeRoot" /grant "NT AUTHORITY\LocalService:(OI)(CI)RX"

Write-Host "✅ Permisos corregidos exitosamente."
Write-Host "Prueba iniciar el sistema nuevamente."
Start-Sleep -Seconds 5

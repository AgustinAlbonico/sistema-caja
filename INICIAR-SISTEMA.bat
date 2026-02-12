@echo off
chcp 65001 >nul
title Iniciar Sistema de Caja
cls

echo ============================================
echo   SISTEMA DE CAJA - INICIO AUTOMATICO
echo ============================================
echo.
echo Este script iniciara:
echo   - PostgreSQL (si no esta corriendo)
echo   - Backend (NestJS)
echo   - Frontend (React)
echo   - Navegador web
echo.
echo ============================================
echo.

:: Obtener la ruta del script
set "SCRIPT_PATH=%~dp0"
set "PS_SCRIPT=%SCRIPT_PATH%iniciar-sistema.ps1"

:: Verificar que el script de PowerShell existe
if not exist "%PS_SCRIPT%" (
    echo ERROR: No se encuentra el script iniciar-sistema.ps1
    echo Ruta buscada: %PS_SCRIPT%
    pause
    exit /b 1
)

:: Ejecutar el script de PowerShell
echo Iniciando sistema...
echo.

powershell.exe -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -ProjectPath "%SCRIPT_PATH%"

:: Si el script falla, mantener la ventana abierta
if %errorlevel% neq 0 (
    echo.
    echo ERROR: El sistema no pudo iniciar correctamente
    pause
)

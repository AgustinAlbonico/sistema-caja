param(
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio',
    [string]$NssmPath = '',
    [string]$BackendServiceName = 'SistemaCajaBackend',
    [string]$FrontendServiceName = 'SistemaCajaFrontend'
)

$ErrorActionPreference = 'Stop'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Ejecuta uninstall-nssm-services.ps1 en PowerShell como Administrador.'
}

. "$PSScriptRoot\services-common.ps1"

$nssmExe = Resolve-NssmExecutable -RuntimeRoot $RuntimeRoot -NssmPath $NssmPath
$nssmExe = Resolve-NssmServiceBinaryPath -RuntimeRoot $RuntimeRoot -NssmExe $nssmExe

foreach ($serviceName in @($BackendServiceName, $FrontendServiceName)) {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($null -eq $service) {
        Write-Host "Servicio no encontrado: $serviceName"
        continue
    }

    if ($service.Status -ne 'Stopped') {
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }

    Invoke-Nssm -NssmExe $nssmExe -Arguments @('remove', $serviceName, 'confirm')
    Write-Host "Servicio removido: $serviceName"
}

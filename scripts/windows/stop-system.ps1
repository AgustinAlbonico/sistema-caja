param(
    [string]$BackendServiceName = 'SistemaCajaBackend',
    [string]$FrontendServiceName = 'SistemaCajaFrontend'
)

$ErrorActionPreference = 'Continue'

foreach ($serviceName in @($FrontendServiceName, $BackendServiceName)) {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($null -eq $service) {
        Write-Host "Servicio no encontrado: $serviceName"
        continue
    }

    if ($service.Status -ne 'Stopped') {
        Stop-Service -Name $serviceName -Force
        Write-Host "Servicio detenido: $serviceName"
    }
}

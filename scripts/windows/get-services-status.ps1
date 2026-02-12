param(
    [string]$BackendServiceName = 'SistemaCajaBackend',
    [string]$FrontendServiceName = 'SistemaCajaFrontend'
)

$services = @($BackendServiceName, $FrontendServiceName)

foreach ($serviceName in $services) {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($null -eq $service) {
        Write-Host "$serviceName => NotInstalled"
    } else {
        Write-Host "$serviceName => $($service.Status)"
    }
}

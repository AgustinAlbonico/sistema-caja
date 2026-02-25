param(
    [int[]]$Ports = @(47832, 5173, 3000)
)

$ErrorActionPreference = 'Stop'

foreach ($port in $Ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($null -eq $connections) {
        Write-Host "Sin proceso escuchando en puerto $port"
        continue
    }

    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
            Stop-Process -Id $process.Id -Force
            Write-Host "Proceso detenido en puerto ${port}: $($process.ProcessName) (PID $($process.Id))"
        } catch {
            Write-Host "No se pudo detener PID $processId en puerto ${port}: $($_.Exception.Message)"
        }
    }
}

param(
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio'
)

$ErrorActionPreference = 'Stop'

# Importar funciones de entorno
. "$PSScriptRoot\runtime-env.ps1"

Write-Host "Verificando conexion a Base de Datos..." -ForegroundColor Cyan

# Cargar configuracion
try {
    $envMap = Import-RuntimeEnv -RuntimeRoot $RuntimeRoot
}
catch {
    Write-Error "No se pudo cargar la configuracion desde $RuntimeRoot"
    Write-Error $_
    exit 1
}

$hostName = Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_HOST'
$port = Get-RuntimeEnvValue -EnvMap $envMap -Key 'DB_PORT' -DefaultValue '5432'

if (-not $hostName) {
    Write-Error "DB_HOST no esta configurado en el archivo .env"
    exit 1
}

Write-Host "Intentando conectar a $hostName : $port ..."

try {
    $result = Test-NetConnection -ComputerName $hostName -Port $port -InformationLevel Detailed

    if ($result.TcpTestSucceeded) {
        Write-Host "CONEXION EXITOSA!" -ForegroundColor Green
        Write-Host "   El servidor de base de datos es accesible."
        if ($result.PingReplyDetails) {
            Write-Host "   Tiempo de ping: $($result.PingReplyDetails.RoundtripTime) ms"
        }
    } else {
        Write-Host "FALLO LA CONEXION" -ForegroundColor Red
        Write-Host "   No se pudo establecer conexion TCP con el puerto $port."
        Write-Host "   Verifica:"
        Write-Host "   1. Que el servicio PostgreSQL este corriendo en el servidor."
        Write-Host "   2. Que el Firewall de Windows en el servidor permita trafico en el puerto $port."
        Write-Host "   3. Que la IP '$hostName' sea correcta."
        exit 1
    }
}
catch {
    Write-Error "Ocurrio un error al intentar verificar la conexion: $_"
    exit 1
}

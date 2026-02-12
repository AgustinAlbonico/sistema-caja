param(
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio',
    [int]$TimeoutSeconds = 5
)

$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'sync-config-from-env.ps1') -RuntimeRoot $RuntimeRoot

$configPath = Join-Path $RuntimeRoot 'config\config.json'
$backendPath = Join-Path $RuntimeRoot 'current\backend'

if (-not (Test-Path -LiteralPath $configPath)) {
    Write-Host "FAIL: No existe config.json en $configPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path -LiteralPath $backendPath)) {
    Write-Host "FAIL: No existe backend en $backendPath" -ForegroundColor Red
    exit 1
}

$config = (Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json)

$env:DB_HOST = [string]$config.database.host
$env:DB_PORT = [string]$config.database.port
$env:DB_USER = [string]$config.database.username
$env:DB_PASSWORD = [string]$config.database.password
$env:DB_NAME = [string]$config.database.database
$env:DB_TIMEOUT_MS = [string]($TimeoutSeconds * 1000)

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $nodeCommand) {
    Write-Host 'FAIL: Node.js no disponible en PATH' -ForegroundColor Red
    exit 1
}

$jsCode = @"
const { Client } = require('pg')

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: Number(process.env.DB_TIMEOUT_MS || '5000'),
  })

  try {
    await client.connect()
    await client.query('SELECT 1')
    await client.end()
    console.log('PASS: Conexion a PostgreSQL exitosa')
    process.exit(0)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log('FAIL: Error de conexion PostgreSQL - ' + message)
    try {
      await client.end()
    } catch {
    }
    process.exit(1)
  }
}

main()
"@

Push-Location $backendPath
try {
    $jsCode | & node -
} finally {
    Pop-Location
}

exit $LASTEXITCODE

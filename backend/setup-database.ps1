# Script para ejecutar migraciones y seeds
# Ejecutar: powershell -ExecutionPolicy Bypass -File setup-database.ps1

$ErrorActionPreference = "Stop"

$backendPath = "C:\Users\agust\Desktop\Sistema caja estudio\backend"
$migrationsPath = "$backendPath\src\database\migrations"
$envFile = "$backendPath\.env"

# Verificar si existe el archivo .env
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: No se encuentra el archivo .env en $backendPath" -ForegroundColor Red
    Write-Host "   Crea el archivo .env copiando .env.example y configura las credenciales de la base de datos." -ForegroundColor Yellow
    Write-Host "" -ForegroundColor White
    Write-Host "   Ejemplo: cp .env.example .env" -ForegroundColor Cyan
    exit 1
}

# Leer variables de entorno
$envContent = Get-Content $envFile
$dbHost = ($envContent | Where-Object { $_ -match '^DB_HOST=' }) -replace '^DB_HOST=', ''
$dbPort = ($envContent | Where-Object { $_ -match '^DB_PORT=' }) -replace '^DB_PORT=', ''
$dbUser = ($envContent | Where-Object { $_ -match '^DB_USER=' }) -replace '^DB_USER=', ''
$dbPassword = ($envContent | Where-Object { $_ -match '^DB_PASSWORD=' }) -replace '^DB_PASSWORD=', ''
$dbName = ($envContent | Where-Object { $_ -match '^DB_NAME=' }) -replace '^DB_NAME=', ''

Write-Host "📋 Configuración de la base de datos:" -ForegroundColor Cyan
Write-Host "   Host: $dbHost" -ForegroundColor Gray
Write-Host "   Puerto: $dbPort" -ForegroundColor Gray
Write-Host "   Usuario: $dbUser" -ForegroundColor Gray
Write-Host "   Base de datos: $dbName" -ForegroundColor Gray
Write-Host ""

# Configurar PGPASSWORD para no exponer contraseña
$env:PGPASSWORD = $dbPassword

# Verificar conexión a PostgreSQL
Write-Host "🔍 Verificando conexión a PostgreSQL..." -ForegroundColor Cyan
try {
    $pingResult = psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: No se puede conectar a PostgreSQL" -ForegroundColor Red
        Write-Host "   Verifica que PostgreSQL esté corriendo y las credenciales sean correctas." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Conexión exitosa a PostgreSQL" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al conectar a PostgreSQL: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Verificar si existe la base de datos
Write-Host "🔍 Verificando si existe la base de datos '$dbName'..." -ForegroundColor Cyan
$dbExists = psql -h $dbHost -p $dbPort -U $dbUser -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = '$dbName';" 2>&1
if ($dbExists.Trim() -ne "1") {
    Write-Host "⚠️  La base de datos '$dbName' no existe. Creándola..." -ForegroundColor Yellow
    psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "CREATE DATABASE ""$dbName"";" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Base de datos '$dbName' creada exitosamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al crear la base de datos" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ La base de datos '$dbName' ya existe" -ForegroundColor Green
}
Write-Host ""

# Ejecutar migraciones
Write-Host "📦 Ejecutando migraciones..." -ForegroundColor Cyan

$migrations = @(
    "001_create_usuarios_table.sql",
    "002_create_auditoria_table.sql",
    "003_add_auditoria_fields.sql"
)

foreach ($migration in $migrations) {
    $migrationPath = Join-Path $migrationsPath $migration
    if (Test-Path $migrationPath) {
        Write-Host "   Ejecutando $migration..." -ForegroundColor Gray
        psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $migrationPath 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $migration completada" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Error al ejecutar $migration" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "   ❌ No se encuentra: $migrationPath" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Ejecutar seed de usuarios
Write-Host "🌱 Ejecutando seed de usuarios..." -ForegroundColor Cyan
Set-Location $backendPath
npm run seed:users 2>&1 | Write-Host -ForegroundColor Gray

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Seed de usuarios completado exitosamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error al ejecutar seed de usuarios" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Limpiar PGPASSWORD
$env:PGPASSWORD = $null

Write-Host "🎉 ¡Configuración de base de datos completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Usuarios creados:" -ForegroundColor Cyan
Write-Host "   Usuario: admin     Contraseña: ferchu123" -ForegroundColor White
Write-Host "   Usuario: sandra    Contraseña: Sandra123" -ForegroundColor White
Write-Host "   Usuario: fiore     Contraseña: Fiore123" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Ahora puedes iniciar el backend con: cd backend && npm run start:dev" -ForegroundColor Cyan

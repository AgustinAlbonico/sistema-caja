# Runbook Operativo - Despliegue Distribuido Sin Tauri (Windows)

## Objetivo

- Backend + frontend locales en cada PC cliente.
- PostgreSQL centralizado en una PC servidor.
- Ejecucion silenciosa con NSSM + accesos directos.
- Configuracion unificada desde un solo archivo: `C:\SistemaCajaEstudio\config\.env`.
- Actualizacion por GitHub Releases publicas con verificacion SHA-256 y rollback.

## Rutas clave

- Runtime: `C:\SistemaCajaEstudio`
- Variables: `C:\SistemaCajaEstudio\config\.env`
- Config backend (generada): `C:\SistemaCajaEstudio\config\config.json`
- Config updater (generada): `C:\SistemaCajaEstudio\config\update-config.json`
- Logs: `C:\SistemaCajaEstudio\logs`
- Scripts: `C:\SistemaCajaEstudio\scripts`

## Requisitos

1. Windows 10/11 x64.
2. Node.js disponible en PATH (o en `current\tools\node\node.exe`).
3. `nssm.exe` en PATH o en `C:\SistemaCajaEstudio\scripts\tools\nssm.exe`.
4. Paquete distribuido con `backend`, `frontend` y `node_modules` incluidos.

Instalar NSSM rapido (opcional, recomendado):

```powershell
winget install --id NSSM.NSSM -e
```

## 1) Servidor PostgreSQL

1. En `postgresql.conf`:

```conf
listen_addresses = '*'
```

2. En `pg_hba.conf` (abierto para cualquier IPv4, alto riesgo):

```conf
host    all    all    0.0.0.0/0    md5
```

3. Firewall abierto para cualquier IPv4 (alto riesgo):

```powershell
New-NetFirewallRule -DisplayName "PostgreSQL 5432 OPEN" -Direction Inbound -Protocol TCP -LocalPort 5432 -RemoteAddress 0.0.0.0/0 -Action Allow
```

Advertencia: esta configuracion expone PostgreSQL a cualquier IP IPv4 que alcance la maquina.

## 2) Instalacion en cliente

Ejecutar PowerShell como administrador, desde el repo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\install-client-runtime.ps1 -RuntimeRoot "C:\SistemaCajaEstudio"
```

Si queres instalar servicios NSSM en el mismo paso:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\install-client-runtime.ps1 -RuntimeRoot "C:\SistemaCajaEstudio" -InstallServices
```

Si instalaste sin `-InstallServices`, instalalos luego con:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\install-nssm-services.ps1 -RuntimeRoot "C:\SistemaCajaEstudio"
```

La instalacion crea un unico acceso directo: `Sistema Caja - Iniciar`.

## 3) Configuracion por .env

Completar `C:\SistemaCajaEstudio\config\.env`.

Variables minimas obligatorias:

- `DB_HOST`
- `DB_USER`
- `DB_NAME`
- `JWT_SECRET`

Variables recomendadas:

- `DB_PORT=5432`
- `DB_PASSWORD=`
- `JWT_EXPIRATION=24h`
- `APP_HOST=127.0.0.1`
- `APP_PORT=47832`
- `FRONTEND_PORT=5173`
- `FRONTEND_URL=http://127.0.0.1:5173`

Abrir `.env` rapido:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\open-db-config.ps1
```

## 4) Configuracion DB por script (opcional)

Este comando actualiza `.env` y regenera `config.json`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\set-db-config.ps1 -Host 192.168.1.10 -Port 5432 -Username postgres -Database sistema_caja -RestartBackend
```

## 5) Validaciones

Probar conectividad DB:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\test-db-connection.ps1
```

Ver estado servicios y puertos:

```powershell
Get-Service SistemaCajaBackend
Get-Service SistemaCajaFrontend
Test-NetConnection -ComputerName 127.0.0.1 -Port 47832
Test-NetConnection -ComputerName 127.0.0.1 -Port 5173
curl -4 http://127.0.0.1:47832/api/health
```

## 6) Operacion diaria

- Unico acceso directo de usuario: `Sistema Caja - Iniciar`
- Al iniciar, el sistema intenta actualizar automaticamente desde GitHub Releases (si `UPDATE_OWNER` y `UPDATE_REPO` estan configurados en `.env`).
- Si no hay version nueva, inicia normalmente.

URLs:

- Frontend: `http://127.0.0.1:5173`
- Backend health: `http://127.0.0.1:47832/api/health`

## 7) Updater (GitHub Releases)

Completar en `.env`:

- `UPDATE_OWNER`
- `UPDATE_REPO`
- `UPDATE_ASSET_NAME`
- `UPDATE_CHANNEL`

La actualizacion es automatica en cada inicio. Si queres desactivar temporalmente el updater, deja vacios `UPDATE_OWNER` y `UPDATE_REPO`.

Chequeo manual:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\check-update.ps1
```

Aplicacion manual:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\apply-update.ps1
```

## 8) Troubleshooting rapido

1. Backend no levanta: revisar `C:\SistemaCajaEstudio\logs\backend-service-error.log`.
2. Frontend no levanta: revisar `C:\SistemaCajaEstudio\logs\frontend-service-error.log`.
3. Error de update: revisar owner/repo/asset en `.env` y hash del release.
4. Error DB: validar `DB_HOST`, credenciales y apertura de `5432` en servidor.

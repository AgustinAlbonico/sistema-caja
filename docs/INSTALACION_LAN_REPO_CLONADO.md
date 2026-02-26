# Instalacion y Configuracion Paso a Paso (LAN, repo clonado)

## Objetivo

Dejar el sistema funcionando en una red LAN con este esquema:

- Una PC servidor con PostgreSQL (motor de base de datos)
- Una o varias PCs cliente con frontend + backend locales
- Verificacion rapida desde `http://127.0.0.1:5173/health` en cada cliente

> Este instructivo usa el enfoque que pediste: **clonar repo + `npm install` + script para levantar todo junto**.

---

## 1) Requisitos

En **cada PC cliente**:

- Windows 10/11
- Node.js 18+ (incluye npm)
- Git
- Acceso de red hacia la PC servidor de PostgreSQL

En la **PC servidor de DB**:

- PostgreSQL instalado y en ejecucion
- IP fija en LAN (recomendado)

---

## 2) Preparar la PC servidor de PostgreSQL

### 2.1 Definir IP fija

Ejemplo: `192.168.1.10` (usa la IP real de tu red).

### 2.2 Permitir conexiones remotas en PostgreSQL

En `postgresql.conf`:

```conf
listen_addresses = '*'
```

En `pg_hba.conf` (ajusta subred a la tuya):

```conf
host    all    all    192.168.1.0/24    md5
```

### 2.3 Abrir firewall del servidor DB (IPv4)

```powershell
New-NetFirewallRule -DisplayName "PostgreSQL LAN 5432" -Direction Inbound -Protocol TCP -LocalPort 5432 -RemoteAddress 192.168.1.0/24 -Action Allow
```

### 2.4 Crear base de datos

Crear una base llamada `sistema_caja` (o el nombre que vayas a usar en `.env`).

---

## 3) Crear tablas de la aplicacion (una sola vez)

Ejecuta `database/crear-tablas.sql` sobre la base `sistema_caja`.

Opciones:

- Con pgAdmin (Query Tool)
- Con `psql`

Ejemplo con `psql` desde cualquier equipo con acceso:

```powershell
psql -h 192.168.1.10 -p 5432 -U postgres -d sistema_caja -f "C:\ruta\al\repo\database\crear-tablas.sql"
```

---

## 4) Clonar el repo en cada PC cliente

```powershell
Set-Location C:\
git clone <URL_DEL_REPOSITORIO> "Sistema caja estudio"
Set-Location "C:\Sistema caja estudio"
```

---

## 5) Configurar `backend/.env` en cada cliente

Edita `backend/.env` con los datos reales de tu LAN.

Ejemplo recomendado:

```env
DB_HOST=192.168.1.10
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=sistema_caja

PORT=47832
FRONTEND_URL=http://127.0.0.1:5173

JWT_SECRET=cambia-este-secreto
JWT_EXPIRATION=7d
```

Notas:

- `DB_HOST` debe ser la IP de la PC servidor de PostgreSQL.
- Mantener `PORT=47832` evita desalineacion con el frontend actual.
- Usa `127.0.0.1` (no `localhost`) para URL local.

---

## 6) Instalar dependencias en cada cliente

Desde la raiz del repo:

```powershell
npm install --prefix .\backend
npm install --prefix .\frontend
```

---

## 7) Generar el icono en la PC cliente (recomendado)

Si queres que el cliente use un icono de escritorio (sin abrir consolas), usa este flujo.

### 7.1 Instalacion runtime que crea el icono automaticamente

Desde la raiz del repo en la PC cliente:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\install-client-runtime.ps1 -RuntimeRoot "C:\SistemaCajaEstudio"
```

Este comando:

- Copia backend/frontend al runtime (`C:\SistemaCajaEstudio\current\`)
- Copia scripts al runtime (`C:\SistemaCajaEstudio\scripts\`)
- Ejecuta `create-shortcuts.ps1`
- Crea el icono de escritorio: `Sistema Caja - Iniciar.lnk`

### 7.2 Si el icono no aparece en el escritorio del usuario correcto

En algunos casos el script se ejecuta con otro usuario (por ejemplo, Administrador) y crea el acceso directo en otro Desktop.

Forza el escritorio destino:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\create-shortcuts.ps1 -RuntimeRoot "C:\SistemaCajaEstudio" -DesktopPath "C:\Users\NOMBRE_USUARIO\Desktop"
```

Resultado esperado:

- Archivo `.lnk` en `C:\Users\NOMBRE_USUARIO\Desktop\Sistema Caja - Iniciar.lnk`
- Wrapper VBS en `C:\SistemaCajaEstudio\scripts\wrappers\iniciar-sistema.vbs`

### 7.3 Doble clic para iniciar

El cliente solo debe hacer doble clic en `Sistema Caja - Iniciar`.
Ese icono ejecuta el arranque oculto del sistema, levanta backend + frontend y abre navegador automaticamente.

---

## 8) Levantar backend + frontend juntos (modo repo clonado, sin runtime)

Si en este modo tambien queres icono local de desarrollo, puedes crearlo con:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\create-dev-shortcut.ps1 -ProjectRoot "C:\Sistema caja estudio"
```

Esto crea `Sistema Caja - Iniciar (Local).lnk` en el escritorio del usuario actual.

Desde la raiz del repo, en cada cliente:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\start-dev-lan.ps1
```

Que hace este script:

- Verifica/instala dependencias si faltan
- Genera `backend/config.dev.json` desde `backend/.env`
- Inicia backend en `127.0.0.1:47832`
- Inicia frontend en `127.0.0.1:5173`
- Abre el navegador

Para forzar reinstalacion de paquetes:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\start-dev-lan.ps1 -InstallDeps
```

---

## 9) Verificar estado completo (front + back + DB)

### 9.1 Ruta de salud en frontend

Abrir manualmente en navegador:

```text
http://127.0.0.1:5173/health
```

Debes ver 3 tarjetas:

- Frontend: OK
- Backend: OK
- Base de datos: OK

### 9.2 Verificacion backend directa

```powershell
curl -4 http://127.0.0.1:47832/api/health
```

El JSON debe indicar `status: ok` y `database.status: connected`.

---

## 10) Crear usuarios iniciales (una sola vez por base)

Si la base esta vacia, corre este seed **una sola vez** desde cualquier cliente:

```powershell
Set-Location "C:\Sistema caja estudio\backend"
$env:DB_HOST='192.168.1.10'
$env:DB_PORT='5432'
$env:DB_USER='postgres'
$env:DB_PASSWORD='tu_password'
$env:DB_NAME='sistema_caja'
npm run db:init
```

Usuarios creados/actualizados:

- `admin` / `ferchu123`
- `sandra` / `Sandra123`
- `fiore` / `Fiore123`

---

## 11) Operacion diaria

### Iniciar (con icono recomendado)

Doble clic en `Sistema Caja - Iniciar` del escritorio.

### Iniciar (alternativa por script)

```powershell
Set-Location "C:\Sistema caja estudio"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\start-dev-lan.ps1
```

### Detener

```powershell
Set-Location "C:\Sistema caja estudio"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\stop-dev-lan.ps1
```

---

## 12) Troubleshooting rapido

### Backend no conecta a DB

- Verifica `DB_HOST`, `DB_PORT`, usuario y password en `backend/.env`
- Verifica firewall y `pg_hba.conf` en servidor DB
- Prueba conectividad desde cliente:

```powershell
Test-NetConnection -ComputerName 192.168.1.10 -Port 5432
```

### `/health` muestra Backend Error

- Verifica puerto local backend:

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 47832
```

- Revisa consola donde se levanto `start-dev-lan.ps1`

### No se crea el icono en el escritorio

- Ejecuta instalacion runtime:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\install-client-runtime.ps1 -RuntimeRoot "C:\SistemaCajaEstudio"
```

- Si sigue sin aparecer, fuerza escritorio objetivo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\create-shortcuts.ps1 -RuntimeRoot "C:\SistemaCajaEstudio" -DesktopPath "C:\Users\NOMBRE_USUARIO\Desktop"
```

- Verifica que exista `C:\SistemaCajaEstudio\scripts\wrappers\iniciar-sistema.vbs`.

### `/health` muestra Base de datos Error

- Backend levanto, pero no logra `SELECT 1` contra PostgreSQL.
- Revisa credenciales y permisos de red hacia servidor DB.

---

## Archivos clave

- `scripts/windows/install-client-runtime.ps1`
- `scripts/windows/create-shortcuts.ps1`
- `scripts/windows/start-system.ps1`
- `scripts/windows/create-dev-shortcut.ps1`
- `scripts/windows/start-dev-hidden.ps1`
- `scripts/windows/start-dev-lan.ps1`
- `scripts/windows/stop-dev-lan.ps1`
- `backend/.env`
- `backend/config.dev.json` (generado)
- `database/crear-tablas.sql`
- `frontend/src/pages/HealthPage.tsx`

# Instalacion LAN Multi-PC + Launcher de Escritorio

Guia corta para operar el sistema en LAN:

- 1 PC hostea PostgreSQL.
- Cada PC cliente corre backend + frontend local.
- Cada cliente usa un icono de escritorio para iniciar todo y abrir la app.

---

## 1) Arquitectura y archivos

- **DB Server**: PostgreSQL en IPv4 (ej: `192.168.100.8:5432`).
- **Cliente**: backend + frontend + launcher.

Archivos del flujo:

- `scripts/windows/start-app.ps1`: inicia/verifica servicios y abre navegador.
- `scripts/windows/install-shortcut.ps1`: crea el acceso directo `.lnk`.
- `scripts/windows/launcher.env.example`: plantilla de puertos/URL del launcher.

---

## 2) PC servidor PostgreSQL (incluye acceso desde cualquier direccion)

1. Instalar PostgreSQL y fijar IP IPv4 de la PC (ej: `192.168.100.8`).
2. Editar `postgresql.conf` y dejar:

```conf
listen_addresses = '*'
port = 5432
```

3. Editar `pg_hba.conf` y agregar una regla para aceptar desde cualquier origen:

```conf
host    all    all    0.0.0.0/0    md5
```

4. Reiniciar el servicio de PostgreSQL.
5. Abrir firewall de Windows para `5432/TCP` (entrada).

Validar desde una PC cliente:

```powershell
Test-NetConnection -ComputerName 192.168.100.8 -Port 5432
```

> Recomendado en produccion: restringir `pg_hba.conf` a tu subred LAN (ej. `192.168.100.0/24`) en lugar de `0.0.0.0/0`.

---

## 3) Configuracion de cada PC cliente

Instalar dependencias en la raiz:

```powershell
npm install
```

Fallback:

```powershell
bun install
```

Editar `backend/.env` con la DB remota:

```env
DB_HOST=192.168.100.8
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD
DB_NAME=sistema_caja
PORT=47832
FRONTEND_URL=http://127.0.0.1:5173
JWT_SECRET=CAMBIAR_EN_PRODUCCION
JWT_EXPIRATION=7d
```

Configurar launcher por PC:

```powershell
Copy-Item scripts\windows\launcher.env.example scripts\windows\launcher.env
```

`scripts/windows/launcher.env` sugerido:

```env
BACKEND_PORT=47832
FRONTEND_PORT=5173
APP_URL=http://127.0.0.1:5173/login
START_TIMEOUT_SECONDS=60
APP_MODE=production
AUTO_BUILD_ON_MISSING_DIST=true
```

> Para acelerar el inicio en clientes, usar `APP_MODE=production`. El primer arranque puede tardar mas si necesita ejecutar build inicial.

---

## 4) Crear icono de escritorio

Usuario actual:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\install-shortcut.ps1
```

Todos los usuarios:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\install-shortcut.ps1 -AllUsersDesktop
```

Se crea `Sistema Caja Estudio.lnk`.

Por defecto el acceso directo ejecuta el launcher en modo oculto (sin consola visible).

Si queres un acceso directo con consola visible para debug:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\install-shortcut.ps1 -ShowConsole
```

---

## 5) Comportamiento del icono

Al hacer doble clic:

1. Si backend + frontend ya estan arriba, solo abre `APP_URL`.
2. Si no, inicia backend y frontend (en ese orden), espera puertos y abre navegador.
3. Evita duplicar procesos.
4. Log en `C:\SistemaCajaEstudio\logs\launcher.log`.

Ademas, el launcher genera/sincroniza automaticamente `C:\SistemaCajaEstudio\config\config.json` (y snapshot en `config.launcher.json`) y exporta `APP_CONFIG_PATH` para que el backend use el mismo `BACKEND_PORT` del launcher (evita desfasajes como `PORT=3000` vs `BACKEND_PORT=47832`).

En `production` usa:

- Backend: `start:prod`
- Frontend: `preview`

Esto reduce notablemente el tiempo de inicio comparado con `start:dev` + `dev`.

---

## 6) Verificacion rapida

- [ ] `backend/.env` apunta por IPv4 a la DB remota.
- [ ] `launcher.env` tiene puertos/URL correctos.
- [ ] Doble clic con servicios apagados: levanta todo y abre app.
- [ ] Doble clic con servicios ya arriba: solo abre app.

Diagnostico manual:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\start-app.ps1
```

Si se queda en "Iniciando Backend", revisar en `C:\SistemaCajaEstudio\logs\backend-stderr.log` y confirmar que aparezca la linea de sincronizacion de `config.json`.

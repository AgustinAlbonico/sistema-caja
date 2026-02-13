# Guía de Instalación del Sistema en PC Cliente

Esta guía describe cómo instalar el sistema en una PC cliente utilizando el método de **Ejecución Directa**, el cual es más robusto y evita problemas de permisos comunes con servicios de Windows.

## 📋 Requisitos Previos

1. **Windows 10 o 11** (x64)
2. **Node.js** instalado en el sistema (o incluido en el paquete)
3. **NSSM** (Non-Sucking Service Manager) para gestionar servicios como servicio de Windows
   - Instalación rápida con: `winget install --id NSSM.NSSM -e`
4. **Acceso administrativo** para instalar los servicios

---

## 📦 Paso 1: Copiar los archivos al cliente

Copia la carpeta completa del proyecto al equipo cliente. Debe contener:
- `backend/` (código del backend NestJS)
- `frontend/` (código del frontend React)
- `scripts/windows/` (scripts de instalación)
- `scripts/tools/nssm.exe` (ejecutable NSSM si no está instalado en sistema)

---

## 🔧 Paso 2: Ejecutar script de instalación

Abre **PowerShell como Administrador** en el equipo cliente, navega a la carpeta del proyecto y ejecuta:

```powershell
cd "c:\Users\AgustinNotebook\Desktop\sistema caja\sistema-caja"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\install-client-runtime.ps1
```

**Este script hace automáticamente:**
- ✅ Crea la estructura de carpetas en `C:\SistemaCajaEstudio\`
- ✅ Copia `backend/` y `frontend/` a `C:\SistemaCajaEstudio\current\`
- ✅ Copia los scripts a `C:\SistemaCajaEstudio\scripts\`
- ✅ Crea template de configuración en `C:\SistemaCajaEstudio\config\.env`
- ✅ Crea acceso directo en el escritorio: **"Sistema Caja - Iniciar"** con icono personalizado
- ❌ **NO instala servicios de Windows** (para evitar problemas de permisos)

---

## ⚙️ Paso 3: Configurar variables de entorno

Abre el archivo de configuración:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\open-db-config.ps1
```

**⚠️ MUY IMPORTANTE: VERIFICAR CONEXIÓN**
Una vez configurado el archivo `.env`, ejecuta este script para verificar que la PC cliente ve al servidor:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\check-db-connection.ps1
```
Si este paso falla (letras rojas), **EL SISTEMA NO FUNCIONARÁ**. Revisa IP, puerto y firewall.

O manualmente: abre `C:\SistemaCajaEstudio\config\.env` con el Bloc de Notas

**Configura las siguientes variables obligatorias:**

```env
# Base de datos
DB_HOST=192.168.1.XX          # IP del servidor PostgreSQL
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_contraseña
DB_NAME=sistema_caja

# JWT
JWT_SECRET=tu_secreto_jwt_seguro

# Opcional: puertos (si se modifican)
APP_PORT=47832
FRONTEND_PORT=5173
```

---

## 🌐 Paso 4: Configurar servidor PostgreSQL (en la PC servidor)

En el servidor PostgreSQL:

1. **Permitir conexiones remotas** en `postgresql.conf`:
   ```conf
   listen_addresses = '*'
   ```

2. **Configurar pg_hba.conf** para permitir conexiones desde la LAN:
   ```conf
   host    all    all    192.168.1.0/24    md5
   ```

3. **Abrir puerto 5432** en el firewall del servidor:
   ```powershell
   New-NetFirewallRule -DisplayName "PostgreSQL" -Direction Inbound -Protocol TCP -LocalPort 5432 -RemoteAddress 192.168.1.0/24 -Action Allow
   ```

---

## 🚀 Paso 5: Iniciar el sistema

Doble clic en el acceso directo **"Sistema Caja - Iniciar"** en el escritorio

**Esto hace:**
- Sincroniza configuración de `.env` → `config.json`
- Intenta actualizar desde GitHub (si está configurado)
- Intenta actualizar desde GitHub (si está configurado)
- Inicia el **backend** en segundo plano
- Inicia el **frontend** en segundo plano
- Abre el navegador en `http://127.0.0.1:5173`

---

## ✅ Verificación

Verifica que todo esté funcionando:

```powershell
# Ver procesos corriendo (backend y frontend)
Get-Process node
Get-Process cmd

# Ver puertos
Test-NetConnection -ComputerName 127.0.0.1 -Port 47832  # Backend
Test-NetConnection -ComputerName 127.0.0.1 -Port 5173   # Frontend

# Ver health endpoint
curl http://127.0.0.1:47832/api/health
```

---

## 🔄 Operación Diaria

- **Para iniciar:** Doble clic en "Sistema Caja - Iniciar"
- **Para detener:** El sistema se detiene automáticamente al cerrar el navegador, o usa:
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\stop-system.ps1
  ```
- **Nota:** Al ser ejecución directa, si reinicias la PC debes volver a iniciar el sistema manualmente con el icono.

---

## 📂 Estructura de archivos creada

```
C:\SistemaCajaEstudio\
├── config\
│   ├── .env                 # ⚠️ EDITAR ESTE ARCHIVO
│   ├── config.json          # Generado automáticamente desde .env
│   └── update-config.json  # Configuración de actualizaciones
├── current\
│   ├── backend\             # Código backend compilado
│   └── frontend\            # Código frontend compilado
├── logs\
│   ├── backend-service.log
│   ├── frontend-service.log
│   └── application-*.log
├── releases\                # Versiones anteriores (rollback)
├── scripts\                 # Scripts del sistema
└── version.json             # Versión actual instalada
```

---

## 🔄 Actualización Automática (Opcional)

El sistema puede actualizarse automáticamente desde GitHub Releases. Para activarlo:

**En `C:\SistemaCajaEstudio\config\.env`:**
```env
UPDATE_OWNER=usuario
UPDATE_REPO=repositorio
UPDATE_ASSET_NAME=release.zip
UPDATE_CHANNEL=stable
```

Cada vez que inicias el sistema, verifica si hay una nueva versión y la aplica automáticamente con:
- Verificación de hash SHA-256
- Rollback automático si falla la actualización

---

## 🛠️ Troubleshooting

**❌ Backend no levanta:**
- Revisar `C:\SistemaCajaEstudio\logs\backend-service-error.log`
- Verificar conexión a PostgreSQL: Ejecutar script `check-db-connection.ps1` (ver Scripts Útiles)

**❌ Frontend no levanta:**
- Revisar `C:\SistemaCajaEstudio\logs\frontend-service-error.log`
- Verificar que el puerto 5173 esté libre

**❌ Error de base de datos:**
- Verificar que el servidor PostgreSQL esté corriendo
- Verificar firewall en puerto 5432
- Verificar `pg_hba.conf` permite la IP del cliente

**❌ Error de actualización:**
- Verificar `UPDATE_OWNER` y `UPDATE_REPO` en `.env`
- Revisar que el asset existe en GitHub Releases
- Verificar hash SHA-256 del release

---

## 📞 Scripts Útiles

**Ver estado de servicios:**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\get-services-status.ps1
```

**Verificar actualizaciones disponibles:**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\check-update.ps1
```

**Aplicar actualización manual:**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\apply-update.ps1
```

**Configurar DB por CLI:**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\set-db-config.ps1 -Host 192.168.1.10 -Port 5432 -Username postgres -Database sistema_caja -RestartBackend
```

**Verificar conexión a Base de Datos:**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SistemaCajaEstudio\scripts\check-db-connection.ps1
```

---

## 📄 Documentación Adicional

Para más detalles técnicos, revisar:
- `docs/RUNBOOK_DESPLIEGUE_DISTRIBUIDO_SIN_TAURI.md` - Runbook operativo completo
- `C:\SistemaCajaEstudio\logs\` - Logs del sistema

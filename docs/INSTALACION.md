# 📋 Guía de Instalación - Sistema de Caja

Guía paso a paso para instalar el Sistema de Caja en cualquier PC y dejarlo 100% funcional.

---

## 📌 Índice

1. [Prerrequisitos](#1-prerrequisitos)
2. [Instalación de PostgreSQL](#2-instalación-de-postgresql)
3. [Configuración de la Base de Datos](#3-configuración-de-la-base-de-datos)
4. [Descarga del Proyecto](#4-descarga-del-proyecto)
5. [Instalación de Dependencias](#5-instalación-de-dependencias)
6. [Creación de Tablas](#6-creación-de-tablas)
7. [Carga de Datos Iniciales](#7-carga-de-datos-iniciales)
8. [Levantar el Sistema](#8-levantar-el-sistema)
9. [Credenciales de Acceso](#9-credenciales-de-acceso)
10. [Solución de Problemas Comunes](#10-solución-de-problemas-comunes)

---

## 1. Prerrequisitos

Antes de comenzar, asegúrate de tener los siguientes componentes instalados:

### ✅ Obligatorios:
- **Node.js** (versión 18 o superior) - [Descargar aquí](https://nodejs.org/)
- **PostgreSQL 15** - [Descargar aquí](https://www.postgresql.org/download/windows/)
- **PowerShell** (Windows 10/11 - ya incluido)

### 💡 Recomendados:
- **VS Code** o cualquier editor de código
- **Git** (para clonar el repositorio)

### 📝 Verificar Node.js:
```powershell
node --version
# Debe mostrar algo como: v18.x.x o v20.x.x
```

---

## 2. Instalación de PostgreSQL

### Paso 2.1: Descargar e Instalar

1. Descarga PostgreSQL 15 desde: https://www.postgresql.org/download/windows/
2. Ejecuta el instalador (`.exe`)

### Paso 2.2: Configuración Durante la Instalación

Cuando el instalador te pida configuración, usa los siguientes valores:

| Configuración | Valor |
|--------------|-------|
| **Puerto** | `5432` |
| **Superusuario (postgres)** | Usuario: `postgres` <br> Contraseña: `postgres` |
| **Locale** | Español, Argentina (o tu preferencia) |
| **Crear base de datos** | ❌ NO crear durante instalación |

### Paso 2.3: Instalar pgAdmin

✅ **Sí instalar pgAdmin** (viene incluido con el instalador de PostgreSQL)
- Útil para ver y administrar la base de datos

### Paso 2.4: Verificar Instalación

1. Abre **pgAdmin** desde el menú de inicio
2. Conéctate al servidor `localhost:5432`
   - Usuario: `postgres`
   - Contraseña: `postgres`

---

## 3. Configuración de la Base de Datos

### Paso 3.1: Crear la Base de Datos

**Opción A: Usar pgAdmin**
1. En pgAdmin, expande `Servers` → `localhost` → `Databases`
2. Botón derecho en `Databases` → `Create` → `Database...`
3. Nombre: `db_sistema_recibos`
4. Click en `Save`

**Opción B: Usar SQL Query en pgAdmin**
1. En pgAdmin, haz click en el ícono de SQL (Query Tool)
2. Ejecuta:
```sql
CREATE DATABASE db_sistema_recibos;
```

### Paso 3.2: Verificar Base de Datos

En pgAdmin deberías ver:
- `Databases` → `db_sistema_recibos` ✅

---

## 4. Descarga del Proyecto

### Paso 4.1: Obtener el Código

**Opción A: Descargar ZIP**
1. Obtén el archivo `.zip` del proyecto
2. Descomprímelo en una ubicación de tu preferencia
3. Ejemplo: `C:\sistema-caja\`

**Opción B: Usar Git (si tienes repositorio)**
```powershell
cd C:\
git clone <URL_DEL_REPOSITORIO>
cd <CARPETA_DEL_PROYECTO>
```

### Paso 4.2: Verificar Estructura

Deberías ver las siguientes carpetas en el directorio raíz:
```
Sistema caja estudio/
├── backend/
├── frontend/
├── database/
└── INSTALACION.md  ← (este archivo)
```

---

## 5. Instalación de Dependencias

### Paso 5.1: Verificar Administrador de Paquetes

El proyecto usa **Bun** como opción preferida, pero también funciona con **npm**.

```powershell
# Verificar si tienes Bun
bun --version

# Si no está instalado, usa npm (viene con Node.js)
npm --version
```

### Paso 5.2: Instalar Dependencias del Backend

```powershell
cd backend

# Si tienes Bun
bun install

# Si no, usa npm
npm install
```

**⏱️ Tiempo estimado:** 2-5 minutos

### Paso 5.3: Instalar Dependencias del Frontend

```powershell
cd ../frontend

# Si tienes Bun
bun install

# Si no, usa npm
npm install
```

**⏱️ Tiempo estimado:** 2-5 minutos

---

## 6. Creación de Tablas

El sistema usa TypeORM con `synchronize: false`, por lo que necesitamos crear las tablas manualmente.

### Paso 6.1: Abrir el Script SQL

1. Navega a la carpeta `database/` en el proyecto
2. Busca el archivo `crear-tablas.sql`
3. Ábrelo con tu editor de código (VS Code, Notepad++, etc.)

### Paso 6.2: Ejecutar el Script en pgAdmin

1. En pgAdmin, expande `Databases` → `db_sistema_recibos`
2. Haz click en el ícono de **SQL Query Tool** (o presiona `F6`)
3. Copia todo el contenido del archivo `crear-tablas.sql`
4. Pégalo en el Query Tool
5. Click en el botón **Play** (▶️) para ejecutar
6. Deberías ver mensajes de `CREATE TABLE` exitosos

### Paso 6.3: Verificar Tablas Creadas

En pgAdmin:
- Expande `db_sistema_recibos` → `Schemas` → `public` → `Tables`
- Deberías ver las siguientes tablas:

| Tabla | Descripción |
|-------|-------------|
| `auditoria` | Registro de acciones de usuarios |
| `cajaDiaria` | Control diario de caja |
| `clientes` | Datos de clientes |
| `conceptos` | Conceptos de pagos |
| `gastos` | Registro de gastos |
| `gastoPagos` | Pagos de gastos |
| `metodosPago` | Métodos de pago (efectivo, transferencia, etc.) |
| `movimientosCaja` | Movimientos de caja diaria |
| `pagos` | Pagos de recibos |
| `recibos` | Recibos emitidos |
| `reciboItems` | Ítems de recibos |
| `usuarios` | Usuarios del sistema |

---

## 7. Carga de Datos Iniciales

### Paso 7.1: Crear Usuarios del Sistema

El sistema incluye usuarios predefinidos. Para crearlos:

```powershell
cd backend

# Si tienes Bun
bun run seed:users

# Si usas npm
npm run seed:users
```

**✅ Salida esperada:**
```
Conexión a base de datos establecida
Usuario 'admin' creado exitosamente
Usuario 'sandra' creado exitosamente
Usuario 'fiore' creado exitosamente

=== USUARIOS DISPONIBLES ===
Usuario: admin
Contraseña: ferchu123
---
Usuario: sandra
Contraseña: Sandra123
---
Usuario: fiore
Contraseña: Fiore123
---
Conexión a base de datos cerrada
```

### Paso 7.2: (Opcional) Crear Admin Extra

Si también quieres el usuario admin adicional:

```powershell
# Si tienes Bun
bun run ts-node src/database/seeds/create-admin.seed.ts

# Si usas npm
npx ts-node src/database/seeds/create-admin.seed.ts
```

**⚠️ NOTA:** Este usuario adicional puede no ser necesario, ya que el seed anterior ya crea un admin.

---

## 8. Levantar el Sistema

### Paso 8.1: Levantar el Backend

**Abre una nueva terminal (PowerShell)**

```powershell
cd C:\ruta\al\proyecto\backend

# Si tienes Bun
bun run start:dev

# Si usas npm
npm run start:dev
```

**✅ Salida esperada:**
```
[Nest] XXXXX  - Starting application...
[Nest] XXXXX  - Nest application successfully started
```

**✅ Backend listo en:** `http://127.0.0.1:3000`

**Deja esta terminal abierta** para que el backend siga corriendo.

---

### Paso 8.2: Levantar el Frontend

**Abre OTRA nueva terminal (PowerShell)**

```powershell
cd C:\ruta\al\proyecto\frontend

# Si tienes Bun
bun run dev

# Si usas npm
npm run dev
```

**✅ Salida esperada:**
```
  VITE v7.x.x  ready in XXX ms

  ➜  Local:   http://127.0.0.1:5173/
  ➜  Network: use --host to expose
```

**✅ Frontend listo en:** `http://127.0.0.1:5173`

**Deja esta terminal también abierta** para que el frontend siga corriendo.

---

### Paso 8.3: Acceder al Sistema

1. Abre tu navegador web (Chrome, Edge, Firefox)
2. Navega a: `http://127.0.0.1:5173`
3. Verás la pantalla de login del sistema

---

## 9. Credenciales de Acceso

### 👤 Usuarios Disponibles

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| **admin** | `ferchu123` | Administrador |
| **sandra** | `Sandra123` | Cajero |
| **fiore** | `Fiore123` | Cajero |

### 🔒 PostgreSQL (pgAdmin)

| Usuario | Contraseña |
|---------|-----------|
| **postgres** | `postgres` |

---

## 10. Solución de Problemas Comunes

### ❌ Problema: "La base de datos no existe"

**Solución:**
1. Verifica que hayas creado la base de datos `db_sistema_recibos`
2. Revisa el archivo `backend/.env`:
   ```env
   DB_NAME=db_sistema_recibos
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```

---

### ❌ Problema: "Error de conexión a PostgreSQL"

**Posibles causas:**

1. **PostgreSQL no está corriendo:**
   - Abre pgAdmin e intenta conectar
   - Si no conecta, inicia el servicio de PostgreSQL:
     ```powershell
     # Abrir PowerShell como Administrador
     Start-Service postgresql-x64-15
     ```

2. **Contraseña incorrecta:**
   - Verifica que la contraseña sea `postgres`
   - O cambia la contraseña en pgAdmin y actualiza `backend/.env`

3. **Puerto incorrecto:**
   - Asegúrate que PostgreSQL use el puerto `5432`

---

### ❌ Problema: "Las tablas no existen"

**Solución:**
1. Ejecuta el script `crear-tablas.sql` en pgAdmin
2. Verifica que no haya errores en la ejecución
3. Confirma que las tablas estén creadas en pgAdmin

---

### ❌ Problema: "Error al ejecutar seed"

**Solución:**
1. Verifica que las tablas existan primero
2. Asegúrate de estar en la carpeta `backend/` al ejecutar el comando
3. Revisa que el archivo `.env` esté configurado correctamente

---

### ❌ Problema: "No puedo hacer login en el sistema"

**Solución:**
1. Verifica que estés usando las credenciales correctas (ver sección 9)
2. En pgAdmin, consulta la tabla `usuarios`:
   ```sql
   SELECT * FROM usuarios;
   ```
3. Si no hay usuarios, ejecuta el seed nuevamente

---

### ❌ Problema: "Error: puerto ya en uso"

**Si el puerto 3000 está ocupado:**
```powershell
# Encontrar el proceso
Get-Process | Where-Object {$_.MainWindowTitle -like "*node*"}

# O usar el puerto específico
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

**Luego matar el proceso:**
```powershell
Stop-Process -Id <ID_DEL_PROCESO> -Force
```

---

### ❌ Problema: "Error de CORS en el navegador"

**Solución:**
1. Asegúrate de que AMBOS (backend y frontend) estén corriendo
2. Verifica el archivo `backend/.env`:
   ```env
   FRONTEND_URL=http://127.0.0.1:5173
   ```

---

## 📞 Soporte Adicional

Si encontrás un problema no listado aquí:

1. **Revisa los logs:**
   - Terminal del backend
   - Terminal del frontend
   - Consola del navegador (F12 → Console)

2. **Verifica archivos de configuración:**
   - `backend/.env`
   - `backend/src/app.module.ts`
   - `frontend/... (configuración de API)`

3. **Documentación adicional:**
   - `estructura_db_sistema_recibos.md` - Estructura de la base de datos

---

## ✅ Checklist de Instalación Completa

Antes de considerar que la instalación está lista, verifica:

- [ ] PostgreSQL 15 instalado y corriendo
- [ ] Base de datos `db_sistema_recibos` creada
- [ ] Tablas creadas correctamente (12 tablas)
- [ ] Backend instalado y funcionando (`bun run start:dev`)
- [ ] Frontend instalado y funcionando (`bun run dev`)
- [ ] Usuarios del sistema creados (`admin`, `sandra`, `fiore`)
- [ ] Puedo acceder a `http://127.0.0.1:5173`
- [ ] Puedo hacer login con el usuario `admin` / `ferchu123`

---

## 🎉 ¡Felicidades!

Si llegaste hasta aquí y todo funciona correctamente, el sistema está instalado y listo para usar.

**Para detener el sistema:**
- Presiona `Ctrl + C` en ambas terminales (backend y frontend)

**Para volver a iniciar:**
```powershell
# Terminal 1 - Backend
cd C:\ruta\al\proyecto\backend
bun run start:dev

# Terminal 2 - Frontend
cd C:\ruta\al\proyecto\frontend
bun run dev
```

---

**Versión:** 1.0
**Fecha:** 10/02/2026
**Sistema:** Sistema de Gestión de Recibos y Caja

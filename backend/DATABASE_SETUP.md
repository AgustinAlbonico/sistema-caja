# 🚀 Configuración de Base de Datos - Primera Vez

Este sistema requiere PostgreSQL y la ejecución de migraciones y seeds antes de iniciar la aplicación.

## ⚠️ IMPORTANTE: Ejecutar ANTES de iniciar el servidor

El backend NO funcionará sin ejecutar primero las migraciones de base de datos.

---

## 📋 Requisitos Previos

1. **PostgreSQL** instalado y corriendo en el puerto 5432 (o puerto configurado)
2. **Credenciales de acceso** a PostgreSQL

---

## 🛠️ Configuración Rápida (Automática)

### Paso 1: Configurar variables de entorno

```powershell
cd backend
cp .env.example .env
```

Luego edita `.env` con tus credenciales de PostgreSQL si son diferentes a las defaults:
```
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=db_sistema_recibos
```

### Paso 2: Ejecutar script de configuración

```powershell
powershell -ExecutionPolicy Bypass -File setup-database.ps1
```

Este script automáticamente:
- ✅ Verifica conexión a PostgreSQL
- ✅ Crea la base de datos si no existe
- ✅ Ejecuta todas las migraciones SQL
- ✅ Ejecuta el seed con los 3 usuarios

---

## 👥 Usuarios Iniciales

El script crea estos usuarios automáticamente:

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| **admin** | ferchu123 | Administrador |
| **sandra** | Sandra123 | Cajero |
| **fiore** | Fiore123 | Cajero |

---

## 🔧 Configuración Manual (Si falla el script)

### 1. Verificar conexión a PostgreSQL

```powershell
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "SELECT 1;"
```

### 2. Crear base de datos (si no existe)

```powershell
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "CREATE DATABASE ""db_sistema_recibos"";"
```

### 3. Ejecutar migraciones SQL (en orden)

```powershell
psql -h 127.0.0.1 -p 5432 -U postgres -d db_sistema_recibos -f src/database/migrations/001_create_usuarios_table.sql
psql -h 127.0.0.1 -p 5432 -U postgres -d db_sistema_recibos -f src/database/migrations/002_create_auditoria_table.sql
psql -h 127.0.0.1 -p 5432 -U postgres -d db_sistema_recibos -f src/database/migrations/003_add_auditoria_fields.sql
```

### 4. Ejecutar seed de usuarios

```powershell
cd backend
npm run seed:users
```

---

## 🚀 Iniciar el Backend

Después de completar la configuración de la base de datos:

```powershell
cd backend
npm run start:dev
```

El backend debe iniciar sin errores. Si ves errores como `relation "usuarios" does not exist`, significa que las migraciones no se ejecutaron correctamente.

---

## 🐛 Problemas Comunes

### Error: `relation "usuarios" does not exist`

**Causa**: Las migraciones SQL no se ejecutaron.

**Solución**: Ejecuta el script `setup-database.ps1` o las migraciones manualmente.

### Error: `password authentication failed for user "postgres"`

**Causa**: La contraseña configurada en `.env` no coincide con la real de PostgreSQL.

**Solución**: Verifica la contraseña en el archivo `.env`.

### Error: `could not connect to server`

**Causa**: PostgreSQL no está corriendo o el puerto es incorrecto.

**Solución**:
- Verifica que PostgreSQL esté corriendo: Verifica en el administrador de servicios de Windows
- Confirma el puerto en `DB_PORT` del archivo `.env`

---

## 📊 Estructura de Base de Datos

Después de las migraciones, tendrás estas tablas:

- **usuarios**: Usuarios del sistema con autenticación
- **auditoria**: Registro de todas las acciones (crear/actualizar/eliminar)
- **clientes** (modificada): Agregado campo `idUsuarioCreacion`
- **recibos** (modificada): Agregado campo `idUsuarioCreacion`
- **gastos** (modificada): Agregado campo `idUsuarioCreacion`
- **cajaDiaria** (modificada): Agregados campos `idUsuarioApertura` y `idUsuarioCierre`

---

## 🔄 Resetear la Base de Datos

Si necesitas empezar desde cero:

```powershell
# Eliminar base de datos
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "DROP DATABASE ""db_sistema_recibos"";"

# Volver a ejecutar el script de configuración
powershell -ExecutionPolicy Bypass -File setup-database.ps1
```

---

## 📚 Próximos Pasos

Después de configurar la base de datos:

1. **Iniciar el backend**: `npm run start:dev`
2. **Iniciar el frontend** (en otra terminal): `cd frontend && npm run dev`
3. **Ingresar al sistema**: http://127.0.0.1:5173/login

✅ ¡Listo para usar el sistema!

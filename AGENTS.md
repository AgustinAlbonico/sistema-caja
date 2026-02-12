# AGENTS.md - Guía para Agentes de Codificación

<!-- CLAVIX:START -->
# Clavix - Prompt Improvement Assistant
Clavix is installed in this project. Use slash commands: `/clavix:improve`, `/clavix:prd`, `/clavix:start`, `/clavix:summarize`
<!-- CLAVIX:END -->

---

# Estructura del Proyecto

Monorepo con **frontend** (React + Vite + Tauri) y **backend** (NestJS):
```
├── frontend/        # React 19, Vite, TypeScript, Tailwind CSS, React Router
├── backend/         # NestJS, TypeScript, TypeORM, PostgreSQL, Winston
└── src-tauri/      # Tauri app configuration
```

---

# Comandos de Build, Lint y Test

## Frontend (React + Vite)

Ejecutar desde `frontend/`:
| Comando | Descripción |
|---------|-------------|
| `bun run dev` | Iniciar servidor de desarrollo (Vite) |
| `bun run build` | Compilar para producción (`tsc -b && vite build`) |
| `bun run lint` | Ejecutar ESLint |
| `bun run tauri:dev` | Iniciar Tauri en modo desarrollo |

**Ejecutar un solo test**: `bun run test -- <ruta-del-test>`

## Backend (NestJS)

Ejecutar desde `backend/`:
| Comando | Descripción |
|---------|-------------|
| `bun run build` | Compilar NestJS |
| `bun run format` | Formatear código con Prettier |
| `bun run start:dev` | Iniciar en modo desarrollo con hot-reload |
| `bun run lint` | Ejecutar ESLint con `--fix` |
| `bun run test` | Ejecutar todos los tests |
| `bun run test:watch` | Ejecutar tests en modo watch |
| `bun run test:cov` | Ejecutar tests con coverage |
| `bun run test:e2e` | Ejecutar tests e2e |
| `bun run db:init` | Ejecutar seeds de la base de datos |

**Ejecutar un solo test**: `bun run test -- <ruta-del-test>.spec.ts`

---

# Convenciones de Código

## Nomenclatura

**SIEMPRE usar camelCase**: Variables `userName`, funciones `getUserData()`, tablas DB `userAccount`, columnas DB `userId`, `createdAt`, props React `interface Props { userName: string }`

## Importaciones

Agrupar: librerías externas → módulos internos (`@/...`) → relativas, separadas con líneas en blanco:
```typescript
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
```

## TypeScript

- **Frontend**: `strict: true`, **Backend**: `noImplicitAny: false`
- **NUNCA usar `any`** (preferir `unknown`)
- Preferir `interface` sobre `type` para formas de objetos
- Evitar aserciones de tipo (`as Type`), usar `readonly` para inmutables
- Aprovechar tipos de utilidad (`Partial<T>`, `Pick<T>`, `Omit<T>`)

## React

- Componentes funcionales con hooks, páginas en `pages/`, componentes en `components/`
- Hooks personalizados en `hooks/` (ej: `useAuth`, `useClientes`)
- Usar `clsx` + `tailwind-merge` para clases condicionales
- Validar props con TypeScript

## Backend (NestJS)

- **ValidationPipe** global: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- TypeORM para entidades (`@Entity`, `@Column`)
- `class-validator` para DTOs (`@IsString()`, `@IsOptional()`)
- Logging con **Winston** (`loggerService`)

## Base de Datos

- TypeORM, entidades en `backend/src/entities/`, seeds en `backend/src/database/`
- Tablas en snake_case: `user_account`, columnas en camelCase: `userId`, `createdAt`

## API

- Prefijo global `/api`, JWT Bearer tokens
- Frontend usa `fetchWithAuth()`, maneja 401 redirigiendo a `/login`

## Formato (Prettier)

Configuración: `{"singleQuote": true, "trailingComma": "all"}`

## Error Handling

- Nunca bloques catch vacíos, siempre try-catch con registro de contexto

## Code Quality

- Funciones < 20-30 líneas, máximo 3-4 niveles de anidación
- DRY, KISS, YAGNI, Single Responsibility
- Preferir retornos tempranos, extraer lógica compleja

---

# Reglas Globales - PowerShell

## Idioma

**SIEMPRE responder en español** - explicaciones, comentarios y documentación en español

## Comandos de Shell

SIEMPRE usar **PowerShell** en lugar de Bash. Equivalentes:
| Bash | PowerShell |
|-------|------------|
| `ls` | `Get-ChildItem` |
| `cat` | `Get-Content` |
| `grep` | `Select-String` |
| `rm` | `Remove-Item` |
| `mkdir` | `New-Item -ItemType Directory` |

## Ejecución de Scripts

**PREFERIR BUN** (`bun run <script>`), fallback a `npm` si no está disponible

## Seguridad

- NUNCA hardcodear secrets ni hacer commit de `.env`
- Sanitizar entradas de usuario, no registrar datos sensibles
- Usar consultas parametrizadas para DB

## Redes

**OBLIGATORIO**: IPv4 exclusivamente. Usar `127.0.0.1` en lugar de `localhost`

## Base de Datos

**OBLIGATORIO**: Revisar `.env` primero para credenciales (`DATABASE_URL`, `DB_HOST`, etc.) antes de pedir al usuario

## Archivos Temporales

**OBLIGATORIO**: Mantener registro de archivos temporales creados. Al finalizar, presentar listado y pedir permiso antes de eliminar

---

# Frontend Testing con Playwright

**OBLIGATORIO**: Todo cambio frontend debe ser probado

1. Parar backend y frontend
2. Verificar puerto 47832 (backend Tauri sidecar) - si está ocupado, usar el existente; si libre, levantar desde cero
3. Usar Playwright MCP con `--headed=false` (headless)
4. Navegar, interactuar, verificar comportamiento esperado
5. Documentar resultado con evidencia (screenshot/log)

**Autenticación**: Si hay login, revisar seeds primero para usuarios de prueba con el rol necesario. NUNCA crear usuarios sin autorización explícita.

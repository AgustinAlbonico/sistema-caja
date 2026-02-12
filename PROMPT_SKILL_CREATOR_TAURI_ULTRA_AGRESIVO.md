Copiá y pegá exactamente este prompt en la skill `skill-creator`:

Quiero que actúes como un arquitecto senior de skills para agentes de código. Necesito que me construyas una skill extremadamente robusta para migrar sistemas web a Tauri desktop en entorno LAN. No quiero una respuesta genérica ni teórica: quiero que absorbas este contexto real de producción, con errores concretos que ya sufrimos, y que diseñes una skill que obligue a prevenirlos desde el primer paso.

Mi contexto real de trabajo es este: desarrollo primero el sistema web con React (frontend), NestJS (backend), PostgreSQL (DB), y recién después lo migro a escritorio con Tauri para correr en muchas PCs dentro de una red LAN.

Necesito que esta skill sea fuerte, estricta y orientada a ejecución real, no a sugerencias blandas. Tiene que forzar observabilidad, diagnóstico y verificación técnica con evidencia.

Este historial de fallas es el corazón del contexto y quiero que lo uses completo:

- Sidecar del backend que no arranca después de instalar.
- Error recurrente en UI: "No se pudo conectar con el backend. Asegúrese de que el sidecar esté ejecutándose".
- Diferencias entre `dev` y `build/installador`, con comportamientos inconsistentes.
- Fallos de path/nombre de sidecar mal resuelto (`os error 2`).
- Fallos de extracción/copia por archivos bloqueados (`os error 32`).
- Estrategia `pkg` inestable (`MODULE_NOT_FOUND` en runtime snapshot).
- Necesidad de migrar a estrategia de runtime más robusta para backend empaquetado.
- Backend mostrando terminal al abrir app (quiero backend oculto, sin consola visible para usuarios finales).
- Falla al guardar configuración inicial: "No se pudo guardar la configuración".
- Parseo roto por BOM en JSON (`Unexpected token` al leer `config.json`).
- Problemas de encoding/serialización al persistir config desde Tauri.
- Setup avanza a login y luego aparece `failed to fetch`.
- Race conditions durante restart del backend tras guardar configuración.
- Endpoint inválido según modo (`Cannot POST /api/config/test` cuando backend no está en modo setup).
- Loop infinito setup/login por lógica de routing basada en supuestos equivocados.
- Necesidad de usar `/api/health` y estado real del backend como fuente de verdad para routing.
- Restricción no deseada de JWT secret mínimo 32 caracteres (quiero permitir longitud variable válida).
- Necesidad de forzar IPv4 (`127.0.0.1`) para backend local y evitar dependencia de `localhost`.
- Modelo LAN correcto: backend local en cada PC cliente, DB remota por IP fija del servidor en `database.host`.
- CRUD frontend con fallos silenciosos (ejemplo: crear cliente y no mostrar feedback útil).
- Error backend en create cliente: `Cannot read properties of undefined (reading "sub")`.
- Al agregar guard en clientes: `Nest can't resolve dependencies of JwtAuthGuard (JwtService)` por wiring incorrecto de módulos.
- Necesidad de importar/cablear correctamente AuthModule en módulos que usan guard.
- Necesidad de revisar logs primero siempre, antes de tocar código.
- Logs obligatorios:
  - `%APPDATA%/sistema-caja/debug_startup.log`
  - `%APPDATA%/sistema-caja/logs/error-YYYY-MM-DD.log`
  - `%APPDATA%/sistema-caja/logs/application-YYYY-MM-DD.log`
- Necesidad de validar backend con `start:dev` antes de rebuild completo de instalador para acelerar debug.
- Casos donde comandos/skills no aparecen hasta reiniciar sesión de herramienta.
- Fricción de portabilidad del skill entre OpenCode, Cursor y Claude Code.

También quiero que incorpores contexto técnico oficial de Tauri sidecars para evitar errores de base:

- `externalBin` debe estar correctamente configurado en `tauri.conf.json`.
- El naming del sidecar y su resolución deben ser consistentes entre configuración, runtime y capabilities.
- Diferencias de ejecución desde Rust y desde JavaScript (`plugin-shell`) deben quedar explícitas.
- Permisos/capabilities de shell (`allow-execute` / `allow-spawn`) deben estar contemplados.
- Considerar el manejo correcto de argumentos permitidos en capabilities.
- Asegurar comportamiento consistente entre modo desarrollo y app instalada.

Y quiero que tengas en cuenta el ecosistema skills.sh para que la skill resultante sea realmente instalable y reutilizable:

- Debe quedar lista para instalar con `npx skills add`.
- Debe usar frontmatter YAML válido en `SKILL.md` (`name`, `description`).
- Debe estar pensada para convivir con otros agentes (OpenCode, Cursor, Claude, Codex).
- Debe evitar ambigüedades para que cualquier agente la ejecute bien sin contexto previo.

Necesito que al diseñar esta skill impongas un comportamiento muy estricto:

- Diagnóstico primero, implementación después.
- Logs primero, hipótesis después.
- Verificación obligatoria después de cada cambio relevante.
- Nada de "capaz", "podría", "quizás" sin validación.
- Nada de cambios a ciegas sin evidencia en logs o checks.
- Nada de cerrar tarea si no hay pruebas mínimas de que setup, login y CRUD funcionan.

Quiero que la skill obligue un flujo operativo duro (sin llamarlo formalmente por secciones rígidas), donde el agente:

1) inspecciona contexto y logs,
2) identifica modo real del backend,
3) valida sidecar, rutas y capabilities,
4) corrige config lifecycle (guardar, leer, encoding, restart),
5) corrige routing setup/login según health real,
6) corrige auth/guard wiring,
7) valida UX de errores (sin fallos silenciosos),
8) corre verificaciones técnicas antes de release,
9) documenta evidencia concreta.

Quiero que la skill deje muy claro cuándo NO avanzar y qué bloquear:

- si no hay logs recientes,
- si no se puede confirmar health backend,
- si hay mismatch de sidecar name/path,
- si hay rutas de setup inconsistentes,
- si hay dependencia de localhost en vez de IPv4 explícita,
- si hay errores de DI en NestJS no resueltos,
- si el frontend oculta errores críticos al usuario.

Necesito que la skill resultante no sea "tutorial" sino "runbook de combate", con lenguaje claro y accionable, centrado en prevenir reincidencias de estos problemas.

No quiero que me expliques qué vas a hacer: hacelo.
No me des placeholders ni TODOs vacíos.
No reduzcas el contexto para simplificar.
No omitas ninguno de los incidentes listados.

Quiero que me devuelvas una skill que cualquier agente pueda usar de forma repetible para ejecutar una migración web a Tauri LAN con nivel de producción, minimizando retrabajo, errores de empaquetado, errores de arranque, loops de setup/login y fallas silenciosas.

Si detectás contradicciones, resolvelas priorizando estabilidad de runtime, trazabilidad por logs y reproducibilidad del proceso.

Importante: no uses encabezados llamados "Entregables" ni "Requisitos". Mantené una redacción directa y orientada a ejecución.

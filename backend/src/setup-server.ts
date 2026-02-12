import * as http from 'http';
import { Client } from 'pg';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import {
  ensureConfigDirectory,
  getPreferredConfigFilePath,
  getReadableConfigPathCandidates,
} from './common/config/runtime-paths';

/**
 * Servidor HTTP ligero para el "modo setup" (primera ejecución).
 * NO depende de NestJS ni TypeORM.
 * Sirve endpoints para probar la conexión a la BD y señalizar reinicio.
 *
 * Flujo:
 * 1. main.ts detecta que no puede conectar a PostgreSQL
 * 2. Arranca este servidor en el mismo puerto (47832)
 * 3. El frontend (SetupConfigPage) puede probar conexiones via POST /api/config/test
 * 4. Cuando el usuario guarda la config y llama POST /api/config/restart,
 *    este servidor se cierra y main.ts reintenta el bootstrap con la nueva config
 */

// ─── Helpers HTTP ────────────────────────────────────────────────────────────

interface JsonBody {
  [key: string]: unknown;
}

function parseJsonBody(req: http.IncomingMessage): Promise<JsonBody> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  data: unknown,
): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ─── Test de conexión PostgreSQL ─────────────────────────────────────────────

interface DbConnectionParams {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

interface PersistedConfig {
  port: number;
  host: string;
  database: DbConnectionParams;
  jwt: {
    secret: string;
    expiration: string;
  };
  schemaVersion: string;
  frontendUrl?: string;
}

function getConfigFilePathForRead(): string {
  if (process.env.APP_CONFIG_PATH) {
    ensureConfigDirectory(process.env.APP_CONFIG_PATH);
    return process.env.APP_CONFIG_PATH;
  }

  for (const candidate of getReadableConfigPathCandidates()) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  const targetPath = getPreferredConfigFilePath();
  ensureConfigDirectory(targetPath);
  return targetPath;
}

function getConfigFilePathForWrite(): string {
  const targetPath = getPreferredConfigFilePath();
  ensureConfigDirectory(targetPath);
  return targetPath;
}

function parseCurrentConfig(): PersistedConfig | null {
  const configFilePath = getConfigFilePathForRead();
  if (!existsSync(configFilePath)) {
    return null;
  }

  const rawConfig = readFileSync(configFilePath, 'utf-8');
  return JSON.parse(rawConfig.replace(/^\uFEFF/, '')) as PersistedConfig;
}

function writeConfig(config: PersistedConfig): void {
  const configFilePath = getConfigFilePathForWrite();
  writeFileSync(configFilePath, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
  });
}

function isValidConfigPayload(payload: unknown): payload is PersistedConfig {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const payloadRecord = payload as Record<string, unknown>;
  const hasDatabase =
    typeof payloadRecord.database === 'object' &&
    payloadRecord.database !== null;
  const hasJwt =
    typeof payloadRecord.jwt === 'object' && payloadRecord.jwt !== null;

  if (!hasDatabase || !hasJwt) {
    return false;
  }

  const database = payloadRecord.database as Record<string, unknown>;
  const jwt = payloadRecord.jwt as Record<string, unknown>;

  return (
    typeof payloadRecord.port === 'number' &&
    typeof payloadRecord.host === 'string' &&
    typeof database.host === 'string' &&
    typeof database.port === 'number' &&
    typeof database.username === 'string' &&
    typeof database.password === 'string' &&
    typeof database.database === 'string' &&
    typeof jwt.secret === 'string' &&
    typeof jwt.expiration === 'string' &&
    typeof payloadRecord.schemaVersion === 'string'
  );
}

async function testPgConnection(
  params: DbConnectionParams,
): Promise<{ success: boolean; message: string }> {
  const client = new Client({
    host: params.host,
    port: params.port || 5432,
    user: params.username,
    password: params.password || '',
    database: params.database,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return { success: true, message: 'Conexión exitosa a la base de datos' };
  } catch (error) {
    try {
      await client.end();
    } catch {
      /* ignorar error al cerrar */
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Error de conexión: ${errorMessage}` };
  }
}

// ─── Servidor Setup ──────────────────────────────────────────────────────────

/**
 * Arranca un servidor HTTP ligero que sirve los endpoints de configuración.
 * La promesa se resuelve cuando se llama a POST /api/config/restart,
 * permitiendo que main.ts continúe con el bootstrap normal de NestJS.
 */
export function runSetupServer(host: string, port: number): Promise<void> {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      // Headers CORS para todas las respuestas
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Accept',
      );

      // Preflight CORS
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = req.url;
      const method = req.method;

      try {
        // GET /api/health - indica que estamos en modo setup
        if (method === 'GET' && url === '/api/health') {
          sendJson(res, 200, {
            status: 'setup',
            message:
              'Backend en modo configuración. Configure la base de datos.',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // GET /api - respuesta básica para verificar que el servidor está vivo
        if (method === 'GET' && url === '/api') {
          sendJson(res, 200, { status: 'setup' });
          return;
        }

        // POST /api/config/test - probar conexión a PostgreSQL
        if (method === 'POST' && url === '/api/config/test') {
          const body = await parseJsonBody(req);

          const dbHost = body.host as string | undefined;
          const dbPort = body.port as number | undefined;
          const username = body.username as string | undefined;
          const password = body.password as string | undefined;
          const database = body.database as string | undefined;

          if (!dbHost || !username || !database) {
            sendJson(res, 400, {
              success: false,
              message: 'Faltan campos requeridos: host, username, database',
            });
            return;
          }

          const result = await testPgConnection({
            host: dbHost,
            port: dbPort || 5432,
            username,
            password: password || '',
            database,
          });

          sendJson(res, result.success ? 200 : 400, result);
          return;
        }

        // GET /api/config/current - leer configuración persistida (si existe)
        if (method === 'GET' && url === '/api/config/current') {
          const currentConfig = parseCurrentConfig();
          if (!currentConfig) {
            sendJson(res, 404, {
              message: 'No existe configuración persistida',
            });
            return;
          }

          sendJson(res, 200, currentConfig);
          return;
        }

        // POST /api/config/save - guardar configuración persistida
        if (method === 'POST' && url === '/api/config/save') {
          const body = await parseJsonBody(req);
          if (!isValidConfigPayload(body)) {
            sendJson(res, 400, {
              message: 'Payload de configuración inválido',
            });
            return;
          }

          writeConfig(body);
          sendJson(res, 200, {
            success: true,
            message: 'Configuración guardada correctamente',
          });
          return;
        }

        // POST /api/config/restart - señal para salir del modo setup
        if (method === 'POST' && url === '/api/config/restart') {
          sendJson(res, 200, {
            success: true,
            message: 'Reiniciando backend con nueva configuración...',
          });

          // Cerrar el servidor después de enviar la respuesta
          // Esto resuelve la promesa y permite que main.ts continúe
          setTimeout(() => {
            server.close(() => {
              resolve();
            });
          }, 500);
          return;
        }

        // Cualquier otro endpoint no disponible en modo setup
        sendJson(res, 404, { message: 'Endpoint no disponible en modo setup' });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error('[setup-server] Error procesando request:', errorMessage);
        sendJson(res, 500, { message: `Error interno: ${errorMessage}` });
      }
    });

    server.listen(port, host, () => {
      console.log(
        `🔧 Backend en MODO SETUP - Escuchando en http://${host}:${port}/api`,
      );
      console.log('   Esperando configuración de base de datos...');
    });
  });
}

/**
 * Prueba si la conexión a PostgreSQL es posible con la configuración actual.
 * Usado por main.ts para decidir si arrancar en modo setup o modo normal.
 */
export async function testDatabaseConnection(
  config: DbConnectionParams,
): Promise<boolean> {
  const result = await testPgConnection(config);
  return result.success;
}

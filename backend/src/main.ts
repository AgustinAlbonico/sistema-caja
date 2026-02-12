// Polyfill globalThis.crypto para Node 18 (pkg no incluye Web Crypto en globalThis)
// @nestjs/typeorm usa crypto.randomUUID() que requiere esto
import { webcrypto } from 'node:crypto';
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { appendFileSync } from 'fs';
import { Client } from 'pg';

// --- DEBUG LOGGING ---
// Logger de emergencia pre-NestJS
try {
  const debugLogDir = getLogsDirectoryPath();
  const debugLogFile = `${debugLogDir}\\debug-startup.log`;
  const timestamp = new Date().toISOString();

  appendFileSync(
    debugLogFile,
    `[${timestamp}] --- INICIO DEL PROCESO BACKEND ---\n`,
  );

  process.on('uncaughtException', (err) => {
    const time = new Date().toISOString();
    try {
      appendFileSync(
        debugLogFile,
        `[${time}] UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}\n`,
      );
    } catch (e) {
      /* ignorar fallo de escritura */
    }
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const time = new Date().toISOString();
    const rejectionMessage =
      reason instanceof Error ? reason.message : String(reason);
    try {
      appendFileSync(
        debugLogFile,
        `[${time}] UNHANDLED REJECTION: ${rejectionMessage}\n`,
      );
    } catch (e) {
      /* ignorar fallo de escritura */
    }
  });
} catch (e) {
  // Fallo catastrófico al intentar loguear
}
// --- END DEBUG LOGGING ---

import { AppModule } from './app.module';
import { initializeDatabase } from './database/init-database';
import { AppConfigService } from './common/config/app-config.service';
import { loggerService } from './common/logger/logger.service';
import { getLogsDirectoryPath } from './common/config/runtime-paths';

/**
 * Arranca NestJS normalmente (modo producción).
 * Requiere que la base de datos ya esté accesible.
 */
async function startNestApp(
  appConfig: ReturnType<typeof AppConfigService.getConfig>,
) {
  const app = await NestFactory.create(AppModule, {
    logger: loggerService,
  });

  app.useLogger(loggerService);
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Inicializar BD: crear tablas, índices y seeds si es la primera vez
  const dataSource = app.get(DataSource);
  await initializeDatabase(dataSource);

  const url = `http://${appConfig.host}:${appConfig.port}/api`;
  loggerService.log(
    `🚀 Backend iniciando en ${appConfig.host}:${appConfig.port}`,
  );
  await app.listen(appConfig.port, appConfig.host);
  loggerService.log(`✅ Backend escuchando en ${url}`);
}

async function testDatabaseConnection(config: {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}): Promise<boolean> {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch {
    try {
      await client.end();
    } catch {
      // ignore close error
    }
    return false;
  }
}

async function bootstrap() {
  try {
    const appConfig = AppConfigService.loadConfig();

    // Probar conexión a la base de datos
    console.log(
      `🔍 Probando conexión a PostgreSQL ${appConfig.database.host}:${appConfig.database.port}/${appConfig.database.database}...`,
    );
    const dbOk = await testDatabaseConnection(appConfig.database);

    if (dbOk) {
      console.log('✅ Conexión a PostgreSQL exitosa, arrancando NestJS...');
      await startNestApp(appConfig);
      return;
    }

    console.error('❌ No se pudo conectar a PostgreSQL con la configuración actual.');
    console.error('   Verifique C:\\SistemaCajaEstudio\\config\\.env y sincronice config.json.');
    process.exit(1);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    loggerService.error(
      `❌ Error fatal durante el inicio: ${error.message}`,
      error.stack,
    );
    process.exit(1);
  }
}

bootstrap();

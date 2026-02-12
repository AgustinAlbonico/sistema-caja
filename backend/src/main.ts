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
import { runSetupServer, testDatabaseConnection } from './setup-server';
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

/**
 * Bootstrap de dos fases:
 * 1. Intenta conectar a PostgreSQL con la config actual
 * 2. Si falla → modo setup (servidor HTTP ligero sin TypeORM)
 * 3. Cuando el usuario configura la DB y llama /api/config/restart → re-carga config y arranca NestJS
 */
async function bootstrap() {
  try {
    const hasPersistedConfig = AppConfigService.configFileExists();

    // Cargar (o crear) configuración desde %APPDATA%\sistema-caja\config.json
    let appConfig = AppConfigService.loadConfig();

    if (!hasPersistedConfig) {
      console.log(
        'ℹ️  Primera ejecución detectada (sin config.json). Entrando en MODO SETUP obligatorio...',
      );
      console.log(
        '   Configure la IP fija del servidor de base de datos para esta PC.',
      );

      await runSetupServer(appConfig.host, appConfig.port);

      console.log('🔄 Recargando configuración guardada por el setup...');
      AppConfigService.resetConfig();
      appConfig = AppConfigService.loadConfig();

      console.log(
        `🔍 Probando conexión a PostgreSQL ${appConfig.database.host}:${appConfig.database.port}/${appConfig.database.database}...`,
      );
      const setupDbOk = await testDatabaseConnection(appConfig.database);

      if (!setupDbOk) {
        console.error(
          '❌ La conexión a PostgreSQL falló con la configuración ingresada en setup.',
        );
        console.error(
          '   Verifique IP/puerto/usuario/contraseña y vuelva a intentar.',
        );
        process.exit(1);
      }

      console.log('✅ Conexión a PostgreSQL exitosa, arrancando NestJS...');
      await startNestApp(appConfig);
      return;
    }

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

    // La BD no está disponible → modo setup
    console.log(
      '⚠️  No se pudo conectar a PostgreSQL. Entrando en MODO SETUP...',
    );
    console.log('   El frontend mostrará la página de configuración.');

    // Servidor liviano que espera hasta que el usuario configure y llame /api/config/restart
    await runSetupServer(appConfig.host, appConfig.port);

    // El usuario guardó la config y llamó restart → re-leer la config actualizada
    console.log('🔄 Recargando configuración...');
    AppConfigService.resetConfig();
    appConfig = AppConfigService.loadConfig();

    console.log(
      `🔍 Re-probando conexión a PostgreSQL ${appConfig.database.host}:${appConfig.database.port}/${appConfig.database.database}...`,
    );
    const dbOkRetry = await testDatabaseConnection(appConfig.database);

    if (!dbOkRetry) {
      console.error(
        '❌ La conexión a PostgreSQL sigue fallando después de la configuración.',
      );
      console.error(
        '   El backend se cerrará. Verifique los datos de conexión e intente de nuevo.',
      );
      process.exit(1);
    }

    console.log('✅ Conexión a PostgreSQL exitosa, arrancando NestJS...');
    await startNestApp(appConfig);
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

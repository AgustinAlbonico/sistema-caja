import * as fs from 'fs';

import {
  ensureConfigDirectory,
  getPreferredConfigFilePath,
  getReadableConfigPathCandidates,
} from './runtime-paths';

/**
 * Interfaz que define la estructura del config.json
 */
export interface AppConfig {
  port: number;
  host: string;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  jwt: {
    secret: string;
    expiration: string;
  };
  schemaVersion: string;
  frontendUrl?: string;
}

/**
 * Servicio que lee la configuración desde APP_CONFIG_PATH (si está definido)
 * o desde C:\SistemaCajaEstudio\config\config.json.
 * Mantiene fallback legacy a %APPDATA%\sistema-caja\config.json para migración.
 */
export class AppConfigService {
  private static config: AppConfig | null = null;

  private static resolveReadableConfigFilePath(): string | null {
    const candidates = getReadableConfigPathCandidates();
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  static configFileExists(): boolean {
    return this.resolveReadableConfigFilePath() !== null;
  }

  /**
   * Lee el archivo config.json desde APP_CONFIG_PATH o runtime central.
   * Si no existe, usa valores por defecto para desarrollo
   */
  static loadConfig(): AppConfig {
    if (this.config) {
      return this.config;
    }

    const configFilePath = this.resolveReadableConfigFilePath();

    if (!configFilePath) {
      console.warn(
        '⚠️  Archivo config.json no encontrado en rutas central/legacy, usando configuración por defecto en memoria...',
      );
      console.warn(
        '   El frontend debería mostrar la página de configuración inicial.',
      );
      this.config = this.getDefaultConfig();
      return this.config;
    }

    console.log(`📁 Intentando leer configuración desde: ${configFilePath}`);

    // Si el archivo no existe, usar defaults en memoria (NO escribir a disco)
    // para que el frontend detecte la primera ejecución y muestre la página de setup
    // Leer y parsear el archivo existente
    try {
      const fileContent = fs.readFileSync(configFilePath, 'utf-8');
      const normalizedContent = fileContent.replace(/^\uFEFF/, '');
      this.config = JSON.parse(normalizedContent);

      const preferredPath = getPreferredConfigFilePath();
      if (preferredPath !== configFilePath && !fs.existsSync(preferredPath)) {
        ensureConfigDirectory(preferredPath);
        fs.writeFileSync(preferredPath, JSON.stringify(this.config, null, 2), {
          encoding: 'utf-8',
        });
        console.log(`ℹ️  Configuración migrada a ruta central: ${preferredPath}`);
      }

      console.log(`✅ Configuración cargada desde: ${configFilePath}`);
      console.log(`   - Puerto: ${this.config!.port}`);
      console.log(`   - Host: ${this.config!.host}`);
      console.log(
        `   - Base de datos: ${this.config!.database.host}:${this.config!.database.port}/${this.config!.database.database}`,
      );
      return this.config!;
    } catch (error) {
      throw new Error(
        `Error al leer config.json: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Retorna la configuración por defecto (sin escribir a disco).
   * Usada en primera ejecución cuando no existe config.json.
   */
  private static getDefaultConfig(): AppConfig {
    return {
      port: 47832,
      host: '127.0.0.1',
      database: {
        host: '127.0.0.1',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: 'db_sistema_recibos',
      },
      jwt: {
        secret: 'ferchu123',
        expiration: '7d',
      },
      schemaVersion: '1.0.0',
      frontendUrl: 'http://127.0.0.1:5173',
    };
  }

  /**
   * Obtiene la configuración actual (debe llamarse loadConfig() primero)
   */
  static getConfig(): AppConfig {
    if (!this.config) {
      throw new Error(
        'Configuración no cargada. Llamar a loadConfig() primero.',
      );
    }
    return this.config;
  }

  /**
   * Limpia la configuración cacheada para forzar re-lectura desde disco.
   * Usado después de que el usuario guarda nuevos datos en el setup.
   */
  static resetConfig(): void {
    this.config = null;
  }

  static getWritableConfigFilePath(): string {
    const targetPath = getPreferredConfigFilePath();
    ensureConfigDirectory(targetPath);
    return targetPath;
  }
}

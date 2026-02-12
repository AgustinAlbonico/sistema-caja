import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Endpoint de health check para verificar que el backend y la base de datos están funcionando
   * El frontend puede usar este endpoint para saber si el backend está disponible
   */
  @Get('health')
  async getHealth() {
    try {
      // Verificar conexión a la base de datos
      const isConnected = this.dataSource.isInitialized;

      // Hacer una query simple para verificar que la conexión es funcional
      let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
      let dbError: string | null = null;

      if (isConnected) {
        try {
          await this.dataSource.query('SELECT 1');
          dbStatus = 'connected';
        } catch (error) {
          dbStatus = 'error';
          dbError = error instanceof Error ? error.message : String(error);
        }
      }

      return {
        status: dbStatus === 'connected' ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatus,
          error: dbError,
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

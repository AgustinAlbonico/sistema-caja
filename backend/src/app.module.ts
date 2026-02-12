import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { CajaModule } from './modules/caja/caja.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { GastosModule } from './modules/gastos/gastos.module';
import { MetodosPagoModule } from './modules/metodos-pago/metodos-pago.module';
import { RecibosModule } from './modules/recibos/recibos.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { ConceptosModule } from './modules/conceptos/conceptos.module';
import { AppConfigService } from './common/config/app-config.service';

@Module({
  imports: [
    // Usar forRootAsync para que la config se lea al momento de crear el módulo,
    // no a nivel de archivo (que se ejecuta al importar y puede crashear si la DB no existe)
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const appConfig = AppConfigService.getConfig();
        return {
          type: 'postgres' as const,
          host: appConfig.database.host,
          port: appConfig.database.port,
          username: appConfig.database.username,
          password: appConfig.database.password,
          database: appConfig.database.database,
          synchronize: false,
          autoLoadEntities: true,
        };
      },
    }),
    AuthModule,
    UsuariosModule,
    ClientesModule,
    MetodosPagoModule,
    RecibosModule,
    CajaModule,
    GastosModule,
    ReportsModule,
    AuditoriaModule,
    ConceptosModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Gasto } from '../../database/entities/gasto.entity';
import { GastoPago } from '../../database/entities/gasto-pago.entity';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import { MovimientoCaja } from '../../database/entities/movimiento-caja.entity';
import { GastoDescripcion } from '../../database/entities/gasto-descripcion.entity';
import { AuthModule } from '../auth/auth.module';
import { CajaModule } from '../caja/caja.module';
import { GastosController } from './gastos.controller';
import { GastosService } from './gastos.service';
import { GastoDescripcionesController } from './gasto-descripciones.controller';
import { GastoDescripcionesService } from './gasto-descripciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Gasto,
      GastoPago,
      MetodoPago,
      MovimientoCaja,
      GastoDescripcion,
    ]),
    CajaModule,
    AuthModule,
  ],
  controllers: [GastosController, GastoDescripcionesController],
  providers: [GastosService, GastoDescripcionesService],
})
export class GastosModule {}

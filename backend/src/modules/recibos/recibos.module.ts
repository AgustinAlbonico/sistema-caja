import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Cliente } from '../../database/entities/cliente.entity';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import { MovimientoCaja } from '../../database/entities/movimiento-caja.entity';
import { Pago } from '../../database/entities/pago.entity';
import { Recibo } from '../../database/entities/recibo.entity';
import { ReciboItem } from '../../database/entities/recibo-item.entity';
import { AuthModule } from '../auth/auth.module';
import { CajaModule } from '../caja/caja.module';
import { PdfModule } from '../pdf/pdf.module';
import { RecibosController } from './recibos.controller';
import { RecibosService } from './recibos.service';
import { ConceptosModule } from '../conceptos/conceptos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Recibo,
      ReciboItem,
      Pago,
      Cliente,
      MetodoPago,
      MovimientoCaja,
    ]),
    AuthModule,
    CajaModule,
    PdfModule,
    ConceptosModule,
  ],
  controllers: [RecibosController],
  providers: [RecibosService],
})
export class RecibosModule {}

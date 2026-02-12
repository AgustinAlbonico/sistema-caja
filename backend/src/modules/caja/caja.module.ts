import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CajaDiaria } from '../../database/entities/caja-diaria.entity';
import { MovimientoCaja } from '../../database/entities/movimiento-caja.entity';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { AuthModule } from '../auth/auth.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CajaDiaria, MovimientoCaja]),
    AuthModule,
    PdfModule,
  ],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService],
})
export class CajaModule {}

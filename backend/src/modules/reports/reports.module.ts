import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientoCaja } from '../../database/entities/movimiento-caja.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([MovimientoCaja])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

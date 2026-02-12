import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Concepto } from '../../database/entities/concepto.entity';
import { ConceptosController } from './conceptos.controller';
import { ConceptosService } from './conceptos.service';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Concepto]), AuthModule],
  controllers: [ConceptosController],
  providers: [ConceptosService],
  exports: [ConceptosService],
})
export class ConceptosModule {}

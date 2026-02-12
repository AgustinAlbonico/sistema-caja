import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';

import { Auditoria } from '../../database/entities/auditoria.entity';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { getNowArgentina } from '../../utils/date.utils';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
  ) {}

  async registrarAccion(dto: CreateAuditoriaDto): Promise<Auditoria> {
    const auditoria = this.auditoriaRepository.create({
      ...dto,
      fechaAccion: getNowArgentina(),
    });
    return this.auditoriaRepository.save(auditoria);
  }

  async obtenerAuditoria(filtros: {
    idUsuario?: number;
    entidad?: string;
    accion?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Auditoria[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const {
      idUsuario,
      entidad,
      accion,
      fechaDesde,
      fechaHasta,
      page = 1,
      limit = 20,
    } = filtros;

    const where: FindOptionsWhere<Auditoria> = {};

    if (idUsuario) {
      where.idUsuario = idUsuario;
    }

    if (entidad) {
      where.entidad = entidad;
    }

    if (accion) {
      where.accion = accion;
    }

    if (fechaDesde && fechaHasta) {
      where.fechaAccion = Between(fechaDesde, fechaHasta);
    }

    const [data, total] = await this.auditoriaRepository.findAndCount({
      where,
      relations: ['usuario'],
      order: { fechaAccion: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async obtenerPorUsuario(idUsuario: number, page = 1, limit = 20) {
    return this.obtenerAuditoria({ idUsuario, page, limit });
  }

  async obtenerPorEntidad(
    entidad: string,
    idEntidad?: number,
    page = 1,
    limit = 20,
  ) {
    const filtros: any = { entidad, page, limit };
    if (idEntidad) {
      filtros.idEntidad = idEntidad;
    }
    return this.obtenerAuditoria(filtros);
  }
}

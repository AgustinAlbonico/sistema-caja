import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';

import { AuditoriaService } from './auditoria.service';

@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('idUsuario') idUsuario?: string,
    @Query('entidad') entidad?: string,
    @Query('accion') accion?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.auditoriaService.obtenerAuditoria({
      page: Number(page),
      limit: Number(limit),
      idUsuario: idUsuario ? Number(idUsuario) : undefined,
      entidad,
      accion,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    });
  }

  @Get('usuario/:idUsuario')
  findByUsuario(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.auditoriaService.obtenerPorUsuario(
      idUsuario,
      Number(page),
      Number(limit),
    );
  }

  @Get('entidad/:entidad')
  findByEntidad(
    @Param('entidad') entidad: string,
    @Query('idEntidad') idEntidad?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.auditoriaService.obtenerPorEntidad(
      entidad,
      idEntidad ? Number(idEntidad) : undefined,
      Number(page),
      Number(limit),
    );
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getTodayArgentina } from '../../utils/date.utils';
import { CajaService } from './caja.service';
import { PdfService } from '../pdf/pdf.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { ReabrirCajaDto } from './dto/reabrir-caja.dto';

@Controller('caja-diaria')
export class CajaController {
  constructor(
    private readonly cajaService: CajaService,
    private readonly pdfService: PdfService,
  ) {}

  @Post('abrir')
  @UseGuards(JwtAuthGuard)
  abrir(@Body() dto: AbrirCajaDto, @Request() req) {
    const idUsuario = req.user?.sub;
    return this.cajaService.abrirCaja(dto.fecha, dto.saldoInicial, idUsuario);
  }

  @Post('cerrar')
  @UseGuards(JwtAuthGuard)
  cerrar(@Body() dto: CerrarCajaDto, @Request() req) {
    const idUsuario = req.user?.sub;
    return this.cajaService.cerrarCaja(dto.fecha, dto.saldoFinal, idUsuario);
  }

  @Post('reabrir')
  @UseGuards(JwtAuthGuard)
  reabrir(@Body() dto: ReabrirCajaDto, @Request() req) {
    const idUsuario = req.user?.sub;
    return this.cajaService.reabrirCaja(dto.fecha, idUsuario);
  }

  @Get('verificar-pendientes/:fechaHoy')
  @UseGuards(JwtAuthGuard)
  async verificarCajasPendientes(@Param('fechaHoy') fechaHoy: string) {
    const cajasPendientes =
      await this.cajaService.verificarCajasAbiertasAnteriores(fechaHoy);
    return {
      pendientes: cajasPendientes,
      cantidad: cajasPendientes.length,
    };
  }

  @Post('cerrar-automaticamente')
  @UseGuards(JwtAuthGuard)
  async cerrarCajasAutomaticamente() {
    const fechaHoy = getTodayArgentina();
    const cajasCerradas =
      await this.cajaService.cerrarCajasAbiertasAutomaticamente(fechaHoy);
    return {
      cerradas: cajasCerradas,
      cantidad: cajasCerradas.length,
      mensaje:
        cajasCerradas.length > 0
          ? `Se han cerrado ${cajasCerradas.length} cajas automáticamente`
          : 'No había cajas pendientes de cierre',
    };
  }

  @Get(':fecha/pdf')
  @UseGuards(JwtAuthGuard)
  async generarPdf(@Param('fecha') fecha: string, @Res() res: Response) {
    const resumen = await this.cajaService.getResumen(fecha);

    // Validar que haya movimientos antes de generar el PDF
    if (!resumen.movimientos || resumen.movimientos.length === 0) {
      throw new BadRequestException(
        'No se puede generar el PDF: no hay movimientos registrados para esta fecha',
      );
    }

    const pdf = await this.pdfService.generarCajaPdf(
      fecha,
      resumen.caja,
      resumen.movimientos,
      resumen.ingresos,
      resumen.egresos,
      resumen.saldoFinal,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="caja-${fecha}.pdf"`,
      'Content-Length': pdf.length.toString(),
    });

    res.send(pdf);
  }

  @Get(':fecha')
  resumen(
    @Param('fecha') fecha: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.cajaService.getResumen(fecha, pageNum, limitNum);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { CreateReciboDto } from './dto/create-recibo.dto';
import { RecibosService } from './recibos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    nombreUsuario: string;
    nombreCompleto: string;
  };
}

@Controller('recibos')
export class RecibosController {
  constructor(private readonly recibosService: RecibosService) {}

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('q') search?: string,
    @Query('idCliente') idCliente?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.recibosService.findAll(
      Number(page),
      Number(limit),
      search,
      idCliente ? Number(idCliente) : undefined,
      startDate,
      endDate,
    );
  }

  @Get('ultimo')
  @UseGuards(JwtAuthGuard)
  async getUltimoRecibo() {
    return this.recibosService.getUltimoRecibo();
  }

  @Get(':idRecibo')
  findOne(@Param('idRecibo', ParseIntPipe) idRecibo: number) {
    return this.recibosService.findOne(idRecibo);
  }

  @Get(':idRecibo/pdf')
  @Header('Content-Type', 'application/pdf')
  @UseGuards(JwtAuthGuard)
  async generarPdf(
    @Param('idRecibo', ParseIntPipe) idRecibo: number,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.recibosService.generarPdf(idRecibo);

    // Enviar el PDF como respuesta
    res.send(pdfBuffer);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateReciboDto, @Req() req: RequestWithUser) {
    return this.recibosService.create(dto, req.user.sub);
  }

  @Delete('ultimo')
  @UseGuards(JwtAuthGuard)
  async anularUltimoRecibo(@Req() req: RequestWithUser) {
    return this.recibosService.anularUltimoRecibo(req.user.sub);
  }

  @Delete(':idRecibo')
  @UseGuards(JwtAuthGuard)
  async eliminarRecibo(
    @Param('idRecibo', ParseIntPipe) idRecibo: number,
    @Req() req: RequestWithUser,
  ) {
    return this.recibosService.eliminarRecibo(idRecibo, req.user.sub);
  }
}

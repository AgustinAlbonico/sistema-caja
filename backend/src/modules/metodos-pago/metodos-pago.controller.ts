import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { MetodosPagoService } from './metodos-pago.service';

@Controller('metodos-pago')
export class MetodosPagoController {
  constructor(private readonly metodosService: MetodosPagoService) {}

  @Get()
  findAll() {
    return this.metodosService.findAll();
  }

  @Get(':idMetodoPago')
  findOne(@Param('idMetodoPago', ParseIntPipe) idMetodoPago: number) {
    return this.metodosService.findOne(idMetodoPago);
  }
}

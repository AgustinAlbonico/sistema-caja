import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';
import { GastosService } from './gastos.service';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    nombreUsuario: string;
    nombreCompleto: string;
  };
}

@Controller('gastos')
export class GastosController {
  constructor(private readonly gastosService: GastosService) {}

  @Get()
  findAll() {
    return this.gastosService.findAll();
  }

  @Get(':idGasto')
  findOne(@Param('idGasto', ParseIntPipe) idGasto: number) {
    return this.gastosService.findOne(idGasto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateGastoDto, @Req() req: RequestWithUser) {
    return this.gastosService.create(dto, req.user.sub);
  }

  @Put(':idGasto')
  update(
    @Param('idGasto', ParseIntPipe) idGasto: number,
    @Body() dto: UpdateGastoDto,
  ) {
    return this.gastosService.update(idGasto, dto);
  }

  @Delete(':idGasto')
  remove(@Param('idGasto', ParseIntPipe) idGasto: number) {
    return this.gastosService.remove(idGasto);
  }
}

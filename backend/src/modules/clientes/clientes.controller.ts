import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    nombreUsuario: string;
    nombreCompleto: string;
  };
}

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('q') search?: string,
  ) {
    return this.clientesService.findAll(Number(page), Number(limit), search);
  }

  @Get('search')
  search(@Query('q') nombre: string) {
    return this.clientesService.searchByNombre(nombre);
  }

  @Get(':idCliente')
  findOne(@Param('idCliente', ParseIntPipe) idCliente: number) {
    return this.clientesService.findOne(idCliente);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateClienteDto, @Req() req: RequestWithUser) {
    return this.clientesService.create(dto, req.user?.sub);
  }

  @Put(':idCliente')
  update(
    @Param('idCliente', ParseIntPipe) idCliente: number,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.clientesService.update(idCliente, dto);
  }

  @Delete(':idCliente')
  remove(@Param('idCliente', ParseIntPipe) idCliente: number) {
    return this.clientesService.remove(idCliente);
  }
}

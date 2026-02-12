import {
  Controller,
  Get,
  Query,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { GastoDescripcionesService } from './gasto-descripciones.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('gasto-descripciones')
export class GastoDescripcionesController {
  constructor(
    private readonly gastoDescripcionesService: GastoDescripcionesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('q') query?: string) {
    return this.gastoDescripcionesService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.gastoDescripcionesService.delete(+id);
    return { success: true };
  }
}

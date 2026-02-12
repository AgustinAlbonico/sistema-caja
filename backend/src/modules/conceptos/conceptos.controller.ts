import {
  Controller,
  Get,
  Query,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { ConceptosService } from './conceptos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('conceptos')
export class ConceptosController {
  constructor(private readonly conceptosService: ConceptosService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('q') query?: string) {
    return this.conceptosService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.conceptosService.delete(+id);
    return { success: true };
  }
}

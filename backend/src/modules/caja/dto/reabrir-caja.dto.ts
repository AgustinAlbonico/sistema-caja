import { IsDateString } from 'class-validator';

export class ReabrirCajaDto {
  @IsDateString()
  fecha: string;
}

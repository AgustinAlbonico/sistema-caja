import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class CerrarCajaDto {
  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsNumberString()
  saldoFinal?: string;

  @IsNumber()
  idUsuarioCierre: number;
}

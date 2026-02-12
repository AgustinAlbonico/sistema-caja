import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class AbrirCajaDto {
  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsNumberString()
  saldoInicial?: string;

  @IsNumber()
  idUsuarioApertura: number;
}

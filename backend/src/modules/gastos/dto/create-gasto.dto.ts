import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class GastoPagoDto {
  @IsNumber()
  idMetodoPago: number;

  @IsNumberString()
  importe: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numerosCheque?: string;
}

export class CreateGastoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  descripcion?: string;

  @IsNumberString()
  importe: string;

  @IsDateString()
  fecha: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GastoPagoDto)
  pagos: GastoPagoDto[];

  @IsOptional()
  @IsBoolean()
  abrirCajaSiCerrada?: boolean;
}

import {
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePagoDto {
  @IsInt()
  idMetodoPago: number;

  @IsNumberString()
  importe: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numerosCheque?: string;
}

import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreateReciboItemDto } from './create-recibo-item.dto';
import { CreatePagoDto } from './create-pago.dto';

export class CreateReciboDto {
  @IsInt()
  idCliente: number;

  @IsOptional()
  @IsInt()
  nroComprobante?: number;

  @IsOptional()
  @IsDateString()
  fechaEmision?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReciboItemDto)
  items: CreateReciboItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePagoDto)
  pagos: CreatePagoDto[];
}

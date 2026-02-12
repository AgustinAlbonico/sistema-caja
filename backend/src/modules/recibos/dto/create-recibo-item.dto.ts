import {
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';

export class CreateReciboItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  descripcion: string;

  @IsInt()
  @Min(1)
  @Max(12)
  mesComprobante: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  anioComprobante: number;

  @IsNumberString()
  importe: string;
}

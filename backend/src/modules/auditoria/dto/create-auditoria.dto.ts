import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAuditoriaDto {
  @IsInt()
  @IsNotEmpty()
  idUsuario: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  accion: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  entidad: string;

  @IsInt()
  @IsOptional()
  idEntidad?: number;

  @IsString()
  @IsOptional()
  detalle?: string;
}

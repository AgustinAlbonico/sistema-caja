import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClienteDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  localidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  codPostal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cuit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoria?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  provincia?: string;
}

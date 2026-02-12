import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMetodoPagoDto {
  @IsString()
  @MaxLength(50)
  nombre: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

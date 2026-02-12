import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombreUsuario: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contrasena: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombreCompleto: string;
}

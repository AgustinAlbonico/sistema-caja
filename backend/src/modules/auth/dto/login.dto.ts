import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombreUsuario: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contrasena: string;
}

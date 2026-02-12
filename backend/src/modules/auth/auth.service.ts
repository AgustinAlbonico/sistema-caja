import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import { Usuario } from '../../database/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.validateUser(dto.nombreUsuario, dto.contrasena);

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: usuario.idUsuario,
      nombreUsuario: usuario.nombreUsuario,
      nombreCompleto: usuario.nombreCompleto,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      usuario: {
        idUsuario: usuario.idUsuario,
        nombreUsuario: usuario.nombreUsuario,
        nombreCompleto: usuario.nombreCompleto,
      },
    };
  }

  async validateUser(
    nombreUsuario: string,
    contrasena: string,
  ): Promise<Usuario | null> {
    const usuario = await this.usuariosRepository.findOne({
      where: { nombreUsuario, activo: true },
    });

    if (!usuario) {
      return null;
    }

    const isMatch = await this.comparePassword(
      contrasena,
      usuario.contrasenaHash,
    );

    if (!isMatch) {
      return null;
    }

    return usuario;
  }

  async hashPassword(contrasena: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(contrasena, saltRounds);
  }

  async comparePassword(contrasena: string, hash: string): Promise<boolean> {
    return bcrypt.compare(contrasena, hash);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Usuario } from '../../database/entities/usuario.entity';
import { AuthService } from '../auth/auth.service';
import { CreateUsuarioDto } from '../auth/dto/create-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly authService: AuthService,
  ) {}

  async findAll(): Promise<Usuario[]> {
    return this.usuariosRepository.find({
      select: [
        'idUsuario',
        'nombreUsuario',
        'nombreCompleto',
        'activo',
        'fechaCreacion',
      ],
      where: { activo: true },
    });
  }

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const contrasenaHash = await this.authService.hashPassword(dto.contrasena);

    const usuario = this.usuariosRepository.create({
      nombreUsuario: dto.nombreUsuario.toUpperCase(),
      contrasenaHash,
      nombreCompleto: dto.nombreCompleto.toUpperCase(),
      activo: true,
    });

    return this.usuariosRepository.save(usuario);
  }
}

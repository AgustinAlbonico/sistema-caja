import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cliente } from '../../database/entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clientesRepository: Repository<Cliente>,
  ) {}

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const query = this.clientesRepository.createQueryBuilder('cliente');

    if (search) {
      query
        .where('cliente.nombre ILIKE :search', { search: `%${search}%` })
        .orWhere('cliente.cuit ILIKE :search', { search: `%${search}%` });
    }

    query
      .orderBy('cliente.nombre', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(idCliente: number) {
    const cliente = await this.clientesRepository.findOne({
      where: { idCliente },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return cliente;
  }

  async create(dto: CreateClienteDto, idUsuarioCreacion?: number) {
    const normalizedDto = this.toUpperCaseFields(dto);
    const cliente = this.clientesRepository.create({
      ...normalizedDto,
      idUsuarioCreacion,
    });
    return this.clientesRepository.save(cliente);
  }

  async update(idCliente: number, dto: UpdateClienteDto) {
    const cliente = await this.findOne(idCliente);
    const normalizedDto = this.toUpperCaseFields(dto);
    const updated = this.clientesRepository.merge(cliente, normalizedDto);
    return this.clientesRepository.save(updated);
  }

  private toUpperCaseFields<T extends CreateClienteDto | UpdateClienteDto>(
    dto: T,
  ): T {
    const newDto = { ...dto };
    if (newDto.nombre) newDto.nombre = newDto.nombre.toUpperCase();
    if (newDto.localidad) newDto.localidad = newDto.localidad.toUpperCase();
    if (newDto.direccion) newDto.direccion = newDto.direccion.toUpperCase();
    if (newDto.provincia) newDto.provincia = newDto.provincia.toUpperCase();
    return newDto;
  }

  async remove(idCliente: number) {
    const cliente = await this.findOne(idCliente);
    await this.clientesRepository.remove(cliente);
    return { ok: true };
  }

  async searchByNombre(nombre: string) {
    if (!nombre || nombre.trim() === '') {
      return [];
    }

    return this.clientesRepository
      .createQueryBuilder('cliente')
      .where('cliente.nombre ILIKE :nombre', { nombre: `%${nombre}%` })
      .select(['cliente.idCliente', 'cliente.nombre', 'cliente.localidad'])
      .orderBy('cliente.nombre', 'ASC')
      .getMany();
  }
}

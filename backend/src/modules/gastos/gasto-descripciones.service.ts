import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { GastoDescripcion } from '../../database/entities/gasto-descripcion.entity';

@Injectable()
export class GastoDescripcionesService {
  constructor(
    @InjectRepository(GastoDescripcion)
    private readonly descripcionesRepository: Repository<GastoDescripcion>,
  ) {}

  async findAll(query?: string): Promise<GastoDescripcion[]> {
    if (!query) {
      return this.descripcionesRepository.find({
        where: { activo: true },
        order: { descripcion: 'ASC' },
        take: 20,
      });
    }

    return this.descripcionesRepository.find({
      where: {
        descripcion: Like(`%${query.toUpperCase()}%`),
        activo: true,
      },
      order: { descripcion: 'ASC' },
      take: 20,
    });
  }

  async findOrCreate(descripcion: string): Promise<GastoDescripcion> {
    const descripcionUpper = descripcion.trim().toUpperCase();

    let descripcionEntidad = await this.descripcionesRepository.findOne({
      where: { descripcion: descripcionUpper },
    });

    if (!descripcionEntidad) {
      descripcionEntidad = this.descripcionesRepository.create({
        descripcion: descripcionUpper,
        activo: true,
      });
      await this.descripcionesRepository.save(descripcionEntidad);
    } else if (!descripcionEntidad.activo) {
      // Si existe pero está inactivo, lo reactivamos
      descripcionEntidad.activo = true;
      await this.descripcionesRepository.save(descripcionEntidad);
    }

    return descripcionEntidad;
  }

  async delete(id: number): Promise<void> {
    await this.descripcionesRepository.update(id, { activo: false });
  }
}

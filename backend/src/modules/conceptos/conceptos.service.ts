import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Concepto } from '../../database/entities/concepto.entity';

@Injectable()
export class ConceptosService {
  constructor(
    @InjectRepository(Concepto)
    private readonly conceptosRepository: Repository<Concepto>,
  ) {}

  async findAll(query?: string): Promise<Concepto[]> {
    if (!query) {
      return this.conceptosRepository.find({
        where: { activo: true },
        order: { descripcion: 'ASC' },
        take: 20,
      });
    }

    return this.conceptosRepository.find({
      where: {
        descripcion: Like(`%${query.toUpperCase()}%`),
        activo: true,
      },
      order: { descripcion: 'ASC' },
      take: 20,
    });
  }

  async findOrCreate(descripcion: string): Promise<Concepto> {
    const descripcionUpper = descripcion.trim().toUpperCase();

    let concepto = await this.conceptosRepository.findOne({
      where: { descripcion: descripcionUpper },
    });

    if (!concepto) {
      concepto = this.conceptosRepository.create({
        descripcion: descripcionUpper,
        activo: true,
      });
      await this.conceptosRepository.save(concepto);
    } else if (!concepto.activo) {
      // Si existe pero está inactivo, lo reactivamos
      concepto.activo = true;
      await this.conceptosRepository.save(concepto);
    }

    return concepto;
  }

  async delete(id: number): Promise<void> {
    await this.conceptosRepository.update(id, { activo: false });
  }
}

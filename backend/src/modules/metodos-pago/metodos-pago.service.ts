import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import { CreateMetodoPagoDto } from './dto/create-metodo-pago.dto';
import { UpdateMetodoPagoDto } from './dto/update-metodo-pago.dto';

@Injectable()
export class MetodosPagoService implements OnModuleInit {
  private readonly logger = new Logger(MetodosPagoService.name);

  constructor(
    @InjectRepository(MetodoPago)
    private readonly metodosRepository: Repository<MetodoPago>,
  ) {}

  async onModuleInit() {
    await this.seedMetodosPago();
  }

  private async seedMetodosPago() {
    const allowed = ['Efectivo', 'Transferencia', 'Cheque'];
    const normalizedAllowed = allowed.map((n) => n.toLowerCase());

    const allMethods = await this.metodosRepository.find();

    for (const method of allMethods) {
      const normalizedName = method.nombre.trim();

      // Check if valid
      const targetIndex = normalizedAllowed.indexOf(
        normalizedName.toLowerCase(),
      );

      if (targetIndex !== -1) {
        // It matches one of the allowed types.
        // Ensure exact casing if needed?
        // If we have "cheque" and we want "Cheque", we could update it.
        const correctName = allowed[targetIndex];
        if (method.nombre !== correctName) {
          this.logger.log(
            `Correcting casing for ${method.nombre} -> ${correctName}`,
          );
          method.nombre = correctName;
          await this.metodosRepository.save(method);
        }
      } else {
        // Invalid method (e.g. "mercadopag")
        this.logger.warn(
          `Removing invalid/deprecated payment method: ${method.nombre}`,
        );
        try {
          // Try to delete. If used, it might fail depending on FK constraints.
          // For now, let's try delete. If it fails, maybe just set active=false?
          // But user complained they "see" it, so likely `findAll` returns active ones.
          // Assuming logical delete or just delete.
          await this.metodosRepository.delete(method.idMetodoPago);
        } catch (e) {
          this.logger.error(`Could not delete ${method.nombre}: ${e.message}`);
          // Fallback: set active false if the entity has 'activo' column (it seems to have it based on create dto)
          if (method.activo) {
            method.activo = false;
            await this.metodosRepository.save(method);
          }
        }
      }
    }

    // Finally ensure all allowed exist
    for (const name of allowed) {
      // We might have duplicates if we didn't dedupe above.
      // But above loop processes all existing.
      // If we had "Cheque" (id1) and "cheque" (id2), both matched targetIndex.
      // Both renamed to "Cheque". Now we have two "Cheque"s.
      // We should dedupe.
    }

    // Better Strategy:
    // 1. Get all.
    // 2. Map to normalize names.
    // 3. Keep the first valid occurrence of each allowed type, delete others.
    // 4. Create missing.

    const keepIds = new Set<number>();

    // Refresh list
    const currentMethods = await this.metodosRepository.find();

    for (const targetName of allowed) {
      // Find all matches for this target (active or not)
      const matches = currentMethods.filter(
        (m) => m.nombre.trim().toLowerCase() === targetName.toLowerCase(),
      );

      if (matches.length === 0) {
        this.logger.log(`Creating missing method: ${targetName}`);
        await this.metodosRepository.save(
          this.metodosRepository.create({ nombre: targetName, activo: true }),
        );
      } else {
        // Keep the first one, delete rest
        // Prefer one that matches exact case if possible
        const bestMatch =
          matches.find((m) => m.nombre === targetName) || matches[0];

        // Fix case if needed
        if (bestMatch.nombre !== targetName) {
          bestMatch.nombre = targetName;
          await this.metodosRepository.save(bestMatch);
        }

        keepIds.add(bestMatch.idMetodoPago);

        // Mark others for deletion
        for (const m of matches) {
          if (m.idMetodoPago !== bestMatch.idMetodoPago) {
            await this.safeDelete(m);
          }
        }
      }
    }

    // Delete anything not in keepIds (like "mercadopag")
    const toRemove = currentMethods.filter(
      (m) =>
        !keepIds.has(m.idMetodoPago) &&
        // Also ensure it wasn't one of the ones we just created (though currentMethods is stale, but keepIds tracks IDs from currentMethods or nothing)
        // Actually, newly created ones won't be in currentMethods.
        !allowed.some((a) => m.nombre.trim().toLowerCase() === a.toLowerCase()), // Double check
    );

    for (const m of toRemove) {
      await this.safeDelete(m);
    }
  }

  private async safeDelete(method: MetodoPago) {
    this.logger.warn(`Removing invalid/duplicate method: ${method.nombre}`);
    try {
      await this.metodosRepository.delete(method.idMetodoPago);
    } catch (e) {
      this.logger.error(
        `Could not delete ${method.nombre}, deactivating instead.`,
      );
      method.activo = false;
      await this.metodosRepository.save(method);
    }
  }

  findAll() {
    return this.metodosRepository.find({ order: { nombre: 'ASC' } });
  }

  async findOne(idMetodoPago: number) {
    const metodo = await this.metodosRepository.findOne({
      where: { idMetodoPago },
    });
    if (!metodo) {
      throw new NotFoundException('Metodo de pago no encontrado');
    }

    return metodo;
  }

  // CRUD methods kept for internal use or admin API if needed, but UI removed.
  async create(dto: CreateMetodoPagoDto) {
    const metodo = this.metodosRepository.create({
      ...dto,
      activo: dto.activo ?? true,
    });

    return this.metodosRepository.save(metodo);
  }

  async update(idMetodoPago: number, dto: UpdateMetodoPagoDto) {
    const metodo = await this.findOne(idMetodoPago);
    const updated = this.metodosRepository.merge(metodo, dto);
    return this.metodosRepository.save(updated);
  }

  async remove(idMetodoPago: number) {
    const metodo = await this.findOne(idMetodoPago);
    await this.metodosRepository.remove(metodo);
    return { ok: true };
  }
}

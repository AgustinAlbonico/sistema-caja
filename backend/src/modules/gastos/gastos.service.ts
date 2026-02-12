import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Gasto } from '../../database/entities/gasto.entity';
import { GastoPago } from '../../database/entities/gasto-pago.entity';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import {
  MovimientoCaja,
  TipoMovimientoCaja,
} from '../../database/entities/movimiento-caja.entity';
import { CajaService } from '../caja/caja.service';
import { GastoDescripcionesService } from './gasto-descripciones.service';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';
import { getNowArgentina } from '../../utils/date.utils';

@Injectable()
export class GastosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cajaService: CajaService,
    private readonly gastoDescripcionesService: GastoDescripcionesService,
    @InjectRepository(Gasto)
    private readonly gastosRepository: Repository<Gasto>,
    @InjectRepository(GastoPago)
    private readonly gastoPagoRepository: Repository<GastoPago>,
    @InjectRepository(MetodoPago)
    private readonly metodoPagoRepository: Repository<MetodoPago>,
  ) {}

  findAll() {
    return this.gastosRepository.find({
      relations: ['pagos', 'pagos.metodoPago'],
      order: { fecha: 'DESC' },
    });
  }

  async findOne(idGasto: number) {
    const gasto = await this.gastosRepository.findOne({
      where: { idGasto },
      relations: ['pagos', 'pagos.metodoPago'],
    });
    if (!gasto) {
      throw new NotFoundException('Gasto no encontrado');
    }

    return gasto;
  }

  async create(dto: CreateGastoDto, idUsuarioCreacion?: number) {
    return this.dataSource.transaction(async (manager) => {
      // Validar descripción obligatoria
      if (!dto.descripcion?.trim()) {
        throw new BadRequestException('La descripción es obligatoria');
      }

      // Guardar la descripción en la tabla de descripciones de gastos
      await this.gastoDescripcionesService.findOrCreate(dto.descripcion);

      // Validar que el importe sea mayor a 0
      if (Number(dto.importe) <= 0) {
        throw new BadRequestException('El importe debe ser mayor a 0');
      }

      // Validar que la suma de pagos coincida con el importe total
      const totalPagos = dto.pagos.reduce(
        (sum, p) => sum + Number(p.importe),
        0,
      );
      if (Math.abs(totalPagos - Number(dto.importe)) > 0.01) {
        throw new BadRequestException(
          'La suma de los pagos debe coincidir con el importe total',
        );
      }

      // Validar que existan los métodos de pago
      const metodoIds = [...new Set(dto.pagos.map((p) => p.idMetodoPago))];
      const metodos = await manager.find(MetodoPago, {
        where: metodoIds.map((id) => ({ idMetodoPago: id })),
      });
      if (metodos.length !== metodoIds.length) {
        throw new BadRequestException('Uno o más métodos de pago no existen');
      }

      // Validar y obtener la caja, abriéndola automáticamente si está cerrada y el usuario lo desea
      const caja = await this.cajaService.validarYAbrirCajaSiCerrada(
        dto.fecha,
        dto.abrirCajaSiCerrada ?? false,
        idUsuarioCreacion,
      );

      const gasto = manager.create(Gasto, {
        descripcion: dto.descripcion ?? null,
        importe: dto.importe,
        fecha: dto.fecha,
        createdAt: getNowArgentina(),
        idUsuarioCreacion,
      });
      const saved = await manager.save(gasto);

      // Crear los pagos asociados
      const gastoPagos = dto.pagos.map((pagoDto) =>
        manager.create(GastoPago, {
          idGasto: saved.idGasto,
          idMetodoPago: pagoDto.idMetodoPago,
          importe: pagoDto.importe,
          numerosCheque: pagoDto.numerosCheque ?? null,
        }),
      );
      await manager.save(gastoPagos);

      // Crear movimientos de caja para cada método de pago
      for (const pagoDto of dto.pagos) {
        const movimiento = manager.create(MovimientoCaja, {
          idCajaDiaria: caja.idCajaDiaria,
          tipo: TipoMovimientoCaja.Egreso,
          concepto: dto.descripcion ?? 'Gasto',
          importe: pagoDto.importe,
          idGasto: saved.idGasto,
          idMetodoPago: pagoDto.idMetodoPago,
          fecha: getNowArgentina(),
        });
        await manager.save(movimiento);
      }

      // Buscar el gasto creado con todas las relaciones
      const gastoCompleto = await manager.findOne(Gasto, {
        where: { idGasto: saved.idGasto },
        relations: ['pagos', 'pagos.metodoPago'],
      });
      return gastoCompleto;
    });
  }

  async update(idGasto: number, dto: UpdateGastoDto) {
    return this.dataSource.transaction(async (manager) => {
      const gasto = await this.findOne(idGasto);

      // Validar descripción si se está actualizando
      if (dto.descripcion !== undefined && !dto.descripcion?.trim()) {
        throw new BadRequestException('La descripción es obligatoria');
      }

      // Si se actualiza la descripción, guardarla en la tabla de descripciones de gastos
      if (dto.descripcion !== undefined && dto.descripcion.trim()) {
        await this.gastoDescripcionesService.findOrCreate(dto.descripcion);
      }

      // Validar que el importe sea mayor a 0
      const nuevoImporte =
        dto.importe !== undefined ? Number(dto.importe) : Number(gasto.importe);
      if (nuevoImporte <= 0) {
        throw new BadRequestException('El importe debe ser mayor a 0');
      }

      // Si se actualizan los pagos, validar y actualizar
      if (dto.pagos) {
        const totalPagos = dto.pagos.reduce(
          (sum, p) => sum + Number(p.importe),
          0,
        );
        if (
          Math.abs(totalPagos - Number(dto.importe || gasto.importe)) > 0.01
        ) {
          throw new BadRequestException(
            'La suma de los pagos debe coincidir con el importe total',
          );
        }

        // Eliminar pagos existentes
        await manager.delete(GastoPago, { idGasto });

        // Crear nuevos pagos
        const gastoPagos = dto.pagos.map((pagoDto) =>
          manager.create(GastoPago, {
            idGasto,
            idMetodoPago: pagoDto.idMetodoPago,
            importe: pagoDto.importe,
            numerosCheque: pagoDto.numerosCheque ?? null,
          }),
        );
        await manager.save(gastoPagos);
      }

      // Actualizar el gasto
      const updated = manager.merge(Gasto, gasto, dto);
      await manager.save(updated);

      // Buscar el gasto actualizado con todas las relaciones
      const gastoCompleto = await manager.findOne(Gasto, {
        where: { idGasto },
        relations: ['pagos', 'pagos.metodoPago'],
      });
      return gastoCompleto;
    });
  }

  async remove(idGasto: number) {
    return this.dataSource.transaction(async (manager) => {
      const gasto = await this.findOne(idGasto);

      // Eliminar movimientos de caja asociados al gasto
      await manager
        .createQueryBuilder()
        .delete()
        .from(MovimientoCaja)
        .where('idGasto = :idGasto', { idGasto })
        .execute();

      // Eliminar pagos asociados al gasto
      await manager
        .createQueryBuilder()
        .delete()
        .from(GastoPago)
        .where('idGasto = :idGasto', { idGasto })
        .execute();

      // Eliminar el gasto
      await manager.remove(gasto);

      return {
        ok: true,
        descripcion: gasto.descripcion,
        importe: gasto.importe,
      };
    });
  }
}

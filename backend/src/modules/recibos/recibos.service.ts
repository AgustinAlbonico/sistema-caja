import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { Cliente } from '../../database/entities/cliente.entity';
import { MetodoPago } from '../../database/entities/metodo-pago.entity';
import {
  MovimientoCaja,
  TipoMovimientoCaja,
} from '../../database/entities/movimiento-caja.entity';
import { Pago } from '../../database/entities/pago.entity';
import { Recibo } from '../../database/entities/recibo.entity';
import { ReciboItem } from '../../database/entities/recibo-item.entity';
import { CajaService } from '../caja/caja.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateReciboDto } from './dto/create-recibo.dto';
import { ConceptosService } from '../conceptos/conceptos.service';
import { toArgentinaDateTime, getNowArgentina } from '../../utils/date.utils';

@Injectable()
export class RecibosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cajaService: CajaService,
    private readonly pdfService: PdfService,
    @InjectRepository(Recibo)
    private readonly recibosRepository: Repository<Recibo>,
    private readonly conceptosService: ConceptosService,
  ) {}
  // ...
  // Inside create method, before transaction or inside?
  // Let's interact with concepts *before* transaction to avoid complexity, or inside.
  // Inside is fine.
  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    idClient?: number,
    startDate?: string,
    endDate?: string,
    order: 'DESC' | 'ASC' = 'DESC',
  ) {
    const query = this.recibosRepository
      .createQueryBuilder('recibo')
      .leftJoinAndSelect('recibo.cliente', 'cliente')
      .leftJoinAndSelect('recibo.items', 'items')
      .leftJoinAndSelect('recibo.pagos', 'pagos')
      .leftJoinAndSelect('pagos.metodoPago', 'metodoPago');

    if (idClient) {
      query.andWhere('recibo.idCliente = :idClient', { idClient });
    }

    if (search) {
      query.andWhere(
        '(cliente.nombre ILIKE :search OR CAST(recibo.nroComprobante AS TEXT) ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (startDate) {
      // Ajustar inicio del día a zona horaria Argentina (GMT-3)
      // '2026-02-07' -> 00:00 UTC -> +3h = 03:00 UTC (00:00 ARG)
      const start = new Date(startDate);
      start.setUTCHours(start.getUTCHours() + 3);
      query.andWhere('recibo.fechaEmision >= :startDate', { startDate: start });
    }

    if (endDate) {
      // Ajustar fin del día a zona horaria Argentina (GMT-3)
      const end = new Date(endDate);
      // Establecer al final del día UTC base
      end.setUTCHours(23, 59, 59, 999);
      // Sumar 3 horas para llegar al final del día ARG en UTC (02:59:59 del día siguiente)
      end.setUTCHours(end.getUTCHours() + 3);
      query.andWhere('recibo.fechaEmision <= :endDate', { endDate: end });
    }

    query
      .orderBy('recibo.fechaEmision', order)
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

  async findOne(idRecibo: number) {
    const recibo = await this.recibosRepository.findOne({
      where: { idRecibo },
      relations: ['cliente', 'items', 'pagos', 'pagos.metodoPago'],
    });
    if (!recibo) {
      throw new NotFoundException('Recibo no encontrado');
    }

    return recibo;
  }

  async create(dto: CreateReciboDto, idUsuarioCreacion?: number) {
    if (dto.items.length === 0) {
      throw new BadRequestException('El recibo debe tener al menos una linea');
    }
    if (dto.pagos.length === 0) {
      throw new BadRequestException('El recibo debe tener al menos un pago');
    }

    // Procesar conceptos antes de la transacción para asegurar que existan y estén en mayúsculas
    for (const item of dto.items) {
      if (item.descripcion) {
        item.descripcion = item.descripcion.toUpperCase();
        await this.conceptosService.findOrCreate(item.descripcion);
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const cliente = await manager.findOne(Cliente, {
        where: { idCliente: dto.idCliente },
      });
      if (!cliente) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const metodoIds = dto.pagos.map((pago) => pago.idMetodoPago);
      const metodos = await manager.findBy(MetodoPago, {
        idMetodoPago: In(metodoIds),
      });
      if (metodos.length !== metodoIds.length) {
        throw new BadRequestException('Uno o mas metodos de pago no existen');
      }

      const totalItems = dto.items.reduce(
        (acc, item) => acc + Number(item.importe),
        0,
      );
      const totalPagos = dto.pagos.reduce(
        (acc, pago) => acc + Number(pago.importe),
        0,
      );
      if (totalItems.toFixed(2) !== totalPagos.toFixed(2)) {
        throw new BadRequestException(
          'El total de items y pagos debe coincidir',
        );
      }

      // Obtener el siguiente número de comprobante desde la tabla config
      const configResult = await manager.query(
        `SELECT valor FROM "config" WHERE clave = 'ultimoNroRecibo' FOR UPDATE`,
      );

      if (!configResult || configResult.length === 0) {
        throw new BadRequestException(
          'No se encontró la configuración de número de recibo',
        );
      }

      const currentNro = Number(configResult[0].valor);
      const nextNro = currentNro + 1;

      // Actualizar la configuración
      await manager.query(
        `UPDATE "config" SET valor = $1, "fechaActualizacion" = CURRENT_TIMESTAMP WHERE clave = 'ultimoNroRecibo'`,
        [nextNro.toString()],
      );

      const recibo = manager.create(Recibo, {
        idCliente: dto.idCliente,
        cliente,
        nroComprobante: nextNro,
        fechaEmision:
          toArgentinaDateTime(dto.fechaEmision) ?? getNowArgentina(),
        total: totalItems.toFixed(2),
        idUsuarioCreacion,
        items: dto.items.map((item) =>
          manager.create(ReciboItem, {
            descripcion: item.descripcion,
            mesComprobante: item.mesComprobante,
            anioComprobante: item.anioComprobante,
            importe: Number(item.importe).toFixed(2),
          }),
        ),
        pagos: dto.pagos.map((pago) =>
          manager.create(Pago, {
            idMetodoPago: pago.idMetodoPago,
            importe: Number(pago.importe).toFixed(2),
            numerosCheque: pago.numerosCheque ?? null,
          }),
        ),
      });

      const saved = await manager.save(recibo);

      const fechaCaja = (
        dto.fechaEmision
          ? toArgentinaDateTime(dto.fechaEmision)!.toISOString()
          : getNowArgentina().toISOString()
      ).split('T')[0];

      // Validar que la caja esté abierta - NO se permite emitir recibos si la caja está cerrada
      const caja = await this.cajaService.validarCajaAbierta(fechaCaja);

      // Usar la fecha del recibo para el movimiento de caja, pero asegurarnos de que tenga la hora correcta
      // El problema es que toArgentinaDateTime("2026-02-08") crea una fecha con hora 00:00:00 GMT-3
      // que al guardarse en PostgreSQL se convierte a UTC, lo que puede cambiar el día
      // Solución: crear la fecha con la fecha del recibo pero usando la hora actual
      const fechaBase = dto.fechaEmision
        ? toArgentinaDateTime(dto.fechaEmision)!
        : getNowArgentina();
      const ahora = getNowArgentina();

      const fechaMovimiento = new Date(
        fechaBase.getFullYear(),
        fechaBase.getMonth(),
        fechaBase.getDate(),
        ahora.getHours(),
        ahora.getMinutes(),
        ahora.getSeconds(),
      );

      const movimientos = dto.pagos.map((pago) =>
        manager.create(MovimientoCaja, {
          idCajaDiaria: caja.idCajaDiaria,
          tipo: TipoMovimientoCaja.Ingreso,
          concepto: `Recibo ${nextNro}`,
          importe: Number(pago.importe).toFixed(2),
          idRecibo: saved.idRecibo,
          idMetodoPago: pago.idMetodoPago,
          fecha: fechaMovimiento,
        }),
      );

      await manager.save(movimientos);

      // Recargar el recibo con todas sus relaciones dentro de la transacción
      const reciboCompleto = await manager.findOne(Recibo, {
        where: { idRecibo: saved.idRecibo },
        relations: ['cliente', 'items', 'pagos', 'pagos.metodoPago'],
      });

      return reciboCompleto;
    });
  }

  /**
   * Genera el PDF de un recibo
   */
  async generarPdf(idRecibo: number): Promise<Buffer> {
    const recibo = await this.findOne(idRecibo);
    return this.pdfService.generarReciboPdf(recibo);
  }

  /**
   * Obtiene el último recibo con el número más alto
   */
  async getUltimoRecibo() {
    const ultimoRecibo = await this.recibosRepository.findOne({
      where: {},
      relations: ['cliente', 'items', 'pagos', 'pagos.metodoPago'],
      order: { nroComprobante: 'DESC' },
    });

    if (!ultimoRecibo) {
      throw new NotFoundException('No hay recibos registrados');
    }

    return ultimoRecibo;
  }

  /**
   * Anula el último recibo del sistema y decrementa el contador
   * Solo permite anular el recibo con el número más alto
   */
  async anularUltimoRecibo(
    idUsuarioAnulacion?: number,
  ): Promise<{ reciboAnulado: number; nroComprobante: number }> {
    return this.dataSource.transaction(async (manager) => {
      // Buscar el recibo con el número más alto
      const ultimoRecibo = await manager
        .createQueryBuilder(Recibo, 'recibo')
        .orderBy('recibo.nroComprobante', 'DESC')
        .getOne();

      if (!ultimoRecibo) {
        throw new BadRequestException('No hay recibos para anular');
      }

      // Verificar que no existan recibos con número mayor (por si acaso)
      const reciboConMayorNro = await manager
        .createQueryBuilder(Recibo, 'recibo')
        .where('recibo.nroComprobante > :nro', {
          nro: ultimoRecibo.nroComprobante,
        })
        .getOne();

      if (reciboConMayorNro) {
        throw new BadRequestException('Solo se puede anular el último recibo');
      }

      // Obtener la configuración actual del contador
      const configResult = await manager.query(
        `SELECT valor FROM "config" WHERE clave = 'ultimoNroRecibo' FOR UPDATE`,
      );

      if (!configResult || configResult.length === 0) {
        throw new BadRequestException(
          'No se encontró la configuración de número de recibo',
        );
      }

      const currentNro = Number(configResult[0].valor);

      // Verificar que el último recibo coincida con el contador
      if (currentNro !== ultimoRecibo.nroComprobante) {
        throw new BadRequestException(
          `El contador (${currentNro}) no coincide con el último recibo (${ultimoRecibo.nroComprobante}). Contacte al administrador.`,
        );
      }

      // Eliminar movimientos de caja asociados al recibo
      await manager
        .createQueryBuilder()
        .delete()
        .from(MovimientoCaja)
        .where('idRecibo = :idRecibo', { idRecibo: ultimoRecibo.idRecibo })
        .execute();

      // Eliminar pagos asociados al recibo
      await manager
        .createQueryBuilder()
        .delete()
        .from(Pago)
        .where('idRecibo = :idRecibo', { idRecibo: ultimoRecibo.idRecibo })
        .execute();

      // Eliminar items del recibo
      await manager
        .createQueryBuilder()
        .delete()
        .from(ReciboItem)
        .where('idRecibo = :idRecibo', { idRecibo: ultimoRecibo.idRecibo })
        .execute();

      // Eliminar el recibo
      await manager.remove(ultimoRecibo);

      // Decrementar el contador
      const previousNro = currentNro - 1;
      await manager.query(
        `UPDATE "config" SET valor = $1, "fechaActualizacion" = CURRENT_TIMESTAMP WHERE clave = 'ultimoNroRecibo'`,
        [previousNro.toString()],
      );

      // Registrar en auditoría
      await manager.query(
        `INSERT INTO auditoria (accion, entidad, "idEntidad", detalle, "idUsuario", "fechaAccion")
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          'DELETE',
          'recibos',
          ultimoRecibo.idRecibo,
          JSON.stringify({
            nroComprobante: ultimoRecibo.nroComprobante,
            idCliente: ultimoRecibo.idCliente,
            total: ultimoRecibo.total,
            fechaEmision: ultimoRecibo.fechaEmision,
            anuladoPor: idUsuarioAnulacion,
          }),
          idUsuarioAnulacion,
        ],
      );

      return {
        reciboAnulado: ultimoRecibo.idRecibo,
        nroComprobante: ultimoRecibo.nroComprobante,
      };
    });
  }

  /**
   * Elimina un recibo sin modificar el contador de números de comprobante.
   * Útil para eliminar recibos antiguos que no son el último.
   */
  async eliminarRecibo(
    idRecibo: number,
    idUsuarioEliminacion?: number,
  ): Promise<{ reciboEliminado: number; nroComprobante: number }> {
    return this.dataSource.transaction(async (manager) => {
      // Buscar el recibo
      const recibo = await manager.findOne(Recibo, {
        where: { idRecibo },
        relations: ['cliente'],
      });

      if (!recibo) {
        throw new NotFoundException('Recibo no encontrado');
      }

      // Guardar datos para la respuesta antes de eliminar
      const nroComprobante = recibo.nroComprobante;

      // Eliminar movimientos de caja asociados al recibo
      await manager
        .createQueryBuilder()
        .delete()
        .from(MovimientoCaja)
        .where('idRecibo = :idRecibo', { idRecibo })
        .execute();

      // Eliminar pagos asociados al recibo
      await manager
        .createQueryBuilder()
        .delete()
        .from(Pago)
        .where('idRecibo = :idRecibo', { idRecibo })
        .execute();

      // Eliminar items del recibo
      await manager
        .createQueryBuilder()
        .delete()
        .from(ReciboItem)
        .where('idRecibo = :idRecibo', { idRecibo })
        .execute();

      // Eliminar el recibo
      await manager.remove(recibo);

      // Registrar en auditoría (no modificamos el contador)
      await manager.query(
        `INSERT INTO auditoria (accion, entidad, "idEntidad", detalle, "idUsuario", "fechaAccion")
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          'DELETE_SIN_CONTADOR',
          'recibos',
          idRecibo,
          JSON.stringify({
            nroComprobante: nroComprobante,
            idCliente: recibo.idCliente,
            nombreCliente: recibo.cliente?.nombre,
            total: recibo.total,
            fechaEmision: recibo.fechaEmision,
            eliminadoPor: idUsuarioEliminacion,
            nota: 'Recibo eliminado sin modificar contador correlativo',
          }),
          idUsuarioEliminacion,
        ],
      );

      return {
        reciboEliminado: idRecibo,
        nroComprobante: nroComprobante,
      };
    });
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CajaDiaria } from '../../database/entities/caja-diaria.entity';
import {
  MovimientoCaja,
  TipoMovimientoCaja,
} from '../../database/entities/movimiento-caja.entity';
import { getNowArgentina } from '../../utils/date.utils';

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(CajaDiaria)
    private readonly cajaRepository: Repository<CajaDiaria>,
    @InjectRepository(MovimientoCaja)
    private readonly movimientosRepository: Repository<MovimientoCaja>,
  ) {}

  async abrirCaja(
    fecha: string,
    saldoInicial?: string,
    idUsuarioApertura?: number,
  ) {
    const existente = await this.cajaRepository.findOne({ where: { fecha } });
    if (existente) {
      return existente;
    }

    const caja = this.cajaRepository.create({
      fecha,
      saldoInicial: saldoInicial ?? '0.00',
      saldoFinal: null,
      cerrada: false,
      fechaCierre: null,
      idUsuarioApertura: idUsuarioApertura ?? null,
    });

    return this.cajaRepository.save(caja);
  }

  async cerrarCaja(
    fecha: string,
    saldoFinal?: string,
    idUsuarioCierre?: number,
  ) {
    const caja = await this.cajaRepository.findOne({ where: { fecha } });
    if (!caja) {
      throw new NotFoundException('Caja diaria no encontrada');
    }
    if (caja.cerrada) {
      throw new BadRequestException('La caja ya esta cerrada');
    }

    const resumen = await this.getResumen(fecha);
    const finalCalculado = resumen.saldoFinal;

    const updated = this.cajaRepository.merge(caja, {
      saldoFinal: saldoFinal ?? finalCalculado,
      cerrada: true,
      fechaCierre: getNowArgentina(),
      idUsuarioCierre: idUsuarioCierre ?? null,
    });

    return this.cajaRepository.save(updated);
  }

  async reabrirCaja(fecha: string, idUsuarioReapertura?: number) {
    const caja = await this.cajaRepository.findOne({ where: { fecha } });
    if (!caja) {
      throw new NotFoundException('Caja diaria no encontrada');
    }
    if (!caja.cerrada) {
      throw new BadRequestException('La caja ya está abierta');
    }

    // Reabrir la caja: cambiar cerrada a false, limpiar fechaCierre e idUsuarioCierre
    // Nota: Se conserva el saldoFinal anterior como referencia, pero la caja queda abierta
    const updated = this.cajaRepository.merge(caja, {
      cerrada: false,
      fechaCierre: null,
      idUsuarioCierre: null,
    });

    return this.cajaRepository.save(updated);
  }

  async getResumen(fecha: string, page?: number, limit?: number) {
    const caja = await this.cajaRepository.findOne({
      where: { fecha },
      relations: ['usuarioApertura', 'usuarioCierre'],
    });
    if (!caja) {
      throw new NotFoundException('Caja diaria no encontrada');
    }

    const movimientos = await this.movimientosRepository.find({
      where: { idCajaDiaria: caja.idCajaDiaria },
      order: { fecha: 'ASC' },
      relations: ['metodoPago', 'recibo', 'recibo.cliente', 'gasto'],
    });

    const ingresos = movimientos
      .filter((mov) => mov.tipo === TipoMovimientoCaja.Ingreso)
      .reduce((acc, mov) => acc + Number(mov.importe), 0);

    const egresos = movimientos
      .filter((mov) => mov.tipo === TipoMovimientoCaja.Egreso)
      .reduce((acc, mov) => acc + Number(mov.importe), 0);

    const saldoInicial = Number(caja.saldoInicial);
    const saldoFinal = saldoInicial + ingresos - egresos;

    // Calcular saldo acumulado para cada movimiento (en orden cronológico)
    let saldoAcumulado = saldoInicial;
    const movimientosConSaldo = movimientos.map((mov) => {
      if (mov.tipo === TipoMovimientoCaja.Ingreso) {
        saldoAcumulado += Number(mov.importe);
      } else {
        saldoAcumulado -= Number(mov.importe);
      }
      return {
        ...mov,
        saldoAcumulado,
      };
    });

    // Invertir orden para mostrar más recientes primero
    const movimientosOrdenados = movimientosConSaldo.reverse();

    // Aplicar paginación si se proporcionan los parámetros
    let movimientosPaginados = movimientosOrdenados;
    let totalPages = 1;
    const total = movimientosOrdenados.length;

    if (page !== undefined && limit !== undefined) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      movimientosPaginados = movimientosOrdenados.slice(startIndex, endIndex);
      totalPages = Math.ceil(total / limit);
    }

    return {
      caja,
      movimientos: movimientosPaginados,
      ingresos: ingresos.toFixed(2),
      egresos: egresos.toFixed(2),
      saldoFinal: saldoFinal.toFixed(2),
      total,
      page: page ?? 1,
      limit: limit ?? total,
      lastPage: totalPages,
    };
  }

  async validarCajaAbierta(fecha: string) {
    const caja = await this.cajaRepository.findOne({ where: { fecha } });
    if (!caja) {
      throw new NotFoundException('Caja diaria no encontrada');
    }
    if (caja.cerrada) {
      throw new BadRequestException('La caja diaria esta cerrada');
    }

    return caja;
  }

  /**
   * Valida si la caja está abierta y, opcionalmente, la abre si está cerrada
   * @param fecha Fecha de la caja
   * @param abrirSiCerrada Si es true, abre la caja automáticamente si está cerrada
   * @param idUsuarioApertura ID del usuario que abre la caja (si se necesita abrir)
   * @returns La caja abierta
   * @throws BadRequestException si la caja está cerrada y abrirSiCerrada es false
   */
  async validarYAbrirCajaSiCerrada(
    fecha: string,
    abrirSiCerrada: boolean,
    idUsuarioApertura?: number,
  ) {
    const caja = await this.cajaRepository.findOne({ where: { fecha } });

    // Si no existe la caja, crearla abierta
    if (!caja) {
      return this.abrirCaja(fecha, '0.00', idUsuarioApertura);
    }

    // Si la caja está abierta, devolverla
    if (!caja.cerrada) {
      return caja;
    }

    // La caja está cerrada
    if (abrirSiCerrada) {
      // Reabrir la caja existente del mismo día
      return this.reabrirCaja(fecha, idUsuarioApertura);
    }

    // La caja está cerrada y el usuario no desea abrirla
    throw new BadRequestException(
      'La caja diaria está cerrada. Para registrar operaciones, debe abrirla primero.',
    );
  }

  async cerrarCajasAbiertasAutomaticamente(
    fechaHoy: string,
  ): Promise<CajaDiaria[]> {
    // Solo cerrar cajas de días ANTERIORES a hoy, nunca la de hoy
    const cajasAnterioresAbiertas = await this.cajaRepository
      .createQueryBuilder('caja')
      .where('caja.cerrada = :cerrada', { cerrada: false })
      .andWhere('caja.fecha < :fechaHoy', { fechaHoy })
      .getMany();

    const cajasCerradas: CajaDiaria[] = [];

    for (const caja of cajasAnterioresAbiertas) {
      try {
        const resumen = await this.getResumen(caja.fecha);
        const updated = this.cajaRepository.merge(caja, {
          saldoFinal: resumen.saldoFinal,
          cerrada: true,
          fechaCierre: getNowArgentina(),
        });
        const cajaCerrada = await this.cajaRepository.save(updated);
        cajasCerradas.push(cajaCerrada);
      } catch (error) {
        console.error(
          `Error al cerrar automáticamente la caja del ${caja.fecha}:`,
          error,
        );
      }
    }

    return cajasCerradas;
  }

  async verificarCajasAbiertasAnteriores(
    fechaHoy: string,
  ): Promise<CajaDiaria[]> {
    const cajasAnterioresAbiertas = await this.cajaRepository
      .createQueryBuilder('caja')
      .where('caja.cerrada = :cerrada', { cerrada: false })
      .andWhere('caja.fecha < :fechaHoy', { fechaHoy })
      .getMany();

    return cajasAnterioresAbiertas;
  }
}

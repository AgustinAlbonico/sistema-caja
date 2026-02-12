import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  MovimientoCaja,
  TipoMovimientoCaja,
} from '../../database/entities/movimiento-caja.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(MovimientoCaja)
    private readonly movimientoRepo: Repository<MovimientoCaja>,
  ) {}

  async getDashboardData(startDate: string, endDate: string) {
    // Ajustar fechas a zona horaria Argentina (GMT-3)
    // Convertir '2026-02-07' -> 00:00 UTC -> +3h = 03:00 UTC (00:00 ARG)
    const start = new Date(startDate);
    start.setUTCHours(start.getUTCHours() + 3);

    // Convertir '2026-02-07' -> 23:59 UTC -> +3h = 02:59 UTC (+1 día) (23:59 ARG)
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    end.setUTCHours(end.getUTCHours() + 3);

    // 1. Totals
    const ingresos = await this.movimientoRepo.sum('importe' as any, {
      fecha: Between(start, end),
      tipo: TipoMovimientoCaja.Ingreso,
    });
    const egresos = await this.movimientoRepo.sum('importe' as any, {
      fecha: Between(start, end),
      tipo: TipoMovimientoCaja.Egreso,
    });

    const totalIngresos = Number.parseFloat(ingresos?.toString() || '0');
    const totalEgresos = Number.parseFloat(egresos?.toString() || '0');
    const balance = totalIngresos - totalEgresos;

    // 2. Daily Evolution
    const rawEvolution = await this.movimientoRepo
      .createQueryBuilder('mov')
      // Ajustar fecha a zona horaria Argentina (-3 horas) antes de extraer el día
      .select("TO_CHAR(mov.fecha - INTERVAL '3 hours', 'YYYY-MM-DD')", 'dia')
      .addSelect(
        "SUM(CASE WHEN mov.tipo = 'ingreso' THEN mov.importe ELSE 0 END)",
        'ingresos',
      )
      .addSelect(
        "SUM(CASE WHEN mov.tipo = 'egreso' THEN mov.importe ELSE 0 END)",
        'egresos',
      )
      .where('mov.fecha BETWEEN :start AND :end', { start, end })
      // Agrupar también usando la fecha ajustada
      .groupBy("TO_CHAR(mov.fecha - INTERVAL '3 hours', 'YYYY-MM-DD')")
      .orderBy('dia', 'ASC')
      .getRawMany();

    const evolution = rawEvolution.map((day) => ({
      date: day.dia,
      ingresos: Number.parseFloat(day.ingresos),
      egresos: Number.parseFloat(day.egresos),
    }));

    // 3. Breakdown by Concept (Top 5 expenses)
    const rawGastos = await this.movimientoRepo
      .createQueryBuilder('mov')
      .select('mov.concepto', 'concepto')
      .addSelect('SUM(mov.importe)', 'total')
      .where('mov.fecha BETWEEN :start AND :end', { start, end })
      .andWhere('mov.tipo = :tipo', { tipo: TipoMovimientoCaja.Egreso })
      .groupBy('mov.concepto')
      .orderBy('total', 'DESC')
      .limit(5)
      .getRawMany();

    const topGastos = rawGastos.map((g) => ({
      concepto: g.concepto,
      total: Number.parseFloat(g.total),
    }));

    return {
      summary: {
        ingresos: totalIngresos,
        egresos: totalEgresos,
        balance,
      },
      evolution,
      topGastos,
    };
  }
}

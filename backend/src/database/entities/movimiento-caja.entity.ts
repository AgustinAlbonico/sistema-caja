import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { CajaDiaria } from './caja-diaria.entity';
import { Recibo } from './recibo.entity';
import { Gasto } from './gasto.entity';
import { MetodoPago } from './metodo-pago.entity';

export enum TipoMovimientoCaja {
  Ingreso = 'ingreso',
  Egreso = 'egreso',
}

@Entity({ name: 'movimientosCaja' })
export class MovimientoCaja {
  @PrimaryGeneratedColumn({ name: 'idMovimientoCaja' })
  idMovimientoCaja: number;

  @Column({ type: 'int' })
  idCajaDiaria: number;

  @ManyToOne(() => CajaDiaria, (caja) => caja.movimientos, { nullable: false })
  @JoinColumn({ name: 'idCajaDiaria' })
  cajaDiaria: CajaDiaria;

  @Column({ type: 'enum', enum: TipoMovimientoCaja })
  tipo: TipoMovimientoCaja;

  @Column({ type: 'varchar', length: 100 })
  concepto: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  importe: string;

  @Column({ type: 'int', nullable: true })
  idRecibo: number | null;

  @ManyToOne(() => Recibo, (recibo) => recibo.movimientos, { nullable: true })
  @JoinColumn({ name: 'idRecibo' })
  recibo: Recibo | null;

  @Column({ type: 'int', nullable: true })
  idGasto: number | null;

  @ManyToOne(() => Gasto, { nullable: true })
  @JoinColumn({ name: 'idGasto' })
  gasto: Gasto | null;

  @Column({ type: 'int', nullable: true })
  idMetodoPago: number | null;

  @ManyToOne(() => MetodoPago, (metodo) => metodo.movimientos, {
    nullable: true,
  })
  @JoinColumn({ name: 'idMetodoPago' })
  metodoPago: MetodoPago | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;
}

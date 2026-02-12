import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Gasto } from './gasto.entity';
import { MetodoPago } from './metodo-pago.entity';

@Entity({ name: 'gastoPagos' })
export class GastoPago {
  @PrimaryGeneratedColumn({ name: 'idGastoPago' })
  idGastoPago: number;

  @Column({ type: 'int' })
  idGasto: number;

  @ManyToOne(() => Gasto, (gasto) => gasto.pagos, { nullable: false })
  @JoinColumn({ name: 'idGasto' })
  gasto: Gasto;

  @Column({ type: 'int' })
  idMetodoPago: number;

  @ManyToOne(() => MetodoPago, (metodo) => metodo.gastoPagos, {
    nullable: false,
  })
  @JoinColumn({ name: 'idMetodoPago' })
  metodoPago: MetodoPago;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  importe: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'referencia' })
  numerosCheque: string | null;
}

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Recibo } from './recibo.entity';
import { MetodoPago } from './metodo-pago.entity';

@Entity({ name: 'pagos' })
export class Pago {
  @PrimaryGeneratedColumn({ name: 'idPago' })
  idPago: number;

  @Column({ type: 'int' })
  idRecibo: number;

  @ManyToOne(() => Recibo, (recibo) => recibo.pagos, { nullable: false })
  @JoinColumn({ name: 'idRecibo' })
  recibo: Recibo;

  @Column({ type: 'int' })
  idMetodoPago: number;

  @ManyToOne(() => MetodoPago, (metodo) => metodo.pagos, { nullable: false })
  @JoinColumn({ name: 'idMetodoPago' })
  metodoPago: MetodoPago;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  importe: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'referencia' })
  numerosCheque: string | null;
}

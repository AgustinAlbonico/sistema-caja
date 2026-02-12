import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Cliente } from './cliente.entity';
import { ReciboItem } from './recibo-item.entity';
import { Pago } from './pago.entity';
import { MovimientoCaja } from './movimiento-caja.entity';

@Entity({ name: 'recibos' })
@Unique('uqRecibosNro', ['nroComprobante'])
export class Recibo {
  @PrimaryGeneratedColumn({ name: 'idRecibo' })
  idRecibo: number;

  @Column({ type: 'int' })
  idCliente: number;

  @ManyToOne(() => Cliente, (cliente) => cliente.recibos, { nullable: false })
  @JoinColumn({ name: 'idCliente' })
  cliente: Cliente;

  @Column({ type: 'int' })
  nroComprobante: number;

  @Column({ type: 'timestamp', name: 'fechaEmision' })
  fechaEmision: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total: string;

  @OneToMany(() => ReciboItem, (item) => item.recibo, { cascade: true })
  items: ReciboItem[];

  @OneToMany(() => Pago, (pago) => pago.recibo, { cascade: true })
  pagos: Pago[];

  @Column({ type: 'int', nullable: true, name: 'idUsuarioCreacion' })
  idUsuarioCreacion: number | null;

  @OneToMany(() => MovimientoCaja, (movimiento) => movimiento.recibo)
  movimientos: MovimientoCaja[];
}

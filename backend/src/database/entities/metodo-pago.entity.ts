import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Pago } from './pago.entity';
import { MovimientoCaja } from './movimiento-caja.entity';
import { GastoPago } from './gasto-pago.entity';

@Entity({ name: 'metodosPago' })
export class MetodoPago {
  @PrimaryGeneratedColumn({ name: 'idMetodoPago' })
  idMetodoPago: number;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => Pago, (pago) => pago.metodoPago)
  pagos: Pago[];

  @OneToMany(() => MovimientoCaja, (movimiento) => movimiento.metodoPago)
  movimientos: MovimientoCaja[];

  @OneToMany(() => GastoPago, (gastoPago) => gastoPago.metodoPago)
  gastoPagos: GastoPago[];
}

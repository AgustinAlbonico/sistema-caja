import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { GastoPago } from './gasto-pago.entity';
import { MovimientoCaja } from './movimiento-caja.entity';

@Entity({ name: 'gastos' })
export class Gasto {
  @PrimaryGeneratedColumn({ name: 'idGasto' })
  idGasto: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  descripcion: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  importe: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'timestamp', name: 'createdAt', nullable: true })
  createdAt: Date | null;

  @Column({ type: 'int', nullable: true, name: 'idUsuarioCreacion' })
  idUsuarioCreacion: number | null;

  @OneToMany(() => GastoPago, (gastoPago) => gastoPago.gasto, { cascade: true })
  pagos: GastoPago[];

  @OneToMany(() => MovimientoCaja, (movimiento) => movimiento.gasto)
  movimientos: MovimientoCaja[];
}

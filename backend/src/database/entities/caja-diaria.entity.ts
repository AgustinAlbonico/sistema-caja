import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { MovimientoCaja } from './movimiento-caja.entity';
import { Usuario } from './usuario.entity';

@Entity({ name: 'cajaDiaria' })
@Unique('uqCajaDiariaFecha', ['fecha'])
export class CajaDiaria {
  @PrimaryGeneratedColumn({ name: 'idCajaDiaria' })
  idCajaDiaria: number;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  saldoInicial: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  saldoFinal: string | null;

  @Column({ type: 'boolean', default: false })
  cerrada: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fechaCierre: Date | null;

  @Column({ type: 'int', nullable: true, name: 'idUsuarioApertura' })
  idUsuarioApertura: number | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'idUsuarioApertura' })
  usuarioApertura: Usuario | null;

  @Column({ type: 'int', nullable: true, name: 'idUsuarioCierre' })
  idUsuarioCierre: number | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'idUsuarioCierre' })
  usuarioCierre: Usuario | null;

  @OneToMany(() => MovimientoCaja, (movimiento) => movimiento.cajaDiaria)
  movimientos: MovimientoCaja[];
}

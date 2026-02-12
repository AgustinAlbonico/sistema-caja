import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Recibo } from './recibo.entity';

@Entity({ name: 'clientes' })
export class Cliente {
  @PrimaryGeneratedColumn({ name: 'idCliente' })
  idCliente: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  localidad: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  codPostal: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cuit: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  categoria: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provincia: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'fechaAlta' })
  fechaAlta: Date;

  @Column({ type: 'int', nullable: true, name: 'idUsuarioCreacion' })
  idUsuarioCreacion: number | null;

  @OneToMany(() => Recibo, (recibo) => recibo.cliente)
  recibos: Recibo[];
}

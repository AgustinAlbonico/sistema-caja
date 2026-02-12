import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Auditoria } from './auditoria.entity';

@Entity({ name: 'usuarios' })
export class Usuario {
  @PrimaryGeneratedColumn({ name: 'idUsuario' })
  idUsuario: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombreUsuario: string;

  @Column({ type: 'varchar', length: 255 })
  contrasenaHash: string;

  @Column({ type: 'varchar', length: 200 })
  nombreCompleto: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'fechaCreacion' })
  fechaCreacion: Date;

  @OneToMany(() => Auditoria, (auditoria) => auditoria.usuario)
  auditorias: Auditoria[];
}

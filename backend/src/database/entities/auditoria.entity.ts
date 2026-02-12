import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';

@Entity({ name: 'auditoria' })
export class Auditoria {
  @PrimaryGeneratedColumn({ name: 'idAuditoria' })
  idAuditoria: number;

  @Column({ type: 'int', name: 'idUsuario' })
  idUsuario: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.auditorias, {
    nullable: false,
  })
  @JoinColumn({ name: 'idUsuario' })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 50 })
  accion: string;

  @Column({ type: 'varchar', length: 50 })
  entidad: string;

  @Column({ type: 'int', nullable: true })
  idEntidad: number | null;

  @Column({ type: 'text', nullable: true })
  detalle: string | null;

  @Column({ type: 'timestamp', name: 'fechaAccion' })
  fechaAccion: Date;
}

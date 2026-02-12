import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('conceptos')
export class Concepto {
  @PrimaryGeneratedColumn()
  idConcepto: number;

  @Column({ unique: true })
  descripcion: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  fechaCreacion: Date;
}

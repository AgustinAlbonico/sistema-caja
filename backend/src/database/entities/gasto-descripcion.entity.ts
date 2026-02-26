import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('gasto_descripciones')
export class GastoDescripcion {
  @PrimaryGeneratedColumn({ name: 'idGastoDescripcion' })
  idGastoDescripcion: number;

  @Column({ name: 'descripcion', unique: true })
  descripcion: string;

  @Column({ name: 'activo', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fechaCreacion' })
  fechaCreacion: Date;
}

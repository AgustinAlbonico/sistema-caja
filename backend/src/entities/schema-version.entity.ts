import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

/**
 * Entidad para control de versiones del schema de la base de datos.
 * Permite rastrear qué migraciones se han ejecutado.
 */
@Entity('schemaVersion')
export class SchemaVersion {
  @PrimaryGeneratedColumn({ name: 'idSchemaVersion' })
  idSchemaVersion: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  version: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string;

  @CreateDateColumn({ name: 'fechaAplicacion' })
  fechaAplicacion: Date;
}

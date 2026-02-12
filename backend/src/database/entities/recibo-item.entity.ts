import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Recibo } from './recibo.entity';

@Entity({ name: 'reciboItems' })
export class ReciboItem {
  @PrimaryGeneratedColumn({ name: 'idReciboItem' })
  idReciboItem: number;

  @Column({ type: 'int' })
  idRecibo: number;

  @ManyToOne(() => Recibo, (recibo) => recibo.items, { nullable: false })
  @JoinColumn({ name: 'idRecibo' })
  recibo: Recibo;

  @Column({ type: 'varchar', length: 100 })
  descripcion: string;

  @Column({ type: 'int' })
  mesComprobante: number;

  @Column({ type: 'int' })
  anioComprobante: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  importe: string;
}

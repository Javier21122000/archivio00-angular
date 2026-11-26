import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type NomeRuolo = 'USER' | 'ADMIN';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  name!: NomeRuolo;
}

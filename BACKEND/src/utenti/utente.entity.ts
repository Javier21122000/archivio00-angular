import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Role } from './role.entity.js';

@Entity('utenti')
export class Utente {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email!: string;

  /** Hash bcrypt: non viene mai restituito dalle API. */
  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 80 })
  lastName!: string;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  // `Relation<>` evita problemi di dipendenza circolare con i moduli ESM.
  @ManyToMany(() => Role, { eager: true })
  @JoinTable({
    name: 'utente_ruoli',
    joinColumn: { name: 'utente_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: Relation<Role[]>;
}

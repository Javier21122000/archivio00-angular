import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, type Relation } from 'typeorm';
import { Oggetto } from '../oggetti/oggetto.entity.js';
import { Utente } from '../utenti/utente.entity.js';

@Entity('preferiti')
@Unique('uk_preferito_utente_oggetto', ['utenteId', 'oggettoId'])
export class Preferito {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'utente_id', type: 'uuid' })
  utenteId!: string;

  @ManyToOne(() => Utente, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'utente_id' })
  utente?: Relation<Utente>;

  @Column({ name: 'oggetto_id', type: 'uuid' })
  oggettoId!: string;

  @ManyToOne(() => Oggetto, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'oggetto_id' })
  oggetto?: Relation<Oggetto>;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}

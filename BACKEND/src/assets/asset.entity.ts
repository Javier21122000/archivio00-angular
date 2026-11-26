import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Oggetto } from '../oggetti/oggetto.entity.js';

export type TipoAsset = 'IMAGE' | 'VIDEO';
/** Stati del workflow di approvazione previsto per la futura evoluzione DAM. */
export type StatoAsset = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

/**
 * Un file multimediale associato a un capo. Per ora esiste solo l'asset principale
 * (la foto del capo, popolato dal seed e tenuto allineato a `oggetti.immagine_url`);
 * la tabella separa i metadati del prodotto dai contenuti multimediali.
 */
@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'oggetto_id', type: 'uuid' })
  oggettoId!: string;

  @ManyToOne(() => Oggetto, (oggetto) => oggetto.assets, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'oggetto_id' })
  oggetto?: Relation<Oggetto>;

  @Column({ type: 'varchar', length: 10, default: 'IMAGE' })
  tipo!: TipoAsset;

  @Column({ type: 'varchar', length: 500 })
  url!: string;

  @Column({ type: 'boolean', default: false })
  principale!: boolean;

  @Column({ type: 'integer', default: 0 })
  ordine!: number;

  @Column({ type: 'varchar', length: 15, default: 'APPROVED' })
  stato!: StatoAsset;

  @Column({ type: 'integer', default: 1 })
  versione!: number;

  /** Metadati liberi (dimensioni, tag, didascalie, esito della classificazione AI…). */
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  metadati!: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}

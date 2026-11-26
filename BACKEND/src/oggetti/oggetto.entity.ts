import { Column, Entity, OneToMany, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer.js';
import { Asset } from '../assets/asset.entity.js';

export const IMMAGINE_NON_DISPONIBILE = '/assets/products/unavailable.svg';

/**
 * Un capo del catalogo. I nomi delle colonne seguono la convenzione snake_case del database; gli indici di ricerca stanno nella migration, non qui.
 */
@Entity('oggetti')
export class Oggetto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 180 })
  nome!: string;

  @Column({ type: 'numeric', precision: 6, scale: 2, transformer: numericTransformer })
  prezzo!: number;

  @Column({ name: 'prezzo_acquisto', type: 'numeric', precision: 6, scale: 2, transformer: numericTransformer })
  prezzoAcquisto!: number;

  @Column({ type: 'varchar', length: 180 })
  fornitore!: string;

  @Column({ type: 'boolean', default: false })
  pubblicato!: boolean;

  @Column({ name: 'in_evidenza', type: 'boolean', default: false })
  inEvidenza!: boolean;

  @Column({ name: 'special_edition', type: 'boolean', default: false })
  specialEdition!: boolean;

  @Column({ type: 'integer', default: 0 })
  rating!: number;

  @Column({ name: 'numero_recensioni', type: 'integer', default: 0 })
  numeroRecensioni!: number;

  @Column({ type: 'varchar', length: 80, default: '' })
  categoria!: string;

  @Column({ type: 'varchar', length: 80, default: '' })
  variante!: string;

  /** Chiave stabile del seed: i riavvii non sovrascrivono le modifiche degli admin. */
  @Column({ name: 'seed_key', type: 'varchar', length: 100, unique: true, nullable: true })
  seedKey!: string | null;

  @Column({ name: 'immagine_url', type: 'varchar', length: 500, default: IMMAGINE_NON_DISPONIBILE })
  immagineUrl!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  /** Predisposizione DAM: più asset digitali per capo (vedi docs/ARCHITECTURE.md). */
  @OneToMany(() => Asset, (asset) => asset.oggetto)
  assets?: Relation<Asset[]>;
}

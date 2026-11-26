import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CATEGORIE } from '../categorie.js';

export const ORDINI = ['archivio', 'prezzo-asc', 'prezzo-desc'] as const;
export type Ordine = (typeof ORDINI)[number];

const inBooleano = ({ value }: { value: unknown }) => value === true || value === 'true';

/** Parametri di GET /oggetti: la validazione evita limit enormi e filtri inventati. */
export class ListaOggettiQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60)
  limit?: number;

  @IsOptional() @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @IsIn(CATEGORIE)
  categoria?: string;

  @IsOptional() @Transform(inBooleano) @IsBoolean()
  special?: boolean;

  @IsOptional() @Transform(inBooleano) @IsBoolean()
  soloBozze?: boolean;

  /** `chiavi=a,b,c` → ['a','b','c'] (seedKey dei capi, per le pagine leggenda). */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((v) => v.trim()).filter(Boolean) : value))
  @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(100, { each: true })
  chiavi?: string[];

  @IsOptional() @IsIn(ORDINI)
  ordine?: Ordine;
}

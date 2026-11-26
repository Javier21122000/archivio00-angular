import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { CATEGORIE } from '../categorie.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Corpo di POST/PUT /oggetti (≈ OggettoRequest). I campi facoltativi omessi non cancellano i dati esistenti. */
export class OggettoRequest {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(180)
  nome!: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999.99)
  prezzo!: number;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999.99)
  prezzoAcquisto!: number;

  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(180)
  fornitore!: string;

  @IsOptional() @IsBoolean()
  pubblicato: boolean = false;

  @IsOptional() @IsBoolean()
  inEvidenza: boolean = false;

  // Solo percorso locale (/assets/...) o http(s): niente javascript:, data: o altri schemi.
  @IsOptional() @IsString() @MaxLength(500) @Matches(/^(\/(?!\/)\S*|https?:\/\/\S+)?$/, { message: 'immagineUrl deve essere un percorso locale o un URL http(s)' })
  immagineUrl?: string;

  @IsOptional() @IsBoolean()
  isSpecialEdition?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(5)
  rating?: number;

  @IsOptional() @IsInt() @Min(0)
  numeroRecensioni?: number;

  @IsOptional() @IsIn(['', ...CATEGORIE])
  categoria?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(80)
  variante?: string;
}

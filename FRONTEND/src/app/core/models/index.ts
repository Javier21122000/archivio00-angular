// Modelli allineati a docs/API-CONTRACT.md. In Angular sono solo tipi (interface): spariscono in compilazione, non hanno costo a runtime.

/** Ruoli normalizzati lato client (il backend manda "USER" / "ADMIN"). */
export type Role = 'ROLE_USER' | 'ROLE_ADMIN';

export type ProductCategory =
  | 'Pelle'
  | 'Denim'
  | 'Top & Camicie'
  | 'Trackwear'
  | 'Outerwear'
  | 'Pantaloni'
  | 'Scarpe';

/** Categorie mostrate nei filtri del catalogo: le reali piu' "Tutti" e "SPECIAL EDITIONS". */
export type Category = 'Tutti' | ProductCategory | 'SPECIAL EDITIONS';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  username: string;
  firstName: string;
  lastName: string;
}

/** DTO pubblico; i campi opzionali sono quelli presenti solo nel DTO admin. */
export interface Product {
  id: string;
  nome: string;
  prezzo: number;
  inEvidenza?: boolean;
  immagineUrl?: string;
  isSpecialEdition?: boolean;
  rating?: number;
  numeroRecensioni?: number;
  categoria?: ProductCategory;
  variante?: string;
  // Solo DTO admin
  prezzoAcquisto?: number;
  fornitore?: string;
  pubblicato?: boolean;
  createdAt?: string;
}

export interface ProductInput {
  nome: string;
  prezzo: number;
  prezzoAcquisto: number;
  fornitore: string;
  pubblicato: boolean;
  isSpecialEdition?: boolean;
  rating?: number;
  numeroRecensioni?: number;
  categoria?: ProductCategory | '';
  variante?: string;
  inEvidenza?: boolean;
  immagineUrl?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Capi visibili all'utente senza filtri (per "L'ARCHIVIO (28)"). */
  catalogCount: number;
}

export type ProductSort = 'archivio' | 'prezzo-asc' | 'prezzo-desc';

export interface ProductQuery {
  page?: number;
  limit?: number;
  q?: string;
  categoria?: ProductCategory;
  special?: boolean;
  soloBozze?: boolean;
  chiavi?: string[];
  ordine?: ProductSort;
}

export interface ProductStats {
  totale: number;
  pubblicati: number;
  bozze: number;
}

export interface Favorite {
  id: string;
  oggetto: Product;
  createdAt: string;
}

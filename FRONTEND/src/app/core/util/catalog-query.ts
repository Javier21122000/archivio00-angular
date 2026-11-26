import { Category, Product, ProductQuery } from '../models';

/** Quanti capi chiedere al server: 8 in home, 12 per pagina nel catalogo. */
export const PAGE_SIZE = 12;
export const COMPACT_SIZE = 8;

/**
 * Traduce la tab scelta nei parametri del server: "Tutti" non filtra,
 * "SPECIAL EDITIONS" diventa special=true, le altre sono categorie reali.
 */
export function categoryToQuery(category: Category): Pick<ProductQuery, 'categoria' | 'special'> {
  if (category === 'Tutti') return {};
  if (category === 'SPECIAL EDITIONS') return { special: true };
  return { categoria: category };
}

/**
 * Accoda la pagina successiva scartando i capi gia' presenti: se nel frattempo il catalogo
 * e' cambiato, lo scorrimento delle pagine potrebbe riproporre un capo e il @for avrebbe id duplicati.
 */
export function appendUnique(current: Product[], incoming: Product[]): Product[] {
  const known = new Set(current.map((p) => p.id));
  return [...current, ...incoming.filter((p) => !known.has(p.id))];
}

/** Ritardo di comparsa scaglionato: dopo l'ottava card non cresce piu' (il ritardo massimo resta a 315ms, per non far aspettare le ultime card). */
export const revealDelay = (index: number): number => Math.min(index, 7) * 45;

/** "ARCHIVE / 03": numero progressivo a due cifre. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

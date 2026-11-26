export const CATEGORIE = ['Denim', 'Pelle', 'Top & Camicie', 'Trackwear', 'Outerwear', 'Pantaloni', 'Scarpe'] as const;
export type Categoria = (typeof CATEGORIE)[number];

/** Euristica che ricava la categoria dal nome del capo: usata solo se l'admin non sceglie la categoria. */
export function deriveCategoria(nome: string): Categoria {
  if (/denim|jeans/i.test(nome)) return 'Denim';
  if (/leather|biker|pelle|varsity/i.test(nome)) return 'Pelle';
  if (/shirt|tee|camici|felpa/i.test(nome)) return 'Top & Camicie';
  if (/nike|jordan|adidas|scarpe/i.test(nome)) return 'Scarpe';
  if (/pirlo|pantalon/i.test(nome)) return 'Pantaloni';
  if (/velour|track|jersey|tuta/i.test(nome)) return 'Trackwear';
  return 'Outerwear';
}

/** Rende letterali i caratteri speciali di LIKE/ILIKE (% _ \) digitati dall'utente. */
export function escapeLike(testo: string): string {
  return testo.replace(/[\\%_]/g, '\\$&');
}

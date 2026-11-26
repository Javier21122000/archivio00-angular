/**
 * Catalogo iniziale: i 28 capi con cui parte il negozio.
 * La `key` coincide con il nome del file immagine in `FRONTEND/public/assets/products/<key>.jpg`.
 */
export interface ProdottoSeed {
  key: string;
  nome: string;
  categoria: string;
  variante: string;
  prezzo: number;
  special: boolean;
  featured: boolean;
  rating: number;
  recensioni: number;
}

const p = (
  key: string, nome: string, categoria: string, variante: string, prezzo: number,
  special: boolean, featured: boolean, rating: number, recensioni: number,
): ProdottoSeed => ({ key, nome, categoria, variante, prezzo, special, featured, rating, recensioni });

export const CATALOGO_SEED: ProdottoSeed[] = [
  p('beckham-denim', 'Beckham Baggy Denim Collab', 'Denim', '', 750, true, true, 5, 7),
  p('artistic-denim', 'Artistic Renaissance Denim (Spezzettata)', 'Denim', '', 380, false, true, 4, 14),
  p('cargo-denim', "Jeans Cargo Wide Leg '04", 'Denim', '', 198, false, false, 4, 21),
  p('acid-denim', 'Denim Lavaggio Acido Vintage', 'Denim', '', 214, false, false, 5, 28),
  p('carpenter-denim', 'Denim Carpenter Loose Fit', 'Denim', '', 205, false, false, 4, 35),
  p('cristiano-leather', 'Cristiano Biker Leather Collab', 'Pelle', '', 440, true, true, 4, 42),
  p('henry-varsity', 'Varsity Jacket Henry Collab', 'Pelle', '', 380, true, false, 5, 10),
  p('chiodo-leather', 'Chiodo in Pelle Vissuta Oversized', 'Pelle', '', 389, false, false, 4, 17),
  p('trench-leather', "Trench Pelle Matrice '01", 'Pelle', '', 365, false, false, 4, 24),
  p('biposto-leather', 'Giacca Pelle Biposto Y2K', 'Pelle', '', 410, false, false, 5, 31),
  p('ronaldinho-tee', 'Ronaldinho Graphic Tee', 'Top & Camicie', '', 180, true, true, 4, 38),
  p('striped-brown', 'Vintage 00s Striped Shirt', 'Top & Camicie', 'Marrone / panna', 170, false, false, 4, 45),
  p('striped-grey', 'Vintage 00s Striped Shirt', 'Top & Camicie', 'Grigio / nero', 175, false, false, 5, 13),
  p('oldculture-cream', 'Oldculture Graphic Sweatshirt', 'Top & Camicie', 'Panna / marrone', 270, false, false, 4, 20),
  p('oldculture-black', 'Oldculture Graphic Sweatshirt', 'Top & Camicie', 'Nero', 280, false, false, 4, 27),
  p('balotelli-velour', 'Balotelli Velour Tracktop Collab', 'Trackwear', '', 310, true, true, 5, 34),
  p('satin-tracksuit', 'Tuta Tecnico-Satinata Y2K', 'Trackwear', '', 255, false, false, 4, 41),
  p('wind-shell', 'Technical Utility Wind Shell Jacket', 'Outerwear', '', 215, false, false, 4, 9),
  p('salvador-zip', 'Salvador Corduroy Zip Jacket', 'Outerwear', '', 245, false, false, 5, 16),
  p('salvador-y2k', 'Salvador Corduroy Y2K Jacket', 'Outerwear', '', 265, false, false, 4, 23),
  p('pirlo-corduroy', 'Pirlo Corduroy Collab', 'Pantaloni', '', 380, true, false, 4, 30),
  p('dunk-low', "Nike Dunk Low Retro 'Y2K' Edition", 'Scarpe', '', 220, false, false, 5, 37),
  p('air-max', 'Nike Air Max 95 Y2K Edition', 'Scarpe', '', 240, false, false, 4, 44),
  p('jordan-4', "Jordan 4 Retro Vintage '06", 'Scarpe', '', 268, false, false, 4, 12),
  p('metallic-puffer', "Puffer Jacket Metallizzato '01", 'Outerwear', '', 298, false, false, 5, 19),
  p('utility-parka', 'Parka Tecnico Multi-Pockets', 'Outerwear', '', 272, false, false, 4, 26),
  p('padded-bomber', 'Bomber Padded Y2K', 'Outerwear', '', 286, false, false, 4, 33),
  p('climacool', 'Adidas Climacool 2000 Archive', 'Scarpe', '', 225, false, false, 5, 40),
];

export interface UtenteSeed {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  admin: boolean;
}

/** Account dimostrativi (solo sviluppo): un utente e un amministratore. */
export const UTENTI_DEMO: UtenteSeed[] = [
  { username: 'utente.archivio00', email: 'utente@archivio00.it', password: 'password123', firstName: 'Utente', lastName: 'Archivio', admin: false },
  { username: 'javier.archivio00', email: 'javier@archivio00.it', password: 'admin123', firstName: 'Javier', lastName: 'Torres', admin: true },
];

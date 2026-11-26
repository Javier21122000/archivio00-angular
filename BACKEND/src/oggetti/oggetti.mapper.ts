import type { Oggetto } from './oggetto.entity.js';

/** DTO pubblico: elenco esplicito dei campi, così una nuova colonna riservata non esce per errore. */
export function toPublic(o: Oggetto) {
  return {
    id: o.id,
    nome: o.nome,
    prezzo: o.prezzo,
    inEvidenza: o.inEvidenza,
    immagineUrl: o.immagineUrl,
    isSpecialEdition: o.specialEdition,
    rating: o.rating,
    numeroRecensioni: o.numeroRecensioni,
    categoria: o.categoria,
    variante: o.variante,
  };
}

/** DTO admin: pubblico + dati riservati (costi, fornitore, stato di pubblicazione). */
export function toAdmin(o: Oggetto) {
  return {
    ...toPublic(o),
    prezzoAcquisto: o.prezzoAcquisto,
    fornitore: o.fornitore,
    pubblicato: o.pubblicato,
    createdAt: o.createdAt,
  };
}

export type OggettoPublicDto = ReturnType<typeof toPublic>;
export type OggettoAdminDto = ReturnType<typeof toAdmin>;

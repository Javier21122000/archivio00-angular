const formatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

/** Formatta un importo in euro all'italiana, es. 189 -> "189,00 €". */
export const euro = (value: number): string => formatter.format(value);

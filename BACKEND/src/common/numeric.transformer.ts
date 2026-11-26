import type { ValueTransformer } from 'typeorm';

/**
 * PostgreSQL restituisce `numeric` come stringa ("750.00") per non perdere precisione.
 * Con questo transformer l'entity espone un `number`, come il BigDecimal serializzato da Jackson.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};

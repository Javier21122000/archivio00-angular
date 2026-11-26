import { Product } from '../models';
import { appendUnique, categoryToQuery, pad2, revealDelay } from './catalog-query';

const p = (id: string): Product => ({ id, nome: id, prezzo: 1 });

describe('catalog-query', () => {
  it('categoryToQuery traduce le tab', () => {
    expect(categoryToQuery('Tutti')).toEqual({});
    expect(categoryToQuery('SPECIAL EDITIONS')).toEqual({ special: true });
    expect(categoryToQuery('Denim')).toEqual({ categoria: 'Denim' });
  });
  it('appendUnique scarta i doppioni e mantiene l’ordine', () => {
    expect(appendUnique([p('a'), p('b')], [p('b'), p('c')]).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
  it('revealDelay si ferma a 7 * 45 ms', () => {
    expect(revealDelay(0)).toBe(0);
    expect(revealDelay(3)).toBe(135);
    expect(revealDelay(40)).toBe(315);
  });
  it('pad2 aggiunge lo zero', () => {
    expect(pad2(3)).toBe('03');
    expect(pad2(12)).toBe('12');
  });
});

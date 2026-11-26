import { parseCategory } from './catalog.page';

describe('parseCategory', () => {
  it('accetta le categorie valide', () => {
    expect(parseCategory('Denim')).toBe('Denim');
    expect(parseCategory('SPECIAL EDITIONS')).toBe('SPECIAL EDITIONS');
    expect(parseCategory('Top & Camicie')).toBe('Top & Camicie');
  });
  it('ripiega su Tutti se manca o e’ sconosciuta', () => {
    expect(parseCategory(null)).toBe('Tutti');
    expect(parseCategory('Cappelli')).toBe('Tutti');
    expect(parseCategory('')).toBe('Tutti');
  });
});

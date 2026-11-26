import { deriveCategoria, escapeLike } from './categorie.js';

describe('deriveCategoria', () => {
  it.each([
    ['Baggy Denim Off-White', 'Denim'],
    ["Biker Leather Jacket '03", 'Pelle'],
    ['Vintage Striped Shirt', 'Top & Camicie'],
    ['Nike Dunk Low', 'Scarpe'],
    ['Pirlo Corduroy', 'Pantaloni'],
    ['Velour Tracktop', 'Trackwear'],
    ['Puffer Jacket', 'Outerwear'],
  ])('%s → %s', (nome, atteso) => {
    expect(deriveCategoria(nome)).toBe(atteso);
  });
});

describe('escapeLike', () => {
  it('rende letterali % _ e backslash', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
  it('lascia invariato il testo normale', () => {
    expect(escapeLike('denim')).toBe('denim');
  });
});

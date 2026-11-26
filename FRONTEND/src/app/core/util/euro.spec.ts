import { euro } from './euro';

describe('euro', () => {
  it('formatta all’italiana', () => {
    expect(euro(189).replace(/\s/g, ' ')).toBe('189,00 €');
    expect(euro(12345.5).replace(/\s/g, ' ')).toBe('12.345,50 €');
  });
});

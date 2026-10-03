import { describe, expect, it } from 'vitest';
import { leesBedrag, pctVoorBedrag } from '../bedrag';

describe('bedrag invullen naast de schuif', () => {
  it('leest Nederlandse en Engelse notatie', () => {
    expect(leesBedrag('4,5')).toBe(4.5);
    expect(leesBedrag('4.5')).toBe(4.5);
    expect(leesBedrag('€ 1.250,00')).toBe(1250);
    expect(leesBedrag(' 12 mln ')).toBe(12);
    expect(leesBedrag('−2')).toBe(-2);
    expect(leesBedrag('veel')).toBeUndefined();
    expect(leesBedrag('')).toBeUndefined();
  });

  it('rekent het bedrag om naar een percentage', () => {
    // Budget € 5,28 mln, nieuw € 4,50 mln: −14,77%
    expect(pctVoorBedrag(4.5, 5.28)).toBe(-14.77);
    // Tarief € 135,05, nieuw € 148,56: +10%
    expect(pctVoorBedrag(148.56, 135.05)).toBe(10);
    expect(pctVoorBedrag(0, 35.1)).toBe(-100);
  });
});

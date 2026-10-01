import { describe, expect, it } from 'vitest';
import { maakProjectie, type LonLat } from '../kaart/projectie';

const vierkant: LonLat[] = [
  [6.4, 53.1],
  [6.8, 53.1],
  [6.8, 53.3],
  [6.4, 53.3],
];

describe('projectie', () => {
  it('past de gemeente in de wereldbreedte, met marge', () => {
    const p = maakProjectie({
      coordinaten: vierkant,
      centrum: [6.6, 53.2],
      exponent: 0.55,
      breedte: 1000,
      marge: 20,
    });
    const xs = vierkant.map((ll) => p.punt(ll).x);
    expect(Math.min(...xs)).toBeCloseTo(20, 6);
    expect(Math.max(...xs)).toBeCloseTo(980, 6);
    expect(p.hoogte).toBeGreaterThan(0);
  });

  it('vergroot het centrum: een punt dicht bij het centrum komt verder weg te liggen', () => {
    const zonder = maakProjectie({
      coordinaten: vierkant,
      centrum: [6.6, 53.2],
      exponent: 1,
      breedte: 1000,
      marge: 0,
    });
    const met = maakProjectie({
      coordinaten: vierkant,
      centrum: [6.6, 53.2],
      exponent: 0.55,
      breedte: 1000,
      marge: 0,
    });
    const afstand = (p: typeof met, ll: LonLat) => {
      const a = p.punt(ll);
      return Math.hypot(a.x - p.centrum.x, a.y - p.centrum.y);
    };
    const dichtbij: LonLat = [6.61, 53.205];
    // relatief ten opzichte van de rand
    const rand: LonLat = [6.8, 53.3];
    expect(afstand(met, dichtbij) / afstand(met, rand)).toBeGreaterThan(
      afstand(zonder, dichtbij) / afstand(zonder, rand),
    );
  });

  it('houdt de richting vanuit het centrum gelijk', () => {
    const p = maakProjectie({
      coordinaten: vierkant,
      centrum: [6.6, 53.2],
      exponent: 0.55,
      breedte: 1000,
      marge: 0,
    });
    const a = p.punt([6.7, 53.2]);
    expect(a.y).toBeCloseTo(p.centrum.y, 6);
    expect(a.x).toBeGreaterThan(p.centrum.x);
  });

  it('met exponent 1 is het gewoon Mercator: rechte lijnen blijven recht', () => {
    const p = maakProjectie({
      coordinaten: vierkant,
      centrum: [6.6, 53.2],
      exponent: 1,
      breedte: 1000,
      marge: 0,
    });
    const a = p.punt([6.4, 53.15]);
    const b = p.punt([6.5, 53.15]);
    const c = p.punt([6.8, 53.15]);
    expect(a.y).toBeCloseTo(b.y, 6);
    expect(b.y).toBeCloseTo(c.y, 6);
  });
});

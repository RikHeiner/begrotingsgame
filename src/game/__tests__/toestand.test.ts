import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, type Data } from '../../engine';
import { echteData, keuzes } from '../../engine/__tests__/hulp';
import { gebouwStanden, toestandBij } from '../toestand';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});

describe('toestand van gebouwen', () => {
  it('volgt de drempels uit de opdracht', () => {
    const d = { gesloten_tot: -30, versoberd_tot: -4, normaal_tot: 3, beter_tot: 15 };
    expect(toestandBij(16, d)).toBe('bloeiend');
    expect(toestandBij(15, d)).toBe('beter');
    expect(toestandBij(3.5, d)).toBe('beter');
    expect(toestandBij(3, d)).toBe('normaal');
    expect(toestandBij(-4, d)).toBe('normaal');
    expect(toestandBij(-4.1, d)).toBe('versoberd');
    expect(toestandBij(-29, d)).toBe('versoberd');
    expect(toestandBij(-30, d)).toBe('gesloten');
  });

  it('zonder keuzes is alles normaal en kost niets', () => {
    const s = gebouwStanden(data, data.kaart, bereken(data, keuzes()));
    for (const g of Object.values(s)) {
      expect(g.toestand).toBe('normaal');
      expect(g.bedrag).toBe(0);
    }
  });

  it('het zwembad sluit bij −50% op sport, en het bedrag staat eronder', () => {
    const r = bereken(data, keuzes({ onderdelen: { k1: -50, k2: -100, k3: -100 } }));
    const s = gebouwStanden(data, data.kaart, r);
    expect(s.zwembad?.toestand).toBe('gesloten');
    // 0,5 × (36,5 − 11,2) + 1 × (2,2 − 1,1) + 1 × 1,1 = 14,85
    expect((s.zwembad?.bedrag ?? 0) / 1e6).toBeCloseTo(14.85, 6);
  });

  it('belastingloket: hogere belastingen maken het loket somber', () => {
    const s = gebouwStanden(data, data.kaart, bereken(data, keuzes({ belastingen: { t1: 20 } })));
    expect(s.loket?.toestand).toBe('versoberd');
  });
});

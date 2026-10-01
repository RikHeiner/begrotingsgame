import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { echteData, keuzes } from '../../engine/__tests__/hulp';
import { berekenImpact, standaardHuishouden, totaal } from '../impact';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});
const tarieven = () => {
  if (!data.tarieven) throw new Error('geen tarieven');
  return data.tarieven;
};

describe('Wat betekent het voor mij?', () => {
  it('een koophuis met de gemiddelde WOZ-waarde, zonder keuzes', () => {
    const r = berekenImpact(tarieven(), keuzes(), standaardHuishouden(data));
    const ozb = r.find((x) => x.naam === 'OZB');
    // 0,1473% van € 340.000
    expect(ozb?.nu).toBe(500.82);
    expect(ozb?.straks).toBe(500.82);
    expect(r.find((x) => x.naam === 'Afvalstoffenheffing')?.nu).toBe(331.2);
    expect(r.find((x) => x.naam === 'Rioolheffing')?.nu).toBe(178.69);
    expect(totaal(r).nu).toBeCloseTo(500.82 + 331.2 + 178.69, 6);
  });

  it('een lagere OZB scheelt de eigenaar geld', () => {
    const r = berekenImpact(
      tarieven(),
      keuzes({ belastingen: { t1: -10 } }),
      standaardHuishouden(data),
    );
    expect(r.find((x) => x.naam === 'OZB')?.straks).toBe(450.74);
  });

  it('huurders betalen geen OZB en geen rioolheffing', () => {
    const r = berekenImpact(tarieven(), keuzes({ belastingen: { t1: -10 } }), {
      ...standaardHuishouden(data),
      woning: 'huur',
      volwassenen: 1,
    });
    expect(r.find((x) => x.naam === 'OZB')?.nu).toBeUndefined();
    expect(r.some((x) => x.naam === 'Rioolheffing')).toBe(false);
    expect(r.find((x) => x.naam === 'Afvalstoffenheffing')?.nu).toBe(283.08);
  });

  it('kinderen tellen mee voor de afvalstoffenheffing', () => {
    const r = berekenImpact(tarieven(), keuzes(), { ...standaardHuishouden(data), kinderen: 2 });
    expect(r.find((x) => x.naam === 'Afvalstoffenheffing')?.nu).toBe(402.12);
  });

  it('Peter en Tineke: Oosterpoort, twee vergunningen, parkeren gratis', () => {
    const h = { ...standaardHuishouden(data), vergunning: 'zone_2', vergunningen: 2 as const };
    const nu = berekenImpact(tarieven(), keuzes(), h).find((x) => x.naam.includes('parkeer'));
    expect(nu?.nu).toBeCloseTo(135.05 + 408.8, 6);
    const gratis = berekenImpact(tarieven(), keuzes({ belastingen: { t5: -100 } }), h);
    expect(gratis.find((x) => x.naam.includes('arkeer'))?.straks).toBe(0);
  });

  it('een onbekend tarief wordt niet verzonnen', () => {
    const r = berekenImpact(tarieven(), keuzes(), {
      ...standaardHuishouden(data),
      vergunning: 'binnenstad',
      vergunningen: 2,
    });
    const p = r.find((x) => x.naam === 'Parkeervergunning');
    expect(p?.nu).toBeUndefined();
    expect(p?.uitleg).toMatch(/niet in de data/);
  });

  it('met kwijtschelding betaal je geen afval, riool en OZB', () => {
    const r = berekenImpact(tarieven(), keuzes(), { ...standaardHuishouden(data), minimum: true });
    expect(totaal(r)).toEqual({ nu: 0, straks: 0 });
  });
});

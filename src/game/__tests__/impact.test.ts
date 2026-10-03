import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, type Data } from '../../engine';
import { echteData, keuzes } from '../../engine/__tests__/hulp';
import { berekenImpact, impactPosten, standaardHuishouden, totaal } from '../impact';

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
    const h = { ...standaardHuishouden(data), vergunning: 'tweede', vergunningen: 2 as const };
    const parkeer = (r: ReturnType<typeof berekenImpact>) =>
      r.filter((x) => x.naam.includes('arkeervergunning'));
    const nu = parkeer(berekenImpact(tarieven(), keuzes(), h, impactPosten(data)));
    expect(nu.reduce((s, x) => s + (x.nu ?? 0), 0)).toBeCloseTo(135.05 + 408.8, 6);
    // Een oude keuze voor t5 (deellink) geldt voor alle posten; de rekenmotor zet dat om.
    const k = bereken(data, keuzes({ belastingen: { t5: -100 } })).keuzes;
    const gratis = parkeer(berekenImpact(tarieven(), k, h, impactPosten(data)));
    expect(gratis.every((x) => x.straks === 0)).toBe(true);
  });

  it('de keuze per zone telt alleen in die zone', () => {
    const k = bereken(data, keuzes({ parkeren: { 'bewoners_1:tweede': 10 } })).keuzes;
    const zone = (vergunning: string) =>
      berekenImpact(
        tarieven(),
        k,
        { ...standaardHuishouden(data), vergunning },
        impactPosten(data),
      ).find((x) => x.naam === 'Parkeervergunning');
    expect(zone('tweede')?.straks).toBe(148.56);
    expect(zone('derde_tm_vijfde')?.straks).toBe(62.05);
  });

  it('de bezoekersvergunning', () => {
    const r = berekenImpact(
      tarieven(),
      keuzes(),
      { ...standaardHuishouden(data), bezoekers: true },
      impactPosten(data),
    );
    expect(r.find((x) => x.naam === 'Bezoekersvergunning')?.nu).toBe(25);
  });

  it('een onbekend tarief wordt niet verzonnen', () => {
    const r = berekenImpact(
      tarieven(),
      keuzes(),
      { ...standaardHuishouden(data), vergunning: 'binnenstad', vergunningen: 2 },
      impactPosten(data),
    );
    expect(r.find((x) => x.naam === 'Parkeervergunning')?.nu).toBe(394.2);
    const p = r.find((x) => x.naam === 'Tweede parkeervergunning');
    expect(p?.nu).toBeUndefined();
    expect(p?.uitleg).toMatch(/niet in de data/);
  });

  it('met kwijtschelding betaal je geen afval, riool en OZB', () => {
    const r = berekenImpact(tarieven(), keuzes(), { ...standaardHuishouden(data), minimum: true });
    expect(totaal(r)).toEqual({ nu: 0, straks: 0 });
  });
});

describe('hondenbelasting', () => {
  const met = (kaarten: string[]) =>
    berekenImpact(tarieven(), keuzes({ kaarten }), { ...standaardHuishouden(data), hond: true });

  it('zonder de kaart: geen hondenbelasting', () => {
    const r = met([]).find((x) => x.naam === 'Hondenbelasting');
    expect(r).toMatchObject({ nu: 0, straks: 0 });
  });

  it('met de kaart: € 133 per jaar', () => {
    const r = met(['k_hond']).find((x) => x.naam === 'Hondenbelasting');
    expect(r).toMatchObject({ nu: 0, straks: 133 });
  });

  it('zonder hond: geen regel', () => {
    const r = berekenImpact(tarieven(), keuzes({ kaarten: ['k_hond'] }), standaardHuishouden(data));
    expect(r.find((x) => x.naam === 'Hondenbelasting')).toBeUndefined();
  });
});

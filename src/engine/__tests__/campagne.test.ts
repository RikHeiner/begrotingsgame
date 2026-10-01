import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, berekenCampagne, type Data, type Keuzes } from '..';
import { echteData, keuzes, mln } from './hulp';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});

const s = (k: Keuzes, jaar: number) => ({ vanaf: jaar, keuzes: k });
const saldoS = (r: ReturnType<typeof bereken>) =>
  data.jaren.map((j) => mln(r.perJaar[j]?.structureel ?? 0));
const saldoI = (r: ReturnType<typeof bereken>) =>
  data.jaren.map((j) => mln(r.perJaar[j]?.incidenteel ?? 0));

describe('gebeurteniskaarten', () => {
  it('er zijn minstens 15 kaarten', () => {
    expect(data.gebeurtenissen.length).toBeGreaterThanOrEqual(15);
  });

  it('een structurele kaart is een percentage van de lasten, elk jaar', () => {
    const r = bereken(data, keuzes({ gebeurtenissen: ['g_jeugdzorg'] }));
    // 4% van 118,8 mln jeugdzorg
    expect(saldoS(r)).toEqual([-4.752, -4.752, -4.752, -4.752]);
    expect(r.effecten.every((e) => e.bron !== 'g_jeugdzorg' || e.zekerheid === 'aanname')).toBe(
      true,
    );
  });

  it('de scenario’s gebruiken de grenzen van de band', () => {
    const voorzichtig = bereken(
      data,
      keuzes({ gebeurtenissen: ['g_jeugdzorg'], scenario: 'voorzichtig' }),
    );
    const optimistisch = bereken(
      data,
      keuzes({ gebeurtenissen: ['g_jeugdzorg'], scenario: 'optimistisch' }),
    );
    expect(saldoS(voorzichtig)[0]).toBeCloseTo(-0.07 * 118.8, 6);
    expect(saldoS(optimistisch)[0]).toBeCloseTo(-0.02 * 118.8, 6);
    // Bij een meevaller is voorzichtig juist de lage kant
    const mee = bereken(
      data,
      keuzes({ gebeurtenissen: ['g_meicirculaire'], scenario: 'voorzichtig' }),
    );
    expect(saldoS(mee)[0]).toBeCloseTo(0.0025 * 825.768, 6);
  });

  it('een eenmalige kaart telt alleen in het eerste jaar', () => {
    const r = bereken(data, keuzes({ gebeurtenissen: ['g_winter'] }));
    expect(saldoI(r)).toEqual([-1.328, 0, 0, 0]);
    expect(saldoS(r)).toEqual([0, 0, 0, 0]);
  });

  it('een kaart met twee effecten telt ze allebei', () => {
    const r = bereken(data, keuzes({ gebeurtenissen: ['g_evenement'] }));
    // +10% van 2,9 toeristenbelasting − 10% van 3,8 openbare orde
    expect(saldoI(r)[0]).toBeCloseTo(0.29 - 0.38, 6);
  });
});

describe('campagne: vier rondes', () => {
  it('één ronde is gewoon de begroting', () => {
    const k = keuzes({ onderdelen: { h1: -10 } });
    expect(saldoS(berekenCampagne(data, [s(k, 2026)]))).toEqual(saldoS(bereken(data, k)));
  });

  it('keuzes die niet veranderen, lopen gewoon door', () => {
    const k = keuzes({ onderdelen: { h1: -10, c2: -20 }, belastingen: { t1: -5 } });
    const c = berekenCampagne(data, [s(k, 2026), s(k, 2027), s(k, 2028), s(k, 2029)]);
    const b = bereken(data, k);
    expect(saldoS(c)).toEqual(saldoS(b));
    expect(c.regels.sluitend).toBe(b.regels.sluitend);
    expect(c.weerstandsvermogen).toBeCloseTo(b.weerstandsvermogen, 9);
  });

  it('een keuze in ronde 3 telt pas vanaf 2028', () => {
    const leeg = keuzes();
    const k = keuzes({ onderdelen: { h1: -10 } });
    const c = berekenCampagne(data, [s(leeg, 2026), s(leeg, 2027), s(k, 2028), s(k, 2029)]);
    expect(saldoS(c)).toEqual([0, 0, 12.3236, 12.3236]);
  });

  it('de vertraging van een subsidie begint in het jaar van de keuze', () => {
    const leeg = keuzes();
    const k = keuzes({ onderdelen: { c2: -20 } });
    const vanaf2026 = saldoS(bereken(data, k));
    const c = berekenCampagne(data, [s(leeg, 2026), s(leeg, 2027), s(k, 2028), s(k, 2029)]);
    // 2028 is het eerste jaar van de bezuiniging: hetzelfde als 2026 bij een keuze in 2026
    expect(saldoS(c)).toEqual([0, 0, vanaf2026[0], vanaf2026[1]]);
    expect(vanaf2026[0]).not.toEqual(vanaf2026[1]);
  });

  it('een kaart uit ronde 2 werkt vanaf 2027', () => {
    const leeg = keuzes();
    const met = keuzes({ gebeurtenissen: ['g_jeugdzorg'] });
    const c = berekenCampagne(data, [s(leeg, 2026), s(met, 2027), s(met, 2028), s(met, 2029)]);
    expect(saldoS(c)).toEqual([0, -4.752, -4.752, -4.752]);
    const winter = keuzes({ gebeurtenissen: ['g_winter'] });
    const w = berekenCampagne(data, [
      s(leeg, 2026),
      s(leeg, 2027),
      s(winter, 2028),
      s(winter, 2029),
    ]);
    expect(saldoI(w)).toEqual([0, 0, -1.328, 0]);
  });

  it('een keuze terugdraaien in een latere ronde geldt vanaf dat jaar', () => {
    const k = keuzes({ onderdelen: { h1: -10 } });
    const leeg = keuzes();
    const c = berekenCampagne(data, [s(k, 2026), s(k, 2027), s(leeg, 2028), s(leeg, 2029)]);
    expect(saldoS(c)).toEqual([12.3236, 12.3236, 0, 0]);
    expect(c.regels.sluitend).toBe(true);
    expect(c.effecten.filter((e) => e.jaar >= 2028 && e.bron === 'h1')).toHaveLength(0);
  });
});

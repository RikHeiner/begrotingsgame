import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, magWijzigen, type Data } from '../../engine';
import { echteData, keuzes } from '../../engine/__tests__/hulp';
import { beginKeuzes, nulbasisKeuzes, postenDieOpleveren, vergelijkMetCollege } from '../nulbasis';
import { THEMA_BELASTINGEN } from '../score';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});

describe('beginnen bij nul', () => {
  it('elke post op zijn minimum; vaste posten en wettelijke taken blijven', () => {
    const k = nulbasisKeuzes(data);
    expect(k.onderdelen.c2).toBe(-100); // cultuursubsidies naar nul
    expect(k.onderdelen.z1).toBe(-10); // jeugdzorg: wettelijk minimum
    expect(k.onderdelen.s1).toBeUndefined(); // bijstand zit vast
    expect(k.belastingen).toEqual({});
    // Een geldige begroting: de rekenmotor hoeft niets te corrigeren.
    const r = bereken(data, k);
    expect(r.correcties).toEqual([]);
    // Er komt veel geld vrij om te verdelen.
    expect(r.perJaar[data.jaren[0] ?? 0]?.structureel).toBeGreaterThan(150e6);
  });

  it('posten waarvan schrappen geld kost, blijven staan', () => {
    const houden = postenDieOpleveren(data);
    // bedrijfsafval levert meer op dan het kost; zonder parkeercontrole betaalt bijna niemand
    expect([...houden].sort()).toEqual(expect.arrayContaining(['m2', 'o4', 'v9']));
    const k = nulbasisKeuzes(data);
    for (const id of houden) expect(k.onderdelen[id], id).toBeUndefined();
    // Elke andere post naar zijn minimum levert geld op.
    expect(Object.keys(k.onderdelen).length).toBeGreaterThan(60);
  });

  it('beginpunt: nul is de nulbasis, het college is zonder keuzes', () => {
    expect(beginKeuzes(data, 'nul')).toEqual(nulbasisKeuzes(data));
    expect(beginKeuzes(data, 'college').onderdelen).toEqual({});
    // Eén keer uitgerekend per dataset.
    expect(nulbasisKeuzes(data)).toBe(nulbasisKeuzes(data));
  });

  it('van nul weer iets toevoegen mag', () => {
    const k = nulbasisKeuzes(data);
    const terug = { ...k, onderdelen: { ...k.onderdelen, c2: 0 } };
    expect(magWijzigen(data, k, terug).ok).toBe(true);
  });

  it('de vergelijking met het college: zonder keuzes overal gelijk', () => {
    const rijen = vergelijkMetCollege(data, bereken(data, keuzes()));
    for (const r of rijen) expect(Math.abs(r.jij - r.college), r.thema).toBeLessThan(1);
    const uit = rijen
      .filter((r) => r.thema !== THEMA_BELASTINGEN)
      .reduce((s, r) => s + r.college, 0);
    const lasten = data.begroting.onderdelen.reduce((s, o) => s + o.lasten_mln * 1e6, 0);
    expect(uit).toBeCloseTo(lasten, -3);
  });

  it('bij nul: minder uitgaven dan het college, gelijke belastingen', () => {
    const rijen = vergelijkMetCollege(data, bereken(data, nulbasisKeuzes(data)));
    const uit = rijen.filter((r) => r.thema !== THEMA_BELASTINGEN);
    expect(uit.reduce((s, r) => s + r.jij, 0)).toBeLessThan(
      uit.reduce((s, r) => s + r.college, 0) - 300e6,
    );
    const b = rijen.find((r) => r.thema === THEMA_BELASTINGEN);
    expect(b && Math.abs(b.jij - b.college)).toBeLessThan(1);
  });

  it('OZB +10%: de inkomsten stijgen met 10% van de OZB-opbrengst', () => {
    const rijen = vergelijkMetCollege(data, bereken(data, keuzes({ belastingen: { t1: 10 } })));
    const b = rijen.find((r) => r.thema === THEMA_BELASTINGEN);
    expect((b?.jij ?? 0) - (b?.college ?? 0)).toBeCloseTo(12.53e6, -3);
  });
});

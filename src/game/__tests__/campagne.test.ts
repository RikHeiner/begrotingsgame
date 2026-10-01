import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { echteData, keuzes, mln } from '../../engine/__tests__/hulp';
import { kaartBedrag, rekenCampagne, toeval, trekKaarten, type Campagne } from '../campagne';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});

describe('campagne in de game', () => {
  it('trekt één of twee nieuwe kaarten, herhaalbaar', () => {
    const a = trekKaarten(data, 42, 1, []);
    expect(a.length).toBeGreaterThanOrEqual(1);
    expect(a.length).toBeLessThanOrEqual(2);
    expect(trekKaarten(data, 42, 1, [])).toEqual(a);
    const b = trekKaarten(data, 42, 2, a);
    expect(b.some((id) => a.includes(id))).toBe(false);
    // Over vier rondes nooit een kaart twee keer
    for (let seed = 1; seed < 50; seed++) {
      const al: string[] = [];
      for (let r = 1; r <= 4; r++) al.push(...trekKaarten(data, seed, r, al));
      expect(new Set(al).size).toBe(al.length);
    }
  });

  it('de toevalsgenerator geeft getallen tussen 0 en 1', () => {
    const r = toeval(7);
    for (let i = 0; i < 100; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('rekent met de rondes en geeft het bedrag van een kaart in het jaar van de ronde', () => {
    const c: Campagne = {
      ronde: 2,
      seed: 1,
      vastgelegd: [keuzes()],
      getrokken: [[], ['g_jeugdzorg']],
    };
    const r = rekenCampagne(data, c, keuzes({ gebeurtenissen: ['g_jeugdzorg'] }));
    expect(mln(r.perJaar[2026]?.structureel ?? 0)).toBe(0);
    expect(mln(r.perJaar[2027]?.structureel ?? 0)).toBe(-4.752);
    expect(mln(kaartBedrag(r, 'g_jeugdzorg', 2027).bedrag)).toBe(-4.752);
    expect(kaartBedrag(r, 'g_jeugdzorg', 2027).soort).toBe('S');
  });
});

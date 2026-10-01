import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, type Data } from '../../engine';
import { evalueer, ExpressieFout, namen, parseer } from '../../engine/expressie';
import { echteData, keuzes } from '../../engine/__tests__/hulp';
import { maakLezer } from '../reacties/context';
import { compileer, geldig, kiesReactie } from '../reacties/kies';
import { gebouwStanden } from '../toestand';

const ctx = (waarden: Record<string, number>) => (naam: string) => {
  if (!(naam in waarden)) throw new Error(naam);
  return waarden[naam] ?? 0;
};

describe('expressies', () => {
  it('rekent vergelijkingen, en/of/niet en haakjes', () => {
    const lees = ctx({ 'pct.o1': -30, 'kaart.k_licht': 0, 'meter.veilig': 40 });
    expect(evalueer(parseer('pct.o1 <= -25'), lees)).toBe(1);
    expect(evalueer(parseer('pct.o1 <= -25 && !kaart.k_licht'), lees)).toBe(1);
    expect(evalueer(parseer('kaart.k_licht || meter.veilig > 50'), lees)).toBe(0);
    expect(evalueer(parseer('(pct.o1 + 10) * 2 == -40'), lees)).toBe(1);
    expect(evalueer(parseer('true'), lees)).toBe(1);
    expect(evalueer(parseer('-pct.o1 >= 30'), lees)).toBe(1);
  });

  it('kent de voorrang: && gaat voor ||', () => {
    const lees = ctx({ a: 1, b: 0, c: 0 });
    expect(evalueer(parseer('a || b && c'), lees)).toBe(1);
    expect(evalueer(parseer('(a || b) && c'), lees)).toBe(0);
  });

  it('weigert onzin en code', () => {
    for (const fout of ['pct.o1 <=', 'alert(1)', 'pct.o1 ; 1', '1 +', '((1)', 'a = 1', 'x["y"]']) {
      expect(() => parseer(fout), fout).toThrow(ExpressieFout);
    }
  });

  it('geeft de gebruikte namen', () => {
    expect(namen(parseer('pct.o1 < 0 && meter.veilig > 50 || kaart.k_bouw'))).toEqual([
      'pct.o1',
      'meter.veilig',
      'kaart.k_bouw',
    ]);
  });
});

describe('tekstballonnen', () => {
  let data: Data;
  beforeAll(async () => {
    data = await echteData();
  });

  it('er zijn minstens 120 reacties, positief en negatief, voor alle inwoners', () => {
    expect(data.reacties.length).toBeGreaterThanOrEqual(120);
    expect(data.reacties.some((r) => r.toon === 'positief')).toBe(true);
    expect(data.reacties.some((r) => r.toon === 'negatief')).toBe(true);
    for (const p of data.personas.personas) {
      expect(
        data.reacties.filter((r) => !r.personas || r.personas.includes(p.id)).length,
        p.id,
      ).toBeGreaterThan(8);
    }
  });

  it('kiest een passende reactie en nooit twee keer achter elkaar dezelfde', () => {
    const r = bereken(data, keuzes({ onderdelen: { k1: -50 } }));
    const lees = maakLezer(data, r, gebouwStanden(data, data.kaart, r));
    const reacties = compileer(data.reacties);
    const sem = geldig(reacties, lees, 'sem').map((x) => x.id);
    expect(sem).toContain('k1_dicht');
    expect(geldig(reacties, lees, 'kees').map((x) => x.id)).not.toContain('k1_dicht');

    let zaad = 1;
    const rng = () => ((zaad = (zaad * 16807) % 2147483647) - 1) / 2147483646;
    let vorige: string | undefined;
    for (let i = 0; i < 200; i++) {
      const keuze = kiesReactie(
        reacties,
        lees,
        data.personas.personas.map((p) => p.id),
        vorige,
        rng,
      );
      expect(keuze).toBeDefined();
      expect(keuze?.reactie.id).not.toBe(vorige);
      if (keuze?.reactie.personas) expect(keuze.reactie.personas).toContain(keuze.persona);
      vorige = keuze?.reactie.id;
    }
  });

  it('kees zegt niets over de fietsenstalling', () => {
    expect(
      data.reacties
        .filter((r) => /fiets/i.test(r.tekst))
        .every((r) => r.personas && !r.personas.includes('kees')),
    ).toBe(true);
  });
});

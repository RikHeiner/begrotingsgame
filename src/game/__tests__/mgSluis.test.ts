import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  bezuinigPeil,
  bezuinigPosten,
  isVeilig,
  nieuwPeil,
  ozbPeil,
  sluisGebeurtenissen,
  sluisScore,
  VEILIG,
  WAND,
} from '../mgSluis';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

describe('Oostersluis: sluiswachter', () => {
  it('acht rondes, met bedragen uit de begroting', () => {
    const g = sluisGebeurtenissen(data);
    expect(g).toHaveLength(8);
    for (const e of g) {
      expect(e.basisMln).toBeGreaterThan(0);
      expect(e.peil).toBeCloseTo((e.basisMln * e.pct) / 100, 1);
      expect(Math.abs(e.peil)).toBeLessThan(WAND);
    }
    expect(g.some((e) => e.peil > 0)).toBe(true);
    expect(g.some((e) => e.peil < 0)).toBe(true);
  });

  it('het gemeentefonds komt uit de kengetallen', () => {
    const fonds = sluisGebeurtenissen(data).find((e) => e.bron.startsWith('Gemeentefonds'));
    expect(fonds?.basisMln).toBeCloseTo(data.kengetallen.gemeentefonds_x1000 / 1000, 3);
  });

  it('er zijn posten om op te bezuinigen, niet op slot', () => {
    const p = bezuinigPosten(data);
    expect(p.length).toBeGreaterThan(0);
    for (const o of p) {
      expect(o.vergrendeld).toBe(false);
      expect(bezuinigPeil(o)).toBeGreaterThan(0);
    }
    expect(ozbPeil(data)).toBeGreaterThan(0);
  });

  it('het peil blijft tussen de wanden', () => {
    expect(nieuwPeil(15, 10)).toBe(WAND);
    expect(nieuwPeil(-15, -10)).toBe(-WAND);
    expect(nieuwPeil(1, 2.25)).toBe(3.3);
    expect(isVeilig(VEILIG)).toBe(true);
    expect(isVeilig(-VEILIG - 0.1)).toBe(false);
  });

  it('een slimme sluiswachter kan alle rondes veilig blijven', () => {
    const g = sluisGebeurtenissen(data);
    const posten = bezuinigPosten(data);
    let peil = 0;
    let veilig = 0;
    g.forEach((e, i) => {
      const na = nieuwPeil(peil, e.peil);
      const post = posten[i % posten.length];
      const opties = [0, ozbPeil(data), post ? bezuinigPeil(post) : 0].map((d) => nieuwPeil(na, d));
      peil = opties.reduce((best, p) => (Math.abs(p) < Math.abs(best) ? p : best));
      if (isVeilig(peil)) veilig++;
    });
    expect(veilig).toBe(g.length);
  });

  it('score: 12,5 punt per veilige ronde', () => {
    expect(sluisScore(8, 8)).toBe(100);
    expect(sluisScore(4, 8)).toBe(50);
    expect(sluisScore(0, 8)).toBe(0);
  });
});

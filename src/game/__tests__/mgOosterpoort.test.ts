import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import { echtAandeel, oosterpoortPosten, punten, RONDES, vanTien } from '../mgOosterpoort';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

describe('De Oosterpoort: wie betaalt de voorstelling?', () => {
  it('vier posten met inkomsten, eerst de Stadsschouwburg en Oosterpoort', () => {
    const p = oosterpoortPosten(data);
    expect(p).toHaveLength(RONDES);
    expect(p[0]?.id).toBe('c1');
    expect(new Set(p.map((o) => o.id)).size).toBe(RONDES);
    for (const o of p) {
      expect(o.gekoppelde_baten_mln).toBeGreaterThan(0);
      expect(echtAandeel(o)).toBeLessThanOrEqual(100);
    }
  });

  it('punten: 25 min het verschil, nooit onder nul', () => {
    expect(punten(60, 60)).toBe(25);
    expect(punten(50, 60)).toBe(15);
    expect(punten(0, 90)).toBe(0);
    expect(punten(63, 62.98)).toBe(25);
  });

  it('van elke € 10 telt op tot € 10', () => {
    for (const o of oosterpoortPosten(data)) {
      const t = vanTien(o);
      expect(t.bezoekers + t.gemeente).toBeCloseTo(10, 6);
      expect(t.bezoekers).toBeCloseTo(echtAandeel(o) / 10, 2);
    }
  });
});

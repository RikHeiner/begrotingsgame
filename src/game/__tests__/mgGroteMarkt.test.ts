import { describe, expect, it } from 'vitest';
import { actieveData } from '../../engine/__tests__/hulp';
import { MARKT_BUDGET_MLN, marktPosten, marktScore, pastNog, somMln } from '../mgGroteMarkt';

describe('Grote Markt', () => {
  it('kiest 12 verschillende posten tussen 1 en 30 mln uit de begroting', async () => {
    const data = await actieveData();
    const posten = marktPosten(data);
    expect(posten).toHaveLength(12);
    expect(new Set(posten.map((o) => o.naam)).size).toBe(12);
    for (const o of posten) {
      expect(o.lasten_mln).toBeGreaterThanOrEqual(1);
      expect(o.lasten_mln).toBeLessThanOrEqual(30);
      expect(data.begroting.onderdelen).toContain(o);
    }
  });

  it('telt op, weet wat nog past en geeft een score van 0 tot 100', async () => {
    const data = await actieveData();
    const posten = marktPosten(data, 12, () => 0.3);
    const [a, b] = posten;
    if (!a || !b) throw new Error('te weinig posten');
    expect(somMln([a, b])).toBeCloseTo(a.lasten_mln + b.lasten_mln, 6);
    expect(marktScore([])).toBe(0);
    const p = { ...a, lasten_mln: 25 };
    expect(marktScore([p])).toBe(50);
    expect(marktScore([p, { ...p, id: 'x' }])).toBe(100);
    expect(pastNog([p], { ...p, id: 'x' })).toBe(true);
    expect(pastNog([p], { ...p, id: 'x', lasten_mln: 25.1 })).toBe(false);
    expect(MARKT_BUDGET_MLN).toBe(50);
  });
});

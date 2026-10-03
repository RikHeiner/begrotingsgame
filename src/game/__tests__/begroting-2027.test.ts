/** De actieve begroting (config.json): 2027. */
import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, GEEN_KEUZES, type Data } from '../../engine';
import { nulbasisKeuzes } from '../nulbasis';
import { actieveData } from '../../engine/__tests__/hulp';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

describe('begroting 2027', () => {
  it('laadt met de meerjarenraming 2027-2030', () => {
    expect(data.config.actiefJaar).toBe(2027);
    expect(data.jaren).toEqual([2027, 2028, 2029, 2030]);
    expect(data.kengetallen.ozb_x1000).toBe(139441);
  });

  it('o5 en k3 zijn vervallen; w12 en c5 zijn nieuw', () => {
    expect(data.index.onderdelen.has('o5')).toBe(false);
    expect(data.index.onderdelen.has('k3')).toBe(false);
    expect(data.index.onderdelen.get('w12')?.lasten_mln).toBe(10.9);
    expect(data.index.onderdelen.get('c5')?.gekoppelde_baten_mln).toBe(8.1);
  });

  it('zonder keuzes is het saldo 0; bij nul is er geld te verdelen', () => {
    const r = bereken(data, { ...GEEN_KEUZES, scenario: data.config.scenario });
    for (const j of data.jaren) expect(Math.abs(r.perJaar[j]?.structureel ?? 1)).toBeLessThan(1);
    const n = bereken(data, nulbasisKeuzes(data));
    expect(n.correcties).toEqual([]);
    expect(n.perJaar[2027]?.structureel).toBeGreaterThan(0);
  });

  it('de personeelskosten 2027 staan erin (p. 355)', () => {
    const v = data.index.verbanden.get('org_frictie');
    expect(v?.parameters.personeelskosten?.waarde).toBe(357.948);
  });
});

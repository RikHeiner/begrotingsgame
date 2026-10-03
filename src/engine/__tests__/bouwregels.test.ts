import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, GEEN_KEUZES, type Data } from '..';
import { actieveData } from './hulp';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

describe('minder bouwregels: sneller bouwen, meer OZB', () => {
  it('het plan scheelt ambtenaren (aanname) en levert na twee jaar OZB van extra woningen op', () => {
    const k = data.begroting.actiekaarten.find((x) => x.id === 'k_minder_bouwregels');
    expect(k?.bedrag_mln).toBeCloseTo(0.49, 2);
    expect(k?.zekerheid).toBe('aanname');
    expect(k?.gebouw).toBe('beleid');
    const zonder = bereken(data, GEEN_KEUZES);
    const met = bereken(data, { ...GEEN_KEUZES, kaarten: ['k_minder_bouwregels'] });
    const ozb = met.effecten.filter((e) => e.verband === 'wg_woningbouw' && e.doel === 'baten:t1');
    const [j0, , j2] = data.jaren;
    const opJaar = (j: number | undefined) =>
      ozb.filter((e) => e.jaar === j).reduce((s, e) => s + e.bedrag, 0);
    expect(opJaar(j0)).toBe(0);
    expect(opJaar(j2)).toBeGreaterThan(0);
    expect(met.perJaar[j2 as number]?.structureel ?? 0).toBeGreaterThan(
      zonder.perJaar[j2 as number]?.structureel ?? 0,
    );
  });
});

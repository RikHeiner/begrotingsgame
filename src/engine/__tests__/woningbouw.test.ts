import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, type Data } from '..';
import { echteData, keuzes, mln } from './hulp';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});

const ozbNieuw = (k: Parameters<typeof keuzes>[0]) =>
  bereken(data, keuzes(k))
    .effecten.filter((e) => e.verband === 'wg_woningbouw' && e.doel === 'baten:t1')
    .map((e) => mln(e.bedrag));

describe('meer woningen, meer OZB', () => {
  it('rekent met het OZB-tarief × de gemiddelde WOZ-waarde', () => {
    // 100 woningen in 2028, 200 in 2029, × € 500,82
    expect(ozbNieuw({ kaarten: ['k_bouw'] })).toEqual([0.050082, 0.100164]);
  });

  it('een lagere OZB geldt ook voor de nieuwe woningen', () => {
    expect(ozbNieuw({ kaarten: ['k_bouw'], belastingen: { t1: -10 } })).toEqual([
      0.045074, 0.090148,
    ]);
  });

  it('is een aanname (het aantal woningen), dus met ⚠︎', () => {
    const r = bereken(data, keuzes({ kaarten: ['k_bouw'] }));
    const e = r.effecten.find((x) => x.verband === 'wg_woningbouw');
    expect(e?.zekerheid).toBe('aanname');
    expect(e?.uitleg).toMatch(/€ 501 OZB per jaar/);
  });
});

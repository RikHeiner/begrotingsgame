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
  it('rekent met het OZB-tarief × de WOZ-waarde van nieuwbouw', () => {
    // 100 woningen in 2028, 200 in 2029, × 0,1473% × € 340.000 × 1,32 = € 661,08
    expect(ozbNieuw({ kaarten: ['k_bouw'] })).toEqual([0.066108, 0.132216]);
  });

  it('een lagere OZB geldt ook voor de nieuwe woningen', () => {
    expect(ozbNieuw({ kaarten: ['k_bouw'], belastingen: { t1: -10 } })).toEqual([
      0.059497, 0.118995,
    ]);
  });

  it('is een aanname (het aantal woningen), dus met ⚠︎', () => {
    const r = bereken(data, keuzes({ kaarten: ['k_bouw'] }));
    const e = r.effecten.find((x) => x.verband === 'wg_woningbouw');
    expect(e?.zekerheid).toBe('aanname');
    expect(e?.uitleg).toMatch(/€ 661 OZB per jaar/);
  });

  it('meer RO-ambtenaren: extra woningen, maar nog zonder getal', () => {
    const r = bereken(data, keuzes({ onderdelen: { w4: 20 } }));
    expect(r.verbanden.wg_woningbouw?.status).toBe('nog niet doorgerekend');
    expect(r.verbanden.wg_woningbouw?.reden).toMatch(/hoeveel per miljoen/);
    expect(r.effecten.filter((e) => e.verband === 'wg_woningbouw')).toEqual([]);
  });

  it('fonds en meer RO-ambtenaren: het fonds telt, de ambtenaren nog niet', () => {
    const r = bereken(data, keuzes({ kaarten: ['k_bouw'], onderdelen: { e10: 20 } }));
    expect(ozbNieuw({ kaarten: ['k_bouw'], onderdelen: { e10: 20 } })).toEqual([
      0.066108, 0.132216,
    ]);
    expect(r.verbanden.wg_woningbouw?.reden).toMatch(/hoeveel per miljoen/);
  });

  it('bezuinigen op RO-ambtenaren levert geen extra woningen op', () => {
    const r = bereken(data, keuzes({ onderdelen: { w4: -20 } }));
    expect(r.verbanden.wg_woningbouw?.status).toBe('niet actief');
  });
});

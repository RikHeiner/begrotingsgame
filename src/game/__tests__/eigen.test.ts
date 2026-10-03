import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, GEEN_KEUZES, type Data, type Keuzes } from '../../engine';
import { codeer, decodeer } from '../deellink';
import { actieveData } from '../../engine/__tests__/hulp';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

const met = (eigen: Keuzes['eigen']): Keuzes => ({ ...GEEN_KEUZES, eigen });

describe('eigen voorstellen', () => {
  it('niet meer doen: elk jaar het bedrag, als aanname (eigen schatting)', () => {
    const r = bereken(
      data,
      met([
        { id: 'a', plek: 'beleid', naam: 'Stoppen met het magazine', bedrag_mln: 0.3, soort: 'S' },
      ]),
    );
    const zonder = bereken(data, GEEN_KEUZES);
    for (const j of data.jaren)
      expect((r.perJaar[j]?.structureel ?? 0) - (zonder.perJaar[j]?.structureel ?? 0)).toBeCloseTo(
        0.3e6,
        -2,
      );
    const e = r.effecten.filter((x) => x.bron === 'eigen:a');
    expect(e.every((x) => x.zekerheid === 'aanname')).toBe(true);
  });

  it('verkopen: eenmalig in het eerste jaar', () => {
    const r = bereken(
      data,
      met([{ id: 'b', plek: 'veiling', naam: 'Oud pand verkopen', bedrag_mln: 1.5, soort: 'I' }]),
    );
    const zonder = bereken(data, GEEN_KEUZES);
    const [j0, j1] = data.jaren;
    expect(
      (r.perJaar[j0 as number]?.incidenteel ?? 0) -
        (zonder.perJaar[j0 as number]?.incidenteel ?? 0),
    ).toBeCloseTo(1.5e6, -2);
    expect(
      (r.perJaar[j1 as number]?.incidenteel ?? 0) -
        (zonder.perJaar[j1 as number]?.incidenteel ?? 0),
    ).toBeCloseTo(0, -2);
  });

  it('zonder naam of bedrag overgeslagen; te groot bedrag begrensd', () => {
    const r = bereken(
      data,
      met([
        { id: 'x', plek: 'beleid', naam: '', bedrag_mln: 1, soort: 'S' },
        { id: 'y', plek: 'beleid', naam: 'Heel veel', bedrag_mln: 999, soort: 'S' },
      ]),
    );
    expect(r.keuzes.eigen).toHaveLength(1);
    expect(r.keuzes.eigen?.[0]?.bedrag_mln).toBe(50);
  });

  it('gaat mee in de deellink', () => {
    const k = met([
      { id: 'c', plek: 'veiling', naam: 'Pand, aan de A', bedrag_mln: 0.75, soort: 'I' },
    ]);
    const terug = decodeer(codeer(k, 2027, 'nul'));
    expect(terug?.keuzes.eigen).toEqual(k.eigen);
  });
});

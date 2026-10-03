import { describe, expect, it } from 'vitest';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  FORUM_MAX_MLN,
  FORUM_MIN_MLN,
  FORUM_STAPPEN,
  forumPosten,
  mlnNaarStap,
  puntenVoorGok,
  rondMooi,
  stapNaarMln,
} from '../mgForum';

describe('Forum', () => {
  it('geeft 20 punten voor precies goed en 0 voor tien keer ernaast', () => {
    expect(puntenVoorGok(12, 12)).toBe(20);
    expect(puntenVoorGok(120, 12)).toBe(0);
    expect(puntenVoorGok(1.2, 12)).toBe(0);
    expect(puntenVoorGok(24, 12)).toBe(Math.round(20 - 20 * Math.log10(2)));
    expect(puntenVoorGok(6, 12)).toBe(puntenVoorGok(24, 12));
    expect(puntenVoorGok(3000, 1)).toBe(0);
  });

  it('de schuif loopt logaritmisch van € 0,1 tot € 300 mln', () => {
    expect(stapNaarMln(0)).toBeCloseTo(FORUM_MIN_MLN, 6);
    expect(stapNaarMln(FORUM_STAPPEN)).toBeCloseTo(FORUM_MAX_MLN, 6);
    for (let s = 1; s <= FORUM_STAPPEN; s++)
      expect(stapNaarMln(s)).toBeGreaterThanOrEqual(stapNaarMln(s - 1));
    expect(mlnNaarStap(stapNaarMln(120))).toBe(120);
    expect(rondMooi(12.34)).toBe(12);
    expect(rondMooi(0.456)).toBe(0.46);
  });

  it('kiest 5 posten van minstens € 1 mln', async () => {
    const data = await actieveData();
    const posten = forumPosten(data);
    expect(posten).toHaveLength(5);
    for (const o of posten) expect(o.lasten_mln).toBeGreaterThanOrEqual(1);
  });
});

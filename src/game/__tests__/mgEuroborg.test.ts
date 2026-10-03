import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  PENALTIES,
  besparingMln,
  gaatErin,
  minimumMln,
  penaltyPosten,
  redenKeeper,
} from '../mgEuroborg';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});
const post = (id: string) => {
  const o = data.index.onderdelen.get(id);
  if (!o) throw new Error(`geen post ${id}`);
  return o;
};

describe("Euroborg: penalty's voor de pot", () => {
  it('acht verschillende posten, half erin en half gehouden', () => {
    for (let n = 0; n < 20; n++) {
      const posten = penaltyPosten(data);
      expect(posten).toHaveLength(PENALTIES);
      expect(new Set(posten.map((o) => o.id)).size).toBe(PENALTIES);
      expect(posten.filter(gaatErin)).toHaveLength(PENALTIES / 2);
    }
  });

  it('een post die erin gaat levert netto geld op', () => {
    for (const o of penaltyPosten(data).filter(gaatErin))
      expect(besparingMln(o)).toBeGreaterThan(0);
  });

  it('elke gehouden bal heeft een reden en een minimum', () => {
    for (const o of data.begroting.onderdelen.filter((x) => !gaatErin(x))) {
      expect(redenKeeper(o).length, o.id).toBeGreaterThan(5);
      expect(minimumMln(o), o.id).toBeGreaterThan(0);
      expect(minimumMln(o), o.id).toBeLessThanOrEqual(o.lasten_mln);
    }
  });

  it('een vergrendelde post blijft helemaal; een post met een minimum deels', () => {
    const vast = data.begroting.onderdelen.find((o) => o.vergrendeld);
    if (!vast) throw new Error('geen vergrendelde post');
    expect(gaatErin(vast)).toBe(false);
    expect(minimumMln(vast)).toBe(vast.lasten_mln);
    const o1 = post('o1');
    expect(gaatErin(o1)).toBe(o1.min_pct !== null && o1.min_pct <= -100);
    if (o1.min_pct !== null && o1.min_pct > -100)
      expect(minimumMln(o1)).toBeCloseTo(o1.lasten_mln * (1 + o1.min_pct / 100));
  });
});

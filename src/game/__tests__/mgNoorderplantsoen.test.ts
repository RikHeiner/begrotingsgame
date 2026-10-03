import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  BREUK_ELKE_MS,
  ERGER_NA_MS,
  PRIJS_ERGER,
  PRIJS_SNEL,
  SPEELTIJD_MS,
  nieuwPark,
  repareer,
  stap,
  uitslag,
} from '../mgNoorderplantsoen';

const kapot = (p: ReturnType<typeof nieuwPark>) =>
  p.tegels.map((t, i) => (t.kapotSinds !== undefined ? i : -1)).filter((i) => i >= 0);

describe('Noorderplantsoen: gaten en lantaarns', () => {
  it('elke 1,2 seconde gaat er iets kapot, nooit gras', () => {
    let p = nieuwPark();
    p = stap(p, BREUK_ELKE_MS * 3 + 10, () => 0);
    expect(kapot(p)).toHaveLength(3);
    for (const i of kapot(p)) expect(p.tegels[i]?.soort).not.toBe('gras');
  });

  it('snel repareren kost € 1, wachten maakt het erger en kost € 3', () => {
    let p = stap(nieuwPark(), BREUK_ELKE_MS, () => 0);
    const i = kapot(p)[0] ?? -1;
    expect(i).toBeGreaterThanOrEqual(0);
    const snel = repareer(p, i);
    expect(snel.kosten).toBe(PRIJS_SNEL);
    expect(snel.park.extra).toBe(0);

    p = stap(p, BREUK_ELKE_MS + ERGER_NA_MS, () => 0);
    expect(p.tegels[i]?.erger).toBe(true);
    const laat = repareer(p, i);
    expect(laat.kosten).toBe(PRIJS_ERGER);
    expect(laat.park.extra).toBe(PRIJS_ERGER - PRIJS_SNEL);
    expect(repareer(laat.park, i).kosten).toBe(0);
  });

  it('na 30 seconden is het klaar; wat nog kapot is telt mee als erger', () => {
    const p = stap(nieuwPark(), SPEELTIJD_MS, () => 0.5);
    expect(p.klaar).toBe(true);
    const u = uitslag(p);
    expect(u.nogKapot).toBe(kapot(p).length);
    expect(u.totaal).toBe(u.nogKapot * PRIJS_ERGER);
    expect(u.score).toBe(0);
  });

  it('alles meteen gerepareerd: score 100; niets kapot gegaan: score 0', () => {
    let p = nieuwPark();
    for (let t = BREUK_ELKE_MS; t < SPEELTIJD_MS; t += BREUK_ELKE_MS) {
      p = stap(p, t, Math.random);
      for (const i of kapot(p)) p = repareer(p, i).park;
    }
    expect(uitslag(p).score).toBe(100);
    expect(uitslag(nieuwPark()).score).toBe(0);
  });
});

describe('het echte bedrag voor onderhoud', () => {
  let data: Data;
  beforeAll(async () => {
    data = await actieveData();
  });
  it('post o1 bestaat en heeft een bedrag', () => {
    const o = data.index.onderdelen.get('o1');
    expect(o?.lasten_mln).toBeGreaterThan(0);
  });
});

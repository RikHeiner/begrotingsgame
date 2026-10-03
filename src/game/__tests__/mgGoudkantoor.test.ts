import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  BREEDTE,
  DRAAIPUNT,
  HOOGTE,
  LEVELS,
  MAX_HOEK,
  goudVoorLevel,
  hoekNaar,
  lengteTotRand,
  maakLevel,
  ophaalSnelheid,
  raak,
  schatten,
  stenen,
} from '../mgGoudkantoor';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

/** Een vaste reeks getallen voor de tests. */
const vast = (zaad = 1) => {
  let a = zaad;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
};

describe('Geldzoeker: het goud', () => {
  it('goud uit het programma heeft de bedragen van de begroting en een zin uit het programma', () => {
    const uitProgramma = schatten(data).filter((s) => s.vvd);
    expect(uitProgramma.length).toBe(5);
    for (const s of uitProgramma) {
      const k = data.begroting.actiekaarten.find((x) => x.id === s.id);
      expect(s.bedragMln).toBe(k?.bedrag_mln);
      expect(s.jaar).toBe(data.begroting.begrotingsjaar);
      expect(s.pagina).toBeGreaterThan(0);
    }
  });

  it('goud uit de tegenbegroting 2026 staat met het jaar 2026 erbij, zonder dubbelingen', () => {
    const tb = schatten(data).filter((s) => !s.vvd);
    expect(tb.length).toBeGreaterThan(15);
    expect(data.minigames.find((m) => m.goud)?.goud?.tegenbegroting?.url).toMatch(/^https:/);
    for (const s of tb) {
      expect(s.jaar).toBe(2026);
      expect(s.bron).toContain('Tegenbegroting VVD Groningen 2026');
    }
    const namen = schatten(data).map((s) => s.naam.toLowerCase());
    expect(namen.filter((n) => n.includes('niemeyer'))).toHaveLength(1);
    expect(namen.filter((n) => n.includes('ongedocumenteerden'))).toHaveLength(1);
  });

  it('level 1 is eenmalig, level 2 elk jaar, level 3 de grootste', () => {
    const alles = schatten(data);
    expect(goudVoorLevel(alles, 1).every((s) => s.soort === 'I')).toBe(true);
    expect(goudVoorLevel(alles, 2).every((s) => s.soort === 'S')).toBe(true);
    const groot = goudVoorLevel(alles, 3);
    expect(groot.length).toBe(9);
    expect(groot[0]?.bedragMln).toBe(Math.max(...alles.map((s) => s.bedragMln)));
  });

  it('stenen zijn kerntaken uit de begroting', () => {
    const s = stenen(data);
    expect(s.length).toBe(4);
    for (const x of s) expect(data.index.onderdelen.get(x.id)).toBeDefined();
  });
});

describe('Geldzoeker: het veld', () => {
  it('elk level heeft een tekort dat je met het goud kunt wegwerken', () => {
    for (let nr = 1; nr <= LEVELS.length; nr++) {
      const l = maakLevel(data, nr, vast(nr));
      const goud = l.plekken.filter((p) => p.soort === 'goud');
      const totaal = goud.reduce((s, p) => s + (p.soort === 'goud' ? p.schat.bedragMln : 0), 0);
      expect(l.tekortMln).toBeGreaterThan(0);
      expect(l.tekortMln).toBeLessThan(totaal);
      expect(l.plekken.some((p) => p.soort === 'steen')).toBe(true);
    }
  });

  it('alles ligt in het veld, binnen bereik van de grijper, en zo goed als niet op elkaar', () => {
    const l = maakLevel(data, 2, vast(7));
    for (const p of l.plekken) {
      expect(p.x - p.r).toBeGreaterThanOrEqual(0);
      expect(p.x + p.r).toBeLessThanOrEqual(BREEDTE);
      expect(p.y + p.r).toBeLessThanOrEqual(HOOGTE);
      expect(Math.abs(hoekNaar(p.x, p.y))).toBeLessThanOrEqual(MAX_HOEK);
    }
    let overlap = 0;
    for (const a of l.plekken)
      for (const b of l.plekken)
        if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) overlap++;
    expect(overlap).toBeLessThanOrEqual(4);
  });

  it('de grijper raakt wat recht onder hem ligt, het dichtstbijzijnde eerst', () => {
    const l = maakLevel(data, 1, vast(3));
    for (const p of l.plekken) {
      const r = raak([p], hoekNaar(p.x, p.y), new Set());
      expect(r.plek?.id).toBe(p.id);
      expect(r.lengte).toBeLessThan(Math.hypot(p.x - DRAAIPUNT.x, p.y - DRAAIPUNT.y));
    }
    const [a] = l.plekken;
    if (a) expect(raak([a], hoekNaar(a.x, a.y), new Set([a.id])).plek).toBeUndefined();
    // niets geraakt: het touw rolt uit tot de rand
    expect(raak([], 0, new Set()).lengte).toBe(lengteTotRand(0));
  });

  it('stenen en groot goud zijn zwaar om op te halen', () => {
    const l = maakLevel(data, 3, vast(5));
    const steen = l.plekken.find((p) => p.soort === 'steen');
    const goud = l.plekken.filter((p) => p.soort === 'goud').sort((a, b) => a.r - b.r);
    expect(ophaalSnelheid(steen)).toBeLessThan(ophaalSnelheid(goud[0]));
    expect(ophaalSnelheid(goud.at(-1))).toBeLessThanOrEqual(ophaalSnelheid(goud[0]));
    expect(ophaalSnelheid(undefined)).toBeGreaterThan(ophaalSnelheid(goud[0]));
    expect(ophaalSnelheid(steen, true)).toBeGreaterThan(ophaalSnelheid(steen));
  });
});

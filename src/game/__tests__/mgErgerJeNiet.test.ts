import { describe, expect, it } from 'vitest';
import {
  BAAN,
  ERGER_VAKKEN,
  LAATSTE,
  START,
  baanVak,
  beginStand,
  doeZet,
  gooi,
  kiesZet,
  mogelijkeZetten,
  pionPlek,
  score,
  vakPlek,
  winnaar,
  type Stand,
} from '../mgErgerJeNiet';

const stand = (vvd: number[], college: number[]): Stand => ({
  pionnen: [
    ...vvd.map((stap, nr) => ({ speler: 'vvd' as const, nr, stap })),
    ...college.map((stap, nr) => ({ speler: 'college' as const, nr, stap })),
  ],
});

/** Een vaste reeks getallen voor de tests. */
const vast = (zaad = 1) => {
  let a = zaad;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
};

describe('Groninger erger je niet: het bord', () => {
  it('de baan loopt rond over de rand van het bord, zonder dubbele vakjes', () => {
    const plekken = Array.from({ length: BAAN }, (_, i) => vakPlek(i));
    expect(new Set(plekken.map((p) => `${p.k},${p.r}`)).size).toBe(BAAN);
    for (const p of plekken) expect(p.k === 0 || p.k === 10 || p.r === 0 || p.r === 10).toBe(true);
    // buren liggen naast elkaar
    for (let i = 0; i < BAAN; i++) {
      const a = vakPlek(i);
      const b = vakPlek(i + 1);
      expect(Math.abs(a.k - b.k) + Math.abs(a.r - b.r)).toBe(1);
    }
  });

  it('elke speler begint op zijn eigen startvakje en komt via de baan in zijn eindvak', () => {
    expect(baanVak('vvd', 0)).toBe(START.vvd);
    expect(baanVak('college', 0)).toBe(START.college);
    expect(baanVak('vvd', BAAN)).toBeUndefined();
    // het laatste baanvakje ligt naast het eerste plekje van het eindvak
    const laatste = vakPlek(baanVak('vvd', BAAN - 1) ?? 0);
    const eind = pionPlek({ speler: 'vvd', nr: 0, stap: BAAN });
    expect(Math.abs(laatste.k - eind.k) + Math.abs(laatste.r - eind.r)).toBe(1);
  });

  it('ergernisvakjes liggen niet op een startvakje', () => {
    for (const v of ERGER_VAKKEN) expect([START.vvd, START.college]).not.toContain(v);
  });
});

describe('Groninger erger je niet: de regels', () => {
  it('alleen met een zes kom je buiten', () => {
    expect(mogelijkeZetten(beginStand(), 'vvd', 5)).toEqual([]);
    expect(mogelijkeZetten(beginStand(), 'vvd', 6).map((z) => z.naar)).toEqual([0, 0]);
  });

  it('niet op een eigen pion en niet voorbij het eindvak', () => {
    expect(mogelijkeZetten(stand([0, 3], [-1, -1]), 'vvd', 3).map((z) => z.nr)).toEqual([1]);
    expect(mogelijkeZetten(stand([LAATSTE - 1, -1], [-1, -1]), 'vvd', 2)).toEqual([]);
  });

  it('slaan: de pion van de ander gaat terug naar huis', () => {
    // vvd stap 2 = vak 8; college stap 22 = vak (26 + 22) % 40 = 8
    const s = stand([0, -1], [22, -1]);
    const g = doeZet(s, { speler: 'vvd', nr: 0, van: 0, naar: 2 });
    expect(g.geslagen?.speler).toBe('college');
    expect(g.stand.pionnen.find((p) => p.speler === 'college' && p.nr === 0)?.stap).toBe(-1);
  });

  it('ergernisvakje: VVD gaat twee terug, het college twee vooruit', () => {
    // vak 9 = vvd stap 3; vak 29 = college stap 3
    const v = doeZet(stand([0, -1], [-1, -1]), { speler: 'vvd', nr: 0, van: 0, naar: 3 });
    expect(v.ergernisVak).toBe(9);
    expect(v.naErgernis).toBe(1);
    const c = doeZet(stand([-1, -1], [0, -1]), { speler: 'college', nr: 0, van: 0, naar: 3 });
    expect(c.ergernisVak).toBe(29);
    expect(c.naErgernis).toBe(5);
  });

  it('winnen: alle pionnen in het eindvak; score 100, anders hooguit 80', () => {
    expect(winnaar(stand([BAAN, BAAN + 1], [3, -1]))).toBe('vvd');
    expect(score(stand([BAAN, BAAN + 1], [3, -1]))).toBe(100);
    expect(score(stand([-1, -1], [3, -1]))).toBe(0);
    expect(score(stand([BAAN, -1], [3, -1]))).toBeLessThanOrEqual(80);
  });

  it('het college slaat liever dan dat het verder loopt', () => {
    // vvd stap 4 = vak 10; college stap 24 = vak 10. College staat op 20 (vak 6) en op 0.
    const s = stand([4, -1], [20, 0]);
    const keuze = kiesZet(s, mogelijkeZetten(s, 'college', 4));
    expect(keuze).toMatchObject({ nr: 0, naar: 24 });
  });

  it('een heel spel tegen jezelf eindigt altijd met een winnaar', () => {
    const kans = vast(7);
    let s = beginStand();
    let beurt: 'vvd' | 'college' = 'vvd';
    for (let i = 0; i < 2000 && !winnaar(s); i++) {
      const worp = gooi(kans);
      const z = kiesZet(s, mogelijkeZetten(s, beurt, worp));
      if (z) s = doeZet(s, z).stand;
      if (worp !== 6) beurt = beurt === 'vvd' ? 'college' : 'vvd';
    }
    expect(winnaar(s)).toBeDefined();
  });
});

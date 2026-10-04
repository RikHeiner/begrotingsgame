import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  PER_RONDE,
  RONDES,
  VIZIER_X,
  VIZIER_Y,
  beoordeel,
  besparingMln,
  kantVan,
  keeperHoudt,
  keeperKiest,
  maakRondes,
  melding,
  penaltyPosten,
  rustigSchot,
  schiet,
  telOp,
  vizierX,
  vizierY,
  type Penalty,
} from '../mgEuroborg';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

/** Een vaste reeks "toevalsgetallen" voor tests. */
const reeks = (...getallen: number[]) => {
  let i = 0;
  return () => getallen[i++ % getallen.length] ?? 0;
};

const vind = (soort: 'wet' | 'keuze'): Penalty => {
  const p = penaltyPosten(data).find((x) => x.soort === soort);
  if (!p) throw new Error(`geen post met soort ${soort}`);
  return p;
};

const ronde = (i: number) => {
  const r = RONDES[i];
  if (!r) throw new Error(`geen ronde ${i}`);
  return r;
};
const R1 = ronde(0);
const R3 = ronde(2);

describe('Euroborg: de posten', () => {
  it('alleen posten met een duidelijke soort; een post van de wet noemt de wet', () => {
    const posten = penaltyPosten(data);
    expect(posten.length).toBeGreaterThanOrEqual(12);
    for (const p of posten) {
      expect(['wet', 'keuze']).toContain(p.soort);
      if (p.soort === 'wet') expect(p.wet?.length, p.id).toBeGreaterThan(3);
      expect(p.naam.length).toBeGreaterThan(2);
      expect(p.uitleg.length).toBeGreaterThan(5);
    }
  });

  it('bedragen komen uit de begroting van het actieve jaar', () => {
    for (const p of penaltyPosten(data)) {
      const o = data.index.onderdelen.get(p.id);
      expect(o, p.id).toBeDefined();
      expect(p.bedragMln).toBe(o?.lasten_mln);
      expect(p.batenMln).toBe(o?.gekoppelde_baten_mln);
    }
  });

  it('3 rondes van 4, steeds 2 van de wet en 2 eigen keuzes, geen post dubbel', () => {
    for (let n = 0; n < 20; n++) {
      const rondes = maakRondes(data);
      expect(rondes).toHaveLength(RONDES.length);
      for (const r of rondes) {
        expect(r).toHaveLength(PER_RONDE);
        expect(r.filter((p) => p.soort === 'wet')).toHaveLength(2);
      }
      const ids = rondes.flat().map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('besparing: uitgaven min de inkomsten die wegvallen, nooit negatief', () => {
    for (const p of penaltyPosten(data)) {
      expect(besparingMln(p)).toBeGreaterThanOrEqual(0);
      expect(Math.abs(besparingMln(p) - Math.max(0, p.bedragMln - p.batenMln))).toBeLessThan(0.051);
    }
    for (const p of penaltyPosten(data).filter((x) => x.soort === 'keuze'))
      expect(besparingMln(p), p.id).toBeGreaterThan(0);
  });
});

describe('Euroborg: schieten', () => {
  it('het vizier blijft binnen zijn baan', () => {
    for (let t = 0; t < 5000; t += 37) {
      expect(Math.abs(vizierX(t, 2000))).toBeLessThanOrEqual(VIZIER_X + 1e-9);
      const y = vizierY(t, 2000);
      expect(y).toBeGreaterThanOrEqual(VIZIER_Y.min - 1e-9);
      expect(y).toBeLessThanOrEqual(VIZIER_Y.max + 1e-9);
    }
    expect(vizierY(0, 2000)).toBeCloseTo(VIZIER_Y.min);
  });

  it('kanten van het doel', () => {
    expect(kantVan(-0.7)).toBe('links');
    expect(kantVan(0)).toBe('midden');
    expect(kantVan(0.7)).toBe('rechts');
    expect(kantVan(rustigSchot('links').x)).toBe('links');
    expect(kantVan(rustigSchot('rechts').x)).toBe('rechts');
  });

  it('de keeper leest de schutter, of gokt', () => {
    expect(keeperKiest(0.7, R1, reeks(0))).toBe('rechts');
    expect(keeperKiest(0.7, R1, reeks(0.99, 0.1))).toBe('links');
    expect(keeperKiest(0.7, R1, reeks(0.99, 0.5))).toBe('midden');
  });

  it('de keeper houdt wat hij kan pakken, maar niet de bovenhoek', () => {
    expect(keeperHoudt(-0.7, 0.4, 'links', R1)).toBe(true);
    expect(keeperHoudt(-0.7, 0.4, 'rechts', R1)).toBe(false);
    expect(keeperHoudt(0.95, 0.9, 'rechts', R3)).toBe(false);
    expect(keeperHoudt(0.1, 0.5, 'midden', R1)).toBe(true);
  });

  it('een betere keeper reikt verder', () => {
    expect(keeperHoudt(0.15, 0.5, 'rechts', R1)).toBe(false);
    expect(keeperHoudt(0.15, 0.5, 'rechts', R3)).toBe(true);
    const rondes = RONDES.map((r) => r.leest);
    expect([...rondes].sort((a, b) => a - b)).toEqual(rondes);
    const vizier = RONDES.map((r) => r.periode);
    expect([...vizier].sort((a, b) => b - a)).toEqual(vizier);
  });

  it('een post van de wet houdt alles tegen, waar je ook schiet', () => {
    const wet = vind('wet');
    for (const x of [-1.2, -0.9, 0, 0.9, 1.2])
      for (const y of [0.1, 0.8, 1.2])
        expect(schiet(wet, { x, y }, R1, reeks(0.99, 0.5)).uitkomst).toBe('wet');
  });

  it('een eigen keuze: naast, over, gestopt of goal', () => {
    const keuze = vind('keuze');
    // keeper gokt midden
    const midden = () => reeks(0.99, 0.5);
    expect(schiet(keuze, { x: 1.1, y: 0.5 }, R1, midden()).uitkomst).toBe('naast');
    expect(schiet(keuze, { x: 0.5, y: 1.1 }, R1, midden()).uitkomst).toBe('over');
    expect(schiet(keuze, { x: 0, y: 0.4 }, R1, midden()).uitkomst).toBe('gestopt');
    expect(schiet(keuze, { x: 0.7, y: 0.4 }, R1, midden()).uitkomst).toBe('goal');
  });
});

describe('Euroborg: punten', () => {
  it('goal = punt en besparing; wet laten staan = punt; keuze laten staan = geen punt', () => {
    const wet = vind('wet');
    const keuze = vind('keuze');
    const goal = beoordeel(keuze, 'schrappen', 'goal');
    expect(goal.punt).toBe(1);
    expect(goal.bespaardMln).toBe(besparingMln(keuze));
    expect(beoordeel(keuze, 'schrappen', 'gestopt')).toMatchObject({ punt: 0, bespaardMln: 0 });
    expect(beoordeel(wet, 'schrappen', 'wet')).toMatchObject({ punt: 0, bespaardMln: 0 });
    expect(beoordeel(wet, 'laten')).toMatchObject({ punt: 1, bespaardMln: 0 });
    expect(beoordeel(keuze, 'laten')).toMatchObject({ punt: 0, bespaardMln: 0 });
    expect(beoordeel(wet, 'telaat').punt).toBe(0);
  });

  it('meldingen noemen de wet en het bedrag', () => {
    const wet = vind('wet');
    const keuze = vind('keuze');
    const gestopt = melding(beoordeel(wet, 'schrappen', 'wet'));
    expect(gestopt.titel).toBe('Gestopt!');
    expect(gestopt.tekst).toContain(`Dit moet van de wet (${wet.wet})`);
    expect(gestopt.tekst).toContain('niet stoppen');
    const goal = melding(beoordeel(keuze, 'schrappen', 'goal'));
    expect(goal.titel).toMatch(/^Gescoord! De gemeente bespaart € [\d.,]+ mln per jaar\.$/);
    expect(goal.goed).toBe(true);
    expect(melding(beoordeel(keuze, 'laten')).tekst).toContain('geen straf');
  });

  it('telt alles op', () => {
    const wet = vind('wet');
    const keuze = vind('keuze');
    const som = telOp([
      beoordeel(keuze, 'schrappen', 'goal'),
      beoordeel(wet, 'schrappen', 'wet'),
      beoordeel(wet, 'laten'),
      beoordeel(keuze, 'laten'),
    ]);
    expect(som).toEqual({
      punten: 2,
      goals: 1,
      schoten: 2,
      bespaardMln: besparingMln(keuze),
    });
  });
});

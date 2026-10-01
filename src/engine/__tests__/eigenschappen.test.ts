/** Property-based tests (fast-check): het saldo is nooit NaN; meters en persona's blijven binnen 0..100. */
import fc from 'fast-check';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../laadData';
import { bereken, magWijzigen } from '../rekenen';
import { grensBelasting, grensOnderdeel } from '../regels';
import type { Keuzes } from '../types';
import { echteData } from './hulp';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});

/** Willekeurige keuzes, ook buiten de grenzen (die moet de motor afvangen). */
const keuzesArb = (): fc.Arbitrary<Keuzes> => {
  const onderdeelIds = data.begroting.onderdelen.map((o) => o.id);
  const belastingIds = data.begroting.belastingen.map((b) => b.id);
  const kaartIds = data.begroting.actiekaarten.map((k) => k.id);
  return fc.record({
    onderdelen: fc.dictionary(
      fc.constantFrom(...onderdeelIds),
      fc.integer({ min: -150, max: 150 }),
    ),
    belastingen: fc.dictionary(
      fc.constantFrom(...belastingIds),
      fc.integer({ min: -150, max: 150 }),
    ),
    kaarten: fc.subarray(kaartIds),
    scenario: fc.constantFrom('voorzichtig', 'midden', 'optimistisch'),
  });
};

describe('eigenschappen', () => {
  it('het saldo is nooit NaN en de meters blijven tussen 0 en 100', () => {
    fc.assert(
      fc.property(keuzesArb(), (k) => {
        const r = bereken(data, k);
        for (const jaar of data.jaren) {
          const j = r.perJaar[jaar];
          expect(Number.isFinite(j?.structureel)).toBe(true);
          expect(Number.isFinite(j?.incidenteel)).toBe(true);
          expect(Number.isFinite(j?.lasten)).toBe(true);
          expect(Number.isFinite(j?.weerstandsvermogen)).toBe(true);
        }
        for (const v of [...Object.values(r.meters), ...Object.values(r.personas)]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
        for (const e of r.effecten) expect(Number.isFinite(e.bedrag)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('de doorgerekende keuzes liggen altijd binnen de grenzen', () => {
    fc.assert(
      fc.property(keuzesArb(), (k) => {
        const r = bereken(data, k);
        for (const [id, pct] of Object.entries(r.keuzes.onderdelen)) {
          const o = data.index.onderdelen.get(id);
          if (!o) throw new Error(id);
          const g = grensOnderdeel(o);
          expect(pct).toBeGreaterThanOrEqual(g.min);
          expect(pct).toBeLessThanOrEqual(g.max);
        }
        for (const [id, pct] of Object.entries(r.keuzes.belastingen)) {
          const b = data.index.belastingen.get(id);
          if (!b) throw new Error(id);
          const g = grensBelasting(b);
          expect(pct).toBeGreaterThanOrEqual(g.min);
          expect(pct).toBeLessThanOrEqual(g.max);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('de saldo’s zijn de som van de effecten (de uitleg klopt altijd)', () => {
    fc.assert(
      fc.property(keuzesArb(), (k) => {
        const r = bereken(data, k);
        for (const jaar of data.jaren) {
          const som = (s: 'S' | 'I') =>
            r.effecten
              .filter((e) => e.jaar === jaar && e.soort === s)
              .reduce((a, e) => a + e.bedrag, 0);
          expect(r.perJaar[jaar]?.structureel).toBeCloseTo(som('S'), 6);
          expect(r.perJaar[jaar]?.incidenteel).toBeCloseTo(som('I'), 6);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('vanuit een sluitende begroting blijft elke toegestane wijziging sluitend', () => {
    fc.assert(
      fc.property(keuzesArb(), keuzesArb(), (a, b) => {
        const huidig = bereken(data, a);
        if (!huidig.regels.sluitend) return;
        const nieuw = { ...b, scenario: a.scenario };
        if (magWijzigen(data, huidig.keuzes, bereken(data, nieuw).keuzes).ok) {
          expect(bereken(data, nieuw).regels.perJaarSluitend).toEqual(
            Object.fromEntries(data.jaren.map((j) => [j, true])),
          );
        }
      }),
      { numRuns: 200 },
    );
  });
});

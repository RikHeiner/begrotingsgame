import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, type Data } from '../../engine';
import { echteData, keuzes } from '../../engine/__tests__/hulp';
import { isGestopt, programmaPct, stilDoorMinimum, wisselProgramma } from '../beleidshuis';
import { nulbasisKeuzes } from '../nulbasis';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});

const saldo = (k: ReturnType<typeof keuzes>, j = 0) =>
  bereken(data, k).perJaar[data.jaren[j] ?? 0]?.structureel ?? 0;
const eenmalig = (k: ReturnType<typeof keuzes>, j = 0) =>
  bereken(data, k).perJaar[data.jaren[j] ?? 0]?.incidenteel ?? 0;

describe('Beleidshuis', () => {
  it('elk jaar: stopzetten verlaagt de post met het bedrag, aanzetten zet het terug', () => {
    const p = data.index.programmas.get('p_vitamine_g');
    expect(p?.structureel_of_incidenteel).toBe('S');
    const k0 = keuzes();
    const k1 = wisselProgramma(data, k0, 'p_vitamine_g');
    expect(isGestopt(k1, 'p_vitamine_g')).toBe(true);
    expect(k1.onderdelen.o6).toBeCloseTo(-(p ? programmaPct(data, p) : 0), 3);
    // 0,5 mln elk jaar, ook in het laatste jaar
    expect(saldo(k1, 3) - saldo(k0, 3)).toBeCloseTo(0.5e6, -3);
    const k2 = wisselProgramma(data, k1, 'p_vitamine_g');
    expect(k2.onderdelen.o6).toBeUndefined();
    expect(k2.gestopt).toBeUndefined();
  });

  it('eenmalig: alleen het eerste jaar, en de schuif blijft staan', () => {
    const k0 = keuzes();
    const k1 = wisselProgramma(data, k0, 'p_preventiefonds_jeugd');
    expect(k1.onderdelen.z1).toBeUndefined();
    // Eenmalig geld: niet in het structurele saldo, wel in het eenmalige.
    expect(saldo(k1, 0) - saldo(k0, 0)).toBeCloseTo(0, -3);
    expect(eenmalig(k1, 0) - eenmalig(k0, 0)).toBeCloseTo(4.509e6, -3);
    expect(eenmalig(k1, 1) - eenmalig(k0, 1)).toBeCloseTo(0, -3);
  });

  it("bij nul lopen de structurele programma's; de eenmalige staan stil", () => {
    const n = nulbasisKeuzes(data);
    expect(isGestopt(n, 'p_vitamine_g')).toBe(false);
    const p = data.index.programmas.get('p_preventiefonds_jeugd');
    expect(p && stilDoorMinimum(data, n, p)).toBe(false);
    expect(isGestopt(n, 'p_preventiefonds_jeugd')).toBe(true);
    // Een eenmalig programma aanzetten kost eenmalig het bedrag.
    const aan = wisselProgramma(data, n, 'p_preventiefonds_jeugd');
    expect(eenmalig(n) - eenmalig(aan)).toBeCloseTo((p?.bedrag_mln ?? 0) * 1e6, -3);
    // Een structureel programma stopzetten scheelt elk jaar het bedrag.
    const uit = wisselProgramma(data, n, 'p_vitamine_g');
    expect(saldo(uit) - saldo(n)).toBeCloseTo(0.5e6, -3);
  });

  it("programma's per post passen boven de ondergrens; plannen staan in het Beleidshuis", () => {
    expect(data.index.programmas.size).toBeGreaterThan(10);
    const plannen = data.begroting.actiekaarten.filter((k) => k.gebouw === 'beleid');
    expect(plannen.length).toBeGreaterThan(10);
    expect(data.gebouwen.find((g) => g.id === 'beleid')?.soort).toBe('beleidshuis');
  });
});

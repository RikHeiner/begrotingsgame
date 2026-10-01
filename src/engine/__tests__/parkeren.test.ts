import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, type Data } from '..';
import { indexeer, parkeerPosten } from '../parkeren';
import { echteData, keuzes, mln } from './hulp';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});
const post = (id: string) => parkeerPosten(data).find((p) => p.id === id);
const direct = (r: ReturnType<typeof bereken>) =>
  r.effecten
    .filter((e) => e.stap === 'direct' && e.jaar === 2026 && e.bron.startsWith('t5:'))
    .reduce((s, e) => s + e.bedrag, 0);

describe('parkeren per vergunning en tariefgebied', () => {
  it('de posten tellen samen op tot de parkeeropbrengst in de begroting', () => {
    const som = parkeerPosten(data).reduce((s, p) => s + p.basis, 0);
    expect(mln(som)).toBeCloseTo(35.1, 6);
    expect(mln(post('garages')?.basis ?? 0)).toBeCloseTo(35.1 - 26.325, 6);
  });

  it('een vergunning is aantal × tarief, per tariefgebied', () => {
    const b = post('bewoners_1:tweede');
    expect(b?.aantal).toBe(9275);
    expect(b?.basis).toBeCloseTo(9275 * 135.05, 2);
    expect(post('bewoners_1:binnenstad')?.aantal).toBe(765);
    expect(post('bewoners_1:derde_tm_vijfde')?.aantal).toBe(17710);
    expect(post('bewoners_2:tweede')?.aantal).toBe(336);
    expect(post('bezoekers')?.aantal).toBe(24621);
    expect(post('mantelzorg')?.basis).toBeCloseTo(247 * 26.02, 2);
  });

  it('de aantallen per gebied kloppen met de totalen in het rapport (bedrijven: 1 verschil)', () => {
    const p = data.parkeren;
    if (!p) throw new Error('geen parkeerdata');
    const som = (k: 'bewoners_1' | 'bewoners_2' | 'bezoekers' | 'bedrijven') =>
      p.aantallen.gebieden.reduce((s, g) => s + g[k], 0);
    expect(som('bewoners_1')).toBe(p.aantallen.totaal_volgens_bron.bewoners_1);
    expect(som('bewoners_2')).toBe(p.aantallen.totaal_volgens_bron.bewoners_2);
    expect(som('bezoekers')).toBe(p.aantallen.totaal_volgens_bron.bezoekers);
    expect(som('bedrijven')).toBe((p.aantallen.totaal_volgens_bron.bedrijven ?? 0) - 1);
  });

  it('een schuif per post levert aantal × tarief × percentage op', () => {
    const r = bereken(data, keuzes({ parkeren: { 'bewoners_1:tweede': 10 } }));
    expect(direct(r)).toBeCloseTo(0.1 * 9275 * 135.05, 0);
    // De kettingeffecten van parkeren (t5) rekenen mee in het saldo.
    expect(r.verbanden).toBeDefined();
    // t5 wordt het gewogen gemiddelde
    expect(r.keuzes.belastingen.t5).toBeCloseTo((0.1 * 9275 * 135.05 * 100) / 35.1e6 / 1, 2);
  });

  it('een oude keuze voor t5 geldt voor alle posten en geeft dezelfde uitkomst', () => {
    const r = bereken(data, keuzes({ belastingen: { t5: -10 } }));
    expect(mln(direct(r))).toBeCloseTo(-3.51, 6);
    expect(Object.values(r.keuzes.parkeren ?? {}).every((x) => x === -10)).toBe(true);
    expect(r.keuzes.belastingen.t5).toBe(-10);
  });

  it('grenzen per post', () => {
    const r = bereken(data, keuzes({ parkeren: { kortparkeren: 80, onbekend: 5 } }));
    expect(r.keuzes.parkeren?.kortparkeren).toBe(50);
    expect(r.keuzes.parkeren).not.toHaveProperty('onbekend');
    expect(r.correcties.some((c) => c.includes('onbekend'))).toBe(true);
  });

  it('indexeert een tarief van een eerder jaar', () => {
    const p = data.parkeren;
    if (!p) throw new Error('geen parkeerdata');
    expect(indexeer(p, 100, 2025).bedrag).toBeCloseTo(104.09, 6);
    expect(indexeer(p, 100, 2025).volledig).toBe(true);
    expect(indexeer(p, 100, 2024).volledig).toBe(false);
    expect(indexeer(p, 100, 2026).bedrag).toBe(100);
  });
});

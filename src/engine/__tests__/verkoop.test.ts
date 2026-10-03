import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, GEEN_KEUZES, type Data } from '..';
import { actieveData } from './hulp';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

const verschil = (kaart: string) => {
  const zonder = bereken(data, GEEN_KEUZES);
  const met = bereken(data, { ...GEEN_KEUZES, kaarten: [kaart] });
  return data.jaren.map((j) => ({
    eenmalig: (met.perJaar[j]?.incidenteel ?? 0) - (zonder.perJaar[j]?.incidenteel ?? 0),
    structureel: (met.perJaar[j]?.structureel ?? 0) - (zonder.perJaar[j]?.structureel ?? 0),
  }));
};

describe('verkopen in het Veilinghuis (BBV: alleen boekwinst is vrij geld)', () => {
  it('Enexis: de waarde boven de boekwaarde is eenmalig vrij geld', () => {
    const [j0] = verschil('k_verkoop_enexis');
    expect(j0?.eenmalig).toBeCloseTo(50e6, -4);
  });

  it('WarmteStad tegen boekwaarde: geen eenmalig geld, wel elk jaar minder rente', () => {
    const v = verschil('k_verkoop_warmtestad');
    expect(v[0]?.eenmalig).toBeCloseTo(0, -3);
    expect(v[0]?.structureel).toBeCloseTo(0, -3);
    // 2,5% rente over 37,975 mln
    expect(v[1]?.structureel).toBeCloseTo(0.025 * 37.975e6, -3);
  });

  it('verhuurde kavels: minder rente, maar de huur valt weg; per saldo kost het iets', () => {
    const v = verschil('k_verkoop_kavels');
    expect(v[1]?.structureel).toBeCloseTo((0.025 * 10 - 0.6) * 1e6, -3);
    expect(v[1]?.structureel ?? 0).toBeLessThan(0);
  });

  it('alle verkopen staan in het Veilinghuis en hebben een bron', () => {
    const verkopen = data.begroting.actiekaarten.filter((k) => k.verkoop);
    expect(verkopen.length).toBeGreaterThanOrEqual(8);
    for (const k of verkopen) {
      expect(k.gebouw).toBe('veiling');
      expect(k.bron.length).toBeGreaterThan(20);
    }
  });
});

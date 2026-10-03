import { describe, expect, it } from 'vitest';
import { actieveData } from '../../engine/__tests__/hulp';
import { mediaan, vergelijkUitgaven } from '../uitgaven';

async function uitgaven() {
  const data = await actieveData();
  if (!data.uitgaven) throw new Error('config.json noemt geen uitgaven');
  return { data, u: data.uitgaven };
}

describe('uitgaven per inwoner vergeleken met andere gemeenten', () => {
  it('mediaan', () => {
    expect(mediaan([3, 1, 2])).toBe(2);
    expect(mediaan([4, 1, 2, 3])).toBe(2.5);
  });

  it('de cijfers zijn van een eerder jaar dan de begroting', async () => {
    const { data, u } = await uitgaven();
    expect(u.jaar).toBeLessThan(data.begroting.begrotingsjaar);
  });

  it('sport bij het zwembad: Groningen in de begroting 2026', async () => {
    const { u } = await uitgaven();
    const v = vergelijkUitgaven(u, 'zwembad');
    expect(v?.jaar).toBe(2026);
    expect(v?.verslagsoort).toBe('begroting');
    const sport = v?.themas.find((t) => t.id === 'sport');
    if (!sport) throw new Error('geen thema sport');
    expect(sport.eigen.naam).toBe('Groningen');
    expect(Math.round(sport.eigen.perInwoner)).toBe(164);
    expect(sport.aantal).toBe(32);
    expect(sport.rang).toBe(31);
    // van laag naar hoog, met Groningen in de korte lijst
    expect(sport.alle.map((r) => r.perInwoner)).toEqual(
      [...sport.alle.map((r) => r.perInwoner)].sort((a, b) => a - b),
    );
    expect(sport.kort.some((r) => r.eigen)).toBe(true);
    expect(sport.kort.length).toBeLessThan(sport.alle.length);
  });

  it('gebouwen zonder thema (zoals het Veilinghuis) hebben geen vergelijking', async () => {
    const { u } = await uitgaven();
    expect(vergelijkUitgaven(u, 'veiling')).toBeUndefined();
  });

  it('elk gewoon gebouw heeft minstens één thema', async () => {
    const { data, u } = await uitgaven();
    for (const g of data.gebouwen.filter((g) => g.onderdelen?.length))
      expect(vergelijkUitgaven(u, g.id), g.id).toBeDefined();
  });
});

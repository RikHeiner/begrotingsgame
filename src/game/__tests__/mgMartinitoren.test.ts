import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import { bekendePosten, inwoners } from '../minigames';
import {
  TIJD,
  TOP,
  TOREN_METER,
  TREDEN_METER,
  VRAGEN,
  beoordeel,
  euroPerInwoner,
  geledingBij,
  juisteKant,
  lessen,
  maakParen,
  meterBij,
  nieuweTreden,
  parenUitData,
  verhouding,
  verschilBij,
  type Antwoord,
} from '../mgMartinitoren';

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

describe('Martinitoren: de vragen', () => {
  it('tien paren van posten met een begrijpelijke naam en het bedrag uit de begroting', () => {
    for (let zaad = 1; zaad <= 25; zaad++) {
      const paren = parenUitData(data, vast(zaad));
      expect(paren).toHaveLength(VRAGEN);
      const ids = paren.flatMap((p) => [p.links.id, p.rechts.id]);
      expect(new Set(ids).size, 'elke post één keer').toBe(ids.length);
      for (const p of paren) {
        for (const post of [p.links, p.rechts]) {
          expect(post.bedragMln).toBe(data.index.onderdelen.get(post.id)?.lasten_mln);
          expect(post.uitleg.length).toBeGreaterThan(10);
          expect(data.spelPosten.some((s) => s.post === post.id)).toBe(true);
        }
        // altijd een duidelijk goed antwoord
        expect(verhouding(p.links, p.rechts)).toBeGreaterThanOrEqual(1.25);
      }
    }
  });

  it('de vragen worden moeilijker: eerst een groot verschil, aan het eind een klein verschil', () => {
    expect(verschilBij(0).min).toBeGreaterThan(verschilBij(5).min);
    expect(verschilBij(5).min).toBeGreaterThan(verschilBij(9).min);
    let begin = 0;
    let eind = 0;
    for (let zaad = 1; zaad <= 20; zaad++) {
      const paren = parenUitData(data, vast(zaad));
      begin += (paren[0]?.verschil ?? 0) + (paren[1]?.verschil ?? 0);
      eind += (paren[8]?.verschil ?? 0) + (paren[9]?.verschil ?? 0);
      expect(paren[0]?.verschil).toBeGreaterThanOrEqual(3);
      expect(paren[9]?.verschil).toBeLessThanOrEqual(3.5);
    }
    expect(begin).toBeGreaterThan(eind * 1.5);
  });

  it('met te weinig posten: minder paren, maar nooit een paar zonder duidelijk verschil', () => {
    const posten = bekendePosten(data).slice(0, 5);
    const paren = maakParen(posten, 10, vast(3));
    expect(paren.length).toBeLessThanOrEqual(2);
    for (const p of paren) expect(p.verschil).toBeGreaterThanOrEqual(1.25);
    const [eerste] = posten;
    if (!eerste) throw new Error('geen posten');
    const gelijk = [
      { ...eerste, id: 'a' },
      { ...eerste, id: 'b' },
    ];
    expect(maakParen(gelijk, 3)).toHaveLength(0);
  });

  it('het goede antwoord is de post waar meer geld naartoe gaat', () => {
    const [p] = parenUitData(data, vast(4));
    if (!p) throw new Error('geen paar');
    const kant = juisteKant(p);
    const groot = kant === 'links' ? p.links : p.rechts;
    const klein = kant === 'links' ? p.rechts : p.links;
    expect(groot.bedragMln).toBeGreaterThan(klein.bedragMln);
    const anders = kant === 'links' ? 'rechts' : 'links';
    expect(beoordeel(p, kant)).toBe('goed');
    expect(beoordeel(p, kant, TIJD - 1)).toBe('snel');
    expect(beoordeel(p, kant, 2)).toBe('goed');
    expect(beoordeel(p, anders, TIJD)).toBe('fout');
    expect(beoordeel(p, undefined, 0)).toBe('telaat');
  });
});

describe('Martinitoren: de klim', () => {
  it('goed is een trede hoger, snel nog een halve erbij, fout of te laat een halve terug', () => {
    expect(nieuweTreden(0, 'goed')).toBe(1);
    expect(nieuweTreden(1, 'snel')).toBe(2.5);
    expect(nieuweTreden(3, 'fout')).toBe(2.5);
    expect(nieuweTreden(3, 'telaat')).toBe(2.5);
    expect(nieuweTreden(0, 'fout')).toBe(0);
    expect(nieuweTreden(TOP - 0.5, 'snel')).toBe(TOP);
  });

  it('de treden lopen van de Grote Markt tot de top op 97 meter', () => {
    expect(meterBij(0)).toBe(0);
    expect(meterBij(TOP)).toBe(TOREN_METER);
    expect(TREDEN_METER.at(-1)).toBe(97);
    for (let t = 1; t <= TOP; t++) expect(meterBij(t)).toBeGreaterThan(meterBij(t - 1));
    expect(meterBij(0.5)).toBe((TREDEN_METER[0] + TREDEN_METER[1]) / 2);
    expect(geledingBij(0)).toBe('de Grote Markt');
    expect(geledingBij(55)).toBe('de wijzerplaten');
    expect(geledingBij(97)).toMatch(/top/);
  });

  it('met alles goed sta je na acht vragen boven; met twee fout niet', () => {
    let t = 0;
    for (let i = 0; i < 8; i++) t = nieuweTreden(t, 'goed');
    expect(t).toBe(TOP);
    t = 0;
    for (const u of [
      'goed',
      'fout',
      'goed',
      'goed',
      'fout',
      'goed',
      'goed',
      'goed',
      'goed',
      'goed',
    ] as const)
      t = nieuweTreden(t, u);
    expect(t).toBeLessThan(TOP);
  });
});

describe('Martinitoren: per inwoner en wat je leert', () => {
  it('per inwoner: het bedrag gedeeld door het aantal inwoners', () => {
    const n = inwoners(data);
    expect(n).toBeGreaterThan(200_000);
    expect(euroPerInwoner(244.427, 244_427)).toBe(1000);
    const [p] = parenUitData(data, vast(2));
    if (p)
      expect(euroPerInwoner(p.links.bedragMln, n)).toBe(Math.round((p.links.bedragMln * 1e6) / n));
  });

  it('lessen noemen de grootste post en hoeveel winnaars van de wet moesten', () => {
    const paren = parenUitData(data, vast(6));
    const antwoorden: Antwoord[] = paren.map((paar) => ({
      paar,
      gekozen: juisteKant(paar),
      uitkomst: 'goed',
      treden: 1,
    }));
    const l = lessen(antwoorden, inwoners(data));
    expect(l.length).toBeGreaterThanOrEqual(2);
    const grootste = paren
      .flatMap((p) => [p.links, p.rechts])
      .sort((a, b) => b.bedragMln - a.bedragMln)[0];
    expect(l[0]).toContain(grootste?.naam);
    expect(l.join(' ')).toMatch(/per inwoner/);
    expect(lessen([], 1)).toEqual([]);
  });
});

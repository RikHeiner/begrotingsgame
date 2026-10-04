import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  BEGIN_STAND,
  KANTEN,
  LEVELS,
  STIL_KAARTEN,
  antwoord,
  gehaald,
  kaartenVoorLevel,
  kantVanVeeg,
  maxPunten,
  museumPosten,
  nodig,
  punten,
  uitlegVan,
  type MuseumKaart,
} from '../mgMuseum';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

/** Een vaste reeks "willekeurige" getallen, voor herhaalbare tests. */
function vasteKans(zaad = 7): () => number {
  let h = zaad;
  return () => {
    h = (h * 1103515245 + 12345) % 2147483648;
    return h / 2147483648;
  };
}

describe('Museum: moet het of mag het?', () => {
  it('alleen twee kanten: moet van de wet en eigen keuze', () => {
    expect(KANTEN.map((k) => k.id)).toEqual(['wet', 'keuze']);
    expect(KANTEN.map((k) => k.tekst)).toEqual(['Moet van de wet', 'Eigen keuze van de gemeente']);
  });

  it('alleen begrijpelijke posten met een soort, met het bedrag uit de begroting', () => {
    const posten = museumPosten(data);
    expect(posten.length).toBeGreaterThanOrEqual(20);
    const spel = new Map(data.spelPosten.map((p) => [p.post, p]));
    for (const p of posten) {
      const o = data.index.onderdelen.get(p.id);
      expect(p.bedragMln, p.id).toBe(o?.lasten_mln);
      expect(p.bedragMln, p.id).toBeGreaterThan(0);
      expect(spel.get(p.id)?.soort, p.id).toBe(p.soort);
      if (p.soort === 'wet') expect(p.wet, p.id).toBeTruthy();
    }
    // posten zonder duidelijke soort doen niet mee
    for (const s of data.spelPosten.filter((x) => !x.soort))
      expect(posten.some((p) => p.id === s.post)).toBe(false);
    // geen belastingen
    const belastingen = new Set(data.begroting.belastingen.map((b) => b.id));
    for (const p of posten) expect(belastingen.has(p.id)).toBe(false);
  });

  it('elk level: de goede aantallen, geen dubbele, van elke soort minstens 40%', () => {
    const posten = museumPosten(data);
    for (let n = 0; n < 20; n++) {
      const kans = vasteKans(n + 1);
      for (const aantal of [...LEVELS.map((l) => l.kaarten), STIL_KAARTEN]) {
        const k = kaartenVoorLevel(posten, aantal, kans);
        expect(k).toHaveLength(aantal);
        expect(new Set(k.map((x) => x.id)).size).toBe(aantal);
        for (const s of ['wet', 'keuze'])
          expect(k.filter((x) => x.soort === s).length, s).toBeGreaterThanOrEqual(
            Math.floor(aantal * 0.4),
          );
      }
    }
  });

  it('posten die je nog niet zag, komen eerst', () => {
    const posten = museumPosten(data);
    const eerst = kaartenVoorLevel(posten, 10, vasteKans(3));
    const gezien = new Set(eerst.map((k) => k.id));
    const daarna = kaartenVoorLevel(posten, 10, vasteKans(4), gezien);
    expect(daarna.filter((k) => gezien.has(k.id))).toHaveLength(0);
  });

  it('niet meer kunstwerken dan er posten zijn', () => {
    const posten = museumPosten(data).slice(0, 5);
    expect(kaartenVoorLevel(posten, 12)).toHaveLength(5);
  });

  it('een reeks goede antwoorden geeft meer punten, tot een maximum', () => {
    expect([1, 2, 3, 4, 5, 6, 9].map(punten)).toEqual([10, 15, 20, 25, 30, 30, 30]);
    expect(maxPunten(3)).toBe(45);
    expect(maxPunten(LEVELS[0].kaarten)).toBe(10 + 15 + 20 + 25 + 30 * 6);
  });

  it('antwoord: goed telt op, fout breekt de reeks', () => {
    const [wet] = museumPosten(data).filter((p) => p.soort === 'wet') as [MuseumKaart];
    const [keuze] = museumPosten(data).filter((p) => p.soort === 'keuze') as [MuseumKaart];
    let r = antwoord(BEGIN_STAND, wet, 'wet');
    expect(r).toMatchObject({ goed: true, erbij: 10 });
    r = antwoord(r.stand, keuze, 'keuze');
    expect(r).toMatchObject({ goed: true, erbij: 15 });
    expect(r.stand).toMatchObject({ punten: 25, reeks: 2, besteReeks: 2, goed: 2, fout: 0 });
    r = antwoord(r.stand, keuze, 'wet');
    expect(r).toMatchObject({ goed: false, erbij: 0 });
    expect(r.stand).toMatchObject({ punten: 25, reeks: 0, besteReeks: 2, goed: 2, fout: 1 });
  });

  it('een level haal je met 70% goed', () => {
    expect(nodig(10)).toBe(7);
    expect(gehaald(7, 10)).toBe(true);
    expect(gehaald(6, 10)).toBe(false);
    expect(nodig(14)).toBe(10);
    expect(gehaald(0, 0)).toBe(false);
  });

  it('uitleg: bij de wet de naam van de wet, bij een keuze dat de gemeente het kan laten', () => {
    for (const p of museumPosten(data)) {
      const t = uitlegVan(p);
      if (p.soort === 'wet') {
        expect(t).toBe(
          `Moet van de ${p.wet}. De gemeente kiest wel hoeveel geld ze eraan uitgeeft.`,
        );
      } else expect(t).toBe('De gemeente kiest dit zelf. Ze kan het ook laten.');
      // geen oordeel over kosten of opbrengst
      expect(t).not.toMatch(/kost geld|levert .*op/);
    }
  });

  it('vegen: links is de wet, rechts de eigen keuze, een klein stukje telt niet', () => {
    expect(kantVanVeeg(-80)).toBe('wet');
    expect(kantVanVeeg(80)).toBe('keuze');
    expect(kantVanVeeg(20)).toBeUndefined();
    expect(kantVanVeeg(-59)).toBeUndefined();
  });
});

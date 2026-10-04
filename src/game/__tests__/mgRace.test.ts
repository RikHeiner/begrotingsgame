import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  BANEN,
  BEURTEN,
  DUUR,
  FASES,
  LEVENS,
  PUNTEN,
  afstand,
  baanBij,
  beschrijfRij,
  bespaard,
  faseBijBeurt,
  faseOp,
  kerntaken,
  korteNaam,
  maakRit,
  maxPunten,
  nieuweStand,
  passeer,
  rijCode,
  snelheid,
  tijdBij,
  uitgaven,
  vrijeWeg,
  zet,
  type Rij,
  type Uitgave,
} from '../mgRace';

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

describe('Race: de uitgaven', () => {
  it('maakt van een keuze de naam van de uitgave', () => {
    expect(korteNaam('Stoppen met het Young Professional Programma')).toBe(
      'Young Professional Programma',
    );
    expect(korteNaam('Eigen ombudsman stoppen, naar de Nationale ombudsman')).toBe(
      'Eigen ombudsman',
    );
    expect(korteNaam('Geen extra controleur voor illegale kamers')).toBe(
      'Extra controleur voor illegale kamers',
    );
    expect(korteNaam('Route Arbeid+ niet uitbreiden')).toBe('Route Arbeid+ uitbreiden');
    expect(korteNaam("Stoppen met 'bewegende stad'")).toBe('Bewegende stad');
    // meer huur vragen of een doel uitstellen is geen uitgave
    expect(korteNaam('Sportclubs 10% meer huur laten betalen')).toBeUndefined();
    expect(korteNaam('CO₂-neutraal in 2040 in plaats van 2035')).toBeUndefined();
  });

  it('alle bedragen komen uit de begroting van het actieve jaar, niet uit een tegenbegroting', () => {
    const lijst = uitgaven(data);
    expect(lijst.length).toBeGreaterThan(30);
    for (const u of lijst) {
      expect(u.jaar).toBe(data.begroting.begrotingsjaar);
      expect(u.bedragMln).toBeGreaterThan(0);
      const bron =
        data.begroting.actiekaarten.find((k) => k.id === u.id)?.bedrag_mln ??
        data.index.programmas.get(u.id)?.bedrag_mln;
      expect(u.bedragMln, u.id).toBe(bron);
      expect(u.naam).not.toMatch(/^(stoppen|geen|niet)\b/i);
      expect(u.uitleg.length).toBeGreaterThan(10);
    }
    const namen = lijst.map((u) => u.naam.toLowerCase());
    expect(new Set(namen).size).toBe(namen.length);
  });

  it('de plannen met een zin uit het verkiezingsprogramma staan vooraan, met de pagina', () => {
    const lijst = uitgaven(data);
    const metZin = lijst.filter((u) => u.vvd);
    expect(metZin.length).toBe(5);
    expect(lijst.slice(0, 5).every((u) => u.vvd && (u.pagina ?? 0) > 0)).toBe(true);
  });

  it('kerntaken moeten van de wet; brandweer en ambulance eerst', () => {
    const kern = kerntaken(data);
    expect(kern[0]?.naam).toBe('Brandweer en ambulance');
    expect(kern.every((k) => k.wet && k.bedragMln >= 5)).toBe(true);
    for (const k of kern) expect(k.bedragMln).toBe(data.index.onderdelen.get(k.id)?.lasten_mln);
  });
});

describe('Race: de rit', () => {
  it('de snelheid loopt op; afstand en tijd passen bij elkaar', () => {
    expect(snelheid(0)).toBeLessThan(snelheid(30));
    expect(snelheid(30)).toBeLessThan(snelheid(DUUR));
    for (const t of [0, 7, 20, 41.5, 60]) expect(tijdBij(afstand(t))).toBeCloseTo(t, 6);
    expect(faseOp(0)).toBe(0);
    expect(faseOp(25)).toBe(1);
    expect(faseOp(59)).toBe(2);
    expect(faseBijBeurt(0)).toBe(0);
    expect(faseBijBeurt(BEURTEN - 1)).toBe(2);
  });

  it('snel spel: rijen tot het eind van de minuut, met drie fases en altijd een vrije weg', () => {
    for (let zaad = 1; zaad < 40; zaad++) {
      const rit = maakRit(data, false, vast(zaad));
      expect(rit.rijen.length).toBeGreaterThan(45);
      expect(vrijeWeg(rit)).toBe(true);
      const fases = rit.rijen.map((r) => r.fase);
      expect(fases).toEqual([...fases].sort());
      expect(new Set(fases).size).toBe(FASES.length);
      for (const r of rit.rijen) {
        expect(r.vakken.filter((v) => v?.soort === 'uitgave').length).toBeLessThan(3);
        expect(r.w).toBeLessThan(afstand(DUUR));
      }
      // in de spits meer uitgaven per rij dan in het begin
      const per = (f: number) => {
        const rijen = rit.rijen.filter((r) => r.fase === f);
        const n = rijen.flatMap((r) => r.vakken).filter((v) => v?.soort === 'uitgave').length;
        return n / rijen.length;
      };
      expect(per(2)).toBeGreaterThan(per(0));
    }
  });

  it('rustige modus: twintig rijen, en altijd te halen met één strook per beurt', () => {
    for (let zaad = 1; zaad < 60; zaad++) {
      const rit = maakRit(data, true, vast(zaad));
      expect(rit.rijen.length).toBe(BEURTEN);
      expect(vrijeWeg(rit)).toBe(true);
      const kern = rit.rijen.flatMap((r) => r.vakken).filter((v) => v?.soort === 'kern');
      expect(kern.length).toBeLessThanOrEqual(3);
    }
  });

  it('de hoogste score telt alle ontweken uitgaven en het beste vak per rij', () => {
    const rit = maakRit(data, true, vast(3));
    const uitg = rit.rijen.flatMap((r) => r.vakken).filter((v) => v?.soort === 'uitgave').length;
    expect(maxPunten(rit)).toBeGreaterThanOrEqual(uitg * PUNTEN.ontweken);
  });
});

describe('Race: spelen', () => {
  const u = (id: string, bedragMln: number, soort: 'S' | 'I' = 'S'): Uitgave => ({
    id,
    naam: id,
    keuze: id,
    uitleg: 'uitleg',
    bedragMln,
    soort,
    jaar: 2027,
  });
  const rij = (vakken: Rij['vakken']): Rij => ({ nr: 0, fase: 0, w: 0, vakken });

  it('van strook wisselen blijft op het fietspad', () => {
    expect(zet(0, -1)).toBe(0);
    expect(zet(1, -1)).toBe(0);
    expect(zet(1, 1)).toBe(2);
    expect(zet(2, 1)).toBe(2);
    expect(zet(1, 0)).toBe(1);
    BANEN.forEach((x, i) => expect(baanBij(x)).toBe(i));
  });

  it('raak je een uitgave, dan verlies je een leven; de rest ontwijk je', () => {
    const r = rij([
      { soort: 'uitgave', uitgave: u('a', 2) },
      { soort: 'uitgave', uitgave: u('b', 1, 'I') },
      { soort: 'munt' },
    ]);
    const { stand, gebeurtenissen } = passeer(nieuweStand(), r, 0);
    expect(stand.levens).toBe(LEVENS - 1);
    expect(stand.geraakt.map((x) => x.id)).toEqual(['a']);
    expect(stand.ontweken.map((x) => x.id)).toEqual(['b']);
    expect(stand.punten).toBe(PUNTEN.ontweken);
    expect(stand.rij).toBe(1);
    expect(gebeurtenissen.map((g) => g.soort)).toEqual(['geraakt', 'ontweken']);
    expect(bespaard(stand)).toEqual({ elkJaar: 0, eenmalig: 1 });
  });

  it('munten en geldzakken geven punten; een kerntaak een leven (of punten als je er drie hebt)', () => {
    const kern = { id: 'v1', naam: 'Brandweer en ambulance', uitleg: '', bedragMln: 30 };
    let s = passeer(nieuweStand(), rij([{ soort: 'munt' }, null, null]), 0).stand;
    expect(s.punten).toBe(PUNTEN.munt);
    s = passeer(s, rij([null, { soort: 'zak' }, null]), 1).stand;
    expect(s.punten).toBe(PUNTEN.munt + PUNTEN.zak);
    // vol: punten
    s = passeer(s, rij([null, null, { soort: 'kern', kern }]), 2).stand;
    expect(s.levens).toBe(LEVENS);
    expect(s.punten).toBe(PUNTEN.munt + PUNTEN.zak + PUNTEN.kern);
    // na een botsing: een leven terug
    s = passeer(s, rij([{ soort: 'uitgave', uitgave: u('x', 1) }, null, null]), 0).stand;
    expect(s.levens).toBe(LEVENS - 1);
    const r = passeer(s, rij([{ soort: 'kern', kern }, null, null]), 0);
    expect(r.stand.levens).toBe(LEVENS);
    expect(r.gebeurtenissen[0]).toMatchObject({ soort: 'kern', leven: true });
    expect(r.stand.kern).toHaveLength(1);
  });

  it('bespaard telt elke uitgave één keer, elk jaar en eenmalig apart, en niet wat je raakte', () => {
    let s = nieuweStand();
    const a = u('a', 2);
    const b = u('b', 0.5, 'I');
    s = passeer(s, rij([{ soort: 'uitgave', uitgave: a }, null, null]), 1).stand;
    s = passeer(s, rij([{ soort: 'uitgave', uitgave: a }, null, null]), 1).stand;
    s = passeer(s, rij([{ soort: 'uitgave', uitgave: b }, null, null]), 1).stand;
    expect(bespaard(s)).toEqual({ elkJaar: 2, eenmalig: 0.5 });
    s = passeer(s, rij([null, { soort: 'uitgave', uitgave: b }, null]), 1).stand;
    expect(bespaard(s)).toEqual({ elkJaar: 2, eenmalig: 0 });
  });

  it('zonder levens gebeurt er niets meer', () => {
    const s = { ...nieuweStand(), levens: 0 };
    expect(passeer(s, rij([{ soort: 'munt' }, null, null]), 0).stand).toBe(s);
  });

  it('beschrijft een rij in woorden en als code', () => {
    const r = rij([
      { soort: 'uitgave', uitgave: u('Campus Camera', 0.1) },
      null,
      { soort: 'munt' },
    ]);
    expect(beschrijfRij(r)).toBe(
      'links een onnodige uitgave: Campus Camera, midden vrij, rechts een munt',
    );
    expect(rijCode(r)).toBe('U.M');
    expect(rijCode(undefined)).toBe('...');
  });
});

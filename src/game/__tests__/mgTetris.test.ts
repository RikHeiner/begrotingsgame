import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  BREED,
  HOOG,
  RUSTIG_BLOKKEN,
  SCHRAP_PUNTEN,
  SCORE_MAX,
  VORM_NAMEN,
  beginStand,
  bespaardMln,
  botst,
  cellen,
  doe,
  draai,
  landing,
  leegBord,
  levelVoor,
  maakRij,
  nieuwBlok,
  omlaag,
  puntenVoorRijen,
  schuif,
  score,
  stapelHoogte,
  tetrisPosten,
  valTijd,
  verdeling,
  vormCellen,
  wisRijen,
  zetVast,
  type Blok,
  type Bord,
  type Cel,
  type Stand,
  type TetrisPost,
  type VormNaam,
} from '../mgTetris';

let data: Data;
let posten: TetrisPost[];
beforeAll(async () => {
  data = await actieveData();
  posten = tetrisPosten(data);
});

/** Een vaste reeks getallen voor de tests. */
const vast = (zaad = 1) => {
  let a = zaad;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
};

const post = (soort: 'wet' | 'keuze'): TetrisPost => {
  const p = posten.find((x) => x.soort === soort);
  if (!p) throw new Error(`geen post van soort ${soort}`);
  return p;
};

const blok = (vorm: VormNaam, x: number, y: number, soort: 'wet' | 'keuze' = 'keuze'): Blok => ({
  vorm,
  draai: 0,
  x,
  y,
  post: post(soort),
  nr: 1,
});

/** Een vakje vullen of lezen. */
function zet(bord: Bord, x: number, y: number, c: Cel): void {
  const rij = bord[y];
  if (rij) rij[x] = c;
}
const cel = (bord: Bord, x: number, y: number): Cel | undefined => bord[y]?.[x];

/** Een bord met de onderste rijen vol, op één gat na (in kolom `gat`). */
function bordMetRijen(aantal: number, gat: number): Bord {
  const bord = leegBord();
  for (let y = HOOG - aantal; y < HOOG; y++)
    for (let x = 0; x < BREED; x++) if (x !== gat) zet(bord, x, y, { soort: 'wet', nr: 0 });
  return bord;
}

describe('Begrotingstetris: de posten', () => {
  it('alleen posten met een duidelijke soort, met het bedrag uit de begroting', () => {
    expect(posten.length).toBeGreaterThan(20);
    for (const p of posten) {
      expect(['wet', 'keuze']).toContain(p.soort);
      expect(p.bedragMln).toBe(data.index.onderdelen.get(p.id)?.lasten_mln);
      if (p.soort === 'wet') expect(p.wet).toBeTruthy();
    }
    const zonderSoort = data.spelPosten.filter((p) => !p.soort).map((p) => p.post);
    for (const id of zonderSoort) expect(posten.some((p) => p.id === id)).toBe(false);
  });

  it('de verdeling telt wet en keuze apart op', () => {
    const v = verdeling(posten);
    expect(v.wet.aantal + v.keuze.aantal).toBe(posten.length);
    expect(v.wet.mln).toBeGreaterThan(v.keuze.mln);
  });

  it('de rij blokken gebruikt alle vormen en mengt wet en keuze', () => {
    const rij = maakRij(posten, 70, vast(3));
    expect(rij).toHaveLength(70);
    // per zak van zeven komt elke vorm één keer
    expect(new Set(rij.slice(0, 7).map((k) => k.vorm)).size).toBe(7);
    expect(rij.some((k) => k.post.soort === 'wet')).toBe(true);
    expect(rij.some((k) => k.post.soort === 'keuze')).toBe(true);
  });
});

describe('Begrotingstetris: vormen en draaien', () => {
  it('elke vorm heeft vier vakjes, en vier keer draaien brengt hem terug', () => {
    for (const v of VORM_NAMEN) {
      const c0 = vormCellen(v, 0);
      expect(c0).toHaveLength(4);
      const sleutel = (c: { x: number; y: number }[]) =>
        c
          .map((p) => `${p.x},${p.y}`)
          .sort()
          .join(' ');
      expect(sleutel(vormCellen(v, 4))).toBe(sleutel(c0));
      expect(new Set(vormCellen(v, 1).map((p) => `${p.x},${p.y}`)).size).toBe(4);
    }
  });

  it('een I-blok staat na een kwartslag rechtop', () => {
    const c = vormCellen('I', 1);
    expect(new Set(c.map((p) => p.x)).size).toBe(1);
    expect(new Set(c.map((p) => p.y)).size).toBe(4);
  });

  it('een nieuw blok begint bovenaan in het midden, binnen het bord', () => {
    for (const v of VORM_NAMEN) {
      const b = nieuwBlok({ vorm: v, post: post('wet') }, 1);
      const c = cellen(b);
      expect(Math.min(...c.map((p) => p.y))).toBe(0);
      expect(Math.min(...c.map((p) => p.x))).toBeGreaterThanOrEqual(3);
      expect(Math.max(...c.map((p) => p.x))).toBeLessThanOrEqual(6);
      expect(botst(leegBord(), b)).toBe(false);
    }
  });

  it('draaien tegen de muur schuift het blok bij (wall kick)', () => {
    const bord = leegBord();
    // een staand I-blok helemaal rechts: plat draaien past alleen als het naar links schuift
    const staand: Blok = { ...blok('I', 0, 5), draai: 1, x: BREED - 3 };
    expect(Math.max(...cellen(staand).map((p) => p.x))).toBe(BREED - 1);
    const plat = draai(bord, staand);
    expect(plat).not.toBeNull();
    expect(plat?.draai).toBe(2);
    expect(botst(bord, plat as Blok)).toBe(false);
    expect(plat?.x).toBeLessThan(staand.x);
  });

  it('draaien kan niet als er nergens plek is', () => {
    const bord = leegBord();
    // een smalle schacht van één vakje breed: een staand I-blok kan niet plat
    for (let y = 0; y < HOOG; y++)
      for (let x = 0; x < BREED; x++) if (x !== 4) zet(bord, x, y, { soort: 'wet', nr: 0 });
    const staand: Blok = { ...blok('I', 2, 6), draai: 1 };
    expect(cellen(staand).every((p) => p.x === 4)).toBe(true);
    expect(botst(bord, staand)).toBe(false);
    expect(draai(bord, staand)).toBeNull();
  });
});

describe('Begrotingstetris: botsen en vallen', () => {
  it('het blok kan niet door de rand of door andere blokken', () => {
    const bord = leegBord();
    const links = blok('O', 0, 0);
    expect(schuif(bord, links, -1)).toBeNull();
    expect(schuif(bord, links, 1)?.x).toBe(1);
    const rechts = blok('O', BREED - 2, 0);
    expect(schuif(bord, rechts, 1)).toBeNull();
    const onder = blok('O', 4, HOOG - 2);
    expect(omlaag(bord, onder)).toBeNull();
    zet(bord, 4, 5, { soort: 'keuze', nr: 0 });
    expect(botst(bord, blok('O', 4, 4))).toBe(true);
    expect(botst(bord, blok('O', 5, 4))).toBe(false);
    // boven het bord mag een blok wel uitsteken
    expect(botst(bord, blok('O', 4, -1))).toBe(false);
  });

  it('een harde val landt op de stapel', () => {
    const bord = bordMetRijen(3, 0);
    const b = landing(bord, blok('O', 4, 0));
    expect(Math.max(...cellen(b).map((p) => p.y))).toBe(HOOG - 4);
    expect(omlaag(bord, b)).toBeNull();
  });
});

describe('Begrotingstetris: rijen wissen', () => {
  it('volle rijen verdwijnen en de rest zakt', () => {
    const bord = bordMetRijen(2, 9);
    zet(bord, 2, HOOG - 3, { soort: 'keuze', nr: 7 });
    // een staand I-blok in het gat maakt twee rijen vol
    const i: Blok = { ...blok('I', 7, HOOG - 4), draai: 1 };
    expect(cellen(i).every((p) => p.x === 9)).toBe(true);
    const vastgezet = zetVast(bord, i);
    expect(vastgezet.boven).toBe(false);
    const { bord: na, rijen } = wisRijen(vastgezet.bord);
    expect(rijen).toEqual([HOOG - 2, HOOG - 1]);
    expect(na).toHaveLength(HOOG);
    expect(cel(na, 2, HOOG - 1)).toEqual({ soort: 'keuze', nr: 7 });
    expect(cel(na, 9, HOOG - 1)).toEqual({ soort: 'keuze', nr: 1 });
    expect(stapelHoogte(na)).toBe(2);
  });

  it('punten per rij, meer voor meer rijen tegelijk en voor een hoger level', () => {
    expect(puntenVoorRijen(0, 1)).toBe(0);
    expect(puntenVoorRijen(1, 1)).toBe(100);
    expect(puntenVoorRijen(4, 1)).toBeGreaterThan(4 * puntenVoorRijen(1, 1));
    expect(puntenVoorRijen(2, 3)).toBe(3 * puntenVoorRijen(2, 1));
  });

  it('het level gaat omhoog met rijen of tijd, en dan valt het blok sneller', () => {
    expect(levelVoor(0)).toBe(1);
    expect(levelVoor(4)).toBe(2);
    expect(levelVoor(0, 61)).toBe(3);
    expect(valTijd(3)).toBeLessThan(valTijd(1));
    expect(valTijd(50)).toBeGreaterThanOrEqual(110);
  });
});

describe('Begrotingstetris: de stand en schrappen', () => {
  const stand = (b: Blok, bord = leegBord()): Stand => ({
    ...beginStand(posten, { kans: vast(2) }),
    bord,
    blok: b,
  });

  it('een eigen keuze kun je schrappen: weg, bespaard bedrag, bonuspunten', () => {
    const p = post('keuze');
    const s = doe(stand(blok('T', 4, 3, 'keuze')), 'schrap', 1);
    expect(s.geschrapt).toEqual([p]);
    expect(bespaardMln(s)).toBe(Math.round(p.bedragMln * 100) / 100);
    expect(s.punten).toBe(SCHRAP_PUNTEN);
    expect(s.blokken).toBe(1);
    // het bord blijft leeg, er komt een nieuw blok
    expect(stapelHoogte(s.bord)).toBe(0);
    expect(s.blok?.nr).toBe(2);
    expect(s.laatste?.lijst[0]?.soort).toBe('geschrapt');
  });

  it('wat moet van de wet kun je niet schrappen: het blok valt meteen', () => {
    const p = post('wet');
    const s = doe(stand(blok('O', 4, 0, 'wet')), 'schrap', 1);
    expect(s.geschrapt).toEqual([]);
    expect(s.wetPogingen).toEqual([p]);
    expect(s.punten).toBe(0);
    expect(cel(s.bord, 4, HOOG - 1)).toEqual({ soort: 'wet', nr: 1 });
    expect(stapelHoogte(s.bord)).toBe(2);
    expect(s.laatste?.lijst.map((g) => g.soort)).toContain('wet');
  });

  it('zakken, harde val en een volle rij geven punten', () => {
    let s = stand(blok('O', 4, 0));
    s = doe(s, 'zak', 1);
    expect(s.punten).toBe(1);
    s = doe(s, 'val', 1);
    expect(s.punten).toBe(1);
    const hard = doe(s, 'hard', 1);
    expect(hard.punten).toBe(1 + 2 * (HOOG - 2 - 2));
    // een I-blok plat in het gat van een rij
    const bord = leegBord();
    for (let x = 4; x < BREED; x++) zet(bord, x, HOOG - 1, { soort: 'wet', nr: 0 });
    const rij = doe(stand(blok('I', 0, 5), bord), 'hard', 2);
    expect(rij.rijen).toBe(1);
    expect(rij.punten).toBe(puntenVoorRijen(1, 2) + 2 * (HOOG - 1 - 6));
    expect(rij.laatste?.lijst.some((g) => g.soort === 'rijen')).toBe(true);
  });

  it('zakken als het blok al ligt, zet het neer', () => {
    const s = doe(stand(blok('O', 4, HOOG - 2)), 'zak', 1);
    expect(s.blokken).toBe(1);
    expect(cel(s.bord, 4, HOOG - 1)).not.toBeNull();
    expect(s.blok?.nr).toBe(2);
  });

  it('de begroting loopt over als de stapel bovenaan komt', () => {
    const bord = leegBord();
    for (let y = 0; y < HOOG; y++) zet(bord, 0, y, { soort: 'wet', nr: 0 });
    for (let y = 2; y < HOOG; y++)
      for (let x = 1; x < BREED - 1; x++) zet(bord, x, y, { soort: 'wet', nr: 0 });
    const s = doe(stand(blok('O', 4, 0), bord), 'hard', 1);
    expect(s.over).toBe('vol');
    expect(s.blok).toBeNull();
    // daarna gebeurt er niets meer
    expect(doe(s, 'links', 1)).toBe(s);
  });

  it('in de rustige modus stopt het spel na een vast aantal blokken', () => {
    let s = beginStand(posten, { maxBlokken: RUSTIG_BLOKKEN, kans: vast(9) });
    let n = 0;
    while (!s.over && n < 100) {
      // om en om links en rechts neerleggen, zodat de stapel niet te hoog wordt
      const kant = n % 3 === 0 ? 'links' : n % 3 === 1 ? 'rechts' : 'draai';
      for (let i = 0; i < 4; i++) s = doe(s, kant, 1);
      s = doe(s, s.blok?.post.soort === 'keuze' ? 'schrap' : 'hard', 1);
      n++;
    }
    expect(s.over).toBeDefined();
    if (s.over === 'blokken') expect(s.blokken).toBe(RUSTIG_BLOKKEN);
    expect(s.geschrapt.every((p) => p.soort === 'keuze')).toBe(true);
  });

  it('de score is hooguit het maximum', () => {
    expect(score({ punten: 120 })).toBe(120);
    expect(score({ punten: 99_999 })).toBe(SCORE_MAX);
  });
});

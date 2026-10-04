/**
 * Grote Markt: "Begrotingstetris". Tetris met de uitgaven van de gemeente. Elk vallend blok is een
 * post uit de begroting (met een naam die iedereen begrijpt). Een volle rij betekent: de begroting
 * sluit. Je kunt een blok schrappen, maar alleen als het een eigen keuze van de gemeente is. Wat
 * moet van de wet, kun je niet schrappen: dat blok valt meteen naar beneden.
 *
 * Alles hier is puur (geen React, geen scherm), zodat de regels te testen zijn. Het toeval komt
 * binnen via `kans`.
 */
import type { Data } from '../engine';
import { bekendePosten, schud, type BekendePost } from './minigames';

/** Het bord: zo veel vakjes breed en hoog. */
export const BREED = 10;
export const HOOG = 17;

/** Spelregels. */
export const SPEELTIJD = 120; // seconden
export const RUSTIG_BLOKKEN = 15; // zo veel blokken in de rustige modus
export const RIJEN_PER_LEVEL = 4;
export const SECONDEN_PER_LEVEL = 30;
export const SCHRAP_PUNTEN = 20;
export const SCORE_MAX = 1000;
/** Punten voor 1, 2, 3 of 4 rijen tegelijk (keer het level). */
export const RIJ_PUNTEN = [0, 100, 300, 500, 800] as const;

/** Een post die als blok kan vallen: altijd met een soort (wet of keuze). */
export type TetrisPost = BekendePost & { soort: 'wet' | 'keuze' };

export type VormNaam = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export const VORM_NAMEN: readonly VormNaam[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

type Punt = { x: number; y: number };

/** De zeven vormen, elk in een vierkant van n bij n vakjes. */
export const VORMEN: Record<VormNaam, { n: number; cellen: readonly [number, number][] }> = {
  I: {
    n: 4,
    cellen: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  O: {
    n: 2,
    cellen: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  T: {
    n: 3,
    cellen: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  S: {
    n: 3,
    cellen: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
  },
  Z: {
    n: 3,
    cellen: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  J: {
    n: 3,
    cellen: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  L: {
    n: 3,
    cellen: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
};

/** De vakjes van een vorm, `draai` keer een kwartslag met de klok mee gedraaid. */
export function vormCellen(vorm: VormNaam, draai: number): Punt[] {
  const { n, cellen } = VORMEN[vorm];
  const keer = ((draai % 4) + 4) % 4;
  return cellen.map(([x0, y0]) => {
    let x = x0;
    let y = y0;
    for (let i = 0; i < keer; i++) [x, y] = [n - 1 - y, x];
    return { x, y };
  });
}

/** Een blok: een vorm met een post, op een plek op het bord. */
export type Blok = {
  vorm: VormNaam;
  draai: number;
  x: number;
  y: number;
  post: TetrisPost;
  /** het hoeveelste blok van het spel */
  nr: number;
};

/** De vakjes van een blok op het bord. */
export const cellen = (b: Blok): Punt[] =>
  vormCellen(b.vorm, b.draai).map((c) => ({ x: b.x + c.x, y: b.y + c.y }));

/** Een vol vakje: van welke soort post, en van welk blok. */
export type Cel = { soort: 'wet' | 'keuze'; nr: number } | null;
/** Het bord, per rij (bovenaan rij 0) en dan per kolom. */
export type Bord = Cel[][];

export const leegBord = (): Bord =>
  Array.from({ length: HOOG }, () => Array.from({ length: BREED }, () => null));

/** Botst het blok met de rand of met een vol vakje? Boven het bord (y < 0) mag wel. */
export function botst(bord: Bord, b: Blok): boolean {
  return cellen(b).some(
    ({ x, y }) => x < 0 || x >= BREED || y >= HOOG || (y >= 0 && bord[y]?.[x] != null),
  );
}

/** Een vakje opzij (dx -1 of 1). Geeft het verschoven blok, of null als dat niet kan. */
export function schuif(bord: Bord, b: Blok, dx: number): Blok | null {
  const nieuw = { ...b, x: b.x + dx };
  return botst(bord, nieuw) ? null : nieuw;
}

/** Een vakje omlaag, of null als het blok ligt. */
export function omlaag(bord: Bord, b: Blok): Blok | null {
  const nieuw = { ...b, y: b.y + 1 };
  return botst(bord, nieuw) ? null : nieuw;
}

/**
 * Probeert een blok bij te schuiven als het na het draaien botst ("wall kick"): eerst op de plek
 * zelf, dan een of twee vakjes opzij, dan een vakje omhoog.
 */
export const KICKS: readonly Punt[] = [
  { x: 0, y: 0 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -2, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: -1 },
];

/** Draait het blok een kwartslag (1 = met de klok mee). Geeft null als het nergens past. */
export function draai(bord: Bord, b: Blok, richting = 1): Blok | null {
  const gedraaid = { ...b, draai: (((b.draai + richting) % 4) + 4) % 4 };
  for (const k of KICKS) {
    const nieuw = { ...gedraaid, x: gedraaid.x + k.x, y: gedraaid.y + k.y };
    if (!botst(bord, nieuw)) return nieuw;
  }
  return null;
}

/** Waar het blok terechtkomt als je het laat vallen. */
export function landing(bord: Bord, b: Blok): Blok {
  let nu = b;
  for (let volgende = omlaag(bord, nu); volgende; volgende = omlaag(bord, nu)) nu = volgende;
  return nu;
}

/** Zet het blok vast op het bord. `boven` is waar als een vakje boven het bord uitsteekt. */
export function zetVast(bord: Bord, b: Blok): { bord: Bord; boven: boolean } {
  const nieuw = bord.map((r) => [...r]);
  let boven = false;
  for (const { x, y } of cellen(b)) {
    if (y < 0) boven = true;
    else {
      const rij = nieuw[y];
      if (rij) rij[x] = { soort: b.post.soort, nr: b.nr };
    }
  }
  return { bord: nieuw, boven };
}

/** De rijen die helemaal vol zijn. */
export const volleRijen = (bord: Bord): number[] =>
  bord.flatMap((r, i) => (r.every((c) => c != null) ? [i] : []));

/** Haalt de volle rijen weg; wat erboven ligt, zakt. */
export function wisRijen(bord: Bord): { bord: Bord; rijen: number[] } {
  const rijen = volleRijen(bord);
  if (!rijen.length) return { bord, rijen };
  const over = bord.filter((_, i) => !rijen.includes(i));
  const leeg = Array.from({ length: rijen.length }, () =>
    Array.from({ length: BREED }, (): Cel => null),
  );
  return { bord: [...leeg, ...over], rijen };
}

export const puntenVoorRijen = (aantal: number, level: number): number =>
  (RIJ_PUNTEN[Math.min(4, aantal)] ?? 0) * level;

/** Het level: elke 4 rijen, of (met de klok) elke 30 seconden, een level hoger. */
export const levelVoor = (rijen: number, seconden = 0): number =>
  1 + Math.max(Math.floor(rijen / RIJEN_PER_LEVEL), Math.floor(seconden / SECONDEN_PER_LEVEL));

/** Zo lang (ms) doet een blok over een vakje omlaag: sneller bij een hoger level. */
export const valTijd = (level: number): number =>
  Math.max(110, Math.round(800 * 0.78 ** (level - 1)));

/** Mag je deze post schrappen? Alleen een eigen keuze; wat moet van de wet niet. */
export const magSchrappen = (p: TetrisPost): boolean => p.soort === 'keuze';

/** De posten die als blok kunnen vallen: alleen met een duidelijke soort (wet of keuze). */
export function tetrisPosten(data: Data): TetrisPost[] {
  return bekendePosten(data).filter(
    (p): p is TetrisPost => (p.soort === 'wet' || p.soort === 'keuze') && p.bedragMln > 0,
  );
}

/** De rij blokken die gaan vallen: vormen per zak van zeven, posten steeds geschud. */
export type Komend = { vorm: VormNaam; post: TetrisPost };

export function maakRij(
  posten: readonly TetrisPost[],
  aantal: number,
  kans: () => number = Math.random,
): Komend[] {
  if (!posten.length) return [];
  const vormen: VormNaam[] = [];
  const lijst: TetrisPost[] = [];
  while (vormen.length < aantal) vormen.push(...schud(VORM_NAMEN, kans));
  while (lijst.length < aantal) lijst.push(...schud(posten, kans));
  return vormen.slice(0, aantal).map((vorm, i) => ({ vorm, post: lijst[i] as TetrisPost }));
}

/** Een nieuw blok bovenaan, in het midden. */
export function nieuwBlok(k: Komend, nr: number): Blok {
  const c = vormCellen(k.vorm, 0);
  const breedte = Math.max(...c.map((p) => p.x)) + 1;
  const boven = Math.min(...c.map((p) => p.y));
  return {
    vorm: k.vorm,
    draai: 0,
    x: Math.floor((BREED - breedte) / 2),
    y: -boven,
    post: k.post,
    nr,
  };
}

// -------------------------------------------------------------------------------------------------
// De stand van het spel, en wat er gebeurt bij elke actie
// -------------------------------------------------------------------------------------------------

export type Gebeurtenis =
  | { soort: 'rijen'; rijen: number[]; punten: number; bordVoor: Bord }
  | { soort: 'geschrapt'; post: TetrisPost; blok: Blok; punten: number }
  | { soort: 'wet'; post: TetrisPost; blok: Blok }
  | { soort: 'vol' };

export type Stand = {
  bord: Bord;
  blok: Blok | null;
  /** de blokken die nog komen */
  rij: Komend[];
  punten: number;
  rijen: number;
  /** zo veel blokken zijn er geweest (neergezet of geschrapt) */
  blokken: number;
  /** de eigen keuzes die je schrapte */
  geschrapt: TetrisPost[];
  /** de wettelijke taken die je probeerde te schrappen */
  wetPogingen: TetrisPost[];
  /** het spel is voorbij: de stapel kwam bovenaan, of alle blokken zijn geweest */
  over?: 'vol' | 'blokken';
  /** wat er bij de laatste actie gebeurde (nr telt op) */
  laatste?: { nr: number; lijst: Gebeurtenis[] };
  /** hoogstens zo veel blokken (rustige modus) */
  maxBlokken?: number;
};

export function beginStand(
  posten: readonly TetrisPost[],
  opties: { maxBlokken?: number; kans?: () => number } = {},
): Stand {
  // genoeg blokken voor het hele spel (zo snel valt er niet meer dan één per seconde)
  const rij = maakRij(posten, opties.maxBlokken ? opties.maxBlokken + 1 : 240, opties.kans);
  const [eerste, ...rest] = rij;
  return {
    bord: leegBord(),
    blok: eerste ? nieuwBlok(eerste, 1) : null,
    rij: rest,
    punten: 0,
    rijen: 0,
    blokken: 0,
    geschrapt: [],
    wetPogingen: [],
    ...(opties.maxBlokken ? { maxBlokken: opties.maxBlokken } : {}),
    ...(eerste ? {} : { over: 'vol' as const }),
  };
}

export type Actie = 'links' | 'rechts' | 'draai' | 'zak' | 'val' | 'hard' | 'schrap';

const metGebeurtenis = (s: Stand, lijst: Gebeurtenis[]): Stand =>
  lijst.length ? { ...s, laatste: { nr: (s.laatste?.nr ?? 0) + 1, lijst } } : s;

/** Het volgende blok bovenaan, of het eind van het spel. */
function volgende(s: Stand, lijst: Gebeurtenis[]): Stand {
  if (s.maxBlokken && s.blokken >= s.maxBlokken)
    return metGebeurtenis({ ...s, blok: null, over: 'blokken' }, lijst);
  const [k, ...rest] = s.rij;
  if (!k) return metGebeurtenis({ ...s, blok: null, over: 'blokken' }, lijst);
  const blok = nieuwBlok(k, s.blokken + 1);
  if (botst(s.bord, blok))
    return metGebeurtenis({ ...s, blok: null, rij: rest, over: 'vol' }, [
      ...lijst,
      { soort: 'vol' },
    ]);
  return metGebeurtenis({ ...s, blok, rij: rest }, lijst);
}

/** Zet het blok neer: rijen wissen, punten tellen, en door naar het volgende blok. */
function landt(s: Stand, blok: Blok, level: number, lijst: Gebeurtenis[], extra = 0): Stand {
  const vast = zetVast(s.bord, blok);
  const blokken = s.blokken + 1;
  if (vast.boven)
    return metGebeurtenis(
      { ...s, bord: vast.bord, blok: null, blokken, punten: s.punten + extra, over: 'vol' },
      [...lijst, { soort: 'vol' }],
    );
  const gewist = wisRijen(vast.bord);
  const punten = puntenVoorRijen(gewist.rijen.length, level);
  const nieuw: Gebeurtenis[] = [...lijst];
  if (gewist.rijen.length)
    nieuw.push({ soort: 'rijen', rijen: gewist.rijen, punten, bordVoor: vast.bord });
  return volgende(
    {
      ...s,
      bord: gewist.bord,
      blok: null,
      blokken,
      rijen: s.rijen + gewist.rijen.length,
      punten: s.punten + punten + extra,
    },
    nieuw,
  );
}

/**
 * Wat er gebeurt bij een actie. `val` is de zwaartekracht (geen punten); `zak` is het blok zelf
 * omlaag duwen (1 punt per vakje; ligt het al, dan zet je het neer). Een harde val geeft 2 punten
 * per vakje. Schrappen: een eigen keuze verdwijnt (bonuspunten, bespaard bedrag); een wettelijke
 * taak niet: dat blok valt meteen naar beneden.
 */
export function doe(s: Stand, actie: Actie, level: number): Stand {
  const b = s.blok;
  if (s.over || !b) return s;
  switch (actie) {
    case 'links':
    case 'rechts': {
      const nieuw = schuif(s.bord, b, actie === 'links' ? -1 : 1);
      return nieuw ? { ...s, blok: nieuw } : s;
    }
    case 'draai': {
      const nieuw = draai(s.bord, b);
      return nieuw ? { ...s, blok: nieuw } : s;
    }
    case 'zak':
    case 'val': {
      const nieuw = omlaag(s.bord, b);
      if (nieuw) return { ...s, blok: nieuw, punten: s.punten + (actie === 'zak' ? 1 : 0) };
      return landt(s, b, level, []);
    }
    case 'hard': {
      const doel = landing(s.bord, b);
      return landt(s, doel, level, [], 2 * (doel.y - b.y));
    }
    case 'schrap': {
      if (magSchrappen(b.post))
        return volgende(
          {
            ...s,
            blok: null,
            blokken: s.blokken + 1,
            punten: s.punten + SCHRAP_PUNTEN,
            geschrapt: [...s.geschrapt, b.post],
          },
          [{ soort: 'geschrapt', post: b.post, blok: b, punten: SCHRAP_PUNTEN }],
        );
      const doel = landing(s.bord, b);
      return landt({ ...s, wetPogingen: [...s.wetPogingen, b.post] }, doel, level, [
        { soort: 'wet', post: b.post, blok: doel },
      ]);
    }
  }
}

/** Het bedrag dat je bespaarde met schrappen (in miljoenen per jaar). */
export const bespaardMln = (s: Pick<Stand, 'geschrapt'>): number =>
  Math.round(s.geschrapt.reduce((som, p) => som + p.bedragMln, 0) * 100) / 100;

/** De score voor de uitslag: de punten, hooguit SCORE_MAX. */
export const score = (s: Pick<Stand, 'punten'>): number =>
  Math.max(0, Math.min(SCORE_MAX, Math.round(s.punten)));

/** Hoe hoog de stapel is (in rijen). */
export function stapelHoogte(bord: Bord): number {
  const i = bord.findIndex((r) => r.some((c) => c != null));
  return i < 0 ? 0 : HOOG - i;
}

/** De posten in het spel per soort, met het totale bedrag: voor de les aan het eind. */
export function verdeling(posten: readonly TetrisPost[]): {
  wet: { aantal: number; mln: number };
  keuze: { aantal: number; mln: number };
} {
  const tel = (soort: 'wet' | 'keuze') => {
    const lijst = posten.filter((p) => p.soort === soort);
    return {
      aantal: lijst.length,
      mln: Math.round(lijst.reduce((s, p) => s + p.bedragMln, 0) * 10) / 10,
    };
  };
  return { wet: tel('wet'), keuze: tel('keuze') };
}

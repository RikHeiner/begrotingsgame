/**
 * Noorderplantsoen, "Parkploeg": er gaat steeds iets kapot in het park. Een gat in het pad, een
 * kapotte lantaarn, een kapot speeltoestel, een afgebroken tak of zwerfafval. Tik erop en de
 * werkbus van de gemeente rijdt erheen. Snel repareren is goedkoop. Wacht je te lang, dan wordt
 * het erger en duurder, en nog later gebeurt er een ongeluk en komt er een klacht.
 *
 * Alle bedragen in het spel (€ 1.000, € 3.000, € 8.000 en het budget per level) zijn spelregels,
 * geen bedragen uit de begroting. Het echte bedrag voor onderhoud komt uit de begroting (post o1,
 * via bekendePosten).
 *
 * De tijd is in seconden spel-tijd. In de rustige modus loopt er geen klok: elke dag is DAG
 * seconden spel-tijd en de ploeg doet hooguit KLUSSEN_PER_DAG klussen per dag.
 */
import type { Data } from '../engine';
import { bekendePosten, type BekendePost } from './minigames';

// Het speelveld in beeldpunten (het canvas schaalt mee).
export const BREEDTE = 480;
export const HOOGTE = 360;

/** Spelregels: wat een reparatie kost, in euro. */
export const PRIJS_SNEL = 1000;
export const PRIJS_ERGER = 3000;
export const PRIJS_ONGELUK = 8000;

/** Rustige modus: een dag is zoveel seconden spel-tijd. */
export const DAG = 3;
export const KLUSSEN_PER_DAG = 2;

/** De werkbus: beeldpunten per seconde en seconden werk per klus. */
export const BUS_SNELHEID = 190;
export const WERKTIJD = 0.5;
/** De gemeentewerf, waar de bus begint (bij de ingang linksonder). */
export const WERF = { x: 34, y: 318 };
/** Zo ver van een kapot ding telt een tik nog (beeldpunten). */
export const RAAK_STRAAL = 30;

// -------------------------------------------------------------------------------------------------
// Het park: paden, vijver en de plekken waar iets kapot kan gaan
// -------------------------------------------------------------------------------------------------

export type Punt = { x: number; y: number };

/** De vijver met de fontein. */
export const VIJVER = { x: 300, y: 168, rx: 64, ry: 40 };
/** Het pad rond de vijver. */
export const RING = { x: 300, y: 168, rx: 98, ry: 66 };

type Bocht = [Punt, Punt, Punt, Punt];

/** Kronkelende paden: elk een bocht (kubische bézier) van de rand naar het pad rond de vijver. */
const PAD_WERF: Bocht = [
  { x: -12, y: 330 },
  { x: 90, y: 332 },
  { x: 110, y: 180 },
  { x: 202, y: 168 },
];
const PAD_BOVEN: Bocht = [
  { x: 58, y: -12 },
  { x: 70, y: 92 },
  { x: 220, y: 56 },
  { x: 300, y: 102 },
];
const PAD_SPEELTUIN: Bocht = [
  { x: 398, y: 168 },
  { x: 452, y: 168 },
  { x: 436, y: 262 },
  { x: 492, y: 262 },
];
const PAD_ONDER: Bocht = [
  { x: 300, y: 234 },
  { x: 288, y: 292 },
  { x: 362, y: 308 },
  { x: 338, y: 372 },
];
export const PADEN: Bocht[] = [PAD_WERF, PAD_BOVEN, PAD_SPEELTUIN, PAD_ONDER];

export function opBocht(b: Readonly<Bocht>, t: number): Punt {
  const u = 1 - t;
  const [a, c, d, e] = b;
  return {
    x: u * u * u * a.x + 3 * u * u * t * c.x + 3 * u * t * t * d.x + t * t * t * e.x,
    y: u * u * u * a.y + 3 * u * u * t * c.y + 3 * u * t * t * d.y + t * t * t * e.y,
  };
}

/** Een punt op het pad rond de vijver (hoek in graden, 0 is rechts, met de klok mee). */
export function opRing(hoek: number): Punt {
  const r = (hoek * Math.PI) / 180;
  return { x: RING.x + Math.cos(r) * RING.rx, y: RING.y + Math.sin(r) * RING.ry };
}

/** De speeltuin, rechtsonder. */
export const SPEELTUIN = { x: 428, y: 322, b: 92, h: 62 };

export type Soort = 'gat' | 'lamp' | 'speel' | 'tak' | 'afval';

export type Plek = { id: string; soort: Soort; x: number; y: number };

const naast = (p: Punt, dx: number, dy: number): Punt => ({ x: p.x + dx, y: p.y + dy });
const plek = (id: string, soort: Soort, p: Punt): Plek => ({
  id,
  soort,
  x: Math.round(p.x),
  y: Math.round(p.y),
});

/** Waar een lantaarn staat (ook als hij heel is). */
export const LANTAARNS: Punt[] = [
  naast(opBocht(PAD_WERF, 0.42), 14, 6),
  naast(opBocht(PAD_BOVEN, 0.45), -2, 14),
  naast(opRing(-60), 12, -8),
  naast(opRing(150), -12, 10),
  naast(opBocht(PAD_SPEELTUIN, 0.62), -14, 4),
  naast(opBocht(PAD_ONDER, 0.55), -14, 2),
];

/** Waar een bankje staat; zwerfafval ligt vaak bij een bankje. */
export const BANKJES: { p: Punt; hoek: number }[] = [
  { p: naast(opRing(-100), 0, -14), hoek: 0 },
  { p: naast(opRing(30), 14, 8), hoek: 1.0 },
  { p: naast(opRing(200), -16, 0), hoek: -1.3 },
  { p: naast(opBocht(PAD_ONDER, 0.3), 16, 0), hoek: 1.5 },
];

/** Grote bomen: plek en grootte. */
export const BOMEN: { p: Punt; r: number }[] = [
  { p: { x: 22, y: 34 }, r: 30 },
  { p: { x: 128, y: 120 }, r: 27 },
  { p: { x: 34, y: 168 }, r: 28 },
  { p: { x: 168, y: 18 }, r: 24 },
  { p: { x: 426, y: 54 }, r: 32 },
  { p: { x: 460, y: 138 }, r: 22 },
  { p: { x: 196, y: 312 }, r: 28 },
  { p: { x: 116, y: 344 }, r: 20 },
  { p: { x: 352, y: 22 }, r: 22 },
  { p: { x: 250, y: 352 }, r: 18 },
];

/** Alle plekken waar iets kapot kan gaan. */
export const PLEKKEN: Plek[] = [
  // gaten in de paden
  plek('gat-1', 'gat', opBocht(PAD_WERF, 0.22)),
  plek('gat-2', 'gat', opBocht(PAD_WERF, 0.66)),
  plek('gat-3', 'gat', opBocht(PAD_BOVEN, 0.25)),
  plek('gat-4', 'gat', opBocht(PAD_BOVEN, 0.7)),
  plek('gat-5', 'gat', opRing(15)),
  plek('gat-6', 'gat', opRing(125)),
  plek('gat-7', 'gat', opBocht(PAD_SPEELTUIN, 0.45)),
  plek('gat-8', 'gat', opBocht(PAD_ONDER, 0.75)),
  plek('gat-9', 'gat', opRing(-130)),
  // lantaarns
  ...LANTAARNS.map((p, i) => plek(`lamp-${i + 1}`, 'lamp', p)),
  // speeltuin
  plek('speel-1', 'speel', { x: SPEELTUIN.x - 24, y: SPEELTUIN.y - 4 }),
  plek('speel-2', 'speel', { x: SPEELTUIN.x + 24, y: SPEELTUIN.y + 2 }),
  // takken bij de grote bomen
  plek('tak-1', 'tak', { x: 140, y: 150 }),
  plek('tak-2', 'tak', { x: 48, y: 200 }),
  plek('tak-3', 'tak', { x: 410, y: 92 }),
  plek('tak-4', 'tak', { x: 214, y: 280 }),
  plek('tak-5', 'tak', { x: 40, y: 70 }),
  // zwerfafval bij de bankjes
  ...BANKJES.map((b, i) => plek(`afval-${i + 1}`, 'afval', naast(b.p, 16, 10))),
];

/** Namen en wat er gebeurt, per soort. */
export const SOORTEN: Record<
  Soort,
  { naam: string; erger: string; ongeluk: string; klacht: string; icoon: string }
> = {
  gat: {
    naam: 'Gat in het pad',
    erger: 'Groot gat in het pad',
    ongeluk: 'Een fietser valt in het gat.',
    klacht: 'Mijn fiets is kapot door dat gat!',
    icoon: '🕳️',
  },
  lamp: {
    naam: 'Kapotte lantaarn',
    erger: 'Lantaarn al weken uit',
    ongeluk: 'Een wandelaar struikelt in het donker.',
    klacht: "'s Avonds durf ik niet meer door het park.",
    icoon: '💡',
  },
  speel: {
    naam: 'Kapot speeltoestel',
    erger: 'Speeltoestel roestig en onveilig',
    ongeluk: 'Een kind valt van het speeltoestel.',
    klacht: 'Mijn kind is gewond geraakt!',
    icoon: '🛝',
  },
  tak: {
    naam: 'Afgebroken tak',
    erger: 'Boom hangt scheef',
    ongeluk: 'Een tak valt op een fietser.',
    klacht: 'Er viel bijna een tak op mijn hoofd!',
    icoon: '🌳',
  },
  afval: {
    naam: 'Zwerfafval',
    erger: 'Bergen afval, er komen ratten',
    ongeluk: 'Ratten bij de bankjes.',
    klacht: 'Het park is een vuilnisbelt!',
    icoon: '🗑️',
  },
};

// -------------------------------------------------------------------------------------------------
// Levels
// -------------------------------------------------------------------------------------------------

export type LevelRegels = {
  nr: number;
  naam: string;
  uitleg: string;
  /** seconden spel-tijd */
  tijd: number;
  /** onderhoudsbudget in euro (spelregel) */
  budget: number;
  /** gemiddeld zoveel seconden tussen twee dingen die kapot gaan */
  breukElke: number;
  soorten: Soort[];
  /** na zoveel seconden wordt het erger */
  ergerNa: number;
  /** na zoveel seconden gebeurt er een ongeluk */
  ongelukNa: number;
};

export const LEVELS: LevelRegels[] = [
  {
    nr: 1,
    naam: 'Lente',
    uitleg: 'Gaten, lantaarns en afval.',
    tijd: 30,
    budget: 13_000,
    breukElke: 3,
    soorten: ['gat', 'lamp', 'afval'],
    ergerNa: 6,
    ongelukNa: 12,
  },
  {
    nr: 2,
    naam: 'Zomer',
    uitleg: 'Het is druk in het park. Ook de speeltuin gaat kapot.',
    tijd: 30,
    budget: 17_000,
    breukElke: 2.2,
    soorten: ['gat', 'lamp', 'afval', 'speel'],
    ergerNa: 5.5,
    ongelukNa: 11,
  },
  {
    nr: 3,
    naam: 'Herfststorm',
    uitleg: 'Storm: er breken ook takken af.',
    tijd: 30,
    budget: 23_000,
    breukElke: 1.8,
    soorten: ['gat', 'lamp', 'afval', 'speel', 'tak'],
    ergerNa: 5,
    ongelukNa: 10,
  },
];

export const level = (nr: number): LevelRegels => LEVELS[nr - 1] ?? (LEVELS[0] as LevelRegels);

/** Aantal dagen in een level in de rustige modus. */
export const dagen = (l: LevelRegels): number => Math.ceil(l.tijd / DAG);

// -------------------------------------------------------------------------------------------------
// Het park in een level
// -------------------------------------------------------------------------------------------------

export type Schade = { id: string; plek: Plek; sinds: number };
export type Fase = 'nieuw' | 'erger';

export type Reparatie = { soort: Soort; plek: string; fase: Fase; prijs: number; t: number };
export type Ongeluk = { soort: Soort; plek: string; t: number };

export type Park = {
  /** spel-tijd in seconden */
  t: number;
  volgendeBreuk: number;
  schades: Schade[];
  reparaties: Reparatie[];
  ongelukken: Ongeluk[];
  uitgegeven: number;
  teller: number;
};

export type Gebeurtenis = { soort: 'kapot' | 'ongeluk'; schade: Schade; t: number };

export function nieuwPark(): Park {
  return {
    t: 0,
    volgendeBreuk: 0.4,
    schades: [],
    reparaties: [],
    ongelukken: [],
    uitgegeven: 0,
    teller: 0,
  };
}

/** Hoe erg het is: nieuw (goedkoop) of erger (duur). */
export const fase = (s: Schade, t: number, l: LevelRegels): Fase =>
  t - s.sinds >= l.ergerNa ? 'erger' : 'nieuw';

/** Hoe ver het is op weg naar een ongeluk (0 tot 1). */
export const voortgang = (s: Schade, t: number, l: LevelRegels): number =>
  Math.max(0, Math.min(1, (t - s.sinds) / l.ongelukNa));

/** Wat het kost om het nu te repareren. */
export const prijsNu = (s: Schade, t: number, l: LevelRegels): number =>
  fase(s, t, l) === 'nieuw' ? PRIJS_SNEL : PRIJS_ERGER;

/** De naam zoals het er nu bij ligt. */
export const naamNu = (s: Schade, t: number, l: LevelRegels): string =>
  fase(s, t, l) === 'nieuw' ? SOORTEN[s.plek.soort].naam : SOORTEN[s.plek.soort].erger;

/**
 * Laat de tijd lopen tot `tot`: er gaan dingen kapot en wat te lang kapot is, geeft een ongeluk
 * (de gemeente moet het dan meteen duur repareren). Geeft het nieuwe park en wat er gebeurde.
 */
export function stap(
  park: Park,
  l: LevelRegels,
  tot: number,
  kans: () => number = Math.random,
): { park: Park; gebeurd: Gebeurtenis[] } {
  if (tot <= park.t) return { park, gebeurd: [] };
  const gebeurd: Gebeurtenis[] = [];
  let schades = park.schades;
  let { volgendeBreuk, teller } = park;
  while (volgendeBreuk <= tot && volgendeBreuk < l.tijd) {
    const bezet = new Set(schades.map((s) => s.plek.id));
    const vrij = PLEKKEN.filter((p) => l.soorten.includes(p.soort) && !bezet.has(p.id));
    const p = vrij[Math.floor(kans() * vrij.length)];
    if (p) {
      teller++;
      const s: Schade = { id: `s${teller}`, plek: p, sinds: volgendeBreuk };
      schades = [...schades, s];
      gebeurd.push({ soort: 'kapot', schade: s, t: volgendeBreuk });
    }
    volgendeBreuk += l.breukElke * (0.7 + kans() * 0.6);
  }
  let { uitgegeven, ongelukken } = park;
  const blijft: Schade[] = [];
  for (const s of schades) {
    const t = s.sinds + l.ongelukNa;
    if (t <= tot) {
      uitgegeven += PRIJS_ONGELUK;
      ongelukken = [...ongelukken, { soort: s.plek.soort, plek: s.plek.id, t }];
      gebeurd.push({ soort: 'ongeluk', schade: s, t });
    } else blijft.push(s);
  }
  gebeurd.sort((a, b) => a.t - b.t);
  return {
    park: { ...park, t: tot, volgendeBreuk, schades: blijft, uitgegeven, ongelukken, teller },
    gebeurd,
  };
}

/** Repareer een schade nu. Geeft undefined als hij er niet (meer) is. */
export function repareer(
  park: Park,
  l: LevelRegels,
  id: string,
): { park: Park; reparatie: Reparatie } | undefined {
  const s = park.schades.find((x) => x.id === id);
  if (!s) return undefined;
  const reparatie: Reparatie = {
    soort: s.plek.soort,
    plek: s.plek.id,
    fase: fase(s, park.t, l),
    prijs: prijsNu(s, park.t, l),
    t: park.t,
  };
  return {
    park: {
      ...park,
      schades: park.schades.filter((x) => x.id !== id),
      reparaties: [...park.reparaties, reparatie],
      uitgegeven: park.uitgegeven + reparatie.prijs,
    },
    reparatie,
  };
}

/** De schade die het dichtst bij een tik ligt (binnen RAAK_STRAAL). */
export function raak(schades: readonly Schade[], x: number, y: number): Schade | undefined {
  let beste: Schade | undefined;
  let afstand = RAAK_STRAAL;
  for (const s of schades) {
    const d = Math.hypot(s.plek.x - x, s.plek.y - y);
    if (d <= afstand) {
      beste = s;
      afstand = d;
    }
  }
  return beste;
}

// -------------------------------------------------------------------------------------------------
// De werkbus (alleen als de klok loopt)
// -------------------------------------------------------------------------------------------------

export type Bus = {
  x: number;
  y: number;
  /** de kijkrichting in radialen */
  hoek: number;
  /** de klussen op volgorde (id's van schades) */
  rij: string[];
  /** seconden werk die nog over zijn */
  werk: number;
  /** waar hij nu werkt */
  bij?: Punt;
};

export const nieuweBus = (): Bus => ({ x: WERF.x, y: WERF.y, hoek: 0, rij: [], werk: 0 });

/** Waar de bus stopt bij een schade: net eronder, binnen het veld. */
export const stopPlek = (p: Punt): Punt => ({
  x: Math.max(16, Math.min(BREEDTE - 16, p.x)),
  y: Math.max(16, Math.min(HOOGTE - 12, p.y + 20)),
});

/**
 * Een stukje tijd voor de bus: werken, of rijden naar de eerste klus en daar repareren. De prijs
 * hangt af van hoe erg het is als de bus er is.
 */
export function busStap(
  bus: Bus,
  park: Park,
  l: LevelRegels,
  dt: number,
): { bus: Bus; park: Park; reparatie?: Reparatie } {
  if (bus.werk > 0) {
    const werk = Math.max(0, bus.werk - dt);
    return { bus: { ...bus, werk, ...(werk > 0 ? {} : { bij: undefined }) }, park };
  }
  const rij = bus.rij.filter((id) => park.schades.some((s) => s.id === id));
  const doel = park.schades.find((s) => s.id === rij[0]);
  if (!doel) return { bus: rij.length === bus.rij.length ? bus : { ...bus, rij }, park };
  const stop = stopPlek(doel.plek);
  const dx = stop.x - bus.x;
  const dy = stop.y - bus.y;
  const d = Math.hypot(dx, dy);
  const stuk = BUS_SNELHEID * dt;
  if (d > stuk) {
    return {
      bus: {
        ...bus,
        rij,
        x: bus.x + (dx / d) * stuk,
        y: bus.y + (dy / d) * stuk,
        hoek: Math.atan2(dy, dx),
      },
      park,
    };
  }
  const r = repareer(park, l, doel.id);
  if (!r) return { bus: { ...bus, rij }, park };
  return {
    bus: {
      ...bus,
      x: stop.x,
      y: stop.y,
      rij: rij.slice(1),
      werk: WERKTIJD,
      bij: { x: doel.plek.x, y: doel.plek.y },
    },
    park: r.park,
    reparatie: r.reparatie,
  };
}

// -------------------------------------------------------------------------------------------------
// De rekening van een level
// -------------------------------------------------------------------------------------------------

export type Rekening = {
  snel: number;
  laat: number;
  ongelukken: number;
  /** nog kapot aan het eind: dat schuif je door, voor de prijs van nu */
  nogKapot: number;
  /** daarvan al erger */
  nogKapotErger: number;
  /** wat je uitgaf, plus wat je doorschuift */
  totaal: number;
  budget: number;
  binnenBudget: boolean;
  /** wat uitstel extra kostte, vergeleken met alles meteen repareren */
  extra: number;
  /** keer te laat: erger gerepareerd, ongeluk of nog kapot */
  teLaat: number;
  sterren: number;
  /** waarvoor je de sterren kreeg */
  redenen: { budget: boolean; veilig: boolean; snel: boolean };
};

/** Zo vaak mag je te laat zijn voor de derde ster (spelregel). */
export const TE_LAAT_VOOR_STER = 2;

export function rekening(park: Park, l: LevelRegels): Rekening {
  const snel = park.reparaties.filter((r) => r.fase === 'nieuw').length;
  const laat = park.reparaties.length - snel;
  const ongelukken = park.ongelukken.length;
  const nogKapot = park.schades.length;
  const nogKapotErger = park.schades.filter((s) => fase(s, park.t, l) === 'erger').length;
  const totaal = park.uitgegeven + park.schades.reduce((som, s) => som + prijsNu(s, park.t, l), 0);
  const aantal = snel + laat + ongelukken + nogKapot;
  const extra = totaal - aantal * PRIJS_SNEL;
  const teLaat = laat + ongelukken + nogKapotErger;
  const redenen = {
    budget: totaal <= l.budget,
    veilig: ongelukken === 0,
    snel: teLaat <= TE_LAAT_VOOR_STER,
  };
  return {
    snel,
    laat,
    ongelukken,
    nogKapot,
    nogKapotErger,
    totaal,
    budget: l.budget,
    binnenBudget: redenen.budget,
    extra,
    teLaat,
    sterren: Number(redenen.budget) + Number(redenen.veilig) + Number(redenen.snel),
    redenen,
  };
}

// -------------------------------------------------------------------------------------------------
// De echte post uit de begroting
// -------------------------------------------------------------------------------------------------

export const ONDERHOUD = 'o1';

/** De post voor onderhoud van straten, groen en speeltuinen, met het bedrag uit de begroting. */
export const onderhoudsPost = (data: Data): BekendePost | undefined =>
  bekendePosten(data).find((p) => p.id === ONDERHOUD);

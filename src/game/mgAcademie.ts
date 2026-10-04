/**
 * Academiegebouw: "Rondkomen met z'n tweeën". Twee jonge mensen huren samen een huis in de
 * gemeente Groningen. Een maand van vier weken: elke week komen er keuzekaarten langs
 * (boodschappen, uit eten, een kapotte fiets, een verjaardag). Eén kaart is de aanslag van de
 * gemeente: de afvalstoffenheffing voor twee personen. Doel: de maand rondkomen, iets sparen en
 * ook een beetje plezier houden.
 *
 * De afvalstoffenheffing komt uit de tarieven van het actieve jaar (`data.tarieven`). Het inkomen,
 * de huur en alle andere kosten zijn voorbeeldbedragen (geen data van de gemeente). Punten,
 * spaardoel en plezier zijn spelregels.
 */
import type { Data } from '../engine';

// -------------------------------------------------------------------------------------------------
// Voorbeeldbedragen (⚠︎ geen data van de gemeente)
// -------------------------------------------------------------------------------------------------

/** Voorbeeld: het inkomen van het huishouden per maand, netto, samen. */
export const INKOMEN = 2400;

/** Voorbeeld: de vaste lasten per maand, die gaan er aan het begin van de maand meteen af. */
export const VASTE_LASTEN = [
  { naam: 'Huur', euro: 1050 },
  { naam: 'Zorgverzekering (2 personen)', euro: 300 },
  { naam: 'Internet en telefoon', euro: 65 },
  { naam: 'Verzekeringen en abonnementen', euro: 60 },
] as const;

export const VASTE_LASTEN_TOTAAL = VASTE_LASTEN.reduce((s, v) => s + v.euro, 0);

/** Wat er na de vaste lasten in de spaarpot zit, aan het begin van de maand. */
export const BEGIN_SALDO = INKOMEN - VASTE_LASTEN_TOTAAL;

// -------------------------------------------------------------------------------------------------
// Spelregels
// -------------------------------------------------------------------------------------------------

/** Spelregel: zoveel willen jullie aan het eind van de maand overhouden. */
export const SPAARDOEL = 200;
/** Spelregel: plezier loopt van 0 tot 100 en begint hier. */
export const PLEZIER_BEGIN = 50;
/** Spelregel: met zoveel plezier is de maand ook leuk geweest. */
export const PLEZIER_DOEL = 60;
/** Spelregel: onder dit plezier krijg je voor plezier geen punten. */
export const PLEZIER_ONDER = 30;
/** Spelregel: seconden om te kiezen, per week (de weken gaan steeds sneller). */
export const TIJD_PER_WEEK = [15, 13, 11, 9] as const;
export const WEKEN = 4;
/** Spelregel: de hoogste score. */
export const MAX_SCORE = 100;

// -------------------------------------------------------------------------------------------------
// De afvalstoffenheffing (echte tarieven)
// -------------------------------------------------------------------------------------------------

export type Heffing = {
  /** het jaar van de tarieven */
  jaar: number;
  /** twee personen, per jaar en per maand (jaar gedeeld door 12) */
  perJaar: number;
  perMaand: number;
  eenPersoon: number;
  drieOfMeer: number;
  /** rioolheffing voor eigenaren, per jaar (huurders betalen die niet zelf) */
  rioolEigenaar: number;
  kwijtschelding: string;
  bron: string;
  bronUrl: string;
};

/** De afvalstoffenheffing uit de tarieven; zonder tarieven is er geen heffing. */
export function heffing(data: Data): Heffing | undefined {
  const t = data.tarieven;
  if (!t) return undefined;
  const a = t.afvalstoffenheffing;
  return {
    jaar: t.begrotingsjaar,
    perJaar: a.twee_personen,
    perMaand: perMaand(a.twee_personen),
    eenPersoon: a.een_persoon,
    drieOfMeer: a.drie_of_meer,
    rioolEigenaar: t.rioolheffing_eigenaar,
    kwijtschelding: t.kwijtschelding?.toelichting ?? '',
    bron: t.bron,
    bronUrl: t.bron_url,
  };
}

/** Een bedrag per jaar per maand, op centen afgerond. */
export const perMaand = (perJaar: number): number => Math.round((perJaar / 12) * 100) / 100;

/** Euro's in Nederlandse notatie: hele euro's zonder centen, anders met. */
export function euro(x: number, opties: { teken?: boolean } = {}): string {
  const afgerond = Math.round(x * 100) / 100;
  const heel = Number.isInteger(afgerond);
  const tekst = Math.abs(afgerond).toLocaleString('nl-NL', {
    minimumFractionDigits: heel ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const voor = afgerond < 0 ? '− ' : afgerond > 0 && opties.teken ? '+ ' : '';
  return `${voor}€ ${tekst}`;
}

// -------------------------------------------------------------------------------------------------
// De keuzekaarten
// -------------------------------------------------------------------------------------------------

export type Soort =
  | 'boodschappen'
  | 'energie'
  | 'aanslag'
  | 'uit'
  | 'fiets'
  | 'wasmachine'
  | 'verjaardag'
  | 'weekend';

export type Keuze = {
  tekst: string;
  /** wat het kost, in euro (voorbeeld) */
  euro: number;
  /** wat het met het plezier doet (spelregel) */
  plezier: number;
  /** wat er gebeurt, voor de melding */
  gevolg: string;
};

export type Kaart = {
  id: string;
  soort: Soort;
  week: number;
  titel: string;
  tekst: string;
  keuzes: Keuze[];
  /** deze keuze maken jullie als de tijd op is: meestal de makkelijke, en die is duur */
  standaard: number;
  /** seconden om te kiezen */
  tijd: number;
  /** het geld gaat naar de gemeente */
  gemeente?: boolean;
};

type Sjabloon = Omit<Kaart, 'id' | 'week' | 'tijd'>;

const BOODSCHAPPEN: Record<number, Keuze[]> = {
  1: [
    {
      tekst: 'Huismerk en aanbiedingen',
      euro: 85,
      plezier: -3,
      gevolg: 'Zuinig. Het smaakt prima, maar het is wel saai.',
    },
    { tekst: 'Wat we lekker vinden', euro: 130, plezier: 3, gevolg: 'Lekker gegeten deze week.' },
    {
      tekst: 'Laten bezorgen',
      euro: 165,
      plezier: 5,
      gevolg: 'Makkelijk, maar je betaalt ook voor het bezorgen.',
    },
  ],
  2: [
    {
      tekst: 'Weekmenu en een lijstje',
      euro: 90,
      plezier: -1,
      gevolg: 'Met een lijstje koop je alleen wat je nodig hebt.',
    },
    {
      tekst: 'Zonder lijstje',
      euro: 130,
      plezier: 2,
      gevolg: 'Hier en daar iets extra in het mandje.',
    },
    {
      tekst: 'Steeds even tussendoor',
      euro: 155,
      plezier: 3,
      gevolg: 'Elke dag naar de winkel: elke keer net iets meer.',
    },
  ],
  3: [
    {
      tekst: 'Huismerk en aanbiedingen',
      euro: 95,
      plezier: -2,
      gevolg: 'Zuinig, en de koelkast is toch vol.',
    },
    {
      tekst: 'Wat we lekker vinden',
      euro: 140,
      plezier: 2,
      gevolg: 'Lekker, en een beetje duurder dan vorige week.',
    },
    { tekst: 'Laten bezorgen', euro: 170, plezier: 4, gevolg: 'Makkelijk, maar duur.' },
  ],
  4: [
    {
      tekst: 'Restjes opmaken',
      euro: 70,
      plezier: -3,
      gevolg: 'Niets weggegooid. Wel drie keer rijst deze week.',
    },
    { tekst: 'Gewone boodschappen', euro: 130, plezier: 2, gevolg: 'Een gewone week.' },
    { tekst: 'Laten bezorgen', euro: 165, plezier: 4, gevolg: 'Makkelijk, maar duur.' },
  ],
};

const boodschappen = (week: number): Sjabloon => ({
  soort: 'boodschappen',
  titel: 'Boodschappen voor de week',
  tekst: 'De koelkast is leeg. Hoe doen jullie de boodschappen?',
  keuzes: BOODSCHAPPEN[week] ?? BOODSCHAPPEN[1] ?? [],
  standaard: 2,
});

const ENERGIE: Sjabloon = {
  soort: 'energie',
  titel: 'De energierekening',
  tekst: 'Het energiebedrijf schrijft jullie maandbedrag af: € 150. Kan het zuiniger?',
  keuzes: [
    { tekst: 'Zo laten', euro: 150, plezier: 0, gevolg: 'Het voorschot is betaald.' },
    {
      tekst: 'Verwarming lager, korter douchen',
      euro: 125,
      plezier: -2,
      gevolg: 'Een trui aan en € 25 bespaard.',
    },
    {
      tekst: 'Voorschot verlagen naar € 100',
      euro: 100,
      plezier: -5,
      gevolg:
        'Nu minder, maar aan het eind van het jaar komt er misschien een flinke rekening. Dat geeft zorgen.',
    },
  ],
  standaard: 0,
};

const UIT: Sjabloon = {
  soort: 'uit',
  titel: 'Zaterdagavond',
  tekst: 'Het is weekend. Wat gaan jullie eten?',
  keuzes: [
    {
      tekst: 'Uit eten in de binnenstad',
      euro: 75,
      plezier: 12,
      gevolg: 'Een heerlijke avond in de binnenstad.',
    },
    {
      tekst: 'Samen thuis koken',
      euro: 20,
      plezier: 5,
      gevolg: 'Samen gekookt. Gezellig en goedkoop.',
    },
    { tekst: 'Pizza laten bezorgen', euro: 35, plezier: 7, gevolg: 'Pizza op de bank.' },
  ],
  standaard: 2,
};

const FIETS: Sjabloon = {
  soort: 'fiets',
  titel: 'Lekke band',
  tekst: 'Eén fiets heeft een lekke band. Zonder fiets kom je niet op je werk.',
  keuzes: [
    { tekst: 'Zelf plakken', euro: 8, plezier: -2, gevolg: 'Zwarte handen, maar hij rijdt weer.' },
    {
      tekst: 'Naar de fietsenmaker',
      euro: 35,
      plezier: 1,
      gevolg: 'Snel gemaakt door de fietsenmaker.',
    },
    {
      tekst: 'Tweedehands fiets kopen',
      euro: 175,
      plezier: 6,
      gevolg: 'Een mooie fiets, maar een flinke hap uit de spaarpot.',
    },
  ],
  standaard: 1,
};

const WASMACHINE: Sjabloon = {
  soort: 'wasmachine',
  titel: 'De wasmachine lekt',
  tekst: 'Er staat water op de vloer. De wasmachine lekt.',
  keuzes: [
    {
      tekst: 'Zelf maken met een filmpje',
      euro: 15,
      plezier: -3,
      gevolg: 'Een nieuw slangetje erin. Het duurde een hele avond.',
    },
    {
      tekst: 'Een monteur laten komen',
      euro: 95,
      plezier: 1,
      gevolg: 'De monteur maakte hem in een half uur.',
    },
    {
      tekst: 'Een nieuwe kopen',
      euro: 450,
      plezier: 5,
      gevolg: 'Een mooie nieuwe machine, maar de spaarpot is bijna leeg.',
    },
  ],
  standaard: 1,
};

const VERJAARDAG: Sjabloon = {
  soort: 'verjaardag',
  titel: 'Verjaardag van een vriendin',
  tekst: 'Een goede vriendin is jarig en geeft een feestje.',
  keuzes: [
    {
      tekst: 'Zelfgemaakt cadeau',
      euro: 10,
      plezier: 4,
      gevolg: 'Ze was blij met het zelfgemaakte cadeau.',
    },
    {
      tekst: 'Cadeau en mee de stad in',
      euro: 65,
      plezier: 10,
      gevolg: 'Een groot feest, tot laat in de stad.',
    },
    { tekst: 'Niet gaan', euro: 0, plezier: -8, gevolg: 'Thuis gebleven. Jammer.' },
  ],
  standaard: 1,
};

const WEEKEND: Sjabloon = {
  soort: 'weekend',
  titel: 'Een weekend weg?',
  tekst: 'Vrienden gaan een weekend naar de Waddenkust. Gaan jullie mee?',
  keuzes: [
    {
      tekst: 'Mee op weekend',
      euro: 140,
      plezier: 14,
      gevolg: 'Uitgewaaid aan zee. Wat een weekend!',
    },
    {
      tekst: 'Een dagje wandelen in de buurt',
      euro: 10,
      plezier: 6,
      gevolg: 'Een mooie wandeling, met een thermoskan koffie.',
    },
    { tekst: 'Thuisblijven', euro: 0, plezier: -5, gevolg: 'Een stil weekend.' },
  ],
  standaard: 0,
};

/** De aanslag van de gemeente: de afvalstoffenheffing voor twee personen, per maand betaald. */
export function aanslagKaart(h: Heffing): Sjabloon {
  const maand = euro(h.perMaand);
  return {
    soort: 'aanslag',
    titel: 'De aanslag gemeentelijke belastingen',
    tekst: `Afvalstoffenheffing ${h.jaar} voor 2 personen: ${euro(h.perJaar)} per jaar, ${maand} per maand. Jullie huren, dus de OZB en de rioolheffing betaalt de verhuurder.`,
    keuzes: [
      {
        tekst: `Betalen: ${maand} per maand`,
        euro: h.perMaand,
        plezier: 0,
        gevolg: `Betaald. De vuilniswagen leegt jullie kliko. Afval ophalen kost geld: jullie deel is ${maand} per maand.`,
      },
      {
        tekst: 'Eerst kwijtschelding vragen',
        euro: h.perMaand,
        plezier: -2,
        gevolg: `Kwijtschelding is voor een inkomen rond het sociaal minimum. Jullie verdienen meer, dus jullie betalen toch ${maand} per maand.`,
      },
    ],
    standaard: 0,
    gemeente: true,
  };
}

/**
 * De maand: vier weken met elk twee kaarten, en in week 2 de aanslag van de gemeente. In week 3
 * en 4 kiest het toeval welke tegenvaller of welk uitje er langskomt.
 */
export function maakMaand(data: Data, kans: () => number = Math.random): Kaart[] {
  const h = heffing(data);
  const weken: Sjabloon[][] = [
    [boodschappen(1), ENERGIE],
    [boodschappen(2), ...(h ? [aanslagKaart(h)] : []), UIT],
    [boodschappen(3), kans() < 0.6 ? FIETS : WASMACHINE],
    [boodschappen(4), kans() < 0.5 ? VERJAARDAG : WEEKEND],
  ];
  return weken.flatMap((kaarten, w) =>
    kaarten.map((k) => ({
      ...k,
      id: `w${w + 1}-${k.soort}`,
      week: w + 1,
      tijd: TIJD_PER_WEEK[w] ?? 10,
    })),
  );
}

// -------------------------------------------------------------------------------------------------
// De stand
// -------------------------------------------------------------------------------------------------

export type Gekozen = { kaart: Kaart; keuze: Keuze; teLaat: boolean };

export type Stand = {
  /** wat er nog in de spaarpot zit */
  saldo: number;
  plezier: number;
  /** alle uitgaven deze maand: vaste lasten en keuzes */
  uitgaven: number;
  /** wat er naar de gemeente ging */
  gemeente: number;
};

export const begrens = (x: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, x));

/** De stand na een rij keuzes. */
export function stand(gekozen: readonly Gekozen[]): Stand {
  let saldo = BEGIN_SALDO;
  let plezier = PLEZIER_BEGIN;
  let uitgaven = VASTE_LASTEN_TOTAAL;
  let gemeente = 0;
  for (const g of gekozen) {
    saldo -= g.keuze.euro;
    uitgaven += g.keuze.euro;
    if (g.kaart.gemeente) gemeente += g.keuze.euro;
    plezier = begrens(plezier + g.keuze.plezier, 0, 100);
  }
  return { saldo: Math.round(saldo * 100) / 100, plezier, uitgaven, gemeente };
}

/** Welk deel van alle uitgaven naar de gemeente ging, in procent. */
export const aandeelGemeente = (s: Stand): number =>
  s.uitgaven > 0 ? (s.gemeente / s.uitgaven) * 100 : 0;

/**
 * Spelregel voor de score (van de 100): 40 als jullie rondkomen, tot 30 voor sparen (vol bij het
 * spaardoel) en tot 30 voor plezier (vol bij het plezierdoel, niets onder PLEZIER_ONDER).
 */
export function score(s: Stand): number {
  if (s.saldo < 0) return Math.round(15 * plezierDeel(s.plezier));
  const sparen = begrens(s.saldo / SPAARDOEL, 0, 1);
  return Math.round(40 + 30 * sparen + 30 * plezierDeel(s.plezier));
}

const plezierDeel = (p: number): number =>
  begrens((p - PLEZIER_ONDER) / (PLEZIER_DOEL - PLEZIER_ONDER), 0, 1);

/** Gehaald: rondgekomen, gespaard tot het doel en genoeg plezier. */
export const gelukt = (s: Stand): boolean => s.saldo >= SPAARDOEL && s.plezier >= PLEZIER_DOEL;

/** Sterren (spelregel): 1 voor rondkomen, 1 voor het spaardoel, 1 voor het plezierdoel. */
export const sterren = (s: Stand): number =>
  (s.saldo >= 0 ? 1 : 0) + (s.saldo >= SPAARDOEL ? 1 : 0) + (s.plezier >= PLEZIER_DOEL ? 1 : 0);

// -------------------------------------------------------------------------------------------------
// Wat afval de gemeente kost
// -------------------------------------------------------------------------------------------------

/** De post afvalinzameling (o3) uit de begroting: lasten en wat de heffing opbrengt. */
export function afvalPost(
  data: Data,
): { naam: string; lastenMln: number; batenMln: number; jaar: number } | undefined {
  const o = data.index.onderdelen.get('o3');
  if (!o) return undefined;
  return {
    naam: o.naam,
    lastenMln: o.lasten_mln,
    batenMln: o.gekoppelde_baten_mln,
    jaar: data.begroting.begrotingsjaar,
  };
}

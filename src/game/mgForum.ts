/**
 * Forum, "Geldtoren op het dakterras": op het dakterras van het Forum bouw je een stapel geld zo
 * hoog als jij denkt dat de gemeente per jaar aan iets uitgeeft. Bij "Raad!" groeit de echte
 * stapel ernaast. Hoe dichterbij, hoe meer sterren en punten.
 *
 * Drie levels van drie vragen: grote posten, middelgrote posten, en tot slot raad je wat een post
 * elke inwoner kost. De posten zijn de posten met een begrijpelijke naam (bekendePosten), met de
 * bedragen uit de begroting van het actieve jaar. Sterren, punten en tijd zijn spelregels.
 *
 * De hoogte van een stapel loopt logaritmisch: elke streep op de schaal (€ 1 mln, € 10 mln,
 * € 100 mln) is tien keer zoveel als de vorige. Anders zou een post van € 1 mln onzichtbaar klein
 * zijn naast de bijstand.
 */
import type { Data } from '../engine';
import { bekendePosten, inwoners, schud, type BekendePost } from './minigames';

// -------------------------------------------------------------------------------------------------
// De schaal
// -------------------------------------------------------------------------------------------------

/** Waar het bedrag in staat: miljoenen per jaar, of euro per inwoner per jaar. */
export type Eenheid = 'mln' | 'euro';

export type Schaal = {
  eenheid: Eenheid;
  /** onderkant en bovenkant van de schaal */
  min: number;
  max: number;
  /** de strepen op de schaal (ijkpunten) */
  ijk: number[];
  /** hier staat de schuif aan het begin van een vraag */
  begin: number;
};

export const SCHAAL_MLN: Schaal = {
  eenheid: 'mln',
  min: 0.5,
  max: 400,
  ijk: [1, 10, 100],
  begin: 10,
};
export const SCHAAL_EURO: Schaal = {
  eenheid: 'euro',
  min: 1,
  max: 2000,
  ijk: [1, 10, 100, 1000],
  begin: 30,
};
export const schaalVoor = (eenheid: Eenheid): Schaal =>
  eenheid === 'mln' ? SCHAAL_MLN : SCHAAL_EURO;

/** Zo veel standen heeft de schuif. Eén stand verder is ongeveer 3,5% meer. */
export const STAPPEN = 200;

/** Rond af op twee cijfers die ertoe doen (12,3 → 12; 0,456 → 0,46; 1234 → 1200). */
export function rondMooi(x: number): number {
  if (x <= 0) return 0;
  const macht = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.round(Math.round(x / macht) * macht * 1000) / 1000;
}

/** Hoe hoog een bedrag op de schaal staat: 0 is onderaan, 1 is bovenaan (logaritmisch). */
export function hoogteVan(waarde: number, schaal: Schaal): number {
  if (!(waarde > 0)) return 0;
  const lo = Math.log10(schaal.min);
  const hi = Math.log10(schaal.max);
  return Math.max(0, Math.min(1, (Math.log10(waarde) - lo) / (hi - lo)));
}

/** Het bedrag bij een hoogte op de schaal (0 tot 1), mooi afgerond. */
export function waardeBij(hoogte: number, schaal: Schaal): number {
  const lo = Math.log10(schaal.min);
  const hi = Math.log10(schaal.max);
  const t = Math.max(0, Math.min(1, hoogte));
  return rondMooi(Math.pow(10, lo + t * (hi - lo)));
}

/** Stand van de schuif (0 tot STAPPEN) naar een bedrag. */
export const stapNaarWaarde = (stap: number, schaal: Schaal): number =>
  waardeBij(stap / STAPPEN, schaal);

/** Bedrag naar de dichtstbijzijnde stand van de schuif. */
export const waardeNaarStap = (waarde: number, schaal: Schaal): number =>
  Math.round(hoogteVan(waarde, schaal) * STAPPEN);

// -------------------------------------------------------------------------------------------------
// Levels en vragen
// -------------------------------------------------------------------------------------------------

export type Groep = 'groot' | 'midden' | 'klein';

/** Groot: minstens € 30 mln. Middel: € 8 tot 30 mln. Klein: minder dan € 8 mln (spelregel). */
export function groepVan(mln: number): Groep {
  return mln >= 30 ? 'groot' : mln >= 8 ? 'midden' : 'klein';
}

export type LevelInstelling = {
  naam: string;
  uitleg: string;
  eenheid: Eenheid;
  /** seconden per vraag (niet bij minder beweging) */
  tijd: number;
};

export const LEVELS: readonly LevelInstelling[] = [
  {
    naam: 'De grote posten',
    uitleg: 'Waar gaat het meeste geld van de gemeente naartoe?',
    eenheid: 'mln',
    tijd: 25,
  },
  {
    naam: 'Middelgrote posten',
    uitleg: 'Posten van een paar miljoen tot een paar tientjes miljoen.',
    eenheid: 'mln',
    tijd: 20,
  },
  {
    naam: 'Per inwoner',
    uitleg: 'Raad wat een post elke inwoner per jaar kost.',
    eenheid: 'euro',
    tijd: 20,
  },
];

export const VRAGEN_PER_LEVEL = 3;
/** Zo veel sterren heb je nodig om naar het volgende level te gaan (spelregel). */
export const DOEL_STERREN = 3;
export const MAX_STERREN = 3;
/** Hoogstens zo veel punten voor een vraag, zonder de tijdbonus. */
export const MAX_PUNTEN = 100;
/** Zo veel punten kost het hulpje (spelregel). */
export const HULP_KOST = 20;

export type Vraag = {
  post: BekendePost;
  eenheid: Eenheid;
  /** het echte bedrag in de eenheid van de vraag (mln, of euro per inwoner) */
  echt: number;
};

/** Euro per inwoner per jaar bij een bedrag in miljoenen. */
export const perInwonerEuro = (mln: number, aantal: number): number => (mln * 1e6) / aantal;

/** Maakt een vraag voor een post in een eenheid. */
export function maakVraag(post: BekendePost, eenheid: Eenheid, aantalInwoners: number): Vraag {
  return {
    post,
    eenheid,
    echt: eenheid === 'mln' ? post.bedragMln : perInwonerEuro(post.bedragMln, aantalInwoners),
  };
}

/**
 * De vragen voor level `nr` (1, 2 of 3). Level 1: grote posten, level 2: middelgrote, level 3: per
 * inwoner, met een kleine, een middelgrote en een grote post. Posten uit `gehad` komen niet terug,
 * tenzij er anders te weinig zijn.
 */
export function vragenVoorLevel(
  posten: readonly BekendePost[],
  nr: number,
  aantalInwoners: number,
  kans: () => number = Math.random,
  gehad: ReadonlySet<string> = new Set(),
): Vraag[] {
  const instelling = LEVELS[Math.min(LEVELS.length, Math.max(1, nr)) - 1] ?? LEVELS[0];
  const eenheid = instelling?.eenheid ?? 'mln';
  const bruikbaar = posten.filter((p) => p.bedragMln > 0);
  const nieuw = (lijst: BekendePost[]) => {
    const vers = lijst.filter((p) => !gehad.has(p.id));
    return vers.length >= VRAGEN_PER_LEVEL ? vers : lijst;
  };
  const vanGroep = (g: Groep) =>
    schud(nieuw(bruikbaar.filter((p) => groepVan(p.bedragMln) === g)), kans);
  let gekozen: BekendePost[];
  if (nr <= 1) gekozen = vanGroep('groot');
  else if (nr === 2) gekozen = vanGroep('midden');
  else {
    gekozen = (['klein', 'midden', 'groot'] as const).flatMap((g) => vanGroep(g).slice(0, 1));
    gekozen = schud(gekozen, kans);
  }
  // Aanvullen als een groep te klein is (bij een andere begroting).
  for (const p of schud(nieuw(bruikbaar), kans)) {
    if (gekozen.length >= VRAGEN_PER_LEVEL) break;
    if (!gekozen.some((x) => x.id === p.id)) gekozen.push(p);
  }
  return gekozen.slice(0, VRAGEN_PER_LEVEL).map((p) => maakVraag(p, eenheid, aantalInwoners));
}

/** Alle posten en het aantal inwoners, om vragen te maken. */
export function forumBasis(data: Data): { posten: BekendePost[]; inwoners: number } {
  return { posten: bekendePosten(data), inwoners: inwoners(data) };
}

// -------------------------------------------------------------------------------------------------
// Hoe goed was je gok?
// -------------------------------------------------------------------------------------------------

/** Hoeveel keer je ernaast zat (altijd 1 of meer; 1 is precies goed). */
export function keerErnaast(gok: number, echt: number): number {
  if (!(gok > 0) || !(echt > 0)) return Infinity;
  return gok >= echt ? gok / echt : echt / gok;
}

/** Sterren: 3 als je minder dan 1,25 keer ernaast zit, 2 onder 2 keer, 1 onder 4 keer. */
export function sterrenVoor(gok: number, echt: number): number {
  const k = keerErnaast(gok, echt);
  return k <= 1.25 ? 3 : k <= 2 ? 2 : k <= 4 ? 1 : 0;
}

/**
 * Punten voor een vraag: 100 als je precies goed zit, 0 als je tien keer of meer ernaast zit. Plus
 * een punt per seconde die over is; het hulpje kost 20 punten (spelregels).
 */
export function puntenVoor(gok: number, echt: number, tijdOver = 0, hulp = false): number {
  const k = keerErnaast(gok, echt);
  const basis = Number.isFinite(k)
    ? Math.max(0, Math.round(MAX_PUNTEN - MAX_PUNTEN * Math.log10(k)))
    : 0;
  return Math.max(
    0,
    basis + (basis > 0 ? Math.max(0, Math.round(tijdOver)) : 0) - (hulp ? HULP_KOST : 0),
  );
}

/** Een korte zin over je gok: "2,1 keer te hoog". */
export function oordeel(gok: number, echt: number): string {
  const k = keerErnaast(gok, echt);
  if (k <= 1.05) return 'Bijna precies goed!';
  const keer = k.toLocaleString('nl-NL', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  return `${keer} keer te ${gok > echt ? 'hoog' : 'laag'}.`;
}

// -------------------------------------------------------------------------------------------------
// Vergelijken met een andere post uit de begroting
// -------------------------------------------------------------------------------------------------

export type Vergelijking = {
  post: BekendePost;
  /** hoeveel keer zo veel (of zo weinig): 1 is ongeveer even veel */
  keer: number;
  richting: 'meer' | 'minder' | 'even';
};

/**
 * Zoekt een andere post uit de begroting die er mooi bij past: ongeveer even veel, of een rond
 * aantal keer zo veel (2 tot 10). Geeft de best passende.
 */
export function vergelijking(
  posten: readonly BekendePost[],
  post: BekendePost,
): Vergelijking | undefined {
  let beste: (Vergelijking & { fout: number }) | undefined;
  for (const p of posten) {
    if (p.id === post.id || !(p.bedragMln > 0) || p.naam === post.naam) continue;
    const r = post.bedragMln / p.bedragMln;
    const groot = r >= 1 ? r : 1 / r;
    const keer = Math.round(groot);
    if (keer > 10) continue;
    // hoe ver zit het van een rond getal af (relatief), een beetje voorkeur voor kleine getallen
    const fout = Math.abs(Math.log(groot / keer)) + keer * 0.004;
    if (Math.abs(groot / keer - 1) > 0.12) continue;
    if (!beste || fout < beste.fout)
      beste = { post: p, keer, richting: keer === 1 ? 'even' : r >= 1 ? 'meer' : 'minder', fout };
  }
  if (!beste) return undefined;
  return { post: beste.post, keer: beste.keer, richting: beste.richting };
}

/** De vergelijking als zin, bijvoorbeeld "ongeveer 3 keer zo veel als Afval ophalen bij huizen". */
export function vergelijkTekst(v: Vergelijking): string {
  if (v.richting === 'even') return `ongeveer even veel als ${v.post.naam}`;
  if (v.richting === 'meer') return `ongeveer ${v.keer} keer zo veel als ${v.post.naam}`;
  const deel =
    v.keer === 2
      ? 'de helft'
      : v.keer === 4
        ? 'een kwart'
        : `een ${['', '', '', 'derde', '', 'vijfde', 'zesde', 'zevende', 'achtste', 'negende', 'tiende'][v.keer]}`;
  return `ongeveer ${deel} van ${v.post.naam}`;
}

/**
 * Het hulpje: een andere post als ijkpunt op de schaal. Niet te dichtbij (dan verklapt hij het
 * antwoord) en niet te ver weg: liefst 2 tot 6 keer zo veel of zo weinig.
 */
export function hulpPost(
  posten: readonly BekendePost[],
  vraag: Vraag,
  kans: () => number = Math.random,
): BekendePost | undefined {
  const anderen = posten.filter((p) => p.id !== vraag.post.id && p.bedragMln > 0);
  const k = (p: BekendePost) => keerErnaast(p.bedragMln, vraag.post.bedragMln);
  const goed = anderen.filter((p) => k(p) >= 2 && k(p) <= 6);
  if (goed.length) return schud(goed, kans)[0];
  return [...anderen].sort(
    (a, b) => Math.abs(Math.log(k(a) / 3)) - Math.abs(Math.log(k(b) / 3)),
  )[0];
}

/** Het bedrag als tekst, in de eenheid van de vraag: "€ 12 mln" of "€ 48". */
export function toonBedrag(waarde: number, eenheid: Eenheid): string {
  if (eenheid === 'euro') {
    const afgerond = waarde < 10 ? Math.round(waarde * 10) / 10 : Math.round(waarde);
    return `€ ${afgerond.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}`;
  }
  const dec = waarde < 1 ? 2 : waarde < 100 ? 1 : 0;
  return `€ ${waarde.toLocaleString('nl-NL', { maximumFractionDigits: dec })} mln`;
}

/** De hoogte van een stapel die groeit: vloeiend, met een klein beetje doorschieten. */
export function groei(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

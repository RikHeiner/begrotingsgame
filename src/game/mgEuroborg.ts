/**
 * Euroborg, "Penalty's voor de pot": elke penalty is een post van de begroting. Vóór de trap kies
 * je: schrappen (schieten) of laten staan.
 *
 * Is de post een eigen keuze van de gemeente, dan staat er een gewone keeper: scoor je, dan is de
 * post geschrapt en bespaart de gemeente geld. Moet de post van de wet, dan staat er een enorme
 * keeper in het doel met de naam van de wet op zijn shirt. Die houdt alles tegen. Laat je een post
 * van de wet staan, dan krijg je een punt.
 *
 * Spelregels (geen bedragen uit de begroting): 3 rondes van 4 penalty's, 1 punt per goal en 1 punt
 * per wettelijke taak die je laat staan. De keeper wordt elke ronde beter, het vizier sneller.
 *
 * Het doel in getallen: x van −1 (linkerpaal) tot 1 (rechterpaal), y van 0 (gras) tot 1 (lat).
 */
import { formatMln, type Data } from '../engine';
import { bekendePosten, schud, type BekendePost } from './minigames';

/** Een penalty: een post die moet van de wet, of een eigen keuze van de gemeente. */
export type Penalty = BekendePost & { soort: 'wet' | 'keuze' };

export const PER_RONDE = 4;

export type Ronde = {
  nr: number;
  naam: string;
  uitleg: string;
  /** kans dat de keeper de goede hoek kiest (anders gokt hij) */
  leest: number;
  /** hoe ver de keeper reikt vanaf zijn plek (in doelbreedtes van paal tot midden) */
  reik: number;
  /** zo lang (ms) duurt één keer heen en weer van het vizier */
  periode: number;
  /** seconden per penalty */
  tijd: number;
};

export const RONDES: readonly Ronde[] = [
  {
    nr: 1,
    naam: 'Oefenwedstrijd',
    uitleg: 'De keeper is nog stijf. Het vizier gaat rustig.',
    leest: 0.15,
    reik: 0.4,
    periode: 2600,
    tijd: 15,
  },
  {
    nr: 2,
    naam: 'Competitie',
    uitleg: 'De keeper leest je beter. Het vizier gaat sneller.',
    leest: 0.35,
    reik: 0.46,
    periode: 1900,
    tijd: 13,
  },
  {
    nr: 3,
    naam: 'Bekerfinale',
    uitleg: 'De beste keeper van de competitie. Het vizier vliegt heen en weer.',
    leest: 0.55,
    reik: 0.52,
    periode: 1400,
    tijd: 11,
  },
];

/** De posten die meedoen: alleen posten waarvan duidelijk is of ze van de wet moeten. */
export function penaltyPosten(data: Data): Penalty[] {
  return bekendePosten(data).filter(
    (p): p is Penalty => (p.soort === 'wet' && !!p.wet) || p.soort === 'keuze',
  );
}

/**
 * De penalty's per ronde: 4 per ronde, steeds 2 van de wet en 2 eigen keuzes (door elkaar), en
 * geen post twee keer. Zijn er te weinig van een soort, dan vult de andere soort aan.
 */
export function maakRondes(data: Data, kans: () => number = Math.random): Penalty[][] {
  const alle = schud(penaltyPosten(data), kans);
  const wet = alle.filter((p) => p.soort === 'wet');
  const keuze = alle.filter((p) => p.soort === 'keuze');
  return RONDES.map(() => {
    const ronde: Penalty[] = [];
    for (let i = 0; i < PER_RONDE; i++) {
      const eerst = i % 2 === 0 ? keuze : wet;
      const anders = i % 2 === 0 ? wet : keuze;
      const p = eerst.shift() ?? anders.shift();
      if (p) ronde.push(p);
    }
    return schud(ronde, kans);
  });
}

/**
 * Wat de gemeente per jaar bespaart als de post helemaal weg is: de uitgaven, min de inkomsten die
 * dan ook wegvallen (zoals kaartjes van het theater). ⚠︎ Aanname van het spel: schrappen is alles.
 */
export function besparingMln(p: BekendePost): number {
  return Math.max(0, Math.round((p.bedragMln - p.batenMln) * 10) / 10);
}

// -------------------------------------------------------------------------------------------------
// Schieten
// -------------------------------------------------------------------------------------------------

/** Waar het vizier mag komen: iets naast de palen en iets boven de lat, zodat je kunt missen. */
export const VIZIER_X = 1.2;
export const VIZIER_Y = { min: 0.05, max: 1.2 };

export type Kant = 'links' | 'midden' | 'rechts';
export const KANTEN: readonly Kant[] = ['links', 'midden', 'rechts'];

/** Het vizier zwaait heen en weer over het doel: x op tijd t (ms). */
export function vizierX(t: number, periode: number): number {
  return VIZIER_X * Math.sin((2 * Math.PI * t) / periode);
}

/** Daarna gaat het vizier op en neer: de hoogte op tijd t (ms). Begint laag. */
export function vizierY(t: number, periode: number): number {
  const midden = (VIZIER_Y.min + VIZIER_Y.max) / 2;
  const half = (VIZIER_Y.max - VIZIER_Y.min) / 2;
  return midden - half * Math.cos((2 * Math.PI * t) / (periode * 0.8));
}

/** In welke kant van het doel een schot gaat. */
export function kantVan(x: number): Kant {
  return x < -1 / 3 ? 'links' : x > 1 / 3 ? 'rechts' : 'midden';
}

/** Rustig schieten (zonder bewegend vizier): een vaste plek per kant, halfhoog. */
export function rustigSchot(kant: Kant): { x: number; y: number } {
  return { x: kant === 'links' ? -0.7 : kant === 'rechts' ? 0.7 : 0, y: 0.42 };
}

/** Waar de keeper heen duikt (het midden van zijn lijf, in x). */
export const DUIK_X: Record<Kant, number> = { links: -0.62, midden: 0, rechts: 0.62 };

/** De keeper kiest een hoek: soms leest hij de schutter, anders gokt hij. */
export function keeperKiest(x: number, ronde: Ronde, kans: () => number = Math.random): Kant {
  if (kans() < ronde.leest) return kantVan(x);
  return KANTEN[Math.min(2, Math.floor(kans() * 3))] ?? 'midden';
}

export type Uitkomst = 'goal' | 'gestopt' | 'naast' | 'over' | 'wet';

/** Houdt de keeper (die naar `duik` gaat) een schot op (x, y)? Een bal in de bovenhoek is onhoudbaar. */
export function keeperHoudt(x: number, y: number, duik: Kant, ronde: Ronde): boolean {
  if (Math.abs(x) >= 0.8 && y >= 0.7) return false;
  const hoog = duik === 'midden' ? 0.9 : 0.85;
  return Math.abs(x - DUIK_X[duik]) <= ronde.reik && y <= hoog;
}

/**
 * Een schot op (x, y). Moet de post van de wet, dan houdt de wet alles tegen. Anders: naast, over,
 * gestopt of een goal.
 */
export function schiet(
  p: Penalty,
  schot: { x: number; y: number },
  ronde: Ronde,
  kans: () => number = Math.random,
): { uitkomst: Uitkomst; duik: Kant } {
  const duik = keeperKiest(schot.x, ronde, kans);
  if (p.soort === 'wet') return { uitkomst: 'wet', duik: kantVan(schot.x) };
  if (Math.abs(schot.x) > 1) return { uitkomst: 'naast', duik };
  if (schot.y > 1) return { uitkomst: 'over', duik };
  return { uitkomst: keeperHoudt(schot.x, schot.y, duik, ronde) ? 'gestopt' : 'goal', duik };
}

// -------------------------------------------------------------------------------------------------
// Punten en uitleg
// -------------------------------------------------------------------------------------------------

export type Keuze = 'schrappen' | 'laten' | 'telaat';

export type Beurt = {
  post: Penalty;
  keuze: Keuze;
  uitkomst?: Uitkomst;
  punt: 0 | 1;
  bespaardMln: number;
};

/**
 * Wat een penalty oplevert. Spelregel: een goal is 1 punt (en de post is geschrapt); een post van de
 * wet laten staan is ook 1 punt. Een eigen keuze laten staan mag, maar geeft geen punt.
 */
export function beoordeel(post: Penalty, keuze: Keuze, uitkomst?: Uitkomst): Beurt {
  const goal = keuze === 'schrappen' && uitkomst === 'goal';
  const punt = goal || (keuze === 'laten' && post.soort === 'wet') ? 1 : 0;
  return {
    post,
    keuze,
    ...(uitkomst ? { uitkomst } : {}),
    punt,
    bespaardMln: goal ? besparingMln(post) : 0,
  };
}

const mln = (x: number) => formatMln(x * 1e6);

/** Wat de wet zegt, in één zin. */
export const wetZin = (p: Penalty): string =>
  `Dit moet van de wet (${p.wet ?? 'de wet'}). De gemeente kan wel kiezen hóéveel ze uitgeeft, maar niet stoppen.`;

/** Hoe de besparing is berekend, als er inkomsten bij de post horen. */
export function besparingUitleg(p: BekendePost): string {
  if (!(p.batenMln > 0)) return '';
  return ` (${mln(p.bedragMln)} uitgaven min ${mln(p.batenMln)} inkomsten die dan ook wegvallen)`;
}

/** De melding na een penalty: titel en uitleg. */
export function melding(b: Beurt): { titel: string; tekst: string; goed: boolean } {
  const p = b.post;
  if (b.keuze === 'telaat')
    return {
      titel: 'Te laat! De scheidsrechter fluit.',
      tekst: `${p.naam} blijft staan. Geen punt.`,
      goed: false,
    };
  if (b.keuze === 'laten')
    return p.soort === 'wet'
      ? { titel: 'Goed gezien! +1 punt', tekst: wetZin(p), goed: true }
      : {
          titel: 'Laten staan mag.',
          tekst: `${p.naam} is een eigen keuze van de gemeente. Schrappen had ${mln(besparingMln(p))} per jaar bespaard. Geen punt, maar ook geen straf.`,
          goed: false,
        };
  switch (b.uitkomst) {
    case 'wet':
      return { titel: 'Gestopt!', tekst: wetZin(p), goed: false };
    case 'goal':
      return {
        titel: `Gescoord! De gemeente bespaart ${mln(b.bespaardMln)} per jaar.`,
        tekst: `${p.naam} is een eigen keuze van de gemeente: die kun je schrappen${besparingUitleg(p)}. +1 punt`,
        goed: true,
      };
    case 'gestopt':
      return {
        titel: 'Gestopt door de keeper.',
        tekst: `Je mocht dit schrappen: het is een eigen keuze van de gemeente. Maar de bal ging er niet in.`,
        goed: false,
      };
    default:
      return {
        titel: b.uitkomst === 'over' ? 'Over de lat!' : 'Naast!',
        tekst: `Je mocht ${p.naam} schrappen: het is een eigen keuze. Maar de bal ging er niet in.`,
        goed: false,
      };
  }
}

/** Het totaal van een reeks beurten. */
export function telOp(beurten: readonly Beurt[]): {
  punten: number;
  goals: number;
  schoten: number;
  bespaardMln: number;
} {
  return {
    punten: beurten.reduce((s, b) => s + b.punt, 0),
    goals: beurten.filter((b) => b.uitkomst === 'goal').length,
    schoten: beurten.filter((b) => b.keuze === 'schrappen').length,
    bespaardMln: Math.round(beurten.reduce((s, b) => s + b.bespaardMln, 0) * 10) / 10,
  };
}

// -------------------------------------------------------------------------------------------------
// De vlucht van de bal (voor de animatie)
// -------------------------------------------------------------------------------------------------

/** Kwadratische bezier: punt op f (0..1). */
export function bezier(
  a: { x: number; y: number },
  c: { x: number; y: number },
  b: { x: number; y: number },
  f: number,
): { x: number; y: number } {
  const g = 1 - f;
  return {
    x: g * g * a.x + 2 * g * f * c.x + f * f * b.x,
    y: g * g * a.y + 2 * g * f * c.y + f * f * b.y,
  };
}

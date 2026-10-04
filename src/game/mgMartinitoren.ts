/**
 * Martinitoren: "Beklim d'Olle Grieze". Steeds twee posten met een naam die iedereen begrijpt:
 * waar gaat meer geld naartoe? Een goed antwoord brengt je klimmer een geleding hoger, een fout
 * antwoord laat hem een stukje terugglijden. De vragen worden moeilijker: eerst verschillen de
 * bedragen veel, aan het eind maar een beetje.
 *
 * Alle bedragen komen uit de begroting van het actieve jaar (via bekendePosten). De treden, de
 * tijd en de bonus zijn spelregels.
 */
import { formatEuro, type Data } from '../engine';
import { bekendePosten, schud, type BekendePost } from './minigames';

/** De Martinitoren is 97 meter hoog. */
export const TOREN_METER = 97;
/** Zoveel vragen in een spel (of minder, als je eerder boven bent). */
export const VRAGEN = 10;
/** Seconden per vraag (spelregel; niet in de rustige modus). */
export const TIJD = 10;
/** Goed binnen zoveel seconden: snelbonus (spelregel). */
export const SNEL = 5;

/**
 * De treden: op deze hoogtes (meter) begint een nieuwe geleding van de toren. Trede 0 is de
 * Grote Markt, de laatste is de top.
 */
export const TREDEN_METER = [0, 14, 28, 40, 50, 62, 74, 84, 97] as const;
export const TOP = TREDEN_METER.length - 1;

/** Spelregels: zo ver ga je omhoog of omlaag (in treden). */
export const STAP_GOED = 1;
export const STAP_BONUS = 0.5;
export const STAP_FOUT = 0.5;

/** De delen van de toren, van onder naar boven, met de hoogte waar ze beginnen. */
export const GELEDINGEN: readonly { vanaf: number; naam: string }[] = [
  { vanaf: 0, naam: 'de Grote Markt' },
  { vanaf: 3, naam: 'de stenen onderbouw' },
  { vanaf: 28, naam: 'de eerste omloop' },
  { vanaf: 48, naam: 'de wijzerplaten' },
  { vanaf: 62, naam: 'de klokkenverdieping' },
  { vanaf: 74, naam: 'de open lantaarn' },
  { vanaf: 84, naam: 'de koperen koepel' },
  { vanaf: 95, naam: 'de windvaan op de top' },
];

export type Kant = 'links' | 'rechts';

export type Paar = {
  links: BekendePost;
  rechts: BekendePost;
  /** zoveel keer is de grootste groter dan de kleinste */
  verschil: number;
};

export type Uitkomst = 'goed' | 'snel' | 'fout' | 'telaat';

export type Antwoord = {
  paar: Paar;
  /** niets gekozen: de tijd was op */
  gekozen?: Kant;
  uitkomst: Uitkomst;
  /** de treden na dit antwoord */
  treden: number;
};

/**
 * Hoe moeilijk vraag `i` is (van `aantal`): de grootste post moet zoveel keer groter zijn dan de
 * kleinste. Eerst een groot verschil, aan het eind een klein verschil.
 */
export function verschilBij(i: number, aantal = VRAGEN): { min: number; max: number } {
  const deel = aantal <= 1 ? 0 : i / (aantal - 1);
  if (deel < 0.3) return { min: 3, max: Infinity };
  if (deel < 0.7) return { min: 1.7, max: 3.5 };
  return { min: 1.25, max: 1.9 };
}

/** Zoveel keer is de ene post groter dan de andere. */
export const verhouding = (a: BekendePost, b: BekendePost): number =>
  Math.max(a.bedragMln, b.bedragMln) / Math.min(a.bedragMln, b.bedragMln);

/**
 * Maakt de paren voor een spel: elke post hooguit één keer, de bedragen verschillen minstens 1,25
 * keer (dan is er altijd een duidelijk goed antwoord), en de vragen worden moeilijker.
 */
export function maakParen(
  posten: readonly BekendePost[],
  aantal = VRAGEN,
  kans: () => number = Math.random,
): Paar[] {
  const bruikbaar = posten.filter((p) => p.bedragMln > 0);
  const gebruikt = new Set<string>();
  const paren: Paar[] = [];
  for (let i = 0; i < aantal; i++) {
    const { min, max } = verschilBij(i, aantal);
    const vrij = schud(
      bruikbaar.filter((p) => !gebruikt.has(p.id)),
      kans,
    );
    let gevonden: [BekendePost, BekendePost] | undefined;
    // eerst binnen de moeilijkheid van deze vraag, anders elk paar met een duidelijk verschil
    for (const [lo, hi] of [
      [min, max],
      [1.25, Infinity],
    ] as const) {
      for (const a of vrij) {
        const b = vrij.find(
          (x) => x.id !== a.id && verhouding(a, x) >= lo && verhouding(a, x) <= hi,
        );
        if (b) {
          gevonden = [a, b];
          break;
        }
      }
      if (gevonden) break;
    }
    if (!gevonden) break;
    const [a, b] = gevonden;
    gebruikt.add(a.id);
    gebruikt.add(b.id);
    paren.push({ links: a, rechts: b, verschil: verhouding(a, b) });
  }
  return paren;
}

/** De paren voor een spel, met de posten uit de begroting van het actieve jaar. */
export const parenUitData = (data: Data, kans: () => number = Math.random): Paar[] =>
  maakParen(bekendePosten(data), VRAGEN, kans);

/** Welke kant meer geld krijgt. */
export const juisteKant = (p: Paar): Kant =>
  p.links.bedragMln >= p.rechts.bedragMln ? 'links' : 'rechts';

/** Hoe een antwoord uitvalt; `over` is het aantal seconden dat nog over was (leeg: geen tijd). */
export function beoordeel(p: Paar, gekozen: Kant | undefined, over?: number): Uitkomst {
  if (!gekozen) return 'telaat';
  if (gekozen !== juisteKant(p)) return 'fout';
  return over !== undefined && over > TIJD - SNEL ? 'snel' : 'goed';
}

/** De treden na een antwoord: tussen 0 en de top. */
export function nieuweTreden(treden: number, uitkomst: Uitkomst): number {
  const stap =
    uitkomst === 'snel' ? STAP_GOED + STAP_BONUS : uitkomst === 'goed' ? STAP_GOED : -STAP_FOUT;
  return Math.max(0, Math.min(TOP, treden + stap));
}

/** De hoogte in meter bij een aantal treden (ook halve treden). */
export function meterBij(treden: number): number {
  const t = Math.max(0, Math.min(TOP, treden));
  const onder = Math.floor(t);
  const boven = Math.min(TOP, onder + 1);
  const a = TREDEN_METER[onder] ?? 0;
  const b = TREDEN_METER[boven] ?? TOREN_METER;
  return a + (b - a) * (t - onder);
}

/** Het deel van de toren op deze hoogte. */
export function geledingBij(meter: number): string {
  let naam = GELEDINGEN[0]?.naam ?? '';
  for (const g of GELEDINGEN) if (meter >= g.vanaf - 0.01) naam = g.naam;
  return naam;
}

/** Euro per inwoner per jaar. */
export const euroPerInwoner = (bedragMln: number, aantalInwoners: number): number =>
  Math.round((bedragMln * 1e6) / aantalInwoners);

/** Wat je leerde, uit de vragen die je kreeg. */
export function lessen(antwoorden: readonly Antwoord[], aantalInwoners: number): string[] {
  if (!antwoorden.length) return [];
  const uit: string[] = [];
  const winnaars = antwoorden.map((a) =>
    juisteKant(a.paar) === 'links' ? a.paar.links : a.paar.rechts,
  );
  const alle = antwoorden.flatMap((a) => [a.paar.links, a.paar.rechts]);
  const grootste = [...alle].sort((a, b) => b.bedragMln - a.bedragMln)[0];
  const kleinste = [...alle].sort((a, b) => a.bedragMln - b.bedragMln)[0];
  if (grootste)
    uit.push(
      `De grootste post in jouw vragen: ${grootste.naam}. Dat is ${formatEuro(
        euroPerInwoner(grootste.bedragMln, aantalInwoners),
      )} per inwoner per jaar.`,
    );
  const keer = grootste && kleinste ? Math.round(grootste.bedragMln / kleinste.bedragMln) : 0;
  if (grootste && kleinste && keer >= 2)
    uit.push(
      `${grootste.naam}: ${keer} keer zoveel geld als ‘${kleinste.naam}’. Zo groot zijn de verschillen in de begroting.`,
    );
  const wet = winnaars.filter((p) => p.soort === 'wet').length;
  if (wet)
    uit.push(
      `Van de ${winnaars.length} posten waar het meeste geld naartoe ging, moesten er ${wet} van de wet. Daar kan de gemeente weinig aan veranderen.`,
    );
  return uit;
}

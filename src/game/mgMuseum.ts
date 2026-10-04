/**
 * Groninger Museum, "Moet het of mag het?": een snel veegspel. Een kunstwerk verschijnt: een taak
 * van de gemeente. Veeg het naar links als het moet van de wet, of naar rechts als de gemeente het
 * zelf kiest. Goede antwoorden achter elkaar geven een reeks en meer punten.
 *
 * Alleen posten met een begrijpelijke naam en een duidelijke soort (spel/minigames.json) doen mee,
 * met het bedrag uit de begroting van het actieve jaar. Geen belastingen: het gaat om de vraag of
 * iets moet, niet om wat het oplevert. Ook bij een taak die moet, kiest de gemeente hoeveel geld ze
 * eraan uitgeeft.
 */
import type { Data } from '../engine';
import { bekendePosten, schud, type BekendePost } from './minigames';

export type Soort = 'wet' | 'keuze';

/** De twee kanten: links "moet van de wet", rechts "eigen keuze". */
export const KANTEN: { id: Soort; tekst: string; kort: string }[] = [
  { id: 'wet', tekst: 'Moet van de wet', kort: 'Moet van de wet' },
  { id: 'keuze', tekst: 'Eigen keuze van de gemeente', kort: 'Eigen keuze' },
];

export const tekstVan = (s: Soort): string => KANTEN.find((k) => k.id === s)?.tekst ?? '';

/** Een kunstwerk: een post met een soort, en bij 'wet' de wet. */
export type MuseumKaart = BekendePost & { soort: Soort };

/** Spelregel: drie levels, steeds meer kunstwerken in ongeveer dezelfde tijd. */
export const LEVELS = [
  { naam: 'De hal', uitleg: 'Rustig beginnen.', kaarten: 10, tijd: 45 },
  { naam: 'De gele toren', uitleg: 'Meer kunstwerken, net zoveel tijd.', kaarten: 14, tijd: 45 },
  { naam: 'De schuine zalen', uitleg: 'Nog meer kunstwerken, minder tijd.', kaarten: 18, tijd: 40 },
] as const;

/** Rustige modus: geen klok en geen levels, maar vaste beurten. */
export const STIL_KAARTEN = 12;
/** Spelregel: zoveel seconden kost een fout antwoord. */
export const FOUT_STRAF = 3;
/** Spelregel: zoveel deel van de kunstwerken goed om een level te halen. */
export const GEHAALD_DEEL = 0.7;
/** Spelregel: de reeks telt tot zo hoog mee voor de punten. */
export const MAX_REEKS = 5;

/** Alle posten die mee kunnen doen: met een soort, en bij 'wet' met de wet erbij. */
export function museumPosten(data: Data): MuseumKaart[] {
  return bekendePosten(data).filter(
    (p): p is MuseumKaart =>
      (p.soort === 'keuze' || (p.soort === 'wet' && !!p.wet)) && p.bedragMln > 0,
  );
}

/**
 * Kunstwerken voor één level: geen dubbele, van elke soort minstens 40% (als dat kan), en eerst
 * posten die je nog niet zag.
 */
export function kaartenVoorLevel(
  posten: readonly MuseumKaart[],
  aantal: number,
  kans: () => number = Math.random,
  gezien: ReadonlySet<string> = new Set(),
): MuseumKaart[] {
  const n = Math.min(aantal, posten.length);
  // nieuwe posten voorop, daarbinnen willekeurig
  const geschud = schud(posten, kans);
  const volgorde = [
    ...geschud.filter((p) => !gezien.has(p.id)),
    ...geschud.filter((p) => gezien.has(p.id)),
  ];
  const minstens = Math.floor(n * 0.4);
  const gekozen: MuseumKaart[] = [];
  for (const s of ['wet', 'keuze'] as const)
    gekozen.push(...volgorde.filter((p) => p.soort === s).slice(0, minstens));
  for (const p of volgorde) {
    if (gekozen.length >= n) break;
    if (!gekozen.includes(p)) gekozen.push(p);
  }
  return schud(gekozen, kans);
}

/** Punten voor een goed antwoord, met `reeks` goede antwoorden op rij (deze meegeteld). */
export const punten = (reeks: number): number =>
  10 + 5 * (Math.min(MAX_REEKS, Math.max(1, reeks)) - 1);

/** De hoogste score voor een level met `aantal` kunstwerken: alles goed, achter elkaar. */
export function maxPunten(aantal: number): number {
  let som = 0;
  for (let r = 1; r <= aantal; r++) som += punten(r);
  return som;
}

/** De stand in een level. */
export type Stand = {
  punten: number;
  reeks: number;
  besteReeks: number;
  goed: number;
  fout: number;
};
export const BEGIN_STAND: Stand = { punten: 0, reeks: 0, besteReeks: 0, goed: 0, fout: 0 };

/** Verwerkt een antwoord: is het goed, en hoeveel punten komen erbij? */
export function antwoord(
  stand: Stand,
  kaart: MuseumKaart,
  keuze: Soort,
): { stand: Stand; goed: boolean; erbij: number } {
  if (keuze !== kaart.soort)
    return { stand: { ...stand, reeks: 0, fout: stand.fout + 1 }, goed: false, erbij: 0 };
  const reeks = stand.reeks + 1;
  const erbij = punten(reeks);
  return {
    stand: {
      punten: stand.punten + erbij,
      reeks,
      besteReeks: Math.max(stand.besteReeks, reeks),
      goed: stand.goed + 1,
      fout: stand.fout,
    },
    goed: true,
    erbij,
  };
}

/** Of een level gehaald is. */
export const gehaald = (goed: number, aantal: number): boolean =>
  aantal > 0 && goed >= Math.ceil(aantal * GEHAALD_DEEL);

/** Hoeveel goede antwoorden nodig zijn om een level te halen. */
export const nodig = (aantal: number): number => Math.ceil(aantal * GEHAALD_DEEL);

/** Waarom het antwoord is wat het is, in gewone woorden. */
export function uitlegVan(k: MuseumKaart): string {
  return k.soort === 'wet'
    ? `Moet van de ${k.wet ?? 'wet'}. De gemeente kiest wel hoeveel geld ze eraan uitgeeft.`
    : 'De gemeente kiest dit zelf. Ze kan het ook laten.';
}

/** Welke kant een veeg kiest: links is de wet, rechts de eigen keuze, te kort is niets. */
export function kantVanVeeg(dx: number, drempel = 60): Soort | undefined {
  if (dx <= -drempel) return 'wet';
  if (dx >= drempel) return 'keuze';
  return undefined;
}

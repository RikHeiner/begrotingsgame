/**
 * Hoofdstation, "Op tijd vertrekken": elke trein is een programma of plan uit de begroting. Gaat
 * het om geld voor elk jaar (S, structureel) of om eenmalig geld (I, incidenteel)?
 */
import type { Data } from '../engine';
import { schud } from './minigames';

export type Soort = 'S' | 'I';

export type Trein = {
  id: string;
  naam: string;
  /** bedrag per keer, in miljoenen (altijd positief) */
  bedrag_mln: number;
  soort: Soort;
};

export const STATION_AANTAL = 8;

/** Alle mogelijke treinen: programma's uit het Beleidshuis en actiekaarten. */
export function alleTreinen(data: Data): Trein[] {
  const uit: Trein[] = [];
  const namen = new Set<string>();
  const voegToe = (t: Trein) => {
    if (namen.has(t.naam)) return;
    namen.add(t.naam);
    uit.push(t);
  };
  for (const p of data.begroting.beleidsprogrammas ?? [])
    voegToe({
      id: p.id,
      naam: p.naam,
      bedrag_mln: p.bedrag_mln,
      soort: p.structureel_of_incidenteel,
    });
  for (const k of data.begroting.actiekaarten)
    voegToe({
      id: k.id,
      naam: k.naam,
      bedrag_mln: Math.abs(k.bedrag_mln),
      soort: k.structureel_of_incidenteel,
    });
  return uit;
}

/**
 * `aantal` treinen, zo veel mogelijk half elk jaar en half eenmalig, in een willekeurige volgorde.
 */
export function kiesTreinen(
  data: Data,
  aantal = STATION_AANTAL,
  kans: () => number = Math.random,
): Trein[] {
  const alle = schud(alleTreinen(data), kans);
  const s = alle.filter((t) => t.soort === 'S');
  const i = alle.filter((t) => t.soort === 'I');
  const helft = Math.floor(aantal / 2);
  const nI = Math.min(i.length, Math.max(helft, aantal - s.length));
  const nS = Math.min(s.length, aantal - nI);
  return schud([...s.slice(0, nS), ...i.slice(0, nI)], kans);
}

/** Eén zin uitleg (B1) bij het goede spoor. */
export function uitlegSpoor(soort: Soort): string {
  return soort === 'S'
    ? 'Dit geld komt elk jaar terug in de begroting, dus het telt elk jaar opnieuw mee.'
    : 'Dit is eenmalig geld: dat kun je maar één keer uitgeven.';
}

export const SPOOR_NAAM: Record<Soort, string> = { S: 'Elk jaar', I: 'Eenmalig' };

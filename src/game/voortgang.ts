/**
 * Je eigen begroting onthouden op dit apparaat (localStorage), zodat je bij een volgend bezoek
 * verder kunt gaan of opnieuw kunt beginnen. Alleen in deze browser; er gaat niets naar een server.
 */
import { codeer, decodeer, type Gelezen } from './deellink';
import type { Keuzes } from '../engine';
import type { Beginpunt } from './nulbasis';

export const OPSLAG_VOORTGANG = 'begrotingsgame:voortgang';

export type Voortgang = Gelezen & { routeStap: number };

export function leesVoortgang(): Voortgang | undefined {
  try {
    const ruw = localStorage.getItem(OPSLAG_VOORTGANG);
    if (!ruw) return undefined;
    const v = JSON.parse(ruw) as { b?: unknown; routeStap?: unknown };
    const g = typeof v.b === 'string' ? decodeer(v.b) : undefined;
    if (!g) return undefined;
    const stap = typeof v.routeStap === 'number' && v.routeStap >= 0 ? Math.floor(v.routeStap) : 0;
    return { ...g, routeStap: stap };
  } catch {
    return undefined;
  }
}

export function bewaarVoortgang(
  keuzes: Keuzes,
  jaar: number,
  beginpunt: Beginpunt,
  routeStap: number,
): void {
  try {
    localStorage.setItem(
      OPSLAG_VOORTGANG,
      JSON.stringify({ b: codeer(keuzes, jaar, beginpunt), routeStap }),
    );
  } catch {
    // privévenster of geen opslag: dan onthouden we niets
  }
}

export function wisVoortgang(): void {
  try {
    localStorage.removeItem(OPSLAG_VOORTGANG);
  } catch {
    // geen opslag
  }
}

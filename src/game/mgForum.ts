/**
 * Forum, "Schatten op het dakterras": raad hoeveel geld de gemeente per jaar aan een post uitgeeft.
 * De schuif gaat in stappen op een logaritmische schaal, van € 0,1 mln tot € 300 mln.
 */
import type { Data } from '../engine';
import type { Onderdeel } from '../engine/schema';
import { schud, vraagPosten } from './minigames';

export const FORUM_MIN_MLN = 0.1;
export const FORUM_MAX_MLN = 300;
export const FORUM_STAPPEN = 200;
export const FORUM_RONDES = 5;
export const FORUM_MAX_PUNTEN = 20;

const LOG_MIN = Math.log10(FORUM_MIN_MLN);
const LOG_MAX = Math.log10(FORUM_MAX_MLN);

/** Rond af op twee cijfers die ertoe doen (12,3 → 12; 0,456 → 0,46). */
export function rondMooi(mln: number): number {
  if (mln <= 0) return 0;
  const macht = Math.pow(10, Math.floor(Math.log10(mln)) - 1);
  return Math.round(Math.round(mln / macht) * macht * 1000) / 1000;
}

/** Stand van de schuif (0 tot `stappen`) naar een bedrag in miljoenen. */
export function stapNaarMln(stap: number, stappen = FORUM_STAPPEN): number {
  const t = Math.max(0, Math.min(stappen, stap)) / stappen;
  return rondMooi(Math.pow(10, LOG_MIN + t * (LOG_MAX - LOG_MIN)));
}

/** Bedrag in miljoenen naar de dichtstbijzijnde stand van de schuif. */
export function mlnNaarStap(mln: number, stappen = FORUM_STAPPEN): number {
  const begrensd = Math.max(FORUM_MIN_MLN, Math.min(FORUM_MAX_MLN, mln));
  return Math.round(((Math.log10(begrensd) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * stappen);
}

/** Punten voor één ronde: 20 als je precies goed zit, 0 als je 10 keer of meer ernaast zit. */
export function puntenVoorGok(gokMln: number, echtMln: number): number {
  if (gokMln <= 0 || echtMln <= 0) return 0;
  return Math.max(
    0,
    Math.round(FORUM_MAX_PUNTEN - FORUM_MAX_PUNTEN * Math.abs(Math.log10(gokMln / echtMln))),
  );
}

/** Posten voor de rondes: minstens € 1 mln, geschud, zonder dubbele namen. */
export function forumPosten(
  data: Data,
  aantal = FORUM_RONDES,
  kans: () => number = Math.random,
): Onderdeel[] {
  const namen = new Set<string>();
  const uit: Onderdeel[] = [];
  for (const o of schud(
    vraagPosten(data, 1).filter((o) => o.lasten_mln <= FORUM_MAX_MLN),
    kans,
  )) {
    if (uit.length >= aantal) break;
    if (namen.has(o.naam)) continue;
    namen.add(o.naam);
    uit.push(o);
  }
  return uit;
}

/** Hoeveel decimalen bij een bedrag in miljoenen, zodat kleine bedragen leesbaar blijven. */
export function decimalenVoor(mln: number): number {
  return mln < 1 ? 2 : mln < 10 ? 1 : 0;
}

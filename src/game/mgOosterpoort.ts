/**
 * De Oosterpoort: "Wie betaalt de voorstelling?". Bij posten met eigen inkomsten (kaartjes, huur,
 * horeca) raad je welk deel van de kosten de bezoekers en gebruikers zelf betalen.
 */
import type { Data } from '../engine';
import type { Onderdeel } from '../engine/schema';

/** De posten, in deze volgorde. Eerst de Oosterpoort zelf. */
export const VOORKEUR = ['c1', 'k1', 'c5', 'e5'];
export const RONDES = 4;
/** Punten per ronde (spelregel): 25 min het verschil in procentpunten. */
export const MAX_PER_RONDE = 25;

/** Een post telt mee als er inkomsten zijn, maar niet meer dan de kosten. */
const geschikt = (o: Onderdeel): boolean =>
  o.lasten_mln > 0 && o.gekoppelde_baten_mln > 0 && o.gekoppelde_baten_mln <= o.lasten_mln;

/** De posten voor het spel: eerst de voorkeur, aangevuld met andere posten met inkomsten. */
export function oosterpoortPosten(data: Data): Onderdeel[] {
  const posten = data.begroting.onderdelen;
  const gekozen = VOORKEUR.map((id) => posten.find((o) => o.id === id)).filter(
    (o): o is Onderdeel => !!o && geschikt(o),
  );
  for (const o of [...posten].sort((a, b) => b.gekoppelde_baten_mln - a.gekoppelde_baten_mln)) {
    if (gekozen.length >= RONDES) break;
    if (geschikt(o) && !gekozen.includes(o)) gekozen.push(o);
  }
  return gekozen.slice(0, RONDES);
}

/** Welk deel van de kosten de gebruikers zelf betalen, in procent. */
export function echtAandeel(o: Onderdeel): number {
  return (o.gekoppelde_baten_mln / o.lasten_mln) * 100;
}

/** Punten voor een gok (in procent): 25 min het verschil, nooit minder dan 0. */
export function punten(gok: number, echt: number): number {
  return Math.round(Math.max(0, MAX_PER_RONDE - Math.abs(gok - echt)));
}

/** Van elke € 10: wat betalen de bezoekers, en wat de gemeente? */
export function vanTien(o: Onderdeel): { bezoekers: number; gemeente: number } {
  const bezoekers = Math.round(echtAandeel(o) * 10) / 100;
  return { bezoekers, gemeente: Math.round((10 - bezoekers) * 100) / 100 };
}

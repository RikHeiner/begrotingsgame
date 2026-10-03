/**
 * Euroborg, "Penalty's voor de pot": elke penalty is een post van de begroting. Gaat de bal erin,
 * dan kun je de post helemaal schrappen. Houdt de keeper hem, dan houden de wet of een vaste
 * afspraak een deel (of alles) tegen.
 */
import { grensOnderdeel, type Data } from '../engine';
import type { Onderdeel } from '../engine/schema';
import { schud, vraagPosten } from './minigames';

export const PENALTIES = 8;

/** Kun je deze post helemaal schrappen? */
export function gaatErin(o: Onderdeel): boolean {
  return grensOnderdeel(o).min <= -100;
}

/** Wat je netto bespaart als je de post helemaal schrapt (de inkomsten die erbij horen vallen weg). */
export function besparingMln(o: Onderdeel): number {
  return o.lasten_mln - o.gekoppelde_baten_mln;
}

/** Wat er minstens overblijft van de post, in miljoenen (bij een vergrendelde post: alles). */
export function minimumMln(o: Onderdeel): number {
  const g = grensOnderdeel(o);
  if (g.min === 0 && g.max === 0) return o.lasten_mln;
  return o.lasten_mln * (1 + g.min / 100);
}

/** Waarom de keeper de bal houdt: de reden uit de data. */
export function redenKeeper(o: Onderdeel): string {
  const g = grensOnderdeel(o);
  if (g.minReden) return g.minReden;
  if (o.vergrendeld && o.reden_vergrendeld) return o.reden_vergrendeld;
  if (o.minimum?.reden) return o.minimum.reden;
  if (o.wettelijke_taak) return 'Dit is een taak die de gemeente van de wet moet doen.';
  return 'Deze post kan niet helemaal weg.';
}

/**
 * De posten voor de penalty's: de helft gaat erin, de helft houdt de keeper. Posten die je
 * helemaal kunt schrappen maar die netto niets opleveren (meer inkomsten dan kosten) doen niet mee.
 */
export function penaltyPosten(
  data: Data,
  aantal = PENALTIES,
  kans: () => number = Math.random,
): Onderdeel[] {
  const posten = schud(vraagPosten(data), kans);
  const erin = posten.filter((o) => gaatErin(o) && besparingMln(o) > 0);
  const gehouden = posten.filter((o) => !gaatErin(o));
  const helft = Math.ceil(aantal / 2);
  const a = erin.slice(0, helft);
  const b = gehouden.slice(0, aantal - a.length);
  const rest = erin.slice(helft, helft + (aantal - a.length - b.length));
  return schud([...a, ...b, ...rest], kans);
}

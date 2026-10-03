/**
 * Grote Markt, "Marktkoopman": vul je kraam met posten uit de begroting, binnen een vast budget.
 * Het budget van € 50 mln is een spelregel; de bedragen van de posten komen uit de begroting.
 */
import type { Data } from '../engine';
import type { Onderdeel } from '../engine/schema';
import { schud, vraagPosten } from './minigames';

/** Spelregel: zoveel mag je uitgeven op de markt. */
export const MARKT_BUDGET_MLN = 50;
/** Spelregel: zoveel seconden heb je. */
export const MARKT_SECONDEN = 60;
export const MARKT_AANTAL = 12;

/** Posten voor de kraampjes: tussen 1 en 30 mln, geschud, zonder dubbele namen. */
export function marktPosten(
  data: Data,
  aantal = MARKT_AANTAL,
  kans: () => number = Math.random,
): Onderdeel[] {
  const namen = new Set<string>();
  const uit: Onderdeel[] = [];
  for (const o of schud(
    vraagPosten(data, 1).filter((o) => o.lasten_mln <= 30),
    kans,
  )) {
    if (uit.length >= aantal) break;
    if (namen.has(o.naam)) continue;
    namen.add(o.naam);
    uit.push(o);
  }
  return uit;
}

/** Samen, in miljoenen (afgerond op duizend euro tegen afrondfouten). */
export function somMln(posten: readonly Onderdeel[]): number {
  return Math.round(posten.reduce((s, o) => s + o.lasten_mln, 0) * 1000) / 1000;
}

/** Past deze post nog in de kraam? */
export function pastNog(
  inKraam: readonly Onderdeel[],
  post: Onderdeel,
  budget = MARKT_BUDGET_MLN,
): boolean {
  return somMln([...inKraam, post]) <= budget;
}

/** Score: welk deel van het budget je gebruikt, van 0 tot 100. */
export function marktScore(inKraam: readonly Onderdeel[], budget = MARKT_BUDGET_MLN): number {
  const som = somMln(inKraam);
  return Math.max(0, Math.min(100, Math.round((som / budget) * 100)));
}

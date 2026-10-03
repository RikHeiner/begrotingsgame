/** De route bij nul (spel/route.json): welk gebouw welk nummer heeft. */
import type { Data } from '../engine';

/** Het nummer van een gebouw op de route (1, 2, …), of undefined als het er niet op staat. */
export function routeNummer(data: Data, gebouw: string): number | undefined {
  const i = data.route.stappen.findIndex((s) => s.gebouw === gebouw);
  return i < 0 ? undefined : i + 1;
}

/** De beste score per minigame, alleen in deze browser. */
import { OPSLAG_MINIGAMES as OPSLAG } from '../../game/state/store';

export function leesBeste(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(OPSLAG) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

export function bewaarBeste(id: string, score: number): number {
  const beste = leesBeste();
  const nieuw = Math.max(beste[id] ?? 0, score);
  try {
    localStorage.setItem(OPSLAG, JSON.stringify({ ...beste, [id]: nieuw }));
  } catch {
    // geen opslag: dan onthouden we de beste score niet
  }
  return nieuw;
}

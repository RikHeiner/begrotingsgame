/** Maten van de gebouwen op de kaart, zonder tekencode (ook bruikbaar in Node). */

export const GEBOUW_B = 50;
export const GEBOUW_H = 32;
/** Zo veel groter tekent de kaart een gebouw dan in de tekening (wereldeenheden). */
export const GEBOUW_SCHAAL = 1.3;
/** Zo groot zijn de namen en bedragen onder de gebouwen (iets groter dan de gebouwen zelf). */
export const TEKST_SCHAAL = 1.55;
/** De bekende gebouwen met een minigame zijn iets kleiner dan de gebouwen van de begroting. */
export const MINIGAME_SCHAAL = GEBOUW_SCHAAL * 0.8;
/** Hoe ver boven de plek van een minigame het label "Speel" staat (wereldeenheden). */
export const BOVEN_MINIGAME = 34 * MINIGAME_SCHAAL;

/** Hoe hoog de tekening van elk bekend gebouw is, van de grond tot de top (tekeneenheden). */
const HOOGTE: Record<string, number> = {
  toren: 76,
  markt: 18,
  station: 38,
  forum: 62,
  stadion: 34,
  plantsoen: 32,
  museum: 40,
  academie: 56,
  sluis: 20,
  concertzaal: 46,
  goudkantoor: 47,
};

/**
 * Hoe ver boven de plek van een minigame het label staat: net boven de top van de tekening. Een
 * spel "bij" een gebouw (de Martinitoren bij het Stadhuis) heeft geen eigen tekening.
 */
export function bovenMinigame(m: { vorm: string; bij?: unknown }): number {
  const h = m.bij ? undefined : HOOGTE[m.vorm];
  return h === undefined ? BOVEN_MINIGAME : (h + 3 - GEBOUW_H / 2) * MINIGAME_SCHAAL;
}
/** Hoe ver boven het midden van een gebouw het nummer van de route staat (wereldeenheden). */
export const BOVEN_DAK = (GEBOUW_H / 2 + 22) * GEBOUW_SCHAAL;

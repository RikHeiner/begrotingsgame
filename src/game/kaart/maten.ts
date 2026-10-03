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
/** Hoe ver boven het midden van een gebouw het nummer van de route staat (wereldeenheden). */
export const BOVEN_DAK = (GEBOUW_H / 2 + 22) * GEBOUW_SCHAAL;

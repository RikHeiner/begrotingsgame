/** Maten van de gebouwen op de kaart, zonder tekencode (ook bruikbaar in Node). */

export const GEBOUW_B = 50;
export const GEBOUW_H = 32;
/** Zo veel groter tekent de kaart een gebouw dan in de tekening (wereldeenheden). */
export const GEBOUW_SCHAAL = 1.8;
/** Hoe ver boven het midden van een gebouw het nummer van de route staat (wereldeenheden). */
export const BOVEN_DAK = (GEBOUW_H / 2 + 22) * GEBOUW_SCHAAL;

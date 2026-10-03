/**
 * Meerjarig rekenen: ingroeipaden en vertraging.
 *
 * Afspraak (zie data/SCHEMA.md): een ingroeipad telt vanaf het eerste jaar van de meerjarenraming.
 * Na het laatste getal blijft het laatste getal gelden. Zonder ingroeipad begint een vertraagd effect
 * in jaar `vertraging` (0 = het eerste jaar) en telt het daarna volledig.
 */

/** Factor uit een ingroeipad voor jaarindex j (0 = eerste jaar). Zonder pad: 1. */
export function ingroei(pad: readonly number[] | null | undefined, j: number): number {
  if (!pad || pad.length === 0) return 1;
  return pad[Math.min(j, pad.length - 1)] ?? 1;
}

/** 1 als het effect in jaar j al loopt, anders 0. */
export function vanaf(vertraging: number, j: number): number {
  return j >= vertraging ? 1 : 0;
}

/** Maakt een rij met een waarde per jaar van de horizon. */
export function perJaar(aantalJaren: number, fn: (j: number) => number): number[] {
  return Array.from({ length: aantalJaren }, (_, j) => fn(j));
}

export function som(rij: readonly number[]): number {
  return rij.reduce((a, b) => a + b, 0);
}

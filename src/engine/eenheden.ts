/** De rekenmotor rekent intern in euro's. De data staat in miljoenen of duizenden. */
export const MLN = 1_000_000;
export const DUIZEND = 1_000;

export const vanMln = (mln: number): number => mln * MLN;
export const vanDuizend = (x1000: number): number => x1000 * DUIZEND;

/** Kleinste bedrag dat als "niet nul" telt, in euro's (tegen afrondingsruis). */
export const EPSILON = 0.5;

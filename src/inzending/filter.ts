/**
 * Filter op scheldwoorden en persoonsgegevens in eigen ideeën. Dezelfde regels staan in de database
 * (public.idee_verdacht); daar beslist het filter. Hier waarschuwt het de speler alvast.
 * Een idee dat het filter vindt, wordt niet geweigerd maar gemarkeerd: de fractie leest het eerst.
 */
export const FILTER_WOORDEN = [
  'kanker',
  'tering',
  'tyfus',
  'klootzak',
  'kut',
  'lul',
  'hoer',
  'mongool',
  'flikker',
  'neuken',
  'godverdomme',
  'debiel',
  'eikel',
  'sukkel',
  'idioot',
  'oplichter',
  'zakkenvuller',
  'landverrader',
] as const;

const PATRONEN = [
  /[^\s@]+@[^\s@]+\.[a-z]{2,}/i, // e-mailadres
  /(\+31|(?<![\p{L}\p{N}_])0)[\s-]?[1-9]([\s-]?[0-9]){8}/u, // telefoonnummer
  /(?<![\p{L}\p{N}_])[1-9][0-9]{3}\s?[a-z]{2}(?![\p{L}\p{N}_])\s*,?\s*[0-9]+/iu, // postcode met huisnummer
  /(?<![\p{L}\p{N}_])NL[0-9]{2}[A-Z]{4}[0-9]{10}(?![\p{L}\p{N}_])/iu, // IBAN
  ...FILTER_WOORDEN.map((w) => new RegExp(`(?<![\\p{L}\\p{N}_])${w}`, 'iu')),
];

export function ideeVerdacht(tekst: string): boolean {
  return PATRONEN.some((p) => p.test(tekst));
}

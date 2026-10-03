/**
 * Academiegebouw: "Rondkomen als student". Een maandbudget voor een student op kamers. Het
 * inkomen en de vaste kosten zijn een voorbeeld; de afvalstoffenheffing komt uit de tarieven van
 * de gemeente.
 */
import type { Data } from '../engine';

/** Voorbeeldbedragen per maand (geen data van de gemeente). */
export const VOORBEELD = {
  inkomen: 1100,
  huur: 500,
  zorgverzekering: 155,
  telefoon: 20,
} as const;

/** Wat de speler zelf verdeelt, in euro per maand. */
export type StudentKeuzes = { boodschappen: number; uitgaan: number; sparen: number };

export const BEGIN: StudentKeuzes = { boodschappen: 250, uitgaan: 100, sparen: 0 };

/** Grenzen en stap van de schuiven (spelregel). */
export const SCHUIF = { min: 0, max: 400, stap: 10 } as const;

/** Afvalstoffenheffing voor een eenpersoonshuishouden, per maand (per jaar gedeeld door 12). */
export function gemeentePerMaand(data: Data): number {
  const perJaar = data.tarieven?.afvalstoffenheffing.een_persoon ?? 0;
  return perJaar / 12;
}

/** Alle vaste kosten per maand: het voorbeeld plus de heffing van de gemeente. */
export function vasteKosten(gemeente: number): number {
  return VOORBEELD.huur + VOORBEELD.zorgverzekering + VOORBEELD.telefoon + gemeente;
}

/** Wat er aan het eind van de maand over is (kan negatief zijn). */
export function saldo(k: StudentKeuzes, gemeente: number): number {
  return VOORBEELD.inkomen - vasteKosten(gemeente) - k.boodschappen - k.uitgaan - k.sparen;
}

/**
 * Spelregel voor de score: 100 als je rondkomt en ook spaart, 70 als je alleen rondkomt, anders
 * 30. Afgerond op centen, zodat een saldo van € −0,00 niet telt als tekort.
 */
export function studentScore(k: StudentKeuzes, gemeente: number): number {
  const over = Math.round(saldo(k, gemeente) * 100) / 100;
  if (over >= 0 && k.sparen > 0) return 100;
  if (over >= 0) return 70;
  return 30;
}

/** Welk deel van het inkomen naar de gemeente gaat, in procent. */
export function aandeelGemeente(gemeente: number): number {
  return (gemeente / VOORBEELD.inkomen) * 100;
}

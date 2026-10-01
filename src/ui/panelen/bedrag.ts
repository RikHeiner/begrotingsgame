/** Een bedrag naast een schuif: lezen wat de speler typt, en omrekenen naar een percentage. */

/** Leest "4,5", "4.5", "€ 1.250,00" of "−2"; undefined als het geen getal is. */
export function leesBedrag(tekst: string): number | undefined {
  let t = tekst.replace(/[€\s]|mln/gi, '').replace(/[−–]/g, '-');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return undefined;
  return Number(t);
}

/** Het percentage bij een nieuw bedrag, afgerond op twee decimalen. */
export function pctVoorBedrag(nieuw: number, basis: number): number {
  return Math.round((nieuw / basis - 1) * 10000) / 100;
}

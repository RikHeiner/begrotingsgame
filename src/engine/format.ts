/**
 * Weergave van bedragen in Nederlandse notatie. De rekenmotor rondt nooit af; dat gebeurt alleen hier.
 * Voorbeeld: formatMln(1_482_000_000) geeft "€ 1.482,0 mln".
 */
import { MLN } from './eenheden';

const MIN = '−'; // echt minteken

function getal(waarde: number, decimalen: number): string {
  return Math.abs(waarde).toLocaleString('nl-NL', {
    minimumFractionDigits: decimalen,
    maximumFractionDigits: decimalen,
  });
}

/** Bedrag in miljoenen. Met `teken` krijgt een positief bedrag een plus. */
export function formatMln(
  euro: number,
  opties: { decimalen?: number; teken?: boolean } = {},
): string {
  const decimalen = opties.decimalen ?? 1;
  const mln = euro / MLN;
  const afgerond = Number(mln.toFixed(decimalen));
  const voorteken = afgerond < 0 ? `${MIN} ` : afgerond > 0 && opties.teken ? '+ ' : '';
  return `${voorteken}€ ${getal(afgerond, decimalen)} mln`;
}

/** Bedrag in hele euro's, bijvoorbeeld "€ 340.000". */
export function formatEuro(euro: number, opties: { teken?: boolean } = {}): string {
  const afgerond = Math.round(euro);
  const voorteken = afgerond < 0 ? `${MIN} ` : afgerond > 0 && opties.teken ? '+ ' : '';
  return `${voorteken}€ ${getal(afgerond, 0)}`;
}

/** Percentage met teken, bijvoorbeeld "−20%" of "+10%". */
export function formatPct(pct: number): string {
  if (pct === 0) return '0%';
  return `${pct < 0 ? MIN : '+'}${getal(pct, 0)}%`;
}

/**
 * De knop "Waarom?": elk bedrag op het scherm is terug te voeren op een lijst Effect-regels.
 * Deze functies filteren en beschrijven die regels in gewone taal.
 */
import { EIGEN_PREFIX } from './types';
import { formatMln } from './format';
import type { Data } from './laadData';
import { parkeerPostVan } from './parkeren';
import type { Effect, Resultaat } from './types';

export type Filter = {
  bron?: string | string[];
  doel?: string;
  jaar?: number;
  soort?: 'S' | 'I';
  stap?: 'direct' | 'dwarsverband';
};

export function waarom(resultaat: Resultaat, filter: Filter = {}): Effect[] {
  const bronnen = filter.bron === undefined ? undefined : [filter.bron].flat();
  return resultaat.effecten.filter(
    (e) =>
      (bronnen === undefined || bronnen.includes(e.bron) || bronnen.includes(e.verband ?? '')) &&
      (filter.doel === undefined || e.doel === filter.doel) &&
      (filter.jaar === undefined || e.jaar === filter.jaar) &&
      (filter.soort === undefined || e.soort === filter.soort) &&
      (filter.stap === undefined || e.stap === filter.stap),
  );
}

export function somVan(effecten: Effect[]): number {
  return effecten.reduce((s, e) => s + e.bedrag, 0);
}

export const AANNAME_LABEL = '⚠︎';

/** De naam van een post, belasting, actiekaart of parkeerpost; undefined als die onbekend is. */
export function naamVan(data: Data, bron: string): string | undefined {
  return (
    data.index.onderdelen.get(bron)?.naam ??
    data.index.belastingen.get(bron)?.naam ??
    data.index.kaarten.get(bron)?.naam ??
    parkeerPostVan(data, bron)?.naam ??
    (bron.startsWith(EIGEN_PREFIX) ? 'Eigen voorstel' : undefined)
  );
}

/** Eén regel in gewone taal, met ⚠︎ bij een aanname. */
export function beschrijf(data: Data, e: Effect): string {
  const label =
    e.zekerheid === 'feit'
      ? ''
      : e.zekerheid === 'aanname'
        ? ` ${AANNAME_LABEL} aanname`
        : ` ${AANNAME_LABEL} aanname, nog te onderzoeken`;
  const bron =
    e.stap === 'dwarsverband'
      ? `Kettingeffect "${data.index.verbanden.get(e.verband ?? '')?.naam ?? e.bron}"`
      : (naamVan(data, e.bron) ?? e.bron);
  return `${bron}: ${formatMln(e.bedrag, { decimalen: 2, teken: true })} in ${e.jaar}${e.soort === 'I' ? ' (eenmalig)' : ''}${label}. ${e.uitleg}`;
}

/** Netto-effect per bron in een jaar, gesorteerd van groot naar klein. */
export function grootsteBronnen(
  resultaat: Resultaat,
  jaar: number,
): { bron: string; bedrag: number }[] {
  const som = new Map<string, number>();
  for (const e of resultaat.effecten) {
    if (e.jaar !== jaar) continue;
    const bron = e.verband ?? e.bron;
    som.set(bron, (som.get(bron) ?? 0) + e.bedrag);
  }
  return [...som]
    .map(([bron, bedrag]) => ({ bron, bedrag }))
    .sort((a, b) => Math.abs(b.bedrag) - Math.abs(a.bedrag) || a.bron.localeCompare(b.bron));
}

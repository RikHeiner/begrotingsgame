/**
 * De namen die een voorwaarde in reacties.json mag gebruiken, en hun waarde in de huidige toestand.
 *   pct.<onderdeel>   wijziging in procenten (−100..100)
 *   tax.<belasting>   wijziging in procenten
 *   kaart.<kaart>     1 als de actiekaart aan staat, anders 0
 *   meter.<meter>     0..100
 *   persona.<id>      tevredenheid 0..100
 *   gebouw.<id>       gewogen gemiddelde wijziging van het gebouw, in procenten
 *   saldo.structureel, saldo.incidenteel   in miljoenen, eerste jaar
 *   sluitend          1 als de begroting in alle jaren sluit
 *   reserve           storting in de reserve, in miljoenen (structureel + eenmalig)
 */
import type { Data, Resultaat } from '../../engine';
import type { GebouwStand } from '../toestand';

export function maakLezer(
  data: Data,
  r: Resultaat,
  standen: Record<string, GebouwStand>,
): (naam: string) => number {
  const jaar = data.jaren[0] ?? 0;
  return (naam) => {
    const [soort, id = ''] = naam.split('.', 2) as [string, string?];
    switch (soort) {
      case 'pct':
        return r.keuzes.onderdelen[id] ?? 0;
      case 'tax':
        return r.keuzes.belastingen[id] ?? 0;
      case 'kaart':
        return r.keuzes.kaarten.includes(id) ? 1 : 0;
      case 'meter':
        return (r.meters as Record<string, number>)[id] ?? 50;
      case 'persona':
        return r.personas[id] ?? 50;
      case 'gebouw':
        return standen[id]?.score ?? 0;
      case 'saldo':
        return (
          (id === 'incidenteel'
            ? (r.perJaar[jaar]?.incidenteel ?? 0)
            : (r.perJaar[jaar]?.structureel ?? 0)) / 1e6
        );
      case 'sluitend':
        return r.regels.sluitend ? 1 : 0;
      case 'reserve':
        return ((r.keuzes.reserve?.structureel ?? 0) + (r.keuzes.reserve?.eenmalig ?? 0)) / 1e6;
    }
    throw new Error(`Onbekende naam in voorwaarde: ${naam}`);
  };
}

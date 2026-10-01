/**
 * Een tegenbegroting (zoals die van de VVD) als losse actiekaarten, zodat de rekenmotor hem kan
 * narekenen. Ombuigingen worden opbrengsten (+), uitgaven worden uitgaven (−).
 */
import type { Actiekaart, Tegenbegroting } from './schema';

export const PREFIX_TEGENBEGROTING = 'tb_';

export function alsKaarten(tb: Tegenbegroting, bron = tb.titel): Actiekaart[] {
  const kaart = (
    post: Tegenbegroting['uitgaven'][number],
    soort: 'opbrengst' | 'uitgave',
    i: number,
  ): Actiekaart => ({
    id: `${PREFIX_TEGENBEGROTING}${soort === 'opbrengst' ? 'o' : 'u'}${i + 1}`,
    soort,
    structureel_of_incidenteel: post.S_of_I,
    bedrag_mln: soort === 'opbrengst' ? post.bedrag_mln : -post.bedrag_mln,
    naam: post.omschrijving,
    // De opmerking in de data is een notitie voor de bouwers (koppeling aan de schuiven), geen uitleg voor spelers.
    uitleg: '',
    meter_effect_punten: {},
    bron,
  });
  return [
    ...tb.ombuigingen_en_opbrengsten.map((p, i) => kaart(p, 'opbrengst', i)),
    ...tb.uitgaven.map((p, i) => kaart(p, 'uitgave', i)),
  ];
}

/** Totalen zoals in de tabellen van de tegenbegroting, in miljoenen. */
export function totalen(tb: Tegenbegroting): {
  ombuigingenS: number;
  ombuigingenI: number;
  uitgavenS: number;
  uitgavenI: number;
} {
  const somVan = (lijst: Tegenbegroting['uitgaven'], s: 'S' | 'I') =>
    lijst.filter((p) => p.S_of_I === s).reduce((a, p) => a + p.bedrag_mln, 0);
  return {
    ombuigingenS: somVan(tb.ombuigingen_en_opbrengsten, 'S'),
    ombuigingenI: somVan(tb.ombuigingen_en_opbrengsten, 'I'),
    uitgavenS: somVan(tb.uitgaven, 'S'),
    uitgavenI: somVan(tb.uitgaven, 'I'),
  };
}

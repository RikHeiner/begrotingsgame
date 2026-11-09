import type { Keuzes } from '/home/user/begrotingsgame/src/engine/types';
import type { Actiekaart } from '/home/user/begrotingsgame/src/engine/schema';
import { laadDataNode } from '/home/user/begrotingsgame/scripts/lees';
import { metExtraKaarten } from '/home/user/begrotingsgame/src/engine/laadData';
import { parkeerPosten } from '/home/user/begrotingsgame/src/engine/parkeren';

const basis = laadDataNode();
const kaart = (id: string, naam: string, soort: 'opbrengst' | 'uitgave', si: 'S' | 'I', bedrag: number, ingroeipad?: number[]): Actiekaart => ({
  id, naam, soort, structureel_of_incidenteel: si, bedrag_mln: bedrag, uitleg: '', meter_effect_punten: {}, bron: 'def1',
  ...(ingroeipad ? { ingroeipad } : {}),
});
const LOONSOM = 357.948;
const REST = 0.2 * LOONSOM - 26.3 - 6.54; // 20% minder ambtenaren, overhead en CDOKE tellen mee
const CAMERAS = 50;
export const EXTRA: Actiekaart[] = [
  kaart('d_apparaat_rest', 'Ambtenarenapparaat 20%: vacaturestop (rest)', 'opbrengst', 'S', REST, [0.25, 0.5, 0.75, 1]),
  { ...kaart('d_camera_invest', 'Camera kapitaallasten', 'uitgave', 'S', 0),
    investering: { bedrag_mln: (CAMERAS * 19000) / 1e6, levensduur_jaar: 5, eenmalige_bijdrage: false } } as Actiekaart,
  kaart('d_camera_expl', 'Camera uitkijken en onderhoud', 'uitgave', 'S', -(CAMERAS * (3000 + 15000 / 18)) / 1e6),
  kaart('d_sport', 'Versnellen Masterplan Sportvoorzieningen', 'uitgave', 'S', -2.0),
  kaart('d_fc', 'Trainingscomplex FC Groningen', 'uitgave', 'I', -2.0),
  kaart('d_milieustraten', 'Ruimere openingstijden milieustraten', 'uitgave', 'S', -0.5),
  kaart('d_veegkosten', 'Geen extra doorberekening veegkosten', 'uitgave', 'S', -2.08),
  kaart('d_warmtestad_geboekt', 'Verkoop 49% WarmteStad zoals in het document geboekt', 'opbrengst', 'I', 37.975),
  kaart('d_ongedoc_2028', 'Ongedocumenteerden 2028 (5,0)', 'opbrengst', 'S', 5.0, [0, 1, 0]),
];
export const data = metExtraKaarten(basis, EXTRA);
const parkeren: Record<string, number> = {};
for (const p of parkeerPosten(data)) {
  if (p.id === 'kortparkeren') parkeren[p.id] = (-5.255 / p.basis) * 1e8;
  else if (p.id === 'garages') parkeren[p.id] = (-1.998 / p.basis) * 1e8;
  else parkeren[p.id] = -(1 - 0.9 / 1.0458) * 100;
}
export const keuzes = (variant: 'document' | 'model' | 'regels'): Keuzes => ({
  onderdelen: {
    h1: -20, c2: -40, s6: -100, w12: -60, s10: -30, s12: -30, g7: -40, d6: -100, m3: -25, s11: -25, z10: -85,
    w7: -40, m4: -55, e7: -35, g1: -25, w6: -55, m9: -100, o4: -100,
    o1: variant === 'regels' ? 10 : 12.5, z1: 10, s3: 10, v3: 10, v2: 10, b1: 5, v5: 10, b2: 5, o6: 4, v4: 10,
  },
  belastingen: { t1: (-25.154 / 139.441) * 100, t2: -10, t4: -(1 - 0.9 / 1.0458) * 100, t3: -100 },
  parkeren,
  kaarten: ['d_apparaat_rest', 'd_camera_invest', 'd_camera_expl', 'd_sport', 'd_fc', 'd_milieustraten', 'd_veegkosten',
    'p_campus_camera', 'k_ongedoc', 'k_dierenarts', 'p_energiebedrijf',
    ...(variant === 'regels' ? ['k_verkoop_warmtestad', 'k_tegenprestatie'] : ['d_ongedoc_2028']),
    ...(variant === 'document' ? ['d_warmtestad_geboekt'] : variant === 'model' ? ['k_verkoop_warmtestad'] : [])],
  scenario: 'midden',
});

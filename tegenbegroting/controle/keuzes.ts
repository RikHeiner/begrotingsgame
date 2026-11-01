import type { Keuzes } from '../../src/engine/types';
import type { Actiekaart } from '../../src/engine/schema';
import { laadDataNode } from '../../scripts/lees';
import { metExtraKaarten } from '../../src/engine/laadData';
import { parkeerPosten } from '../../src/engine/parkeren';

const basis = laadDataNode();
const kaart = (
  id: string,
  naam: string,
  soort: 'opbrengst' | 'uitgave',
  si: 'S' | 'I',
  bedrag: number,
  bron: string,
  ingroeipad?: number[],
): Actiekaart => ({
  id,
  naam,
  soort,
  structureel_of_incidenteel: si,
  bedrag_mln: bedrag,
  uitleg: '',
  meter_effect_punten: {},
  bron,
  ...(ingroeipad ? { ingroeipad } : {}),
});
// 15% minder ambtenaren (53,692 = 15% van de loonsom 357,948, boekwerk p. 355). De besparingen op de overhead
// (h1 −20% = 26,3) en op CDOKE (w12 −60% = 6,54) tellen mee voor die 15%; de rest komt uit de vacaturestop.
const REST_APPARAAT = 53.692 - 26.3 - 6.54;
export const EXTRA: Actiekaart[] = [
  kaart(
    'tb_apparaat_rest',
    'Vacaturestop en afstoten van taken (rest van de 15%)',
    'opbrengst',
    'S',
    REST_APPARAAT,
    '15% van de loonsom (p. 355) min overhead en CDOKE',
    [0.25, 0.5, 0.75, 1],
  ),
  // Begroting 2026, intensivering emissieloos wagenpark: 2027 −565, 2028 e.v. −858 (duizend euro)
  kaart(
    'tb_wagenpark',
    "Elektrisch maken van gemeenteauto's uitstellen",
    'opbrengst',
    'S',
    0.858,
    'Begroting 2026, intensivering 9: 2027 0,565; 2028-2029 0,858',
    [0.565 / 0.858, 1],
  ),
  // Werkprogramma: volgens de begroting 2026 in 2027 0,85 (niet 1,05)
  kaart(
    'tb_werkprogramma',
    'Stoppen met het werkprogramma bijstand',
    'opbrengst',
    'I',
    0.85,
    'Begroting 2026, intensivering 37: 0,85 in 2027',
  ),
];
// Dekkend cameratoezicht binnenstad (35) en stationsgebied (15) = 50 extra camera's (aanname).
// Eenheidsprijzen Nijmegen (raadsbrief Uitbreiding cameratoezicht): 10.000 camera + 9.000 bekabeling; 3.000 uitkijken
// per camera per jaar; onderhoud 15.000 per jaar voor 18 camera's (ca. 833 per camera).
const CAMERAS = 50;
EXTRA.push(
  {
    ...kaart(
      'tb_camera_invest',
      'Dekkend cameratoezicht binnenstad en stationsgebied: aanschaf en aanleg',
      'uitgave',
      'S',
      0,
      "Nijmegen: 19.000 per camera; 50 camera's; afschrijving 5 jaar",
    ),
    investering: {
      bedrag_mln: (CAMERAS * 19000) / 1e6,
      levensduur_jaar: 5,
      eenmalige_bijdrage: false,
    },
  } as Actiekaart,
  kaart(
    'tb_camera_exploitatie',
    'Dekkend cameratoezicht binnenstad en stationsgebied: uitkijken en onderhoud',
    'uitgave',
    'S',
    -(CAMERAS * (3000 + 15000 / 18)) / 1e6,
    'Nijmegen: 3.000 uitkijken + 833 onderhoud per camera per jaar',
  ),
);
export const data = metExtraKaarten(basis, EXTRA);
const parkeren: Record<string, number> = {};
for (const p of parkeerPosten(data)) parkeren[p.id] = -20;
export const fractielijn: Record<string, number> = {
  h1: -20,
  o1: 20,
  c2: -40,
  c1: -40,
  c3: -10,
  z4: -20,
  z1: 10,
  z3: -15,
  z2: 0,
  s10: -40,
  s6: -100,
  s3: 10,
  w12: -60,
  v2: 10,
  k1: 5,
};
// Overgenomen van Rik; zonder m11 en w4 (dubbel met de 15%) en zonder parkeercontrole (kost netto geld).
export const rik: Record<string, number> = {
  g7: -40,
  g5: -30,
  e9: -25,
  e7: -35,
  g1: -24,
  o4: -100,
  z10: -85,
  z8: -25,
  z9: -45,
  g4: -30,
  s12: -75,
  s11: -25,
  z6: -20,
  z11: -16.7,
  c5: -25,
  m9: -100,
  w7: -40,
  w6: -55,
  d6: -100,
  m4: -55,
  o8: -15,
  v3: 10,
  e8: 10,
  e3: 15,
  b1: 5,
  v5: 10,
  b2: 5,
  o6: 5,
  v4: 10,
  w10: 5,
  w1: 5,
  k2: 5,
  e6: 5,
};
export const keuzes: Keuzes = {
  onderdelen: { ...rik, ...fractielijn },
  belastingen: { t1: -20, t2: -10, t4: -20, t3: -100 },
  parkeren,
  kaarten: [
    'tb_apparaat_rest',
    'tb_wagenpark',
    'tb_werkprogramma',
    'p_campus_camera',
    'p_internationale_solidariteit',
    'k_dierenarts',
    'k_tegenprestatie',
    'k_ongedoc',
    'k_smr_onderzoek',
    'tb_camera_invest',
    'tb_camera_exploitatie',
  ],
  gestopt: ['p_route_arbeid_plus'],
  scenario: 'midden',
};

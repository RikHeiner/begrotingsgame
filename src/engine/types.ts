import type { MeterId, Scenario, Zekerheid } from './schema';

export type Jaar = number;

export type Keuzes = {
  /** onderdeel-id -> percentage (-100..+100), 0 = ongewijzigd */
  onderdelen: Record<string, number>;
  /** belasting-id -> percentage */
  belastingen: Record<string, number>;
  /**
   * parkeren per onderdeel (parkeerpost-id -> percentage), zie parkeren.ts. De schuif t5 in
   * `belastingen` wordt daaruit afgeleid (het gewogen gemiddelde).
   */
  parkeren?: Record<string, number>;
  /** actieve actiekaarten */
  kaarten: string[];
  scenario: Scenario;
  /**
   * Geld dat de speler in de algemene reserve stort, in euro's: elk jaar (structureel) of eenmalig in
   * het eerste jaar. Een overschot gaat niet vanzelf naar de reserve; de speler kiest dat zelf.
   */
  reserve?: { structureel: number; eenmalig: number };
  /**
   * Programma's in het Beleidshuis die stilstaan (zie Programma). Alleen een label: het bedrag zit
   * al in de schuif van de post.
   */
  gestopt?: string[];
};

export const GEEN_KEUZES: Keuzes = {
  onderdelen: {},
  belastingen: {},
  kaarten: [],
  scenario: 'midden',
};

/** Waar een effect in de begroting landt: minder lasten of meer baten tellen allebei als gunstig. */
export type Kant = 'lasten' | 'baten';

export type Effect = {
  /** onderdeel-, belasting-, kaart- of dwarsverband-id */
  bron: string;
  /** waar het geld landt: een post-id, `baten:<id>` of `grootheid:<naam>` */
  doel: string;
  /** euro's; + = gunstig voor de gemeente */
  bedrag: number;
  jaar: Jaar;
  soort: 'S' | 'I';
  zekerheid: Zekerheid;
  /** voor de knop "Waarom?" */
  uitleg: string;
  stap: 'direct' | 'dwarsverband';
  kant: Kant;
  /** het dwarsverband dat dit effect maakt, als het een kettingeffect is */
  verband?: string;
};

export type VerbandStatus =
  | 'doorgerekend'
  | 'niet actief'
  | 'nog niet doorgerekend'
  | 'alleen uitleg'
  | 'wacht op nieuwe post';

export type VerbandUitkomst = {
  status: VerbandStatus;
  /** waarom het (nog) niet is doorgerekend, of een toelichting */
  reden?: string;
  /** de kant van de bandbreedte die bij het scenario is gebruikt */
  eind: 'laag' | 'midden' | 'hoog';
};

export type Melding = {
  verband: string;
  tekst: string;
  zekerheid: Zekerheid;
  status: VerbandStatus;
};

export type JaarResultaat = {
  /** saldo t.o.v. de begroting, euro's */
  structureel: number;
  incidenteel: number;
  /** totale lasten en baten van de begroting na de keuzes (inclusief reservemutaties), euro's */
  lasten: number;
  baten: number;
  perDeelprogramma: Record<string, { lasten: number; baten: number }>;
  weerstandsvermogen: number;
};

export type Resultaat = {
  perJaar: Record<Jaar, JaarResultaat>;
  /** 0..100, 50 = huidige begroting */
  meters: Record<MeterId, number>;
  /** tevredenheid 0..100 */
  personas: Record<string, number>;
  effecten: Effect[];
  meldingen: Melding[];
  regels: {
    sluitend: boolean;
    perJaarSluitend: Record<Jaar, boolean>;
    overtredingen: string[];
  };
  /** ratio in het laatste jaar van de horizon (1,61 = 161%) */
  weerstandsvermogen: number;
  /** per dwarsverband: is het doorgerekend, en zo niet, waarom niet */
  verbanden: Record<string, VerbandUitkomst>;
  /** afgeleide grootheden per jaar (bijvoorbeeld extra_woningen, aantal_bijstand) */
  grootheden: Record<string, number[]>;
  /** keuzes zoals ze zijn doorgerekend, na het toepassen van de grenzen */
  keuzes: Keuzes;
  /** wat er aan de keuzes is aangepast omdat het buiten de grenzen viel */
  correcties: string[];
};

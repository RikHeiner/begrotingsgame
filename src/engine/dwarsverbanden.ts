/**
 * Dwarsverbanden (opdracht hoofdstuk 7). Elk verband uit data/dwarsverbanden.json heeft hier een
 * getypeerde functie die de parameters uit de JSON leest. De functies kennen geen bedragen: alle
 * getallen komen uit de data. Een verband zonder voldoende gegevens wordt "nog niet doorgerekend",
 * met de reden erbij.
 *
 * De verbanden worden in topologische volgorde doorgerekend (graaf van `van` naar `naar`, aangevuld
 * met de grootheden die een functie leest en schrijft). Een kring wordt één keer doorgerekend.
 */
import { vanMln } from './eenheden';
import type { Data } from './laadData';
import { bijdrageOnderdeel } from './meters';
import { ingroei, perJaar, som, vanaf } from './meerjarig';
import { waardeBij, heeftBandbreedte, type Eind } from './scenario';
import { formatMln, formatPct } from './format';
import { stortingenInReserve } from './regels';
import type { Dwarsverband, MeterId, Zekerheid } from './schema';
import type { Effect, Kant, Keuzes, VerbandStatus, VerbandUitkomst } from './types';

// ---------------------------------------------------------------------------------------------
// Context voor een implementatie
// ---------------------------------------------------------------------------------------------

class NietDoorgerekend extends Error {}
class WachtOpPost extends Error {}

/** Startwaarde van een grootheid. Factoren beginnen op 1, aantallen en bedragen op 0. */
const GROOTHEID_START: Record<string, number> = {
  bouw_tempo: 1,
  vergunningen_tempo: 1,
  investeringen_tempo: 1,
  wachttijd_burgerzaken: 1,
};

export type Grootheden = Map<string, number[]>;

type EffectInvoer = {
  doel: string;
  kant: Kant;
  bedragen: number[];
  /** parameters die het bedrag bepalen ("naam" of "verband.naam"); bepalen de zekerheid */
  params: string[];
  uitleg: string;
  soort?: 'S' | 'I';
};

export type Ctx = {
  readonly data: Data;
  readonly keuzes: Keuzes;
  readonly verband: Dwarsverband;
  readonly n: number;
  /** wijziging van een onderdeel als fractie (−0,2 = −20%) */
  p(id: string): number;
  /** wijziging van een belasting als fractie */
  t(id: string): number;
  kaart(id: string): boolean;
  /** lasten van een onderdeel in jaar j, euro's */
  lasten(id: string, j?: number): number;
  /** gekoppelde baten van een onderdeel, euro's */
  baten(id: string): number;
  /** opbrengst van een belasting, euro's (zonder de keuze van de speler) */
  opbrengst(id: string): number;
  /** bedrag van een actiekaart, euro's (+ = opbrengst) */
  kaartBedrag(id: string): number;
  /** het directe effect van een post op het saldo per jaar (+ = gunstig) */
  direct(id: string): number[];
  /** een getal-parameter; gooit "nog niet doorgerekend" als de waarde ontbreekt */
  param(naam: string): number;
  /** een parameter met een waarde per jaar */
  lijst(naam: string): number[];
  /** basis-meters vóór de dwarsverbanden */
  basisMeter(meter: MeterId): number;
  grootheid(naam: string): number[];
  zetGrootheid(naam: string, rij: number[]): void;
  effect(invoer: EffectInvoer): void;
  /** meterpunten op basis van een wijziging als fractie (1 = 100%) */
  meter(meter: MeterId, fractie: number): void;
  meterPunten(meter: MeterId, punten: number): void;
  /** het verband is actief, maar levert alleen uitleg op (het geld zit al in een ander effect) */
  uitleg(tekst: string): void;
  /** het verband is actief, maar kan (nog) niet worden doorgerekend */
  nogNiet(reden: string): never;
  /** het verband wacht op een post die nog niet in de begroting staat */
  wacht(reden: string): never;
  /** tekst bij een deel dat niet is doorgerekend, terwijl de rest wel is doorgerekend */
  deelsNiet(reden: string): void;
};

type Implementatie = {
  /** grootheden die deze functie leest (voor de volgorde) */
  leest?: string[];
  /** grootheden die deze functie schrijft */
  schrijft?: string[];
  reken(ctx: Ctx): void;
};

// ---------------------------------------------------------------------------------------------
// Kleine hulpfuncties
// ---------------------------------------------------------------------------------------------

/** Gewogen gemiddelde wijziging (fractie) van een groep onderdelen, gewogen naar lasten. */
function gemiddeldeP(ctx: Ctx, ids: string[]): number {
  let totaal = 0;
  let gewogen = 0;
  for (const id of ids) {
    const l = ctx.lasten(id);
    totaal += l;
    gewogen += l * ctx.p(id);
  }
  return totaal > 0 ? gewogen / totaal : 0;
}

const isNul = (rij: number[]): boolean => rij.every((x) => Math.abs(x) < 0.5);
const mlnTekst = (euro: number): string => formatMln(euro, { decimalen: 2 });
const naam = (ctx: Ctx, id: string): string =>
  ctx.data.index.onderdelen.get(id)?.naam ??
  ctx.data.index.belastingen.get(id)?.naam ??
  ctx.data.index.kaarten.get(id)?.naam ??
  id;

/** Bezuiniging op een post (positief bedrag bij minder lasten), per jaar. */
function besparing(ctx: Ctx, id: string): number[] {
  return ctx.direct(id).map((x) => Math.max(0, x));
}

const GEEN_FORMULE =
  'Er staat nog geen formule of bedrag voor dit kettingeffect in de data. Het wordt getoond als verhaal, niet als bedrag.';

// ---------------------------------------------------------------------------------------------
// Implementaties, op volgorde van de JSON
// ---------------------------------------------------------------------------------------------

export const IMPLEMENTATIES: Record<string, Implementatie> = {
  // ---- Kostendekkende heffingen ----
  kd_afval: {
    schrijft: ['heffing_afval'],
    reken(c) {
      const p = c.p('o3');
      if (!p) return;
      const deltaLasten = p * c.lasten('o3');
      const dekking = c.param('kostendekkingsgraad');
      c.zetGrootheid(
        'heffing_afval',
        c.grootheid('heffing_afval').map((x) => x + deltaLasten * dekking),
      );
      c.effect({
        doel: 'o3',
        kant: 'lasten',
        bedragen: perJaar(c.n, () => deltaLasten * c.param('aandeel_toegerekende_overhead')),
        params: ['aandeel_toegerekende_overhead'],
        uitleg:
          'Minder afvaldienst betekent ook minder overhead die via de heffing wordt betaald. Die overhead komt dan ten laste van de begroting.',
      });
      c.meter('portemonnee', -p);
      c.meter('schoon', p);
    },
  },

  kd_riool: {
    schrijft: ['heffing_riool'],
    reken(c) {
      const p = c.p('o2');
      const groen = c.p('o6');
      if (!p && !groen) return;
      if (p) {
        const delta = p * c.lasten('o2');
        c.zetGrootheid(
          'heffing_riool',
          c.grootheid('heffing_riool').map((x) => x + delta),
        );
        c.meter('portemonnee', -p);
      }
      if (groen) {
        const v = c.verband.vertraging_jaren;
        if (v >= c.n) {
          c.deelsNiet(
            `Het effect van meer of minder groen op de riolering komt pas na ${v} jaar, na de meerjarenraming. Het verlaagt dan de rioolheffing, niet het tekort.`,
          );
        }
      }
      c.uitleg('Riolering wordt volledig betaald uit de rioolheffing. Het saldo verandert niet.');
    },
  },

  kd_leges_omgeving: {
    schrijft: ['bouw_tempo'],
    reken(c) {
      // De omgevingsvergunningen (w8) zitten vast: de bouwleges zijn 100% kostendekkend. Minder
      // ambtenaren voor wonen en gebiedsontwikkeling vertraagt wel de woningbouw.
      const laagste = Math.min(c.p('e10'), c.p('w4'));
      if (laagste >= 0) return;
      const drempel = c.param('drempel_pct');
      const pct = laagste * 100;
      if (pct < -drempel) {
        const minder = (Math.abs(pct) - drempel) / 100;
        c.zetGrootheid(
          'bouw_tempo',
          c.grootheid('bouw_tempo').map((x) => x - minder),
        );
        c.meter('wonen', -minder);
        c.meter('werk', -minder);
      }
    },
  },

  kd_leges_burgerzaken: {
    schrijft: ['wachttijd_burgerzaken'],
    reken(c) {
      const p = c.p('b1');
      if (p >= 0) return;
      c.zetGrootheid(
        'wachttijd_burgerzaken',
        perJaar(c.n, () => 1 + (Math.abs(p) * 100) / 25),
      );
      c.meter('dienstverlening', p);
      c.uitleg(
        'De aanvragen komen toch, dus de leges blijven ongeveer gelijk. Wel worden de wachttijden langer.',
      );
    },
  },

  kd_bedrijfsafval: {
    reken(c) {
      const p = c.p('o4');
      if (p >= 0) return;
      c.effect({
        doel: 'o4',
        kant: 'lasten',
        bedragen: perJaar(c.n, () => p * c.lasten('o4') * c.param('aandeel_vaste_kosten')),
        params: ['aandeel_vaste_kosten'],
        uitleg:
          'Een deel van de kosten van bedrijfsafval loopt door als de gemeente minder doet (vaste kosten). Je bespaart dus minder dan je denkt.',
      });
    },
  },

  kd_werkplaats: {
    reken(c) {
      const p = c.p('o5');
      if (p >= 0) return;
      const v = c.verband.vertraging_jaren;
      c.effect({
        doel: 'h1',
        kant: 'lasten',
        bedragen: perJaar(
          c.n,
          (j) => -p * c.lasten('o5') * c.param('aandeel_overheadvrijval') * vanaf(v, j),
        ),
        params: ['aandeel_overheadvrijval'],
        uitleg:
          'Zonder werk voor derden valt een deel van de overhead vrij. De werkplaats zelf kost netto niets: de inkomsten vallen ook weg.',
      });
    },
  },

  kd_zwembad_tarief: {
    reken(c) {
      if (!c.data.index.belastingen.has('entreeprijzen_sport')) {
        c.wacht('Hiervoor is een schuif voor de entreeprijzen van sportaccommodaties nodig.');
      }
    },
  },

  kd_schouwburg: {
    reken(c) {
      const p = c.p('c1');
      if (!p) return;
      const v = c.verband.vertraging_jaren;
      const toeristen = c.opbrengst('t2') * (1 + c.t('t2'));
      c.effect({
        doel: 'baten:t2',
        kant: 'baten',
        bedragen: perJaar(c.n, (j) => p * c.param('factor_bezoekers') * toeristen * vanaf(v, j)),
        params: ['factor_bezoekers'],
        uitleg:
          'Een deel van de hotelovernachtingen komt door voorstellingen. Meer of minder aanbod verandert de toeristenbelasting.',
      });
    },
  },

  // ---- Rijksgeld en geoormerkte middelen ----
  rijk_geoormerkt: {
    reken(c) {
      const regels: string[] = [];
      for (const id of c.verband.van) {
        const p = c.p(id);
        if (!p || !c.data.index.onderdelen.has(id) || c.baten(id) === 0) continue;
        regels.push(`${naam(c, id)}: ${mlnTekst(-p * c.baten(id))} rijksgeld`);
      }
      if (!regels.length) return;
      c.uitleg(
        `Dit rijksgeld is aan een doel gekoppeld en beweegt mee met de uitgave (zit al in het directe effect): ${regels.join('; ')}.`,
      );
    },
  },

  rijk_buig: {
    leest: ['aantal_bijstand'],
    reken(c) {
      const delta = c.grootheid('aantal_bijstand');
      if (isNul(delta) && c.verband.van.every((id) => !c.p(id))) return;
      c.uitleg(
        'Het bijstandsbudget van het Rijk staat vast. Elk huishouden minder in de bijstand is voordeel voor de gemeente; dat voordeel staat bij de kettingeffecten van werk en inkomen.',
      );
    },
  },

  rijk_verdeelmodel: {
    leest: ['extra_woningen', 'aantal_bijstand'],
    reken(c) {
      const woningen = c.grootheid('extra_woningen');
      const bijstand = c.grootheid('aantal_bijstand');
      if (isNul(woningen) && isNul(bijstand)) return;
      // De bedragen per eenheid staan "in basis": × de uitkeringsfactor geeft euro's. Het Rijk telt
      // de maatstaven van het jaar ervoor, vandaar de vertraging.
      const factor = c.param('uitkeringsfactor');
      const v = c.verband.vertraging_jaren;
      const vorig = (rij: number[], j: number) => (j - v >= 0 ? (rij[j - v] ?? 0) : 0);
      if (!isNul(woningen)) {
        const perWoning =
          (c.param('bedrag_per_woonruimte') +
            c.param('inwoners_per_woning') * c.param('bedrag_per_inwoner')) *
          factor;
        const euro = Math.round(perWoning).toLocaleString('nl-NL');
        c.effect({
          doel: 'grootheid:gemeentefonds',
          kant: 'baten',
          bedragen: perJaar(c.n, (j) => vorig(woningen, j) * perWoning),
          // Het aantal extra woningen is zelf een schatting (wg_woningbouw).
          params: [
            'bedrag_per_woonruimte',
            'inwoners_per_woning',
            'bedrag_per_inwoner',
            'uitkeringsfactor',
            'wg_woningbouw.extra_woningen_per_mln_fonds',
          ],
          uitleg: `Elke nieuwe woning levert ongeveer € ${euro} per jaar gemeentefonds op: voor de woning zelf en voor de inwoners die er komen wonen (meicirculaire 2026). Het Rijk telt de woningen van het jaar ervoor.`,
        });
      }
      if (!isNul(bijstand)) {
        const perHuishouden = c.param('bedrag_per_bijstandshuishouden') * factor;
        const euro = Math.round(perHuishouden).toLocaleString('nl-NL');
        c.effect({
          doel: 'grootheid:gemeentefonds',
          kant: 'baten',
          bedragen: perJaar(c.n, (j) => vorig(bijstand, j) * perHuishouden),
          // Het aantal huishoudens is zelf een schatting (wia_reintegratie).
          params: [
            'bedrag_per_bijstandshuishouden',
            'uitkeringsfactor',
            'wia_reintegratie.kosten_per_traject',
            'wia_reintegratie.slagingskans',
          ],
          uitleg: `Het gemeentefonds geeft ongeveer € ${euro} per bijstandshuishouden (meicirculaire 2026). Minder bijstand levert dus iets minder gemeentefonds op; meer bijstand iets meer. Het voordeel van minder uitkeringen is veel groter.`,
        });
      }
    },
  },

  rijk_ozb_rekentarief: {
    reken(c) {
      if (!c.t('t1')) return;
      c.uitleg(
        'Het Rijk rekent voor het gemeentefonds met een landelijk OZB-tarief. Een lagere OZB betaalt de gemeente dus helemaal zelf.',
      );
    },
  },

  // ---- Werk, inkomen en armoede ----
  wia_reintegratie: {
    schrijft: ['aantal_bijstand'],
    reken(c) {
      const p = c.p('s3');
      if (!p) return;
      const budget = p * c.lasten('s3');
      const uitstroom = (budget / vanMln(c.param('kosten_per_traject'))) * c.param('slagingskans');
      const pad = c.lijst('ingroei');
      const uitkering = vanMln(c.param('rijk_buig.gem_uitkering'));
      const minima = vanMln(c.param('minima_kosten_pp'));
      c.zetGrootheid(
        'aantal_bijstand',
        c.grootheid('aantal_bijstand').map((x, j) => x - uitstroom * ingroei(pad, j)),
      );
      const richting = p > 0 ? 'Meer' : 'Minder';
      c.effect({
        doel: 's1',
        kant: 'lasten',
        bedragen: perJaar(c.n, (j) => uitstroom * uitkering * ingroei(pad, j)),
        params: ['kosten_per_traject', 'slagingskans', 'ingroei', 'rijk_buig.gem_uitkering'],
        uitleg: `${richting} begeleiding naar werk: ongeveer ${Math.round(Math.abs(uitstroom))} huishoudens ${p > 0 ? 'minder' : 'meer'} in de bijstand als het effect helemaal is ingegroeid.`,
      });
      c.effect({
        doel: 's10',
        kant: 'lasten',
        bedragen: perJaar(c.n, (j) => uitstroom * minima * ingroei(pad, j)),
        params: ['kosten_per_traject', 'slagingskans', 'ingroei', 'minima_kosten_pp'],
        uitleg:
          'Wie aan het werk gaat, heeft minder armoederegelingen, bijzondere bijstand en kwijtschelding nodig.',
      });
      c.meter('zorg', p);
    },
  },

  wia_basisbanen: {
    reken(c) {
      if (c.p('s6') >= 0) return;
      c.nogNiet(
        'Het aantal mensen met een basisbaan staat nog niet in de data. Daarom is niet uit te rekenen hoeveel mensen terug in de bijstand komen.',
      );
    },
  },

  wia_loonkosten: {
    reken(c) {
      if (!c.p('s4')) return;
      c.nogNiet(
        'Het aantal mensen met loonkostensubsidie staat nog niet in de data. Daarom is het effect op de bijstand niet uit te rekenen.',
      );
    },
  },

  wia_armoedeval: {
    reken(c) {
      const delta = gemiddeldeP(c, ['s10', 's11', 's12']);
      if (!delta && !c.kaart('k_kwijt')) return;
      // Kwijtschelding schrappen telt als minder regelingen.
      const richting = delta !== 0 ? delta : -1;
      c.meter('werk', -richting / 2);
      c.meter('zorg', richting / 2);
      c.param('rijk_buig.aantal_bijstand');
    },
  },

  wia_kwijtschelding: {
    reken(c) {
      if (!c.kaart('k_kwijt')) return;
      const opbrengst = c.kaartBedrag('k_kwijt');
      c.effect({
        doel: 'grootheid:oninbare_posten',
        kant: 'baten',
        bedragen: perJaar(
          c.n,
          () =>
            -(opbrengst * c.param('oninbaar_pct') + vanMln(c.param('extra_invorderingskosten'))),
        ),
        params: ['oninbaar_pct', 'extra_invorderingskosten'],
        uitleg: `Ongeveer ${c.param('huishoudens').toLocaleString('nl-NL')} huishoudens krijgen nu kwijtschelding. Een deel kan de aanslag niet betalen: dan volgen aanmaningen, invorderingskosten en oninbare posten.`,
      });
      c.deelsNiet('Hoeveel extra mensen schuldhulp nodig hebben, is nog niet doorgerekend.');
    },
  },

  wia_tegenprestatie: {
    reken(c) {
      c.wacht('Hiervoor is een schuif voor een strengere tegenprestatie in de bijstand nodig.');
    },
  },

  wia_inburgering: {
    reken(c) {
      if (!c.p('s7')) return;
      c.nogNiet(
        'Het aantal deelnemers aan inburgering staat nog niet in de data. Daarom is het effect op de bijstand niet uit te rekenen.',
      );
    },
  },

  // ---- Zorg en preventie ----
  zp_schuldhulp: {
    reken(c) {
      if (c.p('s9') >= 0) return;
      const bespaard = besparing(c, 's9');
      const v = c.verband.vertraging_jaren;
      const delen: [string, string, string][] = [
        ['s11', 'a_bijzbijstand', 'meer aanvragen voor bijzondere bijstand'],
        ['z5', 'a_opvang', 'meer mensen in de opvang'],
        ['z1', 'a_jeugd', 'meer jeugdzorg'],
        ['z4', 'a_wij', 'meer werk voor de WIJ-teams'],
      ];
      for (const [doel, param, tekst] of delen) {
        c.effect({
          doel,
          kant: 'lasten',
          bedragen: bespaard.map((b, j) => -b * c.param(param) * vanaf(v, j)),
          params: [param],
          uitleg: `Minder schuldhulp: ${tekst}.`,
        });
      }
    },
  },

  zp_preventie_jeugd: {
    reken(c) {
      const totaal = perJaar(c.n, (j) => som(c.verband.van.map((id) => c.direct(id)[j] ?? 0)));
      if (isNul(totaal)) return;
      const pad = c.lijst('ingroei');
      c.effect({
        doel: 'z1',
        kant: 'lasten',
        bedragen: totaal.map((b, j) => -b * c.param('factor_escalatie') * ingroei(pad, j)),
        params: ['factor_escalatie', 'ingroei'],
        uitleg:
          'Preventie (WIJ-teams, welzijn, onderwijskansen, sport, jeugdwerk) remt de groei van de jeugdzorg. Minder preventie betekent na een paar jaar meer jeugdzorg; meer preventie het omgekeerde.',
      });
    },
  },

  zp_preventie_wmo: {
    reken(c) {
      const totaal = perJaar(c.n, (j) => som(c.verband.van.map((id) => c.direct(id)[j] ?? 0)));
      if (isNul(totaal)) return;
      const pad = c.lijst('ingroei');
      c.effect({
        doel: 'z3',
        kant: 'lasten',
        bedragen: totaal.map((b, j) => -b * c.param('factor') * ingroei(pad, j)),
        params: ['factor', 'ingroei'],
        uitleg:
          'Welzijn en bewegen houden ouderen langer zelfstandig. Minder daarvan betekent na een paar jaar meer Wmo-hulp.',
      });
    },
  },

  zp_beschermd_opvang: {
    reken(c) {
      const ids = c.verband.van.filter((id) => c.p(id) < 0);
      if (!ids.length) return;
      const bespaard = perJaar(c.n, (j) => som(ids.map((id) => besparing(c, id)[j] ?? 0)));
      c.effect({
        doel: 'v3',
        kant: 'lasten',
        bedragen: bespaard.map((b) => -b * c.param('factor_overlast')),
        params: ['factor_overlast'],
        uitleg:
          'Minder beschermd wonen en opvang geeft meer overlast op straat. Dat vraagt meer inzet voor openbare orde en veiligheid.',
      });
      c.meter('veilig', gemiddeldeP(c, ids));
    },
  },

  zp_ongedocumenteerden: {
    reken(c) {
      if (!c.kaart('k_ongedoc')) return;
      const bedrag = c.kaartBedrag('k_ongedoc');
      c.effect({
        doel: 'z5',
        kant: 'lasten',
        bedragen: perJaar(c.n, () => -bedrag * c.param('aandeel_restkosten')),
        params: ['aandeel_restkosten'],
        uitleg:
          'Een deel van de mensen blijft in de gemeente. Dat geeft restkosten in de daklozenopvang en voor veiligheid.',
      });
      c.meterPunten('veilig', -c.data.meters.spelregels.punten_dwarsverband_per_100pct / 4);
    },
  },

  zp_huiselijk_geweld: {
    reken(c) {
      if (c.p('z7') >= 0) return;
      c.nogNiet(GEEN_FORMULE);
    },
  },

  zp_heroine: {
    reken(c) {
      c.wacht('Hiervoor moet heroïneverstrekking als aparte post in de begroting komen.');
    },
  },

  zp_onderwijs_jeugd: {
    reken(c) {
      if (c.p('z1') >= 0 && !c.p('d5')) return;
      c.nogNiet(GEEN_FORMULE);
    },
  },

  zp_gezondheid_sport: {
    reken(c) {
      if (c.p('k1') >= 0 && c.p('k2') >= 0) return;
      c.meter('zorg', gemiddeldeP(c, ['k1', 'k2']) / 2);
      c.nogNiet(`${GEEN_FORMULE} Het effect komt pas na ${c.verband.vertraging_jaren} jaar.`);
    },
  },

  // ---- Veiligheid en handhaving ----
  vh_boetes_rijk: {
    reken(c) {
      if (!c.p('v2')) return;
      c.uitleg(
        "Boetes die boa's uitschrijven gaan naar het Rijk, niet naar de gemeente. Meer boa's leveren de gemeente dus geen boetegeld op.",
      );
    },
  },

  vh_parkeerhandhaving: {
    reken(c) {
      const p = c.p('m2');
      if (!p) return;
      const parkeren = c.opbrengst('t5') * (1 + c.t('t5'));
      c.effect({
        doel: 'baten:t5',
        kant: 'baten',
        bedragen: perJaar(c.n, () => p * c.param('betaalbereidheid') * parkeren),
        params: ['betaalbereidheid'],
        uitleg:
          p < 0
            ? 'Minder parkeercontrole: minder mensen betalen voor parkeren.'
            : 'Meer parkeercontrole: meer mensen betalen voor parkeren.',
      });
    },
  },

  vh_camera_verlichting: {
    reken(c) {
      if (c.p('v3') <= 0 && !c.kaart('k_licht')) return;
      c.nogNiet(
        "De jaarlijkse kosten voor beheer en energie van camera's en verlichting staan nog niet in de data.",
      );
    },
  },

  vh_graffiti_onderhoud: {
    reken(c) {
      const p = c.p('o1');
      if (!p) return;
      const schoon = bijdrageOnderdeel(c.data, 'schoon', 'o1', p);
      c.meterPunten('veilig', c.param('koppeling') * schoon);
    },
  },

  vh_ondermijning_vastgoed: {
    reken(c) {
      const gem = (c.p('v4') + c.p('w3')) / 2;
      if (!gem) return;
      c.meter('wonen', gem);
    },
  },

  vh_evenementen: {
    reken(c) {
      if (!c.p('c2') && !c.p('c3')) return;
      c.nogNiet(GEEN_FORMULE);
    },
  },

  // ---- Openbare ruimte en onderhoud ----
  or_achterstallig: {
    reken(c) {
      if (c.p('o1') >= 0) return;
      const bespaard = besparing(c, 'o1');
      const v = c.verband.vertraging_jaren;
      c.effect({
        doel: 'grootheid:kapitaallasten',
        kant: 'lasten',
        bedragen: bespaard.map(
          (b, j) => (-b * c.param('factor_achterstallig') * Math.max(0, j - (v - 1))) / v,
        ),
        params: ['factor_achterstallig'],
        uitleg:
          'Achterstallig onderhoud wordt later duurder: na een paar jaar moet er meer worden hersteld en komen er schadeclaims.',
      });
    },
  },

  or_areaal: {
    leest: ['extra_woningen'],
    reken(c) {
      const woningen = c.grootheid('extra_woningen');
      if (isNul(woningen)) return;
      const v = c.verband.vertraging_jaren;
      c.effect({
        doel: 'o1',
        kant: 'lasten',
        bedragen: perJaar(
          c.n,
          (j) =>
            -(j - v >= 0 ? (woningen[j - v] ?? 0) : 0) * vanMln(c.param('onderhoud_per_woning')),
        ),
        params: ['onderhoud_per_woning'],
        uitleg: 'Meer woningen betekent meer straten, groen en riolering om te onderhouden.',
      });
    },
  },

  or_zwerfafval: {
    reken(c) {
      c.wacht('Hiervoor moeten prullenbakken als aparte post in de begroting komen.');
    },
  },

  or_klimaat: {
    reken(c) {
      if (!c.p('o6') && !c.p('o1')) return;
      c.nogNiet(
        `${GEEN_FORMULE} Het effect komt pas na ${c.verband.vertraging_jaren} jaar, na de meerjarenraming.`,
      );
    },
  },

  // ---- Economie, parkeren en bezoekers ----
  ec_parkeren_elasticiteit: {
    schrijft: ['binnenstad'],
    reken(c) {
      const x = c.t('t5');
      if (!x) return;
      const e = c.param('elasticiteit');
      c.effect({
        doel: 'baten:t5',
        kant: 'baten',
        bedragen: perJaar(c.n, () => c.opbrengst('t5') * e * x * (1 + x)),
        params: ['elasticiteit'],
        uitleg:
          x > 0
            ? 'Bij een hoger parkeertarief komen er minder auto’s. De opbrengst stijgt dus minder dan het tarief.'
            : 'Bij een lager parkeertarief komen er meer auto’s. Een deel van de gemiste opbrengst komt zo terug.',
      });
      c.zetGrootheid(
        'binnenstad',
        c.grootheid('binnenstad').map((y) => y - x * c.param('factor_binnenstad')),
      );
      c.meter('schoon', x);
    },
  },

  ec_gratis_parkeren: {
    reken(c) {
      if (c.t('t5') > -1) return;
      c.uitleg(
        'Bij gratis parkeren lopen de rente en afschrijving van de garages en wegen gewoon door.',
      );
    },
  },

  ec_reclame: {
    reken(c) {
      if (!c.t('t3') && !c.p('v9')) return;
      c.uitleg(
        'De reclamebelasting en de reclamezuilen staan al als bedrag in je keuzes. Reclamezuilen leveren geld op.',
      );
    },
  },

  ec_toerisme_cultuur: {
    reken(c) {
      const gem = gemiddeldeP(c, c.verband.van);
      if (!gem) return;
      const v = c.verband.vertraging_jaren;
      const toeristen = c.opbrengst('t2') * (1 + c.t('t2'));
      c.effect({
        doel: 'baten:t2',
        kant: 'baten',
        bedragen: perJaar(c.n, (j) => gem * c.param('factor') * toeristen * vanaf(v, j)),
        params: ['factor'],
        uitleg:
          'Cultuur, evenementen en citymarketing trekken bezoekers. Dat verandert de toeristenbelasting.',
      });
    },
  },

  ec_precario_terras: {
    reken(c) {
      if (!c.t('t4')) return;
      c.uitleg(
        'Precario betalen horeca voor terrassen en inwoners voor containers en steigers. De opbrengst is klein, maar je merkt het wel.',
      );
    },
  },

  ec_ozb_nietwoningen: {
    reken(c) {
      if (!c.t('t1')) return;
      c.param('verdeling');
    },
  },

  ec_strategisch_bezit: {
    reken(c) {
      if (!c.p('e7') && !c.kaart('k_vast')) return;
      c.param('boekwaarde');
    },
  },

  // ---- Wonen, groei en grond ----
  wg_woningbouw: {
    schrijft: ['extra_woningen'],
    reken(c) {
      if (!c.kaart('k_bouw')) return;
      const fondsMln = Math.abs(c.kaartBedrag('k_bouw')) / vanMln(1);
      const perJaarExtra = fondsMln * c.param('extra_woningen_per_mln_fonds');
      const v = c.verband.vertraging_jaren;
      const voorraad = perJaar(c.n, (j) => perJaarExtra * Math.max(0, j - v + 1));
      c.zetGrootheid(
        'extra_woningen',
        c.grootheid('extra_woningen').map((x, j) => x + (voorraad[j] ?? 0)),
      );
      // OZB per nieuwe woning: het tarief × de gemiddelde WOZ-waarde, met de OZB-keuze van de
      // speler. Zonder tarievenbestand de parameter ozb_per_woning.
      const t = c.data.tarieven;
      const woz = c.data.kengetallen.gemiddelde_woz;
      const uitTarief = t && woz ? (t.ozb_woning_eigenaar_pct / 100) * woz : undefined;
      const perWoning =
        (uitTarief ?? vanMln(c.param('ozb_per_woning'))) * Math.max(0, 1 + c.t('t1'));
      const euro = Math.round(perWoning).toLocaleString('nl-NL');
      c.effect({
        doel: 'baten:t1',
        kant: 'baten',
        bedragen: voorraad.map((w) => w * perWoning),
        params: uitTarief
          ? ['extra_woningen_per_mln_fonds']
          : ['extra_woningen_per_mln_fonds', 'ozb_per_woning'],
        uitleg: `Het fonds levert ongeveer ${Math.round(perJaarExtra)} extra woningen per jaar op, vanaf ${c.data.jaren[v] ?? 'na de meerjarenraming'}. Elke nieuwe woning betaalt ongeveer € ${euro} OZB per jaar${uitTarief ? ` (${t?.ozb_woning_eigenaar_pct.toLocaleString('nl-NL')}% van de gemiddelde WOZ-waarde${c.t('t1') ? ', met jouw OZB-keuze' : ''})` : ''}.`,
      });
      c.meter('wonen', 1);
      c.deelsNiet(
        'De kosten van voorzieningen (scholen, zorg) voor nieuwe inwoners zijn nog niet doorgerekend. Het extra gemeentefonds staat bij het kettingeffect van het verdeelmodel.',
      );
    },
  },

  wg_grondexploitatie: {
    reken(c) {
      if (!c.kaart('k_bouw') && !c.p('e11')) return;
      c.nogNiet(GEEN_FORMULE);
    },
  },

  wg_onderwijshuisvesting: {
    leest: ['extra_woningen', 'bouw_tempo'],
    reken(c) {
      if (isNul(c.grootheid('extra_woningen'))) return;
      c.nogNiet(GEEN_FORMULE);
    },
  },

  wg_verduurzaming: {
    reken(c) {
      const p = c.p('w11');
      if (!p) return;
      const v = c.verband.vertraging_jaren;
      const extra = p * c.lasten('w11');
      c.effect({
        doel: 'grootheid:energiekosten',
        kant: 'lasten',
        // Elk jaar extra budget verdient zich daarna terug: de besparing stapelt.
        bedragen: perJaar(c.n, (j) => extra * c.param('rendement') * Math.max(0, j - v + 1)),
        params: ['rendement'],
        uitleg:
          'Gemeentegebouwen verduurzamen verlaagt de energiekosten. Elk jaar extra investeren levert de jaren daarna een besparing op.',
      });
    },
  },

  // ---- Energie en deelnemingen ----
  en_warmtestad: {
    reken(c) {
      if (!c.kaart('k_warm')) return;
      c.nogNiet('Het dividend dat na de verkoop wegvalt, staat nog niet in de data.');
    },
  },

  en_opwek: {
    reken(c) {
      if (!c.kaart('k_zon') && !c.kaart('k_wind')) return;
      c.param('gemiste_opbrengst');
    },
  },

  en_dividenden: {
    reken(c) {
      c.wacht('Hiervoor moeten dividend en deelnemingen als aparte post in de begroting komen.');
    },
  },

  // ---- Organisatie en uitvoering ----
  org_frictie: {
    reken(c) {
      const ids = c.verband.van.filter((id) => c.p(id) < 0);
      if (!ids.length) return;
      c.meter('dienstverlening', gemiddeldeP(c, ids));
      c.param('personeelskosten');
    },
  },

  org_capaciteit: {
    schrijft: ['bouw_tempo', 'vergunningen_tempo', 'investeringen_tempo'],
    reken(c) {
      const p = c.p('h1');
      if (!p) return;
      const factor = 1 + c.param('factor_tempo') * p;
      for (const g of ['bouw_tempo', 'vergunningen_tempo', 'investeringen_tempo']) {
        c.zetGrootheid(
          g,
          c.grootheid(g).map((x) => x * factor),
        );
      }
      c.uitleg(
        `Met ${p < 0 ? 'minder' : 'meer'} ambtelijke capaciteit gaan bouwen, vergunningen en investeringen ${p < 0 ? 'langzamer' : 'sneller'} (tempo ${formatPct(Math.round((factor - 1) * 100))}).`,
      );
    },
  },

  org_ai: {
    reken(c) {
      if (!c.kaart('k_ai')) return;
      const investering = Math.abs(c.kaartBedrag('k_ai'));
      const pad = c.lijst('ingroei');
      c.effect({
        doel: 'h1',
        kant: 'lasten',
        bedragen: perJaar(c.n, (j) => investering * c.param('rendement') * ingroei(pad, j)),
        params: ['rendement', 'ingroei'],
        uitleg:
          'Investeren in AI verdient zich pas na een paar jaar terug, via minder werk bij de loketten en in de organisatie.',
      });
    },
  },

  org_bereikbaarheid: {
    reken(c) {
      const ids = c.verband.van.filter((id) => c.p(id) < 0);
      if (!ids.length) return;
      c.meter('dienstverlening', gemiddeldeP(c, ids));
      c.nogNiet(GEEN_FORMULE);
    },
  },

  org_wethouders: {
    reken(c) {
      if (c.p('g1') >= 0) return;
      c.nogNiet(
        'Het wachtgeld en het moment van de verkiezingen staan nog niet in de data. De besparing gaat pas in na de verkiezingen.',
      );
    },
  },

  // ---- Financiering, reserves en tijd ----
  fin_kapitaallasten: {
    reken(c) {
      const investeringen = c.keuzes.kaarten.filter(
        (id) => c.data.index.kaarten.get(id)?.investering,
      );
      if (!investeringen.length) return;
      c.uitleg(
        'Een investering betaal je niet in één keer: je schrijft hem af over de levensduur en betaalt rente. Dat staat bij de actiekaart als kapitaallasten per jaar.',
      );
    },
  },

  fin_incidenteel_structureel: {
    reken(c) {
      const eenmalig = c.keuzes.kaarten.some(
        (id) => c.data.index.kaarten.get(id)?.structureel_of_incidenteel === 'I',
      );
      if (!eenmalig) return;
      c.uitleg(
        'Eenmalig geld mag je niet gebruiken voor vaste lasten. De game controleert dat per jaar.',
      );
    },
  },

  fin_reserves: {
    reken(c) {
      if (!c.verband.van.some((id) => c.kaart(id)) && !c.keuzes.reserve) return;
      c.uitleg(
        'Reserves aanvullen vergroot de buffer voor tegenvallers. Het weerstandsvermogen gaat omhoog en de risico’s worden kleiner.',
      );
    },
  },

  fin_rente: {
    reken(c) {
      const investeringen = c.keuzes.kaarten.some(
        (id) => c.data.index.kaarten.get(id)?.investering,
      );
      const stortingen = stortingenInReserve(c.data, c.keuzes);
      const gestort = c.data.jaren.map((jaar) => stortingen[jaar] ?? 0);
      if (!investeringen && isNul(gestort)) return;
      if (!isNul(gestort)) {
        // Wat in de reserve zit, hoeft de gemeente niet te lenen. Dat scheelt rente vanaf het jaar erna.
        c.effect({
          doel: 'grootheid:rente',
          kant: 'lasten',
          bedragen: perJaar(
            c.n,
            (j) => c.param('fin_kapitaallasten.rente') * som(gestort.slice(0, j)),
          ),
          params: ['fin_kapitaallasten.rente'],
          uitleg:
            'Geld in de reserve hoeft de gemeente niet te lenen. Dat scheelt rente, vanaf het jaar na de storting.',
        });
      }
      if (investeringen) {
        if (isNul(gestort)) c.nogNiet(GEEN_FORMULE);
        c.deelsNiet('De extra rente door lenen voor investeringen is nog niet doorgerekend.');
      }
    },
  },

  // ---- Juridisch en contractueel ----
  jur_subsidies: {
    reken(c) {
      const pad = c.lijst('ingroei');
      for (const id of c.verband.van) {
        const o = c.data.index.onderdelen.get(id);
        // Een post met een eigen ingroeipad heeft de afbouw al in het directe effect.
        if (!o || o.ingroeipad || c.p(id) >= 0) continue;
        const direct = c.direct(id);
        c.effect({
          doel: id,
          kant: 'lasten',
          bedragen: direct.map((d, j) => -d * (1 - ingroei(pad, j))),
          params: ['ingroei'],
          uitleg: `${o.naam}: een subsidie moet je netjes opzeggen. De besparing komt pas later volledig binnen.`,
        });
      }
    },
  },

  jur_wettelijk: {
    reken(c) {
      const opGrens = c.verband.van.filter((id) => {
        const o = c.data.index.onderdelen.get(id);
        return (
          o?.wettelijke_taak && o.min_pct !== null && (c.keuzes.onderdelen[id] ?? 0) <= o.min_pct
        );
      });
      if (!opGrens.length) return;
      c.uitleg(
        `Wettelijke taken hebben een ondergrens. Verder bezuinigen kan niet bij: ${opGrens.map((id) => naam(c, id)).join(', ')}.`,
      );
    },
  },

  jur_gr: {
    reken(c) {
      const v = c.verband.vertraging_jaren;
      for (const id of c.verband.van) {
        const o = c.data.index.onderdelen.get(id);
        if (!o || o.vergrendeld || c.p(id) >= 0) continue;
        c.effect({
          doel: id,
          kant: 'lasten',
          bedragen: c.direct(id).map((d, j) => (j < v ? -d : 0)),
          params: [],
          uitleg: `${o.naam}: deze bijdrage bepaalt de gemeente samen met andere gemeenten. De besparing komt pas na ${v} jaar.`,
        });
      }
    },
  },

  jur_contracten: {
    reken(c) {
      const v = c.verband.vertraging_jaren;
      for (const id of c.verband.van) {
        const o = c.data.index.onderdelen.get(id);
        if (!o || o.vergrendeld || c.p(id) >= 0) continue;
        c.effect({
          doel: id,
          kant: 'lasten',
          bedragen: c.direct(id).map((d, j) => (j < v ? -d : 0)),
          params: [],
          uitleg: `${o.naam}: dit wordt ingekocht via contracten die meerdere jaren lopen. Bezuinigen kan pas bij een nieuwe aanbesteding, na ${v} jaar.`,
        });
      }
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Volgorde: graaf en topologische sortering
// ---------------------------------------------------------------------------------------------

export type Volgorde = { volgorde: string[]; kringen: string[][]; zelfverwijzingen: string[] };

const volgordeCache = new WeakMap<object, Volgorde>();

/** Verbanden waarvan `naar` een `van` van een ander verband raakt, of die een grootheid doorgeven. */
export function bouwGraaf(verbanden: Dwarsverband[]): Map<string, Set<string>> {
  const graaf = new Map<string, Set<string>>(verbanden.map((v) => [v.id, new Set<string>()]));
  for (const a of verbanden) {
    const implA = IMPLEMENTATIES[a.id];
    for (const b of verbanden) {
      if (a.id === b.id) continue;
      const implB = IMPLEMENTATIES[b.id];
      const raakt =
        a.naar.some((x) => b.van.includes(x)) ||
        a.naar.includes(`verband:${b.id}`) ||
        (implA?.schrijft ?? []).some((g) => (implB?.leest ?? []).includes(g));
      if (raakt) graaf.get(a.id)?.add(b.id);
    }
  }
  return graaf;
}

/** Sterk samenhangende componenten met meer dan één verband (Tarjan). */
function vindKringen(graaf: Map<string, Set<string>>): string[][] {
  let teller = 0;
  const index = new Map<string, number>();
  const laag = new Map<string, number>();
  const stapel: string[] = [];
  const opStapel = new Set<string>();
  const kringen: string[][] = [];

  const bezoek = (v: string): void => {
    index.set(v, teller);
    laag.set(v, teller);
    teller++;
    stapel.push(v);
    opStapel.add(v);
    for (const w of graaf.get(v) ?? []) {
      if (!index.has(w)) {
        bezoek(w);
        laag.set(v, Math.min(laag.get(v) ?? 0, laag.get(w) ?? 0));
      } else if (opStapel.has(w)) {
        laag.set(v, Math.min(laag.get(v) ?? 0, index.get(w) ?? 0));
      }
    }
    if (laag.get(v) === index.get(v)) {
      const groep: string[] = [];
      let w: string | undefined;
      do {
        w = stapel.pop();
        if (w === undefined) break;
        opStapel.delete(w);
        groep.push(w);
      } while (w !== v);
      if (groep.length > 1) kringen.push(groep.sort());
    }
  };
  for (const v of graaf.keys()) if (!index.has(v)) bezoek(v);
  return kringen;
}

/** Topologische volgorde (Kahn), bij gelijke stand in de volgorde van de JSON. */
export function bepaalVolgorde(verbanden: Dwarsverband[]): Volgorde {
  const graaf = bouwGraaf(verbanden);
  const ingraad = new Map<string, number>(verbanden.map((v) => [v.id, 0]));
  for (const doelen of graaf.values()) {
    for (const d of doelen) ingraad.set(d, (ingraad.get(d) ?? 0) + 1);
  }
  const positie = new Map(verbanden.map((v, i) => [v.id, i]));
  const klaar: string[] = [];
  const gedaan = new Set<string>();
  const beschikbaar = (): string[] =>
    verbanden.map((v) => v.id).filter((id) => !gedaan.has(id) && (ingraad.get(id) ?? 0) === 0);

  for (;;) {
    const volgende = beschikbaar()[0];
    if (volgende === undefined) {
      // Kring: reken de rest één keer door, in de volgorde van de JSON.
      const rest = verbanden.map((v) => v.id).filter((id) => !gedaan.has(id));
      if (!rest.length) break;
      rest.sort((a, b) => (positie.get(a) ?? 0) - (positie.get(b) ?? 0));
      const eerste = rest[0];
      if (eerste === undefined) break;
      ingraad.set(eerste, 0);
      continue;
    }
    gedaan.add(volgende);
    klaar.push(volgende);
    for (const d of graaf.get(volgende) ?? []) ingraad.set(d, (ingraad.get(d) ?? 0) - 1);
  }

  const zelfverwijzingen = verbanden
    .filter((v) => v.naar.some((x) => v.van.includes(x)))
    .map((v) => v.id);
  return { volgorde: klaar, kringen: vindKringen(graaf), zelfverwijzingen };
}

export function volgordeVoor(data: Data): Volgorde {
  const sleutel = data.dwarsverbanden;
  let v = volgordeCache.get(sleutel);
  if (!v) {
    v = bepaalVolgorde(data.dwarsverbanden.dwarsverbanden);
    volgordeCache.set(sleutel, v);
  }
  return v;
}

// ---------------------------------------------------------------------------------------------
// Doorrekenen
// ---------------------------------------------------------------------------------------------

const ZEKERHEID_ORDE: Record<Zekerheid, number> = { feit: 0, aanname: 1, 'te onderzoeken': 2 };

function zwakste(statussen: Zekerheid[]): Zekerheid {
  return statussen.reduce<Zekerheid>(
    (a, b) => (ZEKERHEID_ORDE[b] > ZEKERHEID_ORDE[a] ? b : a),
    'feit',
  );
}

type Uitvoer = {
  effecten: Effect[];
  meters: Partial<Record<MeterId, number>>;
  grootheden: Grootheden;
  status: VerbandStatus;
  reden?: string;
  bandbreedteGelezen: boolean;
};

export type VerbandInvoer = {
  data: Data;
  keuzes: Keuzes;
  /** directe effecten op het saldo per bron, per jaar */
  direct: Map<string, number[]>;
  basisMeters: Record<MeterId, number>;
};

function draai(
  invoer: VerbandInvoer,
  verband: Dwarsverband,
  impl: Implementatie,
  grootheden: Grootheden,
  eind: Eind,
): Uitvoer {
  const { data, keuzes } = invoer;
  const n = data.jaren.length;
  const lokaal: Grootheden = new Map([...grootheden].map(([k, v]) => [k, [...v]]));
  const uit: Uitvoer = {
    effecten: [],
    meters: {},
    grootheden: lokaal,
    status: 'niet actief',
    bandbreedteGelezen: false,
  };
  let uitlegTekst: string | undefined;
  const deels: string[] = [];
  let actief = false;

  const zoekParam = (ref: string) => {
    const [verbandId, naamParam] = ref.includes('.') ? ref.split('.', 2) : [verband.id, ref];
    const bron = verbandId === verband.id ? verband : data.index.verbanden.get(verbandId ?? '');
    const p = bron?.parameters[naamParam ?? ''];
    if (!p)
      throw new Error(`Dwarsverband ${verband.id}: parameter "${ref}" bestaat niet in de data.`);
    return p;
  };

  const ctx: Ctx = {
    data,
    keuzes,
    verband,
    n,
    p: (id) => (keuzes.onderdelen[id] ?? 0) / 100,
    t: (id) => (keuzes.belastingen[id] ?? 0) / 100,
    kaart: (id) => keuzes.kaarten.includes(id),
    lasten(id, j = 0) {
      const o = data.index.onderdelen.get(id);
      if (!o) return 0;
      const jaar = String(data.jaren[j] ?? data.jaren[0]);
      return vanMln(o.lasten_per_jaar_mln?.[jaar] ?? o.lasten_mln);
    },
    baten: (id) => vanMln(data.index.onderdelen.get(id)?.gekoppelde_baten_mln ?? 0),
    opbrengst: (id) => vanMln(data.index.belastingen.get(id)?.opbrengst_mln ?? 0),
    kaartBedrag: (id) => vanMln(data.index.kaarten.get(id)?.bedrag_mln ?? 0),
    direct: (id) => invoer.direct.get(id) ?? perJaar(n, () => 0),
    param(ref) {
      const p = zoekParam(ref);
      if (typeof p.waarde !== 'number') {
        if (p.waarde === null) {
          ctx.nogNiet(
            `De waarde voor "${ref.split('.').pop()}" ontbreekt nog (${p.status}). ${p.toelichting}`.trim(),
          );
        }
        throw new Error(`Dwarsverband ${verband.id}: parameter "${ref}" is geen getal.`);
      }
      if (heeftBandbreedte(p)) uit.bandbreedteGelezen = true;
      return waardeBij(p, eind) ?? p.waarde;
    },
    lijst(ref) {
      const p = zoekParam(ref);
      if (!Array.isArray(p.waarde)) {
        throw new Error(`Dwarsverband ${verband.id}: parameter "${ref}" is geen lijst.`);
      }
      return p.waarde;
    },
    basisMeter: (m) => invoer.basisMeters[m],
    grootheid: (naamG) => [...(lokaal.get(naamG) ?? perJaar(n, () => GROOTHEID_START[naamG] ?? 0))],
    zetGrootheid(naamG, rij) {
      actief = true;
      lokaal.set(naamG, rij);
    },
    effect(e) {
      actief = true;
      const zekerheid =
        e.params.length === 0 ? 'aanname' : zwakste(e.params.map((r) => zoekParam(r).status));
      e.bedragen.forEach((bedrag, j) => {
        if (Math.abs(bedrag) < 0.005 || !Number.isFinite(bedrag)) return;
        uit.effecten.push({
          bron: verband.id,
          doel: e.doel,
          bedrag,
          jaar: data.jaren[j] ?? 0,
          soort: e.soort ?? 'S',
          zekerheid,
          uitleg: e.uitleg,
          stap: 'dwarsverband',
          kant: e.kant,
          verband: verband.id,
        });
      });
    },
    meter(m, fractie) {
      ctx.meterPunten(m, fractie * data.meters.spelregels.punten_dwarsverband_per_100pct);
    },
    meterPunten(m, punten) {
      if (!punten || !Number.isFinite(punten)) return;
      actief = true;
      uit.meters[m] = (uit.meters[m] ?? 0) + punten;
    },
    uitleg(tekst) {
      uitlegTekst = tekst;
    },
    nogNiet(reden) {
      throw new NietDoorgerekend(reden);
    },
    wacht(reden) {
      throw new WachtOpPost(reden);
    },
    deelsNiet(reden) {
      deels.push(reden);
    },
  };

  try {
    impl.reken(ctx);
    if (actief) {
      uit.status = 'doorgerekend';
      const redenen = [uitlegTekst, ...deels].filter(Boolean);
      if (redenen.length) uit.reden = redenen.join(' ');
    } else if (uitlegTekst || deels.length) {
      uit.status = 'alleen uitleg';
      uit.reden = [uitlegTekst, ...deels].filter(Boolean).join(' ');
    }
  } catch (fout) {
    if (fout instanceof NietDoorgerekend) {
      uit.status = 'nog niet doorgerekend';
      uit.reden = fout.message;
      uit.effecten = [];
    } else if (fout instanceof WachtOpPost) {
      uit.status = 'wacht op nieuwe post';
      uit.reden = fout.message;
      uit.effecten = [];
      uit.meters = {};
    } else {
      throw fout;
    }
  }
  return uit;
}

export type VerbandResultaat = {
  effecten: Effect[];
  meters: Record<MeterId, number>;
  grootheden: Record<string, number[]>;
  uitkomsten: Record<string, VerbandUitkomst>;
};

/**
 * Rekent alle dwarsverbanden door. Bij een ander scenario dan "midden" wordt elk verband met een
 * bandbreedte twee keer doorgerekend (laag en hoog) en telt de minst (voorzichtig) of meest
 * (optimistisch) gunstige uitkomst.
 */
export function rekenDwarsverbanden(
  invoer: VerbandInvoer,
  nulMeters: Record<MeterId, number>,
): VerbandResultaat {
  const { data, keuzes } = invoer;
  let grootheden: Grootheden = new Map();
  const effecten: Effect[] = [];
  const meters = { ...nulMeters };
  const uitkomsten: Record<string, VerbandUitkomst> = {};

  for (const id of volgordeVoor(data).volgorde) {
    const verband = data.index.verbanden.get(id);
    const impl = IMPLEMENTATIES[id];
    if (!verband) continue;
    if (!impl) {
      uitkomsten[id] = {
        status: 'nog niet doorgerekend',
        reden: 'Dit kettingeffect is nog niet in de rekenmotor ingebouwd.',
        eind: 'midden',
      };
      continue;
    }
    let gekozen = draai(invoer, verband, impl, grootheden, 'midden');
    let eind: Eind = 'midden';
    if (keuzes.scenario !== 'midden' && gekozen.bandbreedteGelezen) {
      const laag = draai(invoer, verband, impl, grootheden, 'laag');
      const hoog = draai(invoer, verband, impl, grootheden, 'hoog');
      const somLaag = som(laag.effecten.map((e) => e.bedrag));
      const somHoog = som(hoog.effecten.map((e) => e.bedrag));
      const laagIsSlechter = somLaag <= somHoog;
      const voorzichtig = keuzes.scenario === 'voorzichtig';
      if (somLaag !== somHoog) {
        gekozen = voorzichtig === laagIsSlechter ? laag : hoog;
        eind = voorzichtig === laagIsSlechter ? 'laag' : 'hoog';
      }
    }
    grootheden = gekozen.grootheden;
    effecten.push(...gekozen.effecten);
    for (const [m, punten] of Object.entries(gekozen.meters) as [MeterId, number][]) {
      meters[m] += punten;
    }
    uitkomsten[id] = {
      status: gekozen.status,
      ...(gekozen.reden ? { reden: gekozen.reden } : {}),
      eind,
    };
  }

  return {
    effecten,
    meters,
    grootheden: Object.fromEntries(grootheden),
    uitkomsten,
  };
}

/**
 * Per dwarsverband minstens één test (opdracht 6.6). Bedragen zijn met de hand nagerekend uit
 * data/begroting-2026.json en data/dwarsverbanden.json (scenario midden, tenzij anders vermeld).
 * Bedragen in miljoenen per jaar 2026 t/m 2029.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { bepaalVolgorde, IMPLEMENTATIES } from '../dwarsverbanden';
import { metExtraKaarten, type Data } from '../laadData';
import { bereken } from '../rekenen';
import type { Keuzes, Resultaat, VerbandStatus } from '../types';
import { echteData, keuzes, metAangepasteBegroting, mln, perJaarMln } from './hulp';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});

type Geval = {
  keuzes: Partial<Keuzes>;
  status: VerbandStatus;
  /** som van de effecten van dit verband per jaar, in miljoenen */
  bedragen?: number[];
  /** extra controle op het resultaat */
  controle?: (r: Resultaat) => void;
  /** aangepaste data voor dit geval */
  data?: (d: Data) => Data;
};

const vrijgeven = (ids: string[]) => (d: Data) =>
  metAangepasteBegroting(d, (b) => {
    for (const o of b.onderdelen) {
      if (ids.includes(o.id)) {
        o.vergrendeld = false;
        o.min_pct = -50;
        o.max_pct = 25;
      }
    }
  });

const metInvestering = (d: Data) =>
  metExtraKaarten(d, [
    {
      id: 'test_investering',
      soort: 'uitgave',
      structureel_of_incidenteel: 'S',
      bedrag_mln: -10,
      naam: 'Testinvestering',
      uitleg: '',
      meter_effect_punten: {},
      bron: 'test',
      investering: { bedrag_mln: 10, levensduur_jaar: 40, eenmalige_bijdrage: false },
    },
  ]);

const GEVALLEN: Record<string, Geval> = {
  // −0,2 × 36,8 = −7,36 minder lasten; overhead 10% daarvan komt ten laste van de begroting
  kd_afval: {
    data: vrijgeven(['o3']),
    keuzes: { onderdelen: { o3: -20 } },
    status: 'doorgerekend',
    bedragen: [-0.736, -0.736, -0.736, -0.736],
    controle: (r) => {
      expect(mln(r.grootheden.heffing_afval?.[0] ?? 0)).toBe(-7.36);
      expect(r.meters.portemonnee).toBe(52);
      expect(r.meters.schoon).toBe(48);
    },
  },
  kd_riool: {
    keuzes: { onderdelen: { o6: -50 } },
    status: 'alleen uitleg',
    bedragen: [0, 0, 0, 0],
  },
  // w8 zit vast (bouwleges kostendekkend); e10 −50% geeft minder bouwtempo: (50 − 20)/100 = 0,3
  kd_leges_omgeving: {
    keuzes: { onderdelen: { e10: -50 } },
    status: 'doorgerekend',
    bedragen: [0, 0, 0, 0],
    controle: (r) => expect(r.grootheden.bouw_tempo?.[0]).toBeCloseTo(0.7, 10),
  },
  kd_leges_burgerzaken: {
    keuzes: { onderdelen: { b1: -25 } },
    status: 'doorgerekend',
    bedragen: [0, 0, 0, 0],
    controle: (r) => {
      expect(r.grootheden.wachttijd_burgerzaken?.[0]).toBe(2);
      expect(r.meters.dienstverlening).toBe(47.5);
    },
  },
  // −1 × 7,6 × 0,2 = −1,52 (vaste kosten lopen door)
  kd_bedrijfsafval: {
    keuzes: { onderdelen: { o4: -100 } },
    status: 'doorgerekend',
    bedragen: [-1.52, -1.52, -1.52, -1.52],
  },
  // 1 × 0,9 × 0,1 = 0,09 overheadvrijval, vanaf jaar 2
  kd_werkplaats: {
    keuzes: { onderdelen: { o5: -100 } },
    status: 'doorgerekend',
    bedragen: [0, 0.09, 0.09, 0.09],
  },
  kd_zwembad_tarief: { keuzes: {}, status: 'wacht op nieuwe post' },
  // −0,2 × 0,05 × 2,9 = −0,029 toeristenbelasting, vanaf jaar 2
  kd_schouwburg: {
    keuzes: { onderdelen: { c1: -20 } },
    status: 'doorgerekend',
    bedragen: [0, -0.029, -0.029, -0.029],
  },
  rijk_geoormerkt: {
    keuzes: { onderdelen: { w6: -100 } },
    status: 'alleen uitleg',
    bedragen: [0, 0, 0, 0],
    controle: (r) =>
      expect(r.verbanden.rijk_geoormerkt?.reden).toMatch(/Energiesubsidies: € 11,70 mln/),
  },
  rijk_buig: { keuzes: { onderdelen: { s3: 10 } }, status: 'alleen uitleg' },
  // k_bouw 5 mln × 20 = 100 woningen per jaar vanaf jaar 3; het fonds telt ze een jaar later.
  // Per woning: (11,55 + 1,93 × 374,88) × 1,491 = 1.095,99 euro.
  rijk_verdeelmodel: {
    keuzes: { kaarten: ['k_bouw'] },
    status: 'doorgerekend',
    bedragen: [0, 0, 0, 0.1095987],
  },
  rijk_ozb_rekentarief: { keuzes: { belastingen: { t1: -10 } }, status: 'alleen uitleg' },
  // s3 +10% = 2,07 mln → 2,07 / 0,008 × 0,3 = 77,625 huishoudens.
  // Bijstand: 77,625 × 0,0165 = 1,2808125; minima: 77,625 × 0,0015 = 0,1164375; samen 1,39725.
  // Ingroei 0,3 / 0,7 / 1 / 1.
  wia_reintegratie: {
    keuzes: { onderdelen: { s3: 10 } },
    status: 'doorgerekend',
    bedragen: [0.419175, 0.978075, 1.39725, 1.39725],
    controle: (r) =>
      expect(r.grootheden.aantal_bijstand?.map((x) => Math.round(x * 1e4) / 1e4)).toEqual([
        -23.2875, -54.3375, -77.625, -77.625,
      ]),
  },
  wia_basisbanen: { keuzes: { onderdelen: { s6: -50 } }, status: 'nog niet doorgerekend' },
  wia_loonkosten: { keuzes: { onderdelen: { s4: -10 } }, status: 'nog niet doorgerekend' },
  wia_armoedeval: {
    keuzes: { onderdelen: { s10: -20 } },
    status: 'nog niet doorgerekend',
    controle: (r) => expect(r.verbanden.wia_armoedeval?.reden).toMatch(/aantal_bijstand/),
  },
  // −(4,2 × 0,3 + 0,3) = −1,56
  wia_kwijtschelding: {
    keuzes: { kaarten: ['k_kwijt'] },
    status: 'doorgerekend',
    bedragen: [-1.56, -1.56, -1.56, -1.56],
  },
  wia_tegenprestatie: { keuzes: {}, status: 'wacht op nieuwe post' },
  wia_inburgering: { keuzes: { onderdelen: { s7: -10 } }, status: 'nog niet doorgerekend' },
  // s9 −20%: 0,2 × (11,3 − 1,1) = 2,04 bespaard; vanaf jaar 2: −2,04 × (0,25 + 0,1 + 0,1 + 0,05)
  zp_schuldhulp: {
    keuzes: { onderdelen: { s9: -20 } },
    status: 'doorgerekend',
    bedragen: [0, -1.02, -1.02, -1.02],
  },
  // z4 −10%: 4,42 bespaard; −4,42 × 0,3 × ingroei (0 / 0,5 / 1 / 1)
  zp_preventie_jeugd: {
    keuzes: { onderdelen: { z4: -10 } },
    status: 'doorgerekend',
    bedragen: [0, -0.663, -1.326, -1.326],
  },
  // k3 −100%: 1,1 bespaard; −1,1 × 0,2 × ingroei (0 / 0,5 / 1 / 1)
  zp_preventie_wmo: {
    keuzes: { onderdelen: { k3: -100 } },
    status: 'doorgerekend',
    bedragen: [0, -0.11, -0.22, -0.22],
  },
  // z2 −10%: 0,1 × (84,4 − 1,4) = 8,3 bespaard; × 0,1 overlast
  zp_beschermd_opvang: {
    keuzes: { onderdelen: { z2: -10 } },
    status: 'doorgerekend',
    bedragen: [-0.83, -0.83, -0.83, -0.83],
  },
  // −3,5 × 0,2 = −0,7 restkosten
  zp_ongedocumenteerden: {
    keuzes: { kaarten: ['k_ongedoc'] },
    status: 'doorgerekend',
    bedragen: [-0.7, -0.7, -0.7, -0.7],
  },
  zp_huiselijk_geweld: { keuzes: { onderdelen: { z7: -10 } }, status: 'nog niet doorgerekend' },
  zp_heroine: { keuzes: {}, status: 'wacht op nieuwe post' },
  zp_onderwijs_jeugd: { keuzes: { onderdelen: { z1: -10 } }, status: 'nog niet doorgerekend' },
  zp_gezondheid_sport: { keuzes: { onderdelen: { k2: -50 } }, status: 'nog niet doorgerekend' },
  vh_boetes_rijk: { keuzes: { onderdelen: { v2: 10 } }, status: 'alleen uitleg' },
  // −1 × 0,1 × 35,1 = −3,51
  vh_parkeerhandhaving: {
    keuzes: { onderdelen: { m2: -100 } },
    status: 'doorgerekend',
    bedragen: [-3.51, -3.51, -3.51, -3.51],
  },
  vh_camera_verlichting: { keuzes: { kaarten: ['k_licht'] }, status: 'nog niet doorgerekend' },
  // Schoon-bijdrage van o1 −10%: 120 × 66,4 × −0,1 / 76,553 = −10,40847; veilig += 0,3 × dat
  vh_graffiti_onderhoud: {
    keuzes: { onderdelen: { o1: -10 } },
    status: 'doorgerekend',
    controle: (r) => expect(r.meters.veilig).toBeCloseTo(50 - 0.3 * 10.40847, 4),
  },
  // (0,2 + 0) / 2 = 0,1 → wonen + 1 punt
  vh_ondermijning_vastgoed: {
    keuzes: { onderdelen: { v4: 20 } },
    status: 'doorgerekend',
    controle: (r) => expect(r.meters.wonen).toBeCloseTo(51, 10),
  },
  vh_evenementen: { keuzes: { onderdelen: { c3: -10 } }, status: 'nog niet doorgerekend' },
  // o1 −10%: 6,45 bespaard; 2029: −6,45 × 1,5 × 1/3 = −3,225
  or_achterstallig: {
    keuzes: { onderdelen: { o1: -10 } },
    status: 'doorgerekend',
    bedragen: [0, 0, 0, -3.225],
  },
  // 100 extra woningen in 2028, één jaar later onderhoud: −100 × 0,0005 = −0,05 in 2029
  or_areaal: {
    keuzes: { kaarten: ['k_bouw'] },
    status: 'doorgerekend',
    bedragen: [0, 0, 0, -0.05],
  },
  or_zwerfafval: { keuzes: {}, status: 'wacht op nieuwe post' },
  or_klimaat: { keuzes: { onderdelen: { o6: -50 } }, status: 'nog niet doorgerekend' },
  // 35,1 × −0,3 × 0,2 × 1,2 = −2,5272
  ec_parkeren_elasticiteit: {
    keuzes: { belastingen: { t5: 20 } },
    status: 'doorgerekend',
    bedragen: [-2.5272, -2.5272, -2.5272, -2.5272],
    controle: (r) => expect(r.grootheden.binnenstad?.[0]).toBeCloseTo(-2, 10),
  },
  ec_gratis_parkeren: { keuzes: { belastingen: { t5: -100 } }, status: 'alleen uitleg' },
  ec_reclame: { keuzes: { belastingen: { t3: -100 } }, status: 'alleen uitleg' },
  // e3 −100%: gemiddeld −2,25 / 46,45 over c2, c3, e3; × 0,2 × 2,9 = −0,0280947, vanaf jaar 2
  ec_toerisme_cultuur: {
    keuzes: { onderdelen: { e3: -100 } },
    status: 'doorgerekend',
    bedragen: [0, -0.028095, -0.028095, -0.028095],
  },
  ec_precario_terras: { keuzes: { belastingen: { t4: -50 } }, status: 'alleen uitleg' },
  ec_ozb_nietwoningen: { keuzes: { belastingen: { t1: -10 } }, status: 'nog niet doorgerekend' },
  ec_strategisch_bezit: { keuzes: { kaarten: ['k_vast'] }, status: 'nog niet doorgerekend' },
  // 5 mln × 20 = 100 woningen per jaar vanaf 2028; × 0,1473% × € 340.000 × 1,32 = € 661,08 OZB
  wg_woningbouw: {
    keuzes: { kaarten: ['k_bouw'] },
    status: 'doorgerekend',
    bedragen: [0, 0, 0.066108, 0.132216],
    controle: (r) => expect(r.grootheden.extra_woningen).toEqual([0, 0, 100, 200]),
  },
  wg_grondexploitatie: { keuzes: { kaarten: ['k_bouw'] }, status: 'nog niet doorgerekend' },
  wg_onderwijshuisvesting: { keuzes: { kaarten: ['k_bouw'] }, status: 'nog niet doorgerekend' },
  // w11 +20% = 0,26 per jaar; besparing stapelt: 0,26 × 0,08 × (0, 1, 2, 3)
  wg_verduurzaming: {
    keuzes: { onderdelen: { w11: 20 } },
    status: 'doorgerekend',
    bedragen: [0, 0.0208, 0.0416, 0.0624],
  },
  en_warmtestad: { keuzes: { kaarten: ['k_warm'] }, status: 'nog niet doorgerekend' },
  en_opwek: { keuzes: { kaarten: ['k_zon'] }, status: 'nog niet doorgerekend' },
  en_dividenden: { keuzes: {}, status: 'wacht op nieuwe post' },
  org_frictie: {
    keuzes: { onderdelen: { e2: -20 } },
    status: 'nog niet doorgerekend',
    controle: (r) => expect(r.meters.dienstverlening).toBe(48),
  },
  // 1 + 0,5 × −0,1 = 0,95
  org_capaciteit: {
    keuzes: { onderdelen: { h1: -10 } },
    status: 'doorgerekend',
    controle: (r) => expect(r.grootheden.bouw_tempo?.[0]).toBeCloseTo(0.95, 10),
  },
  // 2 × 0,5 × (0 / 0,3 / 0,7 / 1)
  org_ai: {
    keuzes: { kaarten: ['k_ai'] },
    status: 'doorgerekend',
    bedragen: [0, 0.3, 0.7, 1],
  },
  org_bereikbaarheid: { keuzes: { onderdelen: { b2: -20 } }, status: 'nog niet doorgerekend' },
  org_wethouders: { keuzes: { onderdelen: { g1: -20 } }, status: 'nog niet doorgerekend' },
  // 10 mln over 40 jaar: 0,25 afschrijving + 2,5% rente over de boekwaarde (10; 9,75; 9,5; 9,25)
  fin_kapitaallasten: {
    data: metInvestering,
    keuzes: { kaarten: ['test_investering'] },
    status: 'alleen uitleg',
    controle: (r) =>
      expect(perJaarMln(r, (e) => e.bron === 'test_investering', [2026, 2027, 2028, 2029])).toEqual(
        [-0.5, -0.49375, -0.4875, -0.48125],
      ),
  },
  fin_incidenteel_structureel: { keuzes: { kaarten: ['k_licht'] }, status: 'alleen uitleg' },
  // Reserves aanvullen: 7 mln eenmalig eraf, 7 mln de reserve in. Het weerstandsvermogen blijft 1,61.
  fin_reserves: {
    keuzes: { kaarten: ['k_res'] },
    status: 'alleen uitleg',
    controle: (r) => expect(r.weerstandsvermogen).toBeCloseTo(1.61, 10),
  },
  fin_rente: {
    data: metInvestering,
    keuzes: { kaarten: ['test_investering'] },
    status: 'nog niet doorgerekend',
  },
  // c2 −10%: 3,02 bespaard; in 2026 telt maar 25%: −3,02 × 0,75 = −2,265
  jur_subsidies: {
    keuzes: { onderdelen: { c2: -10 } },
    status: 'doorgerekend',
    bedragen: [-2.265, 0, 0, 0],
  },
  jur_wettelijk: { keuzes: { onderdelen: { z1: -10 } }, status: 'alleen uitleg' },
  // z6 −10%: 0,1 × (18,8 − 6,6) = 1,22; de eerste twee jaar nog niet
  jur_gr: {
    keuzes: { onderdelen: { z6: -10 } },
    status: 'doorgerekend',
    bedragen: [-1.22, -1.22, 0, 0],
  },
  // z3 −10%: 0,1 × (64,7 − 1,9) = 6,28; het eerste jaar nog niet
  jur_contracten: {
    keuzes: { onderdelen: { z3: -10 } },
    status: 'doorgerekend',
    bedragen: [-6.28, 0, 0, 0],
  },
};

describe('dwarsverbanden', () => {
  it('elk dwarsverband in de JSON heeft een implementatie en een test', () => {
    const ids = data.dwarsverbanden.dwarsverbanden.map((v) => v.id);
    expect(ids.filter((id) => !IMPLEMENTATIES[id])).toEqual([]);
    expect(ids.filter((id) => !GEVALLEN[id])).toEqual([]);
    expect(Object.keys(IMPLEMENTATIES).filter((id) => !ids.includes(id))).toEqual([]);
  });

  it('zonder keuzes is geen enkel verband actief, behalve verbanden die op een nieuwe post wachten', () => {
    const r = bereken(data, keuzes());
    for (const [id, u] of Object.entries(r.verbanden)) {
      expect(['niet actief', 'wacht op nieuwe post'], id).toContain(u.status);
    }
    expect(r.meldingen).toEqual([]);
  });

  for (const [id, geval] of Object.entries(GEVALLEN)) {
    it(id, () => {
      const d = geval.data ? geval.data(data) : data;
      const r = bereken(d, keuzes(geval.keuzes));
      expect(r.verbanden[id]?.status, r.verbanden[id]?.reden).toBe(geval.status);
      if (geval.bedragen) {
        const echt = perJaarMln(r, (e) => e.verband === id, d.jaren);
        echt.forEach((b, j) =>
          expect(b, `${id} ${d.jaren[j]}`).toBeCloseTo(geval.bedragen?.[j] ?? 0, 6),
        );
      }
      if (geval.status === 'nog niet doorgerekend' || geval.status === 'wacht op nieuwe post') {
        expect(r.effecten.filter((e) => e.verband === id)).toEqual([]);
        expect(r.verbanden[id]?.reden).toBeTruthy();
      }
      geval.controle?.(r);
    });
  }

  it('minder bijstand levert via het verdeelmodel iets minder gemeentefonds op', () => {
    // s3 +10%: 77,625 huishoudens minder bij volle ingroei (0,3 / 0,7 / 1 / 1), een jaar later
    // geteld; per huishouden 5.136,70 × 1,491 = 7.658,82 euro.
    const r = bereken(data, keuzes({ onderdelen: { s3: 10 } }));
    expect(r.verbanden.rijk_verdeelmodel?.status).toBe('doorgerekend');
    const echt = perJaarMln(r, (e) => e.verband === 'rijk_verdeelmodel', data.jaren);
    const perHh = 5136.7 * 1.491;
    [0, 0.3, 0.7, 1].forEach((f, j) => expect(echt[j]).toBeCloseTo((-77.625 * f * perHh) / 1e6, 6));
  });

  it('elk kettingeffect met een aanname is herkenbaar als aanname', () => {
    const r = bereken(data, keuzes({ onderdelen: { s3: 10, s9: -20 } }));
    const keten = r.effecten.filter((e) => e.stap === 'dwarsverband');
    expect(keten.length).toBeGreaterThan(0);
    for (const e of keten) expect(e.zekerheid).not.toBe('feit');
    // Gem. uitkering staat op "te onderzoeken": dat telt door in de zekerheid van het effect.
    expect(keten.find((e) => e.verband === 'wia_reintegratie' && e.doel === 's1')?.zekerheid).toBe(
      'te onderzoeken',
    );
  });

  it('een actief verband geeft zijn melding', () => {
    const r = bereken(data, keuzes({ onderdelen: { m2: -100 } }));
    expect(r.meldingen.map((m) => m.verband)).toContain('vh_parkeerhandhaving');
  });

  it('voorzichtig kiest de minst gunstige kant, optimistisch de meest gunstige', () => {
    // ec_parkeren_elasticiteit, t5 +20%: 35,1 × e × 0,2 × 1,2, e = −0,6 (hoog) of −0,1 (laag)
    const t5 = (scenario: 'voorzichtig' | 'optimistisch') =>
      bereken(data, keuzes({ belastingen: { t5: 20 }, scenario }));
    const voorzichtig = t5('voorzichtig');
    const optimistisch = t5('optimistisch');
    const jaren = data.jaren;
    const som = (r: Resultaat) =>
      perJaarMln(r, (e) => e.verband === 'ec_parkeren_elasticiteit', jaren);
    expect(som(voorzichtig)).toEqual([-5.0544, -5.0544, -5.0544, -5.0544]);
    expect(som(optimistisch)).toEqual([-0.8424, -0.8424, -0.8424, -0.8424]);
    expect(voorzichtig.verbanden.ec_parkeren_elasticiteit?.eind).toBe('hoog');
    expect(optimistisch.verbanden.ec_parkeren_elasticiteit?.eind).toBe('laag');
  });

  it('de volgorde respecteert de graaf, ook bij grootheden', () => {
    const { volgorde } = bepaalVolgorde(data.dwarsverbanden.dwarsverbanden);
    const voor = (a: string, b: string) => volgorde.indexOf(a) < volgorde.indexOf(b);
    expect(volgorde).toHaveLength(data.dwarsverbanden.dwarsverbanden.length);
    expect(voor('wg_woningbouw', 'or_areaal')).toBe(true);
    expect(voor('wia_reintegratie', 'rijk_verdeelmodel')).toBe(true);
    expect(voor('kd_leges_omgeving', 'wg_onderwijshuisvesting')).toBe(true);
  });
});

/**
 * Verplichte tests uit opdracht 6.6 (behalve de dwarsverbanden: zie dwarsverbanden.test.ts).
 * Verwachte bedragen zijn met de hand nagerekend uit data/begroting-2026.json.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { metExtraKaarten, type Data } from '../laadData';
import { bereken, magWijzigen } from '../rekenen';
import { weerstandBasis } from '../regels';
import { METER_IDS } from '../schema';
import { alsKaarten, totalen } from '../tegenbegroting';
import { GEEN_KEUZES } from '../types';
import { echteData, keuzes, metAangepasteBegroting, mln, perJaarMln } from './hulp';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});

const direct = (bron: string) => (e: { bron: string; stap: string }) =>
  e.bron === bron && e.stap === 'direct';

describe('nulscenario', () => {
  it('geen keuzes geeft saldo 0 in elk jaar en alle meters op 50', () => {
    const r = bereken(data, GEEN_KEUZES);
    for (const jaar of data.jaren) {
      expect(r.perJaar[jaar]?.structureel).toBe(0);
      expect(r.perJaar[jaar]?.incidenteel).toBe(0);
    }
    for (const m of METER_IDS) expect(r.meters[m]).toBe(50);
    for (const p of Object.values(r.personas)) expect(p).toBe(50);
    expect(r.effecten).toEqual([]);
    expect(r.regels.sluitend).toBe(true);
    expect(r.regels.overtredingen).toEqual([]);
    expect(r.weerstandsvermogen).toBeCloseTo(1.61, 10);
  });

  it('de lasten en baten per jaar zijn die van de begroting', () => {
    const r = bereken(data, GEEN_KEUZES);
    for (const jaar of data.jaren) {
      const som = (veld: 'lasten_x1000' | 'baten_x1000') =>
        data.begroting.deelprogrammas.reduce((s, d) => s + (d[veld][String(jaar)] ?? 0), 0) * 1000;
      expect(r.perJaar[jaar]?.lasten).toBe(som('lasten_x1000'));
      expect(r.perJaar[jaar]?.baten).toBe(som('baten_x1000'));
    }
  });
});

describe('doorgeefluiken', () => {
  it('afval en riolering aanpassen verandert het saldo niet', () => {
    const r = bereken(data, keuzes({ onderdelen: { o3: -50, o2: 25 } }));
    for (const jaar of data.jaren) expect(r.perJaar[jaar]?.structureel).toBe(0);
    expect(r.correcties).toHaveLength(2);
  });

  it('ook als ze aanpasbaar zijn: alleen de heffing beweegt, er is geen direct effect', () => {
    const vrij = metAangepasteBegroting(data, (b) => {
      for (const o of b.onderdelen) {
        if (o.id === 'o3' || o.id === 'o2') {
          o.vergrendeld = false;
          o.min_pct = -50;
          o.max_pct = 25;
        }
      }
    });
    const r = bereken(vrij, keuzes({ onderdelen: { o3: -20, o2: -10 } }));
    expect(r.effecten.filter((e) => e.stap === 'direct')).toEqual([]);
    expect(mln(r.grootheden.heffing_afval?.[0] ?? 0)).toBe(-7.36);
    expect(mln(r.grootheden.heffing_riool?.[0] ?? 0)).toBe(-2.25);
    // Enige saldo-effect: de overhead die via de afvalheffing wordt gedekt (te onderzoeken).
    expect(
      r.effecten.every((e) => e.verband === 'kd_afval' && e.zekerheid === 'te onderzoeken'),
    ).toBe(true);
  });
});

describe('gekoppelde baten', () => {
  it('parkeercontrole −100% kost netto geld (6,0 − 5,0 = −1,0 mln)', () => {
    const r = bereken(data, keuzes({ onderdelen: { m2: -100 } }));
    expect(perJaarMln(r, direct('m2'), data.jaren)).toEqual([-1, -1, -1, -1]);
  });

  it('omgevingsvergunningen −50% kost netto geld', () => {
    const r = bereken(data, keuzes({ onderdelen: { w8: -50 } }));
    // −(−0,5) × (10,5 − 17,9) = −3,7
    expect(perJaarMln(r, direct('w8'), data.jaren)).toEqual([-3.7, -3.7, -3.7, -3.7]);
    expect(r.perJaar[data.jaren[0] ?? 0]?.structureel).toBeLessThan(0);
  });

  it('energiesubsidies −100% levert maar 0,3 mln op', () => {
    const r = bereken(data, keuzes({ onderdelen: { w6: -100 } }));
    expect(perJaarMln(r, direct('w6'), data.jaren)).toEqual([0.3, 0.3, 0.3, 0.3]);
  });
});

describe('wettelijke grenzen', () => {
  it('jeugdzorg kan niet verder omlaag dan −10%', () => {
    const r = bereken(data, keuzes({ onderdelen: { z1: -50 } }));
    expect(r.keuzes.onderdelen.z1).toBe(-10);
    expect(r.correcties[0]).toMatch(/wettelijke taak/);
    const m = magWijzigen(data, GEEN_KEUZES, keuzes({ onderdelen: { z1: -20 } }));
    expect(m.ok).toBe(false);
    expect(m.reden).toMatch(/Jeugdzorg is een wettelijke taak.*−10%/);
    expect(magWijzigen(data, GEEN_KEUZES, keuzes({ onderdelen: { z1: -10 } })).ok).toBe(true);
  });

  it('vergrendelde posten kun je niet aanpassen', () => {
    const m = magWijzigen(data, GEEN_KEUZES, keuzes({ onderdelen: { s1: -10 } }));
    expect(m.ok).toBe(false);
    expect(m.reden).toMatch(/🔒/);
  });
});

describe('het slot op de pot', () => {
  it('zonder vrijgemaakt geld kan geen enkele uitgave omhoog', () => {
    let getest = 0;
    for (const o of data.begroting.onderdelen) {
      if (o.vergrendeld || !o.max_pct) continue;
      const kostGeld = o.lasten_mln > o.gekoppelde_baten_mln;
      const m = magWijzigen(data, GEEN_KEUZES, keuzes({ onderdelen: { [o.id]: o.max_pct } }));
      if (kostGeld) {
        expect(m, o.id).toMatchObject({ ok: false });
        expect(m.reden).toMatch(/^Hiervoor heb je nog € [\d.,]+ mln structurele dekking nodig/);
        getest++;
      }
    }
    expect(getest).toBeGreaterThan(70);
  });

  it('zonder vrijgemaakt geld kan geen belasting omlaag en geen uitgavekaart aan', () => {
    for (const b of data.begroting.belastingen) {
      expect(
        magWijzigen(data, GEEN_KEUZES, keuzes({ belastingen: { [b.id]: b.min_pct } })).ok,
      ).toBe(false);
    }
    for (const k of data.begroting.actiekaarten.filter((k) => k.soort === 'uitgave')) {
      expect(magWijzigen(data, GEEN_KEUZES, keuzes({ kaarten: [k.id] })).ok, k.id).toBe(false);
    }
  });

  it('geeft een concreet bedrag in de reden', () => {
    // OZB −10% kost 12,53 mln per jaar
    const m = magWijzigen(data, GEEN_KEUZES, keuzes({ belastingen: { t1: -10 } }));
    expect(m.reden).toBe('Hiervoor heb je nog € 12,5 mln structurele dekking nodig.');
  });

  it('na een bezuiniging is er ruimte om te investeren', () => {
    // h1 −10% levert 0,1 × (129,18 − 5,944) = 12,3236 mln op
    const huidig = keuzes({ onderdelen: { h1: -10 } });
    expect(magWijzigen(data, GEEN_KEUZES, huidig).ok).toBe(true);
    const nieuw = keuzes({ onderdelen: { h1: -10 }, belastingen: { t1: -9 } });
    expect(magWijzigen(data, huidig, nieuw).ok).toBe(true);
    const teVeel = keuzes({ onderdelen: { h1: -10 }, belastingen: { t1: -10 } });
    expect(magWijzigen(data, huidig, teVeel)).toMatchObject({ ok: false });
  });

  it('een wijziging die het saldo niet verslechtert mag altijd, ook bij een tekort', () => {
    const tekort = keuzes({ belastingen: { t1: -10 } });
    const minderTekort = keuzes({ belastingen: { t1: -5 } });
    expect(magWijzigen(data, tekort, minderTekort).ok).toBe(true);
  });

  it('eenmalige uitgaven mogen met structureel en eenmalig geld samen worden gedekt', () => {
    const huidig = keuzes({ kaarten: ['k_warm'] }); // +4,9 eenmalig
    expect(magWijzigen(data, huidig, keuzes({ kaarten: ['k_warm', 'k_licht'] })).ok).toBe(true);
    // Maar eenmalig geld dekt geen structurele uitgave: k_ai kost elk jaar 2 mln
    const m = magWijzigen(data, huidig, keuzes({ kaarten: ['k_warm', 'k_ai'] }));
    expect(m.ok).toBe(false);
    expect(m.reden).toMatch(/structurele dekking/);
  });
});

describe('VVD-testcase', () => {
  it('de posten als losse kaarten geven de controletotalen', () => {
    const vergelijking = data.vergelijking[0];
    if (!vergelijking) throw new Error('Geen tegenbegroting in config.vergelijking');
    const tb = vergelijking.tegenbegroting;
    const kaarten = alsKaarten(tb);
    const metVvd = metExtraKaarten(data, kaarten);
    const r = bereken(metVvd, keuzes({ kaarten: kaarten.map((k) => k.id) }));
    const eerste = data.jaren[0] ?? 0;
    const som = (soort: 'opbrengst' | 'uitgave', s: 'S' | 'I') =>
      mln(
        r.effecten
          .filter((e) => e.jaar === eerste && e.soort === s)
          .filter((e) => (soort === 'opbrengst' ? e.bedrag > 0 : e.bedrag < 0))
          .reduce((a, e) => a + e.bedrag, 0),
      );

    expect(som('opbrengst', 'S')).toBeCloseTo(tb.controle.ombuigingen_structureel, 6);
    expect(som('opbrengst', 'I')).toBeCloseTo(tb.controle.ombuigingen_incidenteel, 6);
    expect(-som('uitgave', 'S')).toBeCloseTo(tb.controle.uitgaven_structureel, 6);
    expect(-som('uitgave', 'I')).toBeCloseTo(tb.controle.uitgaven_incidenteel, 6);

    const t = totalen(tb);
    expect(t.ombuigingenS + t.ombuigingenI).toBeCloseTo(tb.controle.ombuigingen_totaal, 6);
    expect(t.uitgavenS + t.uitgavenI).toBeCloseTo(tb.controle.uitgaven_totaal, 6);

    // Bekende afwijking: structureel 53,97 tegenover 54,029 (tekort 0,059) in elk jaar.
    for (const jaar of data.jaren)
      expect(mln(r.perJaar[jaar]?.structureel ?? 0)).toBeCloseTo(-0.059, 6);
    // Eenmalig alleen in het eerste jaar: 15,602 − 15,971 = −0,369.
    expect(mln(r.perJaar[eerste]?.incidenteel ?? 0)).toBeCloseTo(-0.369, 6);
    for (const jaar of data.jaren.slice(1)) expect(r.perJaar[jaar]?.incidenteel).toBe(0);
    expect(r.regels.sluitend).toBe(false);

    // Bekende afwijking: het document noemt 69,6 als totaal van de uitgaven; de posten tellen op tot 70,0.
    expect(tb.controle.uitgaven_totaal).toBe(70.0);
    expect(tb.controle.bekende_afwijkingen.some((a) => a.includes('69,6'))).toBe(true);
  });
});

describe('meerjarig', () => {
  it('een subsidiebezuiniging met ingroeipad [0,25, 1] levert in jaar 1 een kwart op en daarna alles', () => {
    // e1 (Economische agenda, 1,4 mln) krijgt in deze test een eigen ingroeipad.
    const metPad = metAangepasteBegroting(data, (b) => {
      const e1 = b.onderdelen.find((o) => o.id === 'e1');
      if (e1) e1.ingroeipad = [0.25, 1];
    });
    const r = bereken(metPad, keuzes({ onderdelen: { e1: -100 } }));
    expect(perJaarMln(r, () => true, data.jaren)).toEqual([0.35, 1.4, 1.4, 1.4]);
  });

  it('subsidies afbouwen via het dwarsverband jur_subsidies geeft hetzelfde patroon', () => {
    // c2 −10%: 3,02 mln; in 2026 een kwart (0,755)
    const r = bereken(data, keuzes({ onderdelen: { c2: -10 } }));
    const c2 = perJaarMln(r, (e) => e.bron === 'c2' || e.verband === 'jur_subsidies', data.jaren);
    expect(c2).toEqual([0.755, 3.02, 3.02, 3.02]);
  });

  it('eenmalig geld in 2026 dekt 2027 niet', () => {
    // WarmteStad verkopen (+4,9 eenmalig) en sport +5% (−1,265 structureel)
    const r = bereken(data, keuzes({ kaarten: ['k_warm'], onderdelen: { k1: 5 } }));
    const [eerste, tweede] = data.jaren as [number, number];
    expect(mln(r.perJaar[eerste]?.incidenteel ?? 0)).toBe(4.9);
    expect(r.perJaar[tweede]?.incidenteel).toBe(0);
    expect(r.regels.sluitend).toBe(false);
    expect(r.regels.perJaarSluitend[tweede]).toBe(false);
    expect(r.regels.overtredingen[0]).toMatch(/vaste lasten met eenmalig geld/);
  });

  it('het weerstandsvermogen groeit met een structureel overschot', () => {
    const r = bereken(data, keuzes({ onderdelen: { h1: -10 } }));
    const { reserve, benodigd } = weerstandBasis(data);
    const laatste = data.jaren.at(-1) ?? 0;
    expect(r.weerstandsvermogen).toBeCloseTo(
      (reserve + data.jaren.length * 12_323_600) / benodigd,
      9,
    );
    expect(r.perJaar[laatste]?.weerstandsvermogen).toBe(r.weerstandsvermogen);
  });
});

describe('determinisme', () => {
  it('dezelfde invoer geeft altijd dezelfde uitvoer, ook met keys in een andere volgorde', () => {
    const a = keuzes({
      onderdelen: { s3: 30, z4: -25, h1: -10, o1: -20 },
      belastingen: { t1: 5, t5: -10 },
      kaarten: ['k_bouw', 'k_ai', 'k_warm'],
      scenario: 'voorzichtig',
    });
    const b = keuzes({
      onderdelen: { o1: -20, h1: -10, z4: -25, s3: 30 },
      belastingen: { t5: -10, t1: 5 },
      kaarten: ['k_warm', 'k_ai', 'k_bouw', 'k_ai'],
      scenario: 'voorzichtig',
    });
    expect(bereken(data, a)).toEqual(bereken(data, a));
    expect(bereken(data, b).perJaar).toEqual(bereken(data, a).perJaar);
    expect(bereken(data, b).effecten).toEqual(bereken(data, a).effecten);
  });
});

describe('scenario’s', () => {
  it('voorzichtig ≤ midden ≤ optimistisch', () => {
    const basis = { onderdelen: { s3: 50, z4: -25, o1: -20 }, belastingen: { t5: 10 } };
    const laatste = data.jaren.at(-1) ?? 0;
    const saldo = (scenario: 'voorzichtig' | 'midden' | 'optimistisch') =>
      bereken(data, keuzes({ ...basis, scenario })).perJaar[laatste]?.structureel ?? 0;
    expect(saldo('voorzichtig')).toBeLessThan(saldo('midden'));
    expect(saldo('midden')).toBeLessThan(saldo('optimistisch'));
  });
});

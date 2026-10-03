import { beforeAll, describe, expect, it } from 'vitest';
import { controleer, heeftFouten } from '../controle';
import type { Data } from '../laadData';
import { alsMarkdown, vergelijk } from '../verschil';
import { alsGezamenlijkeKeuzes, narekenen } from '../vvd';
import { actieveData, echteData, leesJson, metAangepasteBegroting } from './hulp';

// De datacontrole kijkt naar de actieve begroting; de verschil- en VVD-tests rekenen met 2026.
let data: Data;
let data2026: Data;
let buurtcodes: string[];
beforeAll(async () => {
  data = await actieveData();
  data2026 = await echteData();
  const geo = leesJson('gemeente-groningen-buurten.geojson') as {
    features: { properties: { code: string } }[];
  };
  buurtcodes = geo.features.map((f) => f.properties.code);
});

const fouten = (d: Data) =>
  controleer({ data: d, buurtcodes })
    .filter((b) => b.niveau === 'fout')
    .map((b) => b.tekst);

describe('data-check', () => {
  it('de echte data heeft geen fouten', () => {
    expect(fouten(data)).toEqual([]);
    expect(heeftFouten(controleer({ data, buurtcodes }))).toBe(false);
  });

  it('meldt onderdelen die hoger zijn dan hun deelprogramma', () => {
    const d = metAangepasteBegroting(data, (b) => {
      const e1 = b.onderdelen.find((o) => o.id === 'e1');
      if (e1) e1.lasten_mln = 100;
    });
    expect(fouten(d).some((t) => t.includes('1.1'))).toBe(true);
  });

  it('een bekende afwijking is een waarschuwing, geen fout', () => {
    const d = metAangepasteBegroting(data, (b) => {
      b.bekende_afwijkingen = [];
    });
    expect(fouten(d).some((t) => t.includes('2.1'))).toBe(true);
  });

  it('meldt totalen die niet kloppen', () => {
    const d = metAangepasteBegroting(data, (b) => {
      b.totalen.lasten_excl_reserves_x1000['2027'] = 1;
    });
    expect(fouten(d).some((t) => t.startsWith('2027'))).toBe(true);
  });

  it('meldt een onbekend id in een dwarsverband en een onderdeel zonder gebouw', () => {
    const d = metAangepasteBegroting(data, (b) => {
      const e1 = b.onderdelen.find((o) => o.id === 'e1');
      if (e1) e1.gebouw = 'bestaat_niet';
    });
    const kapot = {
      ...d,
      dwarsverbanden: {
        ...d.dwarsverbanden,
        dwarsverbanden: d.dwarsverbanden.dwarsverbanden.map((v, i) =>
          i === 0 ? { ...v, van: [...v.van, 'x99', 'meter:geluk'] } : v,
        ),
      },
    };
    const f = fouten(kapot);
    expect(f.some((t) => t.includes('"x99"'))).toBe(true);
    expect(f.some((t) => t.includes('meter:geluk'))).toBe(true);
    expect(f.some((t) => t.includes('bestaat_niet'))).toBe(true);
  });

  it('accepteert een vervallen id uit de mapping als waarschuwing', () => {
    const kapot = {
      ...data,
      dwarsverbanden: {
        ...data.dwarsverbanden,
        dwarsverbanden: data.dwarsverbanden.dwarsverbanden.map((v, i) =>
          i === 0 ? { ...v, van: [...v.van, 'x99'] } : v,
        ),
      },
    };
    const bevindingen = controleer({
      data: kapot,
      buurtcodes,
      mappings: [
        { van_jaar: 2025, naar_jaar: 2026, posten: [{ oud: 'x99', nieuw: null, vervallen: true }] },
      ],
    });
    expect(bevindingen.filter((b) => b.niveau === 'fout')).toEqual([]);
    expect(bevindingen.some((b) => b.niveau === 'waarschuwing' && b.tekst.includes('x99'))).toBe(
      true,
    );
  });
});

describe('data-diff', () => {
  it('ziet nieuwe, vervallen, hernoemde en gewijzigde posten, ook via de mapping', () => {
    const nieuw = structuredClone(data2026.begroting);
    nieuw.begrotingsjaar = 2027;
    nieuw.onderdelen = nieuw.onderdelen.filter((o) => o.id !== 'e1');
    const e2 = nieuw.onderdelen.find((o) => o.id === 'e2');
    if (e2) {
      e2.lasten_mln = 4.4;
      e2.naam = 'Economische zaken';
    }
    const e3 = nieuw.onderdelen.find((o) => o.id === 'e3');
    if (e3) e3.id = 'e12';
    const v = vergelijk(data2026.begroting, nieuw, {
      van_jaar: 2026,
      naar_jaar: 2027,
      posten: [{ oud: 'e3', nieuw: 'e12' }],
    });
    expect(v.vervallen.map((p) => p.id)).toEqual(['e1']);
    expect(v.nieuw).toEqual([]);
    expect(v.hernoemd.map((h) => h.nieuw.id)).toEqual(['e2']);
    expect(
      v.gewijzigd.map((g) => [g.nieuw.id, Math.round(g.verschilLasten * 1000) / 1000]),
    ).toEqual([['e2', 1.5]]);
    const md = alsMarkdown(data2026.begroting, nieuw);
    expect(md).toContain('# Verschillen begroting 2026 → 2027');
    expect(md).toContain('`e12`'); // zonder mapping is e12 een nieuwe post
  });
});

describe('vvd-check', () => {
  it('vertaalt posten naar percentages en kaarten', () => {
    const tb = data2026.vergelijking[0]?.tegenbegroting;
    if (!tb) throw new Error('geen tegenbegroting');
    const regels = narekenen(data2026, tb);
    const ozb = regels.find((r) => r.koppeling === 't1');
    // 10 mln op 125,3 mln OZB = −7,98%
    expect(ozb?.pct).toBeCloseTo((-10 / 125.3) * 100, 9);
    expect(ozb?.gameDirect).toBeCloseTo(-10, 9);
    const precario = regels.find((r) => r.koppeling === 't4');
    expect(precario?.binnenGrenzen).toBe(false);
    expect(regels.filter((r) => r.type === 'geen').length).toBe(13);
    // drie parkeerposten op dezelfde schuif tellen op
    const k = alsGezamenlijkeKeuzes(data2026, tb);
    expect(k.belastingen.t5).toBeCloseTo((-6.4 / 35.1) * 100, 9);
  });
});

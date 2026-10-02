import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, GEEN_KEUZES, type Data } from '../../engine';
import { echteData, keuzes } from '../../engine/__tests__/hulp';
import { codeer, decodeer, leesUitUrl, maakLink } from '../deellink';
import {
  kleineLetters,
  behaaldeBadges,
  gevoeligheid,
  lezerVoor,
  maatregelen,
  personaZinnen,
  sterren,
  vergelijkPerThema,
  THEMA_OVERIG,
} from '../score';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});
describe('score', () => {
  it('drie sterren met een gezonde, sluitende begroting', () => {
    const r = bereken(data, keuzes({ onderdelen: { h1: -10 } }));
    const st = sterren(data, r);
    expect(st.map((s) => s.id)).toEqual(['sluitend', 'gezond', 'eenmalig']);
    expect(st.every((s) => s.gehaald)).toBe(true);
    const slecht = bereken(data, keuzes({ kaarten: ['k_warm'], onderdelen: { k1: 5 } }));
    const st2 = sterren(data, slecht);
    // Eenmalig geld telt alleen in 2026: in 2027 sluit deze begroting niet.
    expect(st2.find((s) => s.id === 'sluitend')?.gehaald).toBe(false);
    expect(st2.find((s) => s.id === 'eenmalig')?.gehaald).toBe(false);
  });

  it('badges', () => {
    const r = bereken(data, keuzes({ onderdelen: { h1: -10 }, kaarten: ['k_bouw'] }));
    const ids = behaaldeBadges(data, lezerVoor(data, r)).map((b) => b.id);
    expect(ids).toContain('stadhuisslanker');
    expect(ids).toContain('woningbouwer');
  });
});

describe('eindscherm', () => {
  it('een zin per inwoner, zonder verzonnen bedragen', () => {
    const r = bereken(data, keuzes({ belastingen: { t5: -20 }, onderdelen: { h1: -20 } }));
    const zinnen = personaZinnen(data, r);
    expect(zinnen).toHaveLength(data.personas.personas.length);
    expect(zinnen.find((z) => z.id === 'peter_tineke')?.zin).toMatch(
      /blij met een lagere prijs voor de bewonersvergunning \(tweede zone\)/,
    );
    expect(zinnen.find((z) => z.id === 'sem')?.zin).toMatch(/merkt weinig/);
    expect(zinnen.every((z) => !/€/.test(z.zin))).toBe(true);
  });

  it('wat stopt en wat komt erbij', () => {
    const r = bereken(
      data,
      keuzes({
        onderdelen: { k1: -20, o1: 10 },
        belastingen: { t1: 5, t3: -100 },
        kaarten: ['k_warm', 'k_licht'],
      }),
    );
    const m = maatregelen(data, r);
    expect(m.minder.map((x) => x.id)).toEqual(['k1', 'k_warm']);
    expect(m.meer.map((x) => x.id).sort()).toEqual(['k_licht', 'o1', 't3']);
    expect(m.belasting.map((x) => x.id)).toEqual(['t1']);
  });

  it('scenariogevoeligheid: voorzichtig ≤ midden ≤ optimistisch', () => {
    const g = gevoeligheid(data, keuzes({ onderdelen: { s3: 50, z4: -25 } }));
    expect(g.voorzichtig).toBeLessThan(g.midden);
    expect(g.midden).toBeLessThan(g.optimistisch);
  });

  it('vergelijking per thema met de tegenbegroting', () => {
    const tb = data.vergelijking[0]?.tegenbegroting;
    const rijen = vergelijkPerThema(data, bereken(data, keuzes({ onderdelen: { h1: -10 } })), tb);
    const bestuur = rijen.find((r) => r.thema === 'Bestuur en organisatie');
    expect((bestuur?.jij ?? 0) / 1e6).toBeCloseTo(12.3236, 4);
    // overhead 7,0 + minder wethouders 0,2
    expect((bestuur?.vergelijking ?? 0) / 1e6).toBeCloseTo(7.2, 6);
    // Ombuigingen min uitgaven over alle thema's = het saldo van de tegenbegroting (53,97 + 15,602 − 70,0)
    const totaal = rijen.reduce((s, r) => s + r.vergelijking, 0) / 1e6;
    expect(totaal).toBeCloseTo(53.97 + 15.602 - 70.0, 6);
    expect(rijen.some((r) => r.thema === THEMA_OVERIG)).toBe(true);
  });
});

describe('deellink', () => {
  it('codeert en decodeert de keuzes', () => {
    const k = keuzes({
      onderdelen: { h1: -10, k1: 5 },
      belastingen: { t1: -5 },
      kaarten: ['k_bouw'],
      scenario: 'voorzichtig',
      reserve: { structureel: 2e6, eenmalig: 0 },
    });
    const g = decodeer(codeer(k, 2026));
    expect(g).toEqual({ jaar: 2026, keuzes: k, beginpunt: 'college' });
  });

  it('neemt het beginpunt mee; een oude link begon bij het college', () => {
    const k = keuzes({ onderdelen: { c2: -100 } });
    expect(decodeer(codeer(k, 2026, 'nul'))?.beginpunt).toBe('nul');
    expect(decodeer(codeer(k, 2026))?.beginpunt).toBe('college');
    const link = maakLink('https://begrotingsgame.nl/', k, 2026, 'nul');
    expect(leesUitUrl(link)?.beginpunt).toBe('nul');
  });

  it('neemt de parkeerkeuzes mee', () => {
    const k = keuzes({ belastingen: { t5: 1.2 }, parkeren: { 'bewoners_1:tweede': 10 } });
    expect(decodeer(codeer(k, 2026))?.keuzes).toEqual(k);
  });

  it('zit in de url en negeert onzin', () => {
    const link = maakLink(
      'https://begrotingsgame.nl/#debug',
      keuzes({ onderdelen: { h1: -10 } }),
      2026,
    );
    expect(link).toMatch(/^https:\/\/begrotingsgame\.nl\/\?b=/);
    expect(leesUitUrl(link)?.keuzes.onderdelen).toEqual({ h1: -10 });
    expect(decodeer('onzin')).toBeUndefined();
    expect(decodeer(codeer(GEEN_KEUZES, 2026))?.keuzes).toEqual(GEEN_KEUZES);
  });
});

describe('kleineLetters', () => {
  it('maakt alleen het eerste woord klein en laat eigennamen en afkortingen staan', () => {
    expect(kleineLetters('Overhead (staf, ICT, huisvesting, HR)')).toBe(
      'overhead (staf, ICT, huisvesting, HR)',
    );
    expect(kleineLetters('Onroerendezaakbelasting')).toBe('onroerendezaakbelasting');
    expect(kleineLetters('Groninger Archieven')).toBe('Groninger Archieven');
    expect(kleineLetters('Stadsschouwburg en Oosterpoort')).toBe('Stadsschouwburg en Oosterpoort');
    expect(kleineLetters('OZB')).toBe('OZB');
  });
});

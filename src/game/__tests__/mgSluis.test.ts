import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import { bekendePosten } from '../minigames';
import {
  AANVAAR,
  beginStand,
  besteZet,
  BEZUINIG_PCT,
  bezuinigOpties,
  isVeilig,
  LEVELS,
  levelDuur,
  levelGehaald,
  levelVoorbij,
  LEVENS,
  maakSchepen,
  MAX_PCT,
  nieuwPeil,
  OZB_KEER,
  ozbStap,
  RESERVE_KEER,
  RESERVE_MLN,
  RIJK_NAAM,
  schipFase,
  sluisScore,
  stap,
  VEILIG,
  WACHT,
  WAND,
  type Schip,
  type Stand,
} from '../mgSluis';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

/** Een vaste reeks "toevalsgetallen" voor herhaalbare tests. */
function vasteKans(zaad = 7): () => number {
  let h = zaad;
  return () => {
    h = (h * 1103515245 + 12345) % 2147483648;
    return h / 2147483648;
  };
}

const schip = (bedragMln: number): Schip => ({
  id: 'x',
  kleur: bedragMln > 0 ? 'groen' : 'rood',
  tekst: 'test',
  kort: 'test',
  bron: 'rijk',
  naam: RIJK_NAAM,
  basisMln: 100,
  pct: Math.abs(bedragMln),
  bedragMln,
});

describe('Oostersluis: de schepen', () => {
  it('elk level het goede aantal schepen, groen en rood, met bedragen uit de begroting', () => {
    LEVELS.forEach((l, i) => {
      const nr = i + 1;
      const schepen = maakSchepen(data, nr, vasteKans(nr));
      expect(schepen).toHaveLength(l.schepen);
      expect(new Set(schepen.map((s) => s.tekst)).size).toBe(schepen.length);
      for (const s of schepen) {
        expect(s.basisMln).toBeGreaterThan(0);
        expect(s.pct).toBeLessThanOrEqual(MAX_PCT);
        expect(Math.abs(s.bedragMln)).toBeCloseTo((s.basisMln * s.pct) / 100, 1);
        expect(Math.abs(s.bedragMln)).toBeGreaterThanOrEqual(l.minMln - 0.05);
        expect(Math.abs(s.bedragMln)).toBeLessThanOrEqual(l.maxMln + 0.6);
        expect(Math.sign(s.bedragMln)).toBe(s.kleur === 'groen' ? 1 : -1);
      }
    });
  });

  it('over veel spellen komen zowel groene als rode schepen voor', () => {
    const alle = Array.from({ length: 10 }, (_, i) =>
      maakSchepen(data, 2, vasteKans(i + 1)),
    ).flat();
    expect(alle.some((s) => s.kleur === 'groen')).toBe(true);
    expect(alle.some((s) => s.kleur === 'rood')).toBe(true);
  });

  it('de bedragen komen uit de begroting: posten, belastingen en het gemeentefonds', () => {
    const posten = bekendePosten(data);
    const alle = Array.from({ length: 10 }, (_, i) =>
      maakSchepen(data, 3, vasteKans(i + 3)),
    ).flat();
    for (const s of alle) {
      if (s.bron === 'rijk')
        expect(s.basisMln).toBeCloseTo(data.kengetallen.gemeentefonds_x1000 / 1000, 3);
      else if (s.bron === 'belasting')
        expect(data.begroting.belastingen.map((b) => b.opbrengst_mln)).toContain(s.basisMln);
      else {
        const p = posten.find((x) => x.naam === s.naam);
        expect(p?.bedragMln).toBe(s.basisMln);
        // een post die moet van de wet, krijgt de wet erbij
        if (p?.soort === 'wet') expect(s.wet).toBe(p.wet);
      }
    }
  });

  it('een schip vaart aan, ligt in de kolk en vaart weer weg', () => {
    expect(schipFase(-1).fase).toBe('weg');
    expect(schipFase(1).fase).toBe('aan');
    expect(schipFase(AANVAAR + 0.1).fase).toBe('kolk');
    expect(schipFase(AANVAAR + WACHT + 0.1).fase).toBe('uit');
    expect(levelDuur(1, 8)).toBeGreaterThan(8 * 6);
  });
});

describe('Oostersluis: wat jij kunt doen', () => {
  it('bezuinigen kan alleen op eigen keuzes, niet op wat moet van de wet', () => {
    const opties = bezuinigOpties(data);
    expect(opties.length).toBeGreaterThan(3);
    for (const o of opties) {
      expect(o.post.soort).toBe('keuze');
      expect(Math.abs(o.bedragMln - (o.post.bedragMln * BEZUINIG_PCT) / 100)).toBeLessThan(0.051);
    }
    expect(opties.some((o) => o.post.id === 'z1')).toBe(false);
  });

  it('de OZB een beetje omhoog: hooguit een paar keer per level', () => {
    const ozb = ozbStap(data);
    expect(ozb).toBeGreaterThan(0);
    let s = beginStand();
    for (let i = 0; i < OZB_KEER; i++) s = stap(s, { soort: 'ozb', richting: 1, stapMln: ozb });
    expect(s.peil).toBeCloseTo(OZB_KEER * ozb, 1);
    const daarna = stap(s, { soort: 'ozb', richting: 1, stapMln: ozb });
    expect(daarna.peil).toBe(s.peil);
    expect(daarna.gebeurd).toEqual({ soort: 'kan-niet', reden: 'ozb' });
    // omlaag kan altijd (lagere lasten)
    const omlaag = stap(s, { soort: 'ozb', richting: -1, stapMln: ozb });
    expect(omlaag.peil).toBeCloseTo((OZB_KEER - 1) * ozb, 1);
  });

  it('de reserve is een spaarpot: op is op, ook in een volgend level', () => {
    let s = beginStand();
    for (let i = 0; i < RESERVE_KEER; i++) {
      s = stap(s, { soort: 'reserve' });
      s = { ...s, peil: 0 };
    }
    expect(s.reserveOver).toBe(0);
    expect(stap(s, { soort: 'reserve' }).gebeurd).toEqual({ soort: 'kan-niet', reden: 'reserve' });
    expect(stap(s, { soort: 'nieuw', reserveOver: s.reserveOver }).reserveOver).toBe(0);
    expect(stap(beginStand(), { soort: 'reserve' }).peil).toBe(RESERVE_MLN);
  });

  it('op dezelfde post bezuinig je maar één keer per level', () => {
    const optie = bezuinigOpties(data)[0];
    if (!optie) throw new Error('geen posten om op te bezuinigen');
    const s = stap(beginStand(), { soort: 'bezuinig', optie });
    expect(s.peil).toBe(optie.bedragMln);
    const nog = stap(s, { soort: 'bezuinig', optie });
    expect(nog.peil).toBe(s.peil);
    expect(nog.gebeurd).toEqual({ soort: 'kan-niet', reden: 'al-bezuinigd' });
  });
});

describe('Oostersluis: het peil', () => {
  it('het peil blijft tussen de wanden', () => {
    expect(nieuwPeil(10, 10)).toBe(WAND);
    expect(nieuwPeil(-10, -10)).toBe(-WAND);
    expect(nieuwPeil(1, 2.25)).toBe(3.3);
    expect(isVeilig(VEILIG)).toBe(true);
    expect(isVeilig(-VEILIG - 0.1)).toBe(false);
  });

  it('veilig door de sluis: een punt; buiten de band: alarm, een leven minder en terug naar 0', () => {
    let s = stap(beginStand(), { soort: 'aankomst', schip: schip(-3) });
    expect(s.peil).toBe(-3);
    s = stap(s, { soort: 'controle' });
    expect(s.veilig).toBe(1);
    expect(s.gebeurd?.soort).toBe('veilig');
    s = stap(s, { soort: 'aankomst', schip: schip(-5) });
    s = stap(s, { soort: 'controle' });
    expect(s.gebeurd).toMatchObject({ soort: 'alarm', richting: 'laag', peil: -8 });
    expect(s.levens).toBe(LEVENS - 1);
    expect(s.peil).toBe(0);
    expect(s.klaar).toBe(2);
    // zonder schip in de kolk gebeurt er niets
    expect(stap(s, { soort: 'controle' })).toBe(s);
  });

  it('een level is voorbij als alle schepen erdoor zijn, of als de levens op zijn', () => {
    const s: Stand = { ...beginStand(), klaar: 8 };
    expect(levelVoorbij(s, 8)).toBe(true);
    expect(levelGehaald(s, 8)).toBe(true);
    const dood: Stand = { ...beginStand(), levens: 0, klaar: 3 };
    expect(levelVoorbij(dood, 8)).toBe(true);
    expect(levelGehaald(dood, 8)).toBe(false);
  });

  it('een slimme sluiswachter houdt elk level elk schip veilig', () => {
    const opties = bezuinigOpties(data);
    const ozb = ozbStap(data);
    for (let zaad = 1; zaad <= 5; zaad++) {
      let reserve = RESERVE_KEER;
      for (let nr = 1; nr <= LEVELS.length; nr++) {
        const schepen = maakSchepen(data, nr, vasteKans(zaad * 10 + nr));
        let s = beginStand(reserve);
        for (const sch of schepen) {
          s = stap(s, { soort: 'aankomst', schip: sch });
          for (let i = 0; i < 4; i++) {
            const zet = besteZet(s, opties, ozb);
            if (!zet) break;
            s = stap(s, zet);
          }
          s = stap(s, { soort: 'controle' });
        }
        expect(s.veilig).toBe(schepen.length);
        expect(levelGehaald(s, schepen.length)).toBe(true);
        reserve = s.reserveOver;
      }
    }
  });

  it('score: alle veilige schepen van het totaal', () => {
    const max = LEVELS.reduce((s, l) => s + l.schepen, 0);
    expect(sluisScore([8, 9, 10])).toEqual({ score: 27, max });
    expect(sluisScore([4])).toEqual({ score: 4, max });
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  aandeelGemeente,
  afvalPost,
  BEGIN_SALDO,
  euro,
  gelukt,
  heffing,
  INKOMEN,
  maakMaand,
  MAX_SCORE,
  PLEZIER_BEGIN,
  PLEZIER_DOEL,
  score,
  SPAARDOEL,
  stand,
  sterren,
  TIJD_PER_WEEK,
  VASTE_LASTEN_TOTAAL,
  type Gekozen,
  type Kaart,
} from '../mgAcademie';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

/** Speelt een maand met een vaste keuze per kaart. */
const speel = (kaarten: Kaart[], kies: (k: Kaart) => number): Gekozen[] =>
  kaarten.map((kaart) => {
    const keuze = kaart.keuzes[kies(kaart)];
    if (!keuze) throw new Error(`geen keuze op ${kaart.id}`);
    return { kaart, keuze, teLaat: false };
  });

const goedkoopste = (k: Kaart) =>
  k.keuzes.reduce((b, x, i, l) => (x.euro < (l[b]?.euro ?? Infinity) ? i : b), 0);
const duurste = (k: Kaart) =>
  k.keuzes.reduce((b, x, i, l) => (x.euro > (l[b]?.euro ?? -Infinity) ? i : b), 0);

describe('Academiegebouw: rondkomen met z’n tweeën', () => {
  it('gebruikt de afvalstoffenheffing voor twee personen uit de tarieven, per jaar en per maand', () => {
    const t = data.tarieven;
    expect(t).toBeDefined();
    const h = heffing(data);
    expect(h?.perJaar).toBe(t?.afvalstoffenheffing.twee_personen);
    expect(h?.perJaar).not.toBe(t?.afvalstoffenheffing.een_persoon);
    expect(h?.perMaand).toBeCloseTo((t?.afvalstoffenheffing.twee_personen ?? 0) / 12, 2);
    expect(h?.jaar).toBe(data.begroting.begrotingsjaar);
    expect(h?.eenPersoon).toBe(t?.afvalstoffenheffing.een_persoon);
    expect(h?.drieOfMeer).toBe(t?.afvalstoffenheffing.drie_of_meer);
    expect(h?.kwijtschelding).toContain('kwijtschelding');
  });

  it('de aanslag staat in week 2 en kost de heffing voor twee personen per maand', () => {
    const h = heffing(data);
    const maand = maakMaand(data, () => 0);
    const aanslag = maand.filter((k) => k.soort === 'aanslag');
    expect(aanslag).toHaveLength(1);
    const k = aanslag[0];
    expect(k?.week).toBe(2);
    expect(k?.gemeente).toBe(true);
    expect(k?.tekst).toContain(euro(h?.perJaar ?? 0));
    expect(k?.tekst).toContain(euro(h?.perMaand ?? 0));
    for (const keuze of k?.keuzes ?? []) expect(keuze.euro).toBe(h?.perMaand);
  });

  it('een maand heeft vier weken met minstens twee kaarten, en de tijd wordt korter', () => {
    const maand = maakMaand(data, () => 0.99);
    for (let w = 1; w <= 4; w++)
      expect(maand.filter((k) => k.week === w).length).toBeGreaterThanOrEqual(2);
    expect(maand.map((k) => k.week)).toEqual([...maand.map((k) => k.week)].sort());
    expect(TIJD_PER_WEEK[0]).toBeGreaterThan(TIJD_PER_WEEK[3]);
    for (const k of maand) {
      expect(k.keuzes[k.standaard]).toBeDefined();
      expect(new Set(maand.map((x) => x.id)).size).toBe(maand.length);
    }
    // het toeval kiest de tegenvaller en het uitje
    const anders = maakMaand(data, () => 0);
    expect(anders.map((k) => k.soort)).not.toEqual(maand.map((k) => k.soort));
  });

  it('de stand begint met het inkomen min de vaste lasten', () => {
    const s = stand([]);
    expect(s.saldo).toBe(INKOMEN - VASTE_LASTEN_TOTAAL);
    expect(s.saldo).toBe(BEGIN_SALDO);
    expect(s.plezier).toBe(PLEZIER_BEGIN);
    expect(s.uitgaven).toBe(VASTE_LASTEN_TOTAAL);
    expect(s.gemeente).toBe(0);
  });

  it('wat naar de gemeente gaat, is precies de heffing per maand', () => {
    const h = heffing(data);
    const maand = maakMaand(data, () => 0);
    const s = stand(speel(maand, () => 0));
    expect(s.gemeente).toBeCloseTo(h?.perMaand ?? 0, 6);
    const kosten = maand.reduce((t, k) => t + (k.keuzes[0]?.euro ?? 0), 0);
    expect(s.uitgaven).toBeCloseTo(VASTE_LASTEN_TOTAAL + kosten, 6);
    expect(s.saldo).toBeCloseTo(BEGIN_SALDO - kosten, 6);
    const pct = aandeelGemeente(s);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(5);
  });

  it('alles duur: dan lukt sparen niet', () => {
    for (const kans of [0, 0.99]) {
      const s = stand(
        speel(
          maakMaand(data, () => kans),
          duurste,
        ),
      );
      expect(s.saldo).toBeLessThan(SPAARDOEL);
      expect(gelukt(s)).toBe(false);
    }
  });

  it('alles goedkoop: wel sparen, maar te weinig plezier', () => {
    for (const kans of [0, 0.99]) {
      const s = stand(
        speel(
          maakMaand(data, () => kans),
          goedkoopste,
        ),
      );
      expect(s.saldo).toBeGreaterThanOrEqual(SPAARDOEL);
      expect(s.plezier).toBeLessThan(PLEZIER_DOEL);
      expect(score(s)).toBeLessThan(MAX_SCORE);
    }
  });

  it('slim kiezen, met één uitje: het doel is te halen en geeft de hoogste score', () => {
    for (const kans of [0, 0.99]) {
      const maand = maakMaand(data, () => kans);
      // Zuinig, maar niet overal: twee weken lekkere boodschappen, één keer uit eten, een
      // zelfgemaakt cadeau of een dagje wandelen, en de verwarming een graadje lager.
      const keuze: Record<string, number> = {
        'w1-boodschappen': 1,
        'w1-energie': 1,
        'w2-uit': 0,
        'w3-boodschappen': 1,
        'w4-verjaardag': 0,
        'w4-weekend': 1,
      };
      const s = stand(speel(maand, (k) => keuze[k.id] ?? goedkoopste(k)));
      expect(gelukt(s)).toBe(true);
      expect(score(s)).toBe(MAX_SCORE);
      expect(sterren(s)).toBe(3);
    }
  });

  it('de standaardkeuze (als de tijd op is) haalt het doel niet', () => {
    const maand = maakMaand(data, () => 0);
    const s = stand(speel(maand, (k) => k.standaard));
    expect(gelukt(s)).toBe(false);
  });

  it('score: een tekort kost de meeste punten; plezier blijft tussen 0 en 100', () => {
    const tekort = { saldo: -10, plezier: 100, uitgaven: 1, gemeente: 0 };
    expect(score(tekort)).toBeLessThanOrEqual(15);
    expect(sterren(tekort)).toBe(1);
    expect(score({ saldo: 0, plezier: 0, uitgaven: 1, gemeente: 0 })).toBe(40);
    expect(score({ saldo: SPAARDOEL, plezier: PLEZIER_DOEL, uitgaven: 1, gemeente: 0 })).toBe(100);
    const k = maakMaand(data, () => 0)[0] as Kaart;
    const veel = Array.from({ length: 40 }, () => ({
      kaart: k,
      keuze: { tekst: '', euro: 0, plezier: -9, gevolg: '' },
      teLaat: false,
    }));
    expect(stand(veel).plezier).toBe(0);
  });

  it('bedragen in euro: hele euro’s zonder centen, anders met', () => {
    expect(euro(85)).toBe('€ 85');
    expect(euro(30.31)).toBe('€ 30,31');
    expect(euro(1234.5)).toBe('€ 1.234,50');
    expect(euro(-12, { teken: true })).toBe('− € 12');
    expect(euro(12, { teken: true })).toBe('+ € 12');
  });

  it('afval ophalen (o3): de heffing dekt de kosten', () => {
    const p = afvalPost(data);
    expect(p).toBeDefined();
    expect(p?.lastenMln).toBeGreaterThan(0);
    expect(p?.batenMln).toBeGreaterThanOrEqual(p?.lastenMln ?? Infinity);
    expect(p?.jaar).toBe(data.begroting.begrotingsjaar);
  });
});

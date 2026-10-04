import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  forumBasis,
  groei,
  groepVan,
  hoogteVan,
  hulpPost,
  keerErnaast,
  LEVELS,
  maakVraag,
  oordeel,
  perInwonerEuro,
  puntenVoor,
  rondMooi,
  SCHAAL_EURO,
  SCHAAL_MLN,
  STAPPEN,
  stapNaarWaarde,
  sterrenVoor,
  toonBedrag,
  vergelijking,
  vergelijkTekst,
  vragenVoorLevel,
  VRAGEN_PER_LEVEL,
  waardeBij,
  waardeNaarStap,
} from '../mgForum';
import { bekendePosten, inwoners, type BekendePost } from '../minigames';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

/** Een vaste rij "toevalsgetallen", zodat de test steeds hetzelfde doet. */
const vast = (zaad = 1) => {
  let s = zaad;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

const post = (id: string, bedragMln: number): BekendePost => ({
  id,
  naam: `Post ${id}`,
  uitleg: 'Een post om mee te testen.',
  bedragMln,
  batenMln: 0,
  begrotingsnaam: id,
});

describe('Forum: de schaal', () => {
  it('loopt logaritmisch: elke streep is tien keer zoveel', () => {
    expect(hoogteVan(SCHAAL_MLN.min, SCHAAL_MLN)).toBe(0);
    expect(hoogteVan(SCHAAL_MLN.max, SCHAAL_MLN)).toBe(1);
    const een = hoogteVan(1, SCHAAL_MLN);
    const tien = hoogteVan(10, SCHAAL_MLN);
    const honderd = hoogteVan(100, SCHAAL_MLN);
    expect(tien - een).toBeCloseTo(honderd - tien, 9);
    expect(hoogteVan(0, SCHAAL_MLN)).toBe(0);
    expect(hoogteVan(1e6, SCHAAL_MLN)).toBe(1);
  });

  it('schuif en bedrag horen bij elkaar, en de schuif loopt op', () => {
    for (const schaal of [SCHAAL_MLN, SCHAAL_EURO]) {
      expect(stapNaarWaarde(0, schaal)).toBeCloseTo(schaal.min, 6);
      expect(stapNaarWaarde(STAPPEN, schaal)).toBeCloseTo(schaal.max, 6);
      for (let s = 1; s <= STAPPEN; s++)
        expect(stapNaarWaarde(s, schaal)).toBeGreaterThanOrEqual(stapNaarWaarde(s - 1, schaal));
      expect(
        Math.abs(waardeNaarStap(stapNaarWaarde(120, schaal), schaal) - 120),
      ).toBeLessThanOrEqual(1);
      for (const ijk of schaal.ijk) expect(waardeBij(hoogteVan(ijk, schaal), schaal)).toBe(ijk);
    }
  });

  it('rondt mooi af op twee cijfers', () => {
    expect(rondMooi(12.34)).toBe(12);
    expect(rondMooi(0.456)).toBe(0.46);
    expect(rondMooi(1234)).toBe(1200);
    expect(rondMooi(0)).toBe(0);
  });

  it('toont bedragen in miljoenen of in euro per inwoner', () => {
    expect(toonBedrag(12, 'mln')).toBe('€ 12 mln');
    expect(toonBedrag(205.1, 'mln')).toBe('€ 205 mln');
    expect(toonBedrag(4.35, 'mln')).toBe('€ 4,4 mln');
    expect(toonBedrag(0.5, 'mln')).toBe('€ 0,5 mln');
    expect(toonBedrag(839.4, 'euro')).toBe('€ 839');
    expect(toonBedrag(4.1, 'euro')).toBe('€ 4,1');
  });
});

describe('Forum: punten en sterren', () => {
  it('meer sterren als je dichterbij zit, even streng te hoog als te laag', () => {
    expect(sterrenVoor(100, 100)).toBe(3);
    expect(sterrenVoor(120, 100)).toBe(3);
    expect(sterrenVoor(150, 100)).toBe(2);
    expect(sterrenVoor(50, 100)).toBe(2);
    expect(sterrenVoor(300, 100)).toBe(1);
    expect(sterrenVoor(1000, 100)).toBe(0);
    expect(sterrenVoor(25, 100)).toBe(sterrenVoor(400, 100));
    expect(keerErnaast(0, 5)).toBe(Infinity);
  });

  it('100 punten voor precies goed, 0 voor tien keer ernaast; tijdbonus en hulpje', () => {
    expect(puntenVoor(12, 12)).toBe(100);
    expect(puntenVoor(120, 12)).toBe(0);
    expect(puntenVoor(1.2, 12)).toBe(0);
    expect(puntenVoor(24, 12)).toBe(Math.round(100 - 100 * Math.log10(2)));
    expect(puntenVoor(6, 12)).toBe(puntenVoor(24, 12));
    expect(puntenVoor(12, 12, 15)).toBe(115);
    expect(puntenVoor(12, 12, 15, true)).toBe(95);
    // geen bonus als je er helemaal naast zat, en nooit minder dan 0
    expect(puntenVoor(500, 12, 20, true)).toBe(0);
  });

  it('zegt hoe ver je ernaast zat', () => {
    expect(oordeel(100, 100)).toMatch(/precies/);
    expect(oordeel(210, 100)).toBe('2,1 keer te hoog.');
    expect(oordeel(50, 100)).toBe('2,0 keer te laag.');
  });

  it('de groei schiet een klein beetje door en eindigt precies', () => {
    expect(groei(0)).toBe(0);
    expect(groei(1)).toBe(1);
    expect(groei(2)).toBe(1);
    expect(Math.max(...[0.6, 0.7, 0.8, 0.9].map(groei))).toBeGreaterThan(1);
    expect(Math.max(...[0.6, 0.7, 0.8, 0.9].map(groei))).toBeLessThan(1.15);
  });
});

describe('Forum: vragen uit de begroting', () => {
  it('drie levels: groot, middel en per inwoner, met posten met een begrijpelijke naam', () => {
    const { posten, inwoners: n } = forumBasis(data);
    expect(n).toBe(inwoners(data));
    expect(LEVELS).toHaveLength(3);
    const l1 = vragenVoorLevel(posten, 1, n, vast(3));
    const l2 = vragenVoorLevel(posten, 2, n, vast(3));
    const l3 = vragenVoorLevel(posten, 3, n, vast(3));
    for (const l of [l1, l2, l3]) expect(l).toHaveLength(VRAGEN_PER_LEVEL);
    for (const v of l1) expect(groepVan(v.post.bedragMln)).toBe('groot');
    for (const v of l2) expect(groepVan(v.post.bedragMln)).toBe('midden');
    expect(new Set(l3.map((v) => groepVan(v.post.bedragMln))).size).toBe(3);
    for (const v of [...l1, ...l2]) {
      expect(v.eenheid).toBe('mln');
      // het bedrag komt uit de begroting van het actieve jaar
      expect(v.echt).toBe(data.index.onderdelen.get(v.post.id)?.lasten_mln);
      expect(v.post.uitleg.length).toBeGreaterThan(10);
    }
    for (const v of l3) {
      expect(v.eenheid).toBe('euro');
      expect(v.echt).toBeCloseTo((v.post.bedragMln * 1e6) / n, 6);
    }
    // alle bedragen passen op de schaal
    for (const v of [...l1, ...l2]) {
      expect(v.echt).toBeGreaterThan(SCHAAL_MLN.min);
      expect(v.echt).toBeLessThan(SCHAAL_MLN.max);
    }
    for (const v of l3) {
      expect(v.echt).toBeGreaterThan(SCHAAL_EURO.min);
      expect(v.echt).toBeLessThan(SCHAAL_EURO.max);
    }
  });

  it('een level opnieuw geeft andere posten, als dat kan', () => {
    const { posten, inwoners: n } = forumBasis(data);
    const eerst = vragenVoorLevel(posten, 1, n, vast(5));
    const opnieuw = vragenVoorLevel(posten, 1, n, vast(7), new Set(eerst.map((v) => v.post.id)));
    for (const v of opnieuw) expect(eerst.some((e) => e.post.id === v.post.id)).toBe(false);
  });

  it('vult aan als een groep te klein is', () => {
    const weinig = [post('a', 50), post('b', 2), post('c', 3), post('d', 12)];
    const vragen = vragenVoorLevel(weinig, 1, 200_000, vast(2));
    expect(vragen).toHaveLength(3);
    expect(new Set(vragen.map((v) => v.post.id)).size).toBe(3);
  });

  it('per inwoner: miljoenen gedeeld door het aantal inwoners', () => {
    expect(perInwonerEuro(1, 250_000)).toBe(4);
    expect(maakVraag(post('x', 10), 'euro', 250_000).echt).toBe(40);
    expect(maakVraag(post('x', 10), 'mln', 250_000).echt).toBe(10);
  });

  it('vergelijkt alleen met een andere post uit de begroting, met een rond getal', () => {
    const lijst = [post('a', 30), post('b', 10.6), post('c', 28), post('d', 70)];
    const v = vergelijking(lijst, post('z', 30.5));
    expect(v?.post.id).toBe('a');
    expect(v?.richting).toBe('even');
    const drie = vergelijking([post('b', 10), post('q', 1)], post('z', 30.5));
    expect(drie && vergelijkTekst(drie)).toBe('ongeveer 3 keer zo veel als Post b');
    const half = vergelijking([post('d', 61)], post('z', 30.5));
    expect(half && vergelijkTekst(half)).toBe('ongeveer de helft van Post d');
    expect(vergelijking([post('q', 1)], post('z', 30.5))).toBeUndefined();
    // met de echte posten is er voor (bijna) elke post een vergelijking
    const echte = bekendePosten(data);
    const met = echte.filter((p) => vergelijking(echte, p));
    expect(met.length).toBeGreaterThanOrEqual(echte.length - 2);
    for (const p of echte) expect(vergelijking(echte, p)?.post.id).not.toBe(p.id);
  });

  it('het hulpje is een andere post, niet te dichtbij', () => {
    const { posten, inwoners: n } = forumBasis(data);
    for (const nr of [1, 2, 3])
      for (const vraag of vragenVoorLevel(posten, nr, n, vast(nr))) {
        const h = hulpPost(posten, vraag, vast(9));
        expect(h).toBeDefined();
        expect(h?.id).not.toBe(vraag.post.id);
        const k = keerErnaast(h?.bedragMln ?? 0, vraag.post.bedragMln);
        expect(k).toBeGreaterThanOrEqual(1.5);
      }
  });
});

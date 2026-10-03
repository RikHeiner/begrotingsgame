import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { echteData, keuzes } from '../../engine/__tests__/hulp';
import { AANTAL_STEDEN, grootteVan, rangnummer, vergelijkWoonlasten } from '../woonlasten';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});
const woonlasten = () => {
  if (!data.woonlasten) throw new Error('geen woonlasten');
  return data.woonlasten;
};

describe('woonlasten vergeleken met andere gemeenten', () => {
  it('het bestand heeft alle gemeenten, met inwoners en kloppende sommen', () => {
    const w = woonlasten();
    expect(w.jaar).toBe(data.config.actiefJaar);
    expect(w.gemeenten).toHaveLength(342);
    for (const g of w.gemeenten) {
      expect(g.inwoners, g.naam).toBeGreaterThan(0);
      for (const p of ['een', 'meer'] as const)
        expect(g[`ozb`] + g[`afval_${p}`] + g[`riool_${p}`] - g[`korting_${p}`]).toBeCloseTo(
          g[`koop_${p}`],
          1,
        );
    }
  });

  it('de tarieven van Groningen bij COELO zijn dezelfde als in tarieven-2026.json', () => {
    const g = woonlasten().gemeenten.find((x) => x.code === '0014');
    const t = data.tarieven;
    expect(g?.afval_een).toBe(t?.afvalstoffenheffing.een_persoon);
    expect(g?.afval_meer).toBe(t?.afvalstoffenheffing.drie_of_meer);
    expect(g?.riool_meer).toBe(t?.rioolheffing_eigenaar);
  });

  it('koophuis, meerpersoons: hetzelfde rangnummer als COELO publiceert', () => {
    const v = vergelijkWoonlasten(woonlasten(), keuzes(), 'koop', 'meer');
    expect(v?.naam).toBe('Groningen');
    expect(v?.nu).toBe(1267.92);
    expect(v?.straks).toBe(1267.92);
    expect(v?.gemiddelde).toBe(1095);
    expect(v?.rang).toEqual({ nu: 293, straks: 293, aantal: 342 });
    expect(v?.rang?.nu).toBe(woonlasten().handmatig?.gemeente.rang_koop_meer);
  });

  it('een lagere OZB verlaagt de woonlasten en het rangnummer', () => {
    // −20% van 687,11 OZB = −137,42
    const v = vergelijkWoonlasten(
      woonlasten(),
      keuzes({ belastingen: { t1: -20 } }),
      'koop',
      'meer',
    );
    expect(v?.straks).toBeCloseTo(1267.92 - 137.422, 2);
    expect(v?.rang?.straks).toBeLessThan(293);
    const anderen = woonlasten()
      .gemeenten.filter((g) => g.code !== '0014')
      .map((g) => g.koop_meer);
    expect(v?.rang?.straks).toBe(rangnummer(v?.straks ?? 0, anderen));
    expect(v?.steden.find((r) => r.eigen)?.bedrag).toBe(v?.straks);
  });

  it('de grote steden zijn de grootste gemeenten naar inwoners, van laag naar hoog', () => {
    const v = vergelijkWoonlasten(woonlasten(), keuzes(), 'koop', 'een');
    expect(v?.steden).toHaveLength(AANTAL_STEDEN);
    expect(v?.steden.map((r) => r.naam)).toEqual(
      expect.arrayContaining(['Amsterdam', 'Rotterdam', "'s-Gravenhage", 'Utrecht', 'Groningen']),
    );
    const bedragen = v?.steden.map((r) => r.bedrag) ?? [];
    expect(bedragen).toEqual([...bedragen].sort((a, b) => a - b));
    expect(v?.provincie).toHaveLength(10);
  });

  it('huurhuis: de cijfers van COELO, en de keuzes veranderen niets', () => {
    const v = vergelijkWoonlasten(
      woonlasten(),
      keuzes({ belastingen: { t1: -20 } }),
      'huur',
      'meer',
    );
    expect(v).toMatchObject({ nu: 402, straks: 402, gemiddelde: 500 });
    expect(v?.rang).toEqual({ nu: 79, straks: 79, aantal: 342 });
    expect(vergelijkWoonlasten(woonlasten(), keuzes(), 'huur', 'een')?.rang).toBeUndefined();
  });

  it('huishoudgrootte', () => {
    expect(grootteVan(1)).toBe('een');
    expect(grootteVan(2)).toBe('meer');
  });
});

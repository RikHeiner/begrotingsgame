import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { echteData, keuzes, mln } from '../../engine/__tests__/hulp';
import type { Inzending } from '../../inzending/types';
import {
  combinaties,
  kerncijfers,
  maakCsv,
  perGebied,
  perPost,
  rekenDoor,
  zoekIdeeen,
} from '../analyse';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});

let n = 0;
const inzending = (deel: Partial<Inzending>): Inzending => ({
  id: `id-${++n}`,
  aangemaakt: `2026-10-0${n}T12:00:00.000Z`,
  begrotingsjaar: 2026,
  keuzes: keuzes(),
  missie: null,
  gebied: null,
  idee: null,
  idee_status: 'geen',
  toestemming_versie: 1,
  ...deel,
});

const drie = () => [
  inzending({
    keuzes: keuzes({ onderdelen: { h1: -10 }, belastingen: { t1: -5 } }),
    gebied: 'zuid',
    idee: 'Meer bankjes in het park.',
    idee_status: 'nieuw',
  }),
  inzending({
    keuzes: keuzes({ onderdelen: { h1: -20 }, belastingen: { t1: -5 } }),
    gebied: 'zuid',
    idee: '=SOM(A1:A9) "test"; regel',
    idee_status: 'verdacht',
  }),
  inzending({ keuzes: keuzes({ onderdelen: { h1: 10 } }), gebied: 'onzin' }),
];

describe('dashboard: analyse van inzendingen', () => {
  it('rekent elke inzending door met de rekenmotor', () => {
    const b = rekenDoor(data, drie());
    // 12,3236 − 6,265 (zie de e2e-test van de deellink)
    expect(mln(b[0]?.saldoS ?? 0)).toBeCloseTo(6.0586, 3);
    expect(mln(b[0]?.perBron.get('h1') ?? 0)).toBeCloseTo(12.3236, 3);
    expect(b[0]?.sluitend).toBe(true);
    expect(b[2]?.saldoS).toBeLessThan(0);
  });

  it('telt per post hoe vaak en hoeveel', () => {
    const rijen = perPost(data, rekenDoor(data, drie()));
    const h1 = rijen.find((r) => r.id === 'h1');
    expect(h1).toMatchObject({ gekozen: 3, omlaag: 2, omhoog: 1, soort: 'onderdeel' });
    expect(h1?.gemiddeldPct).toBeCloseTo((-10 - 20 + 10) / 3, 6);
    const t1 = rijen.find((r) => r.id === 't1');
    expect(t1).toMatchObject({ gekozen: 2, omlaag: 2, omhoog: 0, gemiddeldPct: -5 });
    expect(t1?.gemiddeldBedrag).toBeLessThan(0);
    expect(rijen[0]?.id).toBe('h1');
    expect(rijen.some((r) => r.gekozen === 0)).toBe(false);
  });

  it('telt per gebied, met onbekende gebieden als niet ingevuld', () => {
    const g = perGebied(data, drie());
    expect(g.find((x) => x.id === 'zuid')?.aantal).toBe(2);
    expect(g.find((x) => x.id === 'onbekend')?.aantal).toBe(1);
    expect(g.reduce((s, x) => s + x.aantal, 0)).toBe(3);
  });

  it('vindt combinaties die vaker voorkomen', () => {
    const c = combinaties(data, drie());
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ aantal: 2 });
    expect([c[0]?.a, c[0]?.b].join(' + ')).toMatch(
      /Onroerendezaakbelasting.*omlaag \+ Overhead.*omlaag/,
    );
  });

  it('kerncijfers en zoeken in ideeën', () => {
    const k = kerncijfers(rekenDoor(data, drie()));
    expect(k).toMatchObject({ aantal: 3, sluitend: 2, ideeen: 2, teBeoordelen: 2, verdacht: 1 });
    expect(zoekIdeeen(drie(), 'BANKJES park').map((i) => i.idee)).toEqual([
      'Meer bankjes in het park.',
    ]);
    expect(zoekIdeeen(drie(), '')).toHaveLength(2);
  });

  it('maakt een CSV voor Excel die terug te lezen is', () => {
    const csv = maakCsv(data, rekenDoor(data, drie()));
    expect(csv.startsWith('﻿')).toBe(true);
    const regels = csv.slice(1).trimEnd().split('\r\n');
    expect(regels).toHaveLength(4);
    const kop = (regels[0] ?? '').split(';');
    const eerste = (regels[1] ?? '').split(';');
    const kolom = (naam: RegExp) => kop.findIndex((k) => naam.test(k));
    expect(eerste[kolom(/^gebied$/)]).toBe('Zuid');
    expect(eerste[kolom(/^saldo structureel/)]).toBe('6,059');
    expect(eerste[kolom(/^sluitend$/)]).toBe('ja');
    expect(eerste[kolom(/^h1 /)]).toBe('-10');
    expect(eerste[kolom(/^t1 /)]).toBe('-5');
    expect(eerste[kolom(/^idee$/)]).toBe('Meer bankjes in het park.');
    // Vrije tekst met een formule, aanhalingstekens en een puntkomma
    expect(regels[2]).toContain(`"'=SOM(A1:A9) ""test""; regel"`);
    expect(kop.length).toBe(eerste.length);
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  BREEDTE,
  DAG,
  HOOGTE,
  KLUSSEN_PER_DAG,
  LEVELS,
  PLEKKEN,
  PRIJS_ERGER,
  PRIJS_ONGELUK,
  PRIJS_SNEL,
  RAAK_STRAAL,
  SOORTEN,
  WERKTIJD,
  busStap,
  dagen,
  fase,
  level,
  nieuweBus,
  nieuwPark,
  onderhoudsPost,
  raak,
  rekening,
  repareer,
  stap,
  stopPlek,
  type Bus,
  type LevelRegels,
  type Park,
} from '../mgNoorderplantsoen';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

/** Een vaste reeks getallen voor de tests. */
const vast = (zaad = 1) => {
  let a = zaad;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
};

const L1 = level(1);

describe('Noorderplantsoen: het park', () => {
  it('alle plekken liggen in het veld en niet op elkaar', () => {
    const ids = new Set(PLEKKEN.map((p) => p.id));
    expect(ids.size).toBe(PLEKKEN.length);
    for (const p of PLEKKEN) {
      expect(p.x).toBeGreaterThanOrEqual(10);
      expect(p.x).toBeLessThanOrEqual(BREEDTE - 10);
      expect(p.y).toBeGreaterThanOrEqual(10);
      expect(p.y).toBeLessThanOrEqual(HOOGTE - 10);
      for (const q of PLEKKEN)
        if (q !== p)
          expect(Math.hypot(p.x - q.x, p.y - q.y), `${p.id}-${q.id}`).toBeGreaterThan(18);
    }
    for (const soort of Object.keys(SOORTEN))
      expect(PLEKKEN.some((p) => p.soort === soort)).toBe(true);
  });

  it('elk level: meer dat kapot gaat, minder tijd voor het erger wordt', () => {
    expect(LEVELS).toHaveLength(3);
    for (let i = 1; i < LEVELS.length; i++) {
      const [a, b] = [LEVELS[i - 1] as LevelRegels, LEVELS[i] as LevelRegels];
      expect(b.breukElke).toBeLessThan(a.breukElke);
      expect(b.soorten.length).toBeGreaterThanOrEqual(a.soorten.length);
      expect(b.ongelukNa).toBeLessThanOrEqual(a.ongelukNa);
    }
    for (const l of LEVELS) {
      expect(l.ergerNa).toBeLessThan(l.ongelukNa);
      expect(dagen(l)).toBe(10);
    }
  });
});

describe('Noorderplantsoen: kapot, erger, ongeluk', () => {
  it('er gaan dingen kapot van de soorten van het level, nooit twee op één plek', () => {
    const { park, gebeurd } = stap(nieuwPark(), level(3), 29, vast(3));
    const kapot = gebeurd.filter((g) => g.soort === 'kapot');
    expect(kapot.length).toBeGreaterThan(12);
    for (const g of kapot) expect(level(3).soorten).toContain(g.schade.plek.soort);
    const plekken = park.schades.map((s) => s.plek.id);
    expect(new Set(plekken).size).toBe(plekken.length);
    // level 1 heeft geen speeltuin en geen takken
    const l1 = stap(nieuwPark(), L1, 29, vast(4)).gebeurd;
    expect(l1.every((g) => ['gat', 'lamp', 'afval'].includes(g.schade.plek.soort))).toBe(true);
  });

  it('snel repareren kost € 1.000, later € 3.000 (spelregels)', () => {
    let { park } = stap(nieuwPark(), L1, 1, () => 0);
    const s = park.schades[0];
    expect(s).toBeDefined();
    if (!s) return;
    expect(fase(s, park.t, L1)).toBe('nieuw');
    const snel = repareer(park, L1, s.id);
    expect(snel?.reparatie.prijs).toBe(PRIJS_SNEL);
    expect(snel?.park.uitgegeven).toBe(PRIJS_SNEL);
    expect(snel?.park.schades).toHaveLength(0);
    // wachten tot het erger is (maar nog geen ongeluk)
    park = stap(park, L1, s.sinds + L1.ergerNa + 0.1, () => 0.99).park;
    expect(fase(s, park.t, L1)).toBe('erger');
    expect(repareer(park, L1, s.id)?.reparatie.prijs).toBe(PRIJS_ERGER);
    expect(repareer(park, L1, 'bestaat-niet')).toBeUndefined();
  });

  it('nog langer wachten: een ongeluk, dat kost het meest', () => {
    const { park, gebeurd } = stap(nieuwPark(), L1, 1, () => 0);
    const s = park.schades[0];
    if (!s) throw new Error('niets kapot');
    const later = stap(park, L1, s.sinds + L1.ongelukNa + 0.01, () => 0.5);
    expect(gebeurd[0]?.soort).toBe('kapot');
    const ongeluk = later.gebeurd.find((g) => g.soort === 'ongeluk' && g.schade.id === s.id);
    expect(ongeluk).toBeDefined();
    expect(later.park.schades.some((x) => x.id === s.id)).toBe(false);
    expect(later.park.ongelukken).toHaveLength(
      later.gebeurd.filter((g) => g.soort === 'ongeluk').length,
    );
    expect(later.park.uitgegeven).toBe(PRIJS_ONGELUK * later.park.ongelukken.length);
    expect(PRIJS_ONGELUK).toBeGreaterThan(PRIJS_ERGER);
  });

  it('een tik raakt de dichtstbijzijnde schade', () => {
    const { park } = stap(nieuwPark(), level(3), 20, vast(9));
    for (const s of park.schades)
      expect(raak(park.schades, s.plek.x + 3, s.plek.y - 2)?.id).toBe(s.id);
    expect(raak(park.schades, -100, -100)).toBeUndefined();
    const s = park.schades[0];
    if (s) expect(raak([s], s.plek.x + RAAK_STRAAL + 1, s.plek.y)).toBeUndefined();
  });
});

describe('Noorderplantsoen: de rekening', () => {
  it('telt snel, laat, ongelukken en wat nog kapot is; uitstel kost extra', () => {
    const park: Park = {
      ...nieuwPark(),
      reparaties: [
        { soort: 'gat', plek: 'gat-1', fase: 'nieuw', prijs: PRIJS_SNEL, t: 1 },
        { soort: 'lamp', plek: 'lamp-1', fase: 'erger', prijs: PRIJS_ERGER, t: 9 },
      ],
      ongelukken: [{ soort: 'afval', plek: 'afval-1', t: 20 }],
      schades: [{ id: 's9', plek: PLEKKEN[0] as never, sinds: 28 }],
      uitgegeven: PRIJS_SNEL + PRIJS_ERGER + PRIJS_ONGELUK,
      t: 30,
    };
    const r = rekening(park, L1);
    expect(r).toMatchObject({ snel: 1, laat: 1, ongelukken: 1, nogKapot: 1, teLaat: 2 });
    // wat nog kapot is (2 seconden oud, dus nog nieuw) schuif je door voor de prijs van nu
    expect(r.totaal).toBe(PRIJS_SNEL + PRIJS_ERGER + PRIJS_ONGELUK + PRIJS_SNEL);
    expect(r.nogKapotErger).toBe(0);
    expect(r.extra).toBe(r.totaal - 4 * PRIJS_SNEL);
    expect(r.binnenBudget).toBe(r.totaal <= L1.budget);
    expect(r.redenen).toEqual({ budget: r.totaal <= L1.budget, veilig: false, snel: true });
    expect(r.sterren).toBe(Number(r.binnenBudget) + 1);
    const perfect = rekening(
      { ...nieuwPark(), reparaties: [park.reparaties[0] as never], uitgegeven: PRIJS_SNEL },
      L1,
    );
    expect(perfect.sterren).toBe(3);
    expect(perfect.extra).toBe(0);
  });
});

/** Rustige modus: elke dag twee klussen, de oudste eerst. */
function speelRustig(l: LevelRegels, zaad: number): Park {
  const kans = vast(zaad);
  let park = stap(nieuwPark(), l, 1, kans).park;
  for (let d = 0; d < dagen(l); d++) {
    for (let k = 0; k < KLUSSEN_PER_DAG; k++) {
      const s = [...park.schades].sort((a, b) => a.sinds - b.sinds)[0];
      if (s) park = repareer(park, l, s.id)?.park ?? park;
    }
    park = stap(park, l, Math.min(l.tijd, park.t + DAG), kans).park;
  }
  return park;
}

const afstand = (s: Park['schades'][number], b: Bus) => Math.hypot(s.plek.x - b.x, s.plek.y - b.y);

/** Met de klok: steeds de dichtstbijzijnde schade in de rij van de bus. */
function speelMetBus(l: LevelRegels, zaad: number): Park {
  const kans = vast(zaad);
  let park = nieuwPark();
  let bus: Bus = nieuweBus();
  const dt = 1 / 30;
  while (park.t < l.tijd) {
    park = stap(park, l, Math.min(l.tijd, park.t + dt), kans).park;
    if (!bus.rij.length) {
      const s = [...park.schades].sort((a, b) => afstand(a, bus) - afstand(b, bus))[0];
      if (s) bus = { ...bus, rij: [s.id] };
    }
    const r = busStap(bus, park, l, dt);
    bus = r.bus;
    park = r.park;
  }
  return park;
}

describe('Noorderplantsoen: te halen', () => {
  it('in de rustige modus haalt wie elke dag goed kiest alle levels', () => {
    for (const l of LEVELS)
      for (const zaad of [1, 2, 3]) {
        const r = rekening(speelRustig(l, zaad), l);
        expect(r.binnenBudget, `level ${l.nr}`).toBe(true);
        expect(r.ongelukken).toBe(0);
      }
  });

  it('met de klok haalt een goede speler het budget, wie niets doet niet', () => {
    for (const l of LEVELS) {
      let gehaald = 0;
      for (const zaad of [1, 2, 3, 4, 5])
        if (rekening(speelMetBus(l, zaad), l).binnenBudget) gehaald++;
      expect(gehaald, `level ${l.nr}`).toBeGreaterThanOrEqual(4);
      const niets = stap(nieuwPark(), l, l.tijd, vast(1)).park;
      expect(rekening(niets, l).binnenBudget, `level ${l.nr}`).toBe(false);
      expect(rekening(niets, l).sterren).toBe(0);
    }
  });

  it('de bus rijdt naar de klus, repareert die en werkt even', () => {
    let park = stap(nieuwPark(), L1, 1, () => 0).park;
    const s = park.schades[0];
    if (!s) throw new Error('niets kapot');
    let bus: Bus = { ...nieuweBus(), rij: [s.id] };
    let gerepareerd = false;
    for (let i = 0; i < 200 && !gerepareerd; i++) {
      const r = busStap(bus, park, L1, 0.05);
      bus = r.bus;
      park = r.park;
      if (r.reparatie) gerepareerd = true;
    }
    expect(gerepareerd).toBe(true);
    expect(bus).toMatchObject({ ...stopPlek(s.plek), werk: WERKTIJD, rij: [] });
    expect(park.schades).toHaveLength(0);
    bus = busStap(bus, park, L1, WERKTIJD + 0.01).bus;
    expect(bus.werk).toBe(0);
    expect(bus.bij).toBeUndefined();
  });
});

describe('Noorderplantsoen: de echte post', () => {
  it('onderhoud van straten, groen en speeltuinen, met het bedrag uit de begroting', () => {
    const p = onderhoudsPost(data);
    expect(p).toBeDefined();
    const o = data.index.onderdelen.get('o1');
    expect(p?.bedragMln).toBe(o?.lasten_mln);
    expect(p?.bedragMln).toBeGreaterThan(10);
    expect(p?.naam).toMatch(/onderhoud/i);
    expect(p?.soort).toBe('wet');
    expect(p?.wet).toBeTruthy();
  });
});

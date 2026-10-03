/**
 * Geometrie van de gemeentekaart in wereldcoördinaten, los van het tekenen (en dus te testen):
 * buurten met hun gebied, gebiedsgrenzen, water, wegen van het Stadhuis naar elk gebouw, labels.
 */
import type { Data } from '../../engine';
import { GEBOUW_SCHAAL } from './maten';
import { maakProjectie, type LonLat, type Punt, type Projectie } from './projectie';

export type BuurtGeo = {
  type: 'FeatureCollection';
  features: {
    properties: { code: string; naam: string };
    geometry:
      | { type: 'Polygon'; coordinates: number[][][] }
      | { type: 'MultiPolygon'; coordinates: number[][][][] };
  }[];
};

export type Buurt = { code: string; naam: string; gebied: string; ringen: Punt[][] };
export type Weg = { gebouw: string; van: Punt; ctrl: Punt; naar: Punt };
export type Water =
  | { id: string; naam: string; soort: 'lijn'; punten: Punt[]; breedte: number }
  | { id: string; naam: string; soort: 'vlak'; ringen: Punt[][] };
export type Label = { tekst: string; punt: Punt; soort: 'dorp' | 'gebied' | 'water' };

export type KaartGeometrie = {
  breedte: number;
  hoogte: number;
  /** dikte van de rand onder de gekantelde kaart (2,5D), in wereldeenheden */
  dikte: number;
  buurten: Buurt[];
  /** lijnstukken tussen buurten van verschillende gebieden */
  gebiedsgrenzen: [Punt, Punt][];
  water: Water[];
  wegen: Weg[];
  gebouwen: Record<string, Punt>;
  /** de bekende gebouwen met een minigame (Martinitoren, Forum, …) */
  minigames: Record<string, Punt>;
  labels: Label[];
  projectie: Projectie;
};

function ringenVan(f: BuurtGeo['features'][number]): number[][][] {
  return f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat();
}

const sleutel = (a: number[], b: number[]) => {
  const x = `${a[0]},${a[1]}`;
  const y = `${b[0]},${b[1]}`;
  return x < y ? `${x}|${y}` : `${y}|${x}`;
};

/**
 * `opties` past de instellingen uit kaart.json aan: de 3D-kaart kantelt met de camera, dus daar is
 * de kaart plat (kanteling 1) en zonder getekende rand (dikte 0).
 */
export function maakGeometrie(
  data: Data,
  geo: BuurtGeo,
  opties: { kanteling?: number; dikte?: number } = {},
): KaartGeometrie {
  const k = { ...data.kaart, ...opties };
  const coordinaten: LonLat[] = geo.features.flatMap((f) =>
    ringenVan(f).flatMap((ring) => ring.map((c) => [c[0] ?? 0, c[1] ?? 0] as const)),
  );
  const projectie = maakProjectie({
    coordinaten,
    centrum: [k.centrum.lon, k.centrum.lat],
    exponent: k.vergroting.exponent,
    breedte: k.wereld_breedte,
    marge: k.wereld_breedte * 0.04,
    kanteling: k.kanteling,
  });
  const p = (c: readonly number[]) => projectie.punt([c[0] ?? 0, c[1] ?? 0]);

  const gebiedVan = new Map<string, string>();
  for (const g of data.gebieden.gebieden) for (const c of g.buurten) gebiedVan.set(c, g.id);

  const buurten: Buurt[] = geo.features.map((f) => ({
    code: f.properties.code,
    naam: f.properties.naam,
    gebied: gebiedVan.get(f.properties.code) ?? '',
    ringen: ringenVan(f).map((ring) => ring.map(p)),
  }));

  // Gebiedsgrenzen: een lijnstuk dat in twee buurten van verschillende gebieden voorkomt.
  const stukken = new Map<string, { a: number[]; b: number[]; gebieden: string[] }>();
  for (const f of geo.features) {
    const gebied = gebiedVan.get(f.properties.code) ?? '';
    for (const ring of ringenVan(f)) {
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i] ?? [];
        const b = ring[i + 1] ?? [];
        const s = sleutel(a, b);
        const bestaand = stukken.get(s);
        if (bestaand) bestaand.gebieden.push(gebied);
        else stukken.set(s, { a, b, gebieden: [gebied] });
      }
    }
  }
  const gebiedsgrenzen: [Punt, Punt][] = [...stukken.values()]
    .filter((s) => s.gebieden.length === 2 && s.gebieden[0] !== s.gebieden[1])
    .map((s) => [p(s.a), p(s.b)]);

  const water: Water[] = k.water.flatMap((w): Water[] => {
    if (w.lijn)
      return [
        { id: w.id, naam: w.naam, soort: 'lijn', punten: w.lijn.map(p), breedte: w.breedte ?? 6 },
      ];
    if (w.vlak) return [{ id: w.id, naam: w.naam, soort: 'vlak', ringen: [w.vlak.map(p)] }];
    const buurt = buurten.find((b) => b.code === w.buurt);
    return buurt ? [{ id: w.id, naam: w.naam, soort: 'vlak', ringen: buurt.ringen }] : [];
  });

  const gebouwen: Record<string, Punt> = {};
  for (const g of data.gebouwen) {
    if (g.positie) gebouwen[g.id] = projectie.punt([g.positie.lon, g.positie.lat]);
  }

  spreid(gebouwen, MIN_AFSTAND, 'stadhuis', REK);

  // De minigames: kleiner, dus dichter op elkaar; de gebouwen blijven staan.
  // Ze blijven binnen de gemeente. Een spel "bij" een gebouw staat vast op dat gebouw.
  const minigames: Record<string, Punt> = {};
  for (const m of data.minigames)
    if (!m.bij) minigames[m.id] = projectie.punt([m.positie.lon, m.positie.lat]);
  const binnen = (q: Punt) => buurten.some((b) => b.ringen[0] && inRing(q, b.ringen[0]));
  spreidRond(
    minigames,
    Object.values(gebouwen),
    MIN_AFSTAND * 0.8,
    MIN_AFSTAND * 0.6,
    REK,
    200,
    binnen,
  );
  for (const m of data.minigames) {
    const g = m.bij && gebouwen[m.bij.gebouw];
    if (m.bij && g)
      minigames[m.id] = { x: g.x + m.bij.dx * GEBOUW_SCHAAL, y: g.y + m.bij.dy * GEBOUW_SCHAAL };
  }

  // Wegen: van het Stadhuis naar elk gebouw, licht gebogen, om en om naar links en rechts.
  const hub = gebouwen.stadhuis ?? projectie.centrum;
  const wegen: Weg[] = data.gebouwen
    .filter((g) => g.id !== 'stadhuis' && gebouwen[g.id])
    .map((g, i) => {
      const naar = gebouwen[g.id] as Punt;
      const dx = naar.x - hub.x;
      const dy = naar.y - hub.y;
      const kant = i % 2 ? 1 : -1;
      return {
        gebouw: g.id,
        van: hub,
        ctrl: {
          x: (hub.x + naar.x) / 2 - dy * 0.15 * kant,
          y: (hub.y + naar.y) / 2 + dx * 0.15 * kant,
        },
        naar,
      };
    });

  const labels: Label[] = k.labels.map((l) => ({
    tekst: l.tekst,
    soort: l.soort,
    punt: projectie.punt([l.lon, l.lat]),
  }));

  return {
    breedte: projectie.breedte,
    // De rand onder de gekantelde kaart hoort er ook bij.
    hoogte: projectie.hoogte + k.dikte,
    dikte: k.dikte,
    buurten,
    gebiedsgrenzen,
    water,
    wegen,
    gebouwen,
    minigames,
    labels,
    projectie,
  };
}

/** Kleinste afstand tussen twee gebouwen in wereldeenheden (gebouwen zijn groter dan op schaal). */
export const MIN_AFSTAND = 100;
/** Namen zijn breder dan gebouwen: horizontaal is er meer ruimte nodig dan verticaal. */
export const REK = 1.7;

/**
 * Duwt gebouwen die te dicht op elkaar staan uit elkaar, tot ze minstens `min` uit elkaar staan
 * (horizontaal gemeten als afstand / rek).
 * Deterministisch; het vaste gebouw (het Stadhuis) blijft staan.
 */
/**
 * Schuift losse punten weg van vaste punten (minstens `minVast`) en van elkaar (minstens
 * `minLos`). De vaste punten bewegen niet. `rek` werkt zoals bij `spreid`.
 */
export function spreidRond(
  los: Record<string, Punt>,
  vast: Punt[],
  minVast: number,
  minLos: number,
  rek = 1,
  rondes = 200,
  /** mag een punt hier staan? Een duw die erbuiten komt, gaat niet door */
  binnen: (p: Punt) => boolean = () => true,
): void {
  const ids = Object.keys(los).sort();
  const duw = (a: Punt, b: Punt, min: number, deel: number): boolean => {
    let dx = (a.x - b.x) / rek;
    let dy = a.y - b.y;
    let d = Math.hypot(dx, dy);
    if (d >= min) return false;
    if (d < 1e-6) {
      dx = 0;
      dy = 1;
      d = 1;
    }
    const f = ((min - d) / d) * deel;
    const nieuw = { x: a.x + dx * f * rek, y: a.y + dy * f };
    if (!binnen(nieuw)) return false;
    a.x = nieuw.x;
    a.y = nieuw.y;
    return true;
  };
  for (let r = 0; r < rondes; r++) {
    let verschoven = false;
    for (const id of ids) {
      const a = los[id] as Punt;
      for (const v of vast) verschoven = duw(a, v, minVast, 1) || verschoven;
      for (const ander of ids) {
        if (ander <= id) continue;
        const b = los[ander] as Punt;
        if (duw(a, b, minLos, 0.5)) {
          duw(b, a, minLos, 0.5);
          verschoven = true;
        }
      }
    }
    if (!verschoven) return;
  }
}

export function spreid(
  posities: Record<string, Punt>,
  min: number,
  vast?: string,
  rek = 1,
  rondes = 300,
): void {
  const ids = Object.keys(posities).sort();
  for (let r = 0; r < rondes; r++) {
    let verschoven = false;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = posities[ids[i] as string] as Punt;
        const b = posities[ids[j] as string] as Punt;
        let dx = (b.x - a.x) / rek;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= min) continue;
        if (d < 1e-6) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const duw = (min - d) / d;
        const aVast = ids[i] === vast;
        const bVast = ids[j] === vast;
        const fa = aVast ? 0 : bVast ? 1 : 0.5;
        const fb = bVast ? 0 : aVast ? 1 : 0.5;
        a.x -= dx * duw * fa * rek;
        a.y -= dy * duw * fa;
        b.x += dx * duw * fb * rek;
        b.y += dy * duw * fb;
        verschoven = true;
      }
    }
    if (!verschoven) break;
  }
}

/** Punt op een kwadratische Bézier-kromme, t van 0 tot 1. */
export function opWeg(w: Weg, t: number): Punt {
  const u = 1 - t;
  return {
    x: u * u * w.van.x + 2 * u * t * w.ctrl.x + t * t * w.naar.x,
    y: u * u * w.van.y + 2 * u * t * w.ctrl.y + t * t * w.naar.y,
  };
}

/** Ligt een punt in een ring (even-oneven-regel)? */
export function inRing(punt: Punt, ring: Punt[]): boolean {
  let binnen = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i] as Punt;
    const b = ring[j] as Punt;
    if (
      a.y > punt.y !== b.y > punt.y &&
      punt.x < ((b.x - a.x) * (punt.y - a.y)) / (b.y - a.y) + a.x
    ) {
      binnen = !binnen;
    }
  }
  return binnen;
}

export function buurtOp(geo: KaartGeometrie, punt: Punt): Buurt | undefined {
  return geo.buurten.find((b) => b.ringen.some((r) => inRing(punt, r)));
}

/** Omhullende rechthoek van alle buurten van een gebied. */
export function gebiedKader(
  geo: KaartGeometrie,
  gebied: string,
): { x: number; y: number; b: number; h: number } | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of geo.buurten) {
    if (b.gebied !== gebied) continue;
    for (const r of b.ringen) {
      for (const q of r) {
        minX = Math.min(minX, q.x);
        minY = Math.min(minY, q.y);
        maxX = Math.max(maxX, q.x);
        maxY = Math.max(maxY, q.y);
      }
    }
  }
  return Number.isFinite(minX) ? { x: minX, y: minY, b: maxX - minX, h: maxY - minY } : undefined;
}

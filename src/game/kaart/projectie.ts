/**
 * Projectie van de gemeentekaart: Mercator, daarna een radiale vergroting vanuit het centrum,
 * zodat de binnenstad groter wordt en alle gebouwen passen (opdracht 8.2):
 *   r' = R × (r / R) ^ exponent
 * met r de afstand tot het centrum en R de grootste afstand binnen de gemeente.
 * Het resultaat past in een wereld van `breedte` eenheden breed; de hoogte volgt uit de vorm.
 */
import { geoMercator } from 'd3-geo';

export type Punt = { x: number; y: number };
export type LonLat = readonly [number, number];

export type Projectie = {
  punt(lonlat: LonLat): Punt;
  breedte: number;
  hoogte: number;
  centrum: Punt;
};

export type ProjectieOpties = {
  /** alle coördinaten van de gemeente (voor R en de omvang) */
  coordinaten: LonLat[];
  centrum: LonLat;
  exponent: number;
  breedte: number;
  marge: number;
};

export function maakProjectie(o: ProjectieOpties): Projectie {
  const merc = geoMercator().scale(1).translate([0, 0]);
  const basis = (ll: LonLat): Punt => {
    const p = merc([ll[0], ll[1]]);
    if (!p) throw new Error(`Kan ${ll.join(',')} niet projecteren.`);
    return { x: p[0], y: p[1] };
  };
  const c = basis(o.centrum);
  let R = 0;
  for (const ll of o.coordinaten) {
    const p = basis(ll);
    R = Math.max(R, Math.hypot(p.x - c.x, p.y - c.y));
  }
  if (R === 0) throw new Error('De gemeente heeft geen omvang.');

  const vergroot = (p: Punt): Punt => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const r = Math.hypot(dx, dy);
    if (r === 0) return { x: c.x, y: c.y };
    const factor = (R * Math.pow(r / R, o.exponent)) / r;
    return { x: c.x + dx * factor, y: c.y + dy * factor };
  };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ll of o.coordinaten) {
    const p = vergroot(basis(ll));
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const schaal = (o.breedte - 2 * o.marge) / (maxX - minX);
  const naarWereld = (p: Punt): Punt => ({
    x: (p.x - minX) * schaal + o.marge,
    y: (p.y - minY) * schaal + o.marge,
  });
  return {
    punt: (ll) => naarWereld(vergroot(basis(ll))),
    breedte: o.breedte,
    hoogte: (maxY - minY) * schaal + 2 * o.marge,
    centrum: naarWereld(c),
  };
}

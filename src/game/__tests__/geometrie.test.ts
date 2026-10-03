import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { DATA_MAP, echteData } from '../../engine/__tests__/hulp';
import {
  buurtOp,
  gebiedKader,
  maakGeometrie,
  MIN_AFSTAND,
  REK,
  spreid,
  type BuurtGeo,
  type KaartGeometrie,
} from '../kaart/geometrie';

let data: Data;
let geo: KaartGeometrie;
beforeAll(async () => {
  data = await echteData();
  const buurten = JSON.parse(
    readFileSync(resolve(DATA_MAP, 'gemeente-groningen-buurten.geojson'), 'utf8'),
  ) as BuurtGeo;
  geo = maakGeometrie(data, buurten);
});

describe('kaartgeometrie', () => {
  it('heeft alle buurten, gebouwen en een weg naar elk gebouw', () => {
    expect(geo.buurten).toHaveLength(151);
    expect(Object.keys(geo.gebouwen)).toHaveLength(15);
    expect(geo.wegen).toHaveLength(14);
    expect(geo.gebiedsgrenzen.length).toBeGreaterThan(50);
  });

  it('gebouwen overlappen niet en het Stadhuis staat op de Grote Markt', () => {
    const p = Object.entries(geo.gebouwen);
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const [, a] = p[i] as [string, { x: number; y: number }];
        const [, b] = p[j] as [string, { x: number; y: number }];
        expect(Math.hypot((a.x - b.x) / REK, a.y - b.y)).toBeGreaterThanOrEqual(MIN_AFSTAND - 0.5);
      }
    }
    const markt = geo.projectie.punt([data.kaart.centrum.lon, data.kaart.centrum.lat]);
    expect(geo.gebouwen.stadhuis?.x).toBeCloseTo(markt.x, 6);
    expect(geo.gebouwen.stadhuis?.y).toBeCloseTo(markt.y, 6);
  });

  it('vindt het gebied onder een punt, en het kader van een gebied', () => {
    const ten = geo.projectie.punt([6.695, 53.2767]);
    expect(buurtOp(geo, ten)?.gebied).toBe('ten_boer');
    const k = gebiedKader(geo, 'haren');
    expect(k && k.b > 0 && k.h > 0).toBe(true);
  });

  it('spreid is deterministisch en laat het vaste punt staan', () => {
    const maak = () => ({ a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, c: { x: 0, y: 1 } });
    const x = maak();
    const y = maak();
    spreid(x, 10, 'a');
    spreid(y, 10, 'a');
    expect(x).toEqual(y);
    expect(x.a).toEqual({ x: 0, y: 0 });
    expect(Math.hypot(x.b.x - x.c.x, x.b.y - x.c.y)).toBeGreaterThanOrEqual(9.99);
  });
});

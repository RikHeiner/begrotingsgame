/**
 * Van een opmerking van een inwoner naar de post waar die over gaat: het gebouw en de post om te
 * openen. Een tekstballon leest de post uit zijn voorwaarde (bijvoorbeeld "pct.o1 <= -20" of
 * "tax.t1 >= 5"); bij een inwoner staat het id van de post erbij.
 */
import type { Data } from '../engine';
import { parkeerPostVan } from '../engine';

export type Doel = {
  gebouw: string;
  /** data-post van de regel in het paneel; zonder: alleen het gebouw */
  post?: string;
  naam: string;
};

/** Het doel bij een id van een post, belasting, parkeerpost, kaart of gebouw. */
export function doelVanId(data: Data, id: string): Doel | undefined {
  const o = data.index.onderdelen.get(id);
  if (o) return { gebouw: o.gebouw, post: id, naam: o.naam };
  const parkeerBelasting = data.parkeren?.opbrengst.belasting;
  const parkeerGebouw = data.parkeren?.opbrengst.gebouw;
  if (id === parkeerBelasting && parkeerGebouw)
    return { gebouw: parkeerGebouw, post: 'parkeren', naam: 'Parkeertarieven' };
  const b = data.index.belastingen.get(id);
  const loket = data.gebouwen.find((g) => g.soort === 'loket');
  if (b && loket) return { gebouw: loket.id, post: id, naam: b.naam };
  const parkeer = parkeerPostVan(data, id);
  if (parkeer && parkeerGebouw)
    return { gebouw: parkeerGebouw, post: `parkeren:${parkeer.id}`, naam: parkeer.naam };
  const k = data.index.kaarten.get(id);
  if (k) {
    const g = k.gebouw ?? data.gebouwen.find((x) => x.soort === 'veilinghuis')?.id;
    if (g) return { gebouw: g, post: id, naam: k.naam };
  }
  const p = data.index.programmas.get(id);
  const beleid = data.gebouwen.find((g) => g.soort === 'beleidshuis');
  if (p && beleid) return { gebouw: beleid.id, post: id, naam: p.naam };
  const g = data.gebouwen.find((x) => x.id === id);
  if (g) return { gebouw: g.id, naam: g.naam };
  return undefined;
}

/** Het doel bij de voorwaarde van een tekstballon (de eerste post, belasting, kaart of gebouw). */
export function doelVanVoorwaarde(data: Data, voorwaarde: string): Doel | undefined {
  for (const m of voorwaarde.matchAll(/\b(pct|tax|kaart|gebouw)\.([A-Za-z0-9_]+)/g)) {
    const doel = m[2] ? doelVanId(data, m[2]) : undefined;
    if (doel) return doel;
  }
  return undefined;
}

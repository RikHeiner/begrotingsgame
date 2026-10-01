/**
 * Meters en persona's. Dit is uitdrukkelijk een spelregel en geen voorspelling.
 * 50 is de huidige begroting; elke meter blijft tussen 0 en 100.
 */
import type { Data } from './laadData';
import { METER_IDS, type MeterId } from './schema';
import type { Keuzes } from './types';

export const NEUTRAAL = 50;

const klem = (x: number): number => Math.min(100, Math.max(0, x));

export function legeMeters(waarde = 0): Record<MeterId, number> {
  return Object.fromEntries(METER_IDS.map((m) => [m, waarde])) as Record<MeterId, number>;
}

function kortVan(data: Data, meter: MeterId): string | undefined {
  return data.meters.meters.find((m) => m.id === meter)?.kort;
}

/** Totaal gewicht van een meter: som van lasten × gewicht over de niet-vergrendelde posten. */
function totaalGewicht(data: Data, kort: string): number {
  let totaal = 0;
  for (const o of data.begroting.onderdelen) {
    const w = o.meters[kort];
    if (!w || o.vergrendeld) continue;
    totaal += o.lasten_mln * w;
  }
  return totaal;
}

/** Hoeveel meterpunten één onderdeel bijdraagt bij een wijziging p (fractie, -1..1). */
export function bijdrageOnderdeel(data: Data, meter: MeterId, id: string, p: number): number {
  const kort = kortVan(data, meter);
  const o = data.index.onderdelen.get(id);
  if (!kort || !o || o.vergrendeld) return 0;
  const w = o.meters[kort];
  const totaal = totaalGewicht(data, kort);
  if (!w || totaal === 0) return 0;
  return (data.meters.spelregels.gevoeligheid_onderdelen * o.lasten_mln * w * p) / totaal;
}

/**
 * Meters op basis van de directe keuzes: de schuiven (gewogen naar lasten en gewicht) en de
 * belastingen (portemonnee, gewogen naar opbrengst en voelbaarheid). Zonder klemmen.
 */
export function basisMeters(data: Data, keuzes: Keuzes): Record<MeterId, number> {
  const uit = legeMeters(NEUTRAAL);
  for (const m of data.meters.meters) {
    if (m.id === 'portemonnee') continue;
    const totaal = totaalGewicht(data, m.kort);
    if (totaal === 0) continue;
    let delta = 0;
    for (const o of data.begroting.onderdelen) {
      const w = o.meters[m.kort];
      if (!w || o.vergrendeld) continue;
      delta += o.lasten_mln * w * ((keuzes.onderdelen[o.id] ?? 0) / 100);
    }
    uit[m.id] = NEUTRAAL + (data.meters.spelregels.gevoeligheid_onderdelen * delta) / totaal;
  }

  let totaal = 0;
  let delta = 0;
  for (const b of data.begroting.belastingen) {
    const w = b.opbrengst_mln * b.voelbaarheid_portemonnee;
    totaal += w;
    delta += w * ((keuzes.belastingen[b.id] ?? 0) / 100);
  }
  if (totaal > 0) {
    uit.portemonnee = NEUTRAAL - (data.meters.spelregels.gevoeligheid_belastingen * delta) / totaal;
  }
  return uit;
}

/** Punten uit actiekaarten (`meter_effect_punten`, met de korte meternaam). */
export function kaartPunten(data: Data, keuzes: Keuzes): Record<MeterId, number> {
  const uit = legeMeters(0);
  for (const id of keuzes.kaarten) {
    const k = data.index.kaarten.get(id);
    if (!k) continue;
    for (const [kort, punten] of Object.entries(k.meter_effect_punten)) {
      const meter = data.index.meterPerKort.get(kort);
      if (meter) uit[meter] += punten;
    }
  }
  return uit;
}

export function eindMeters(
  basis: Record<MeterId, number>,
  ...extra: Record<MeterId, number>[]
): Record<MeterId, number> {
  const uit = legeMeters(0);
  for (const m of METER_IDS) {
    uit[m] = klem(basis[m] + extra.reduce((s, e) => s + e[m], 0));
  }
  return uit;
}

/** Tevredenheid per persona (0..100). */
export function personaTevredenheid(
  data: Data,
  keuzes: Keuzes,
  meters: Record<MeterId, number>,
): Record<string, number> {
  const { gewicht_meters, punten_posten_per_100pct } = data.personas.spelregels;
  const uit: Record<string, number> = {};
  for (const p of data.personas.personas) {
    let gewicht = 0;
    let afwijking = 0;
    for (const [meter, w] of Object.entries(p.meters) as [MeterId, number][]) {
      gewicht += w;
      afwijking += w * (meters[meter] - NEUTRAAL);
    }
    let waarde = NEUTRAAL + (gewicht > 0 ? (gewicht_meters * afwijking) / gewicht : 0);
    for (const [id, w] of Object.entries(p.posten)) {
      const pct = data.index.onderdelen.has(id)
        ? (keuzes.onderdelen[id] ?? 0)
        : data.index.belastingen.has(id)
          ? (keuzes.belastingen[id] ?? 0)
          : keuzes.kaarten.includes(id)
            ? 100
            : 0;
      waarde += w * (pct / 100) * punten_posten_per_100pct;
    }
    uit[p.id] = klem(waarde);
  }
  return uit;
}

/** Blije inwoners: het gemiddelde van de persona's. */
export function blijeInwoners(personas: Record<string, number>): number {
  const waarden = Object.values(personas);
  return waarden.length ? waarden.reduce((a, b) => a + b, 0) / waarden.length : NEUTRAAL;
}

/**
 * Parkeren per vergunning en tariefgebied. De parkeeropbrengst uit de begroting (de schuif t5) wordt
 * verdeeld in posten:
 *   - vergunningen: aantal × tarief (per tariefgebied als dat zo in de data staat);
 *   - kortparkeren en overig: de parkeerbelasting uit de kerngegevens min de vergunningen;
 *   - parkeergarages: de opbrengst in de begroting min de parkeerbelasting.
 * Samen is dat precies de opbrengst in de begroting. Een tarief van een eerder jaar wordt
 * geïndexeerd naar het begrotingsjaar met `indexatie` uit de data.
 *
 * De keuze per post staat in `keuzes.parkeren`; de schuif t5 wordt het gewogen gemiddelde, zodat
 * kettingeffecten, inwoners en tekstballonnen die op t5 reageren gewoon blijven werken.
 */
import { vanDuizend, vanMln } from './eenheden';
import type { Data } from './laadData';
import type { ParkerenData, Zekerheid } from './schema';

export type ParkeerPost = {
  /** bijvoorbeeld "bewoners_1:tweede", "bezoekers", "kortparkeren" of "garages" */
  id: string;
  naam: string;
  groep: 'vergunning' | 'kortparkeren' | 'garages';
  vergunning?: string;
  tariefgebied?: string;
  /** opbrengst per jaar in euro's */
  basis: number;
  /** tarief per jaar in euro's, geïndexeerd naar het begrotingsjaar */
  tarief?: number;
  /** het tarief zoals het in de bron staat */
  bronTarief?: { bedrag: number; prijspeil: number };
  aantal?: number;
  peiljaar?: number;
  min: number;
  max: number;
  uitleg: string;
  zekerheid: Zekerheid;
  /** id's uit `bronnen` in de data */
  bronnen: string[];
  /** wat niet zeker is, voor de knop Waarom? */
  opmerkingen: string[];
};

export const PARKEER_PREFIX = 't5:';

const GEBIED_KORT: Record<string, string> = {
  binnenstad: 'binnenstad',
  tweede: 'tweede zone',
  derde_tm_vijfde: 'derde tot en met vijfde zone',
};

/** Indexeert een bedrag van `prijspeil` naar het begrotingsjaar; geeft ook aan of dat volledig kon. */
export function indexeer(
  p: ParkerenData,
  bedrag: number,
  prijspeil: number,
): { bedrag: number; volledig: boolean } {
  let uit = bedrag;
  let volledig = true;
  for (let jaar = prijspeil + 1; jaar <= p.begrotingsjaar; jaar++) {
    const i = p.indexatie.find((x) => x.naar_jaar === jaar);
    if (i) uit *= 1 + i.pct / 100;
    else volledig = false;
  }
  return { bedrag: uit, volledig };
}

const cache = new WeakMap<Data, ParkeerPost[]>();

export function parkeerPosten(data: Data): ParkeerPost[] {
  const p = data.parkeren;
  if (!p) return [];
  const bewaard = cache.get(data);
  if (bewaard) return bewaard;

  const status = new Map(p.bronnen.map((b) => [b.id, b.status]));
  const zeker = (bronnen: string[]): Zekerheid =>
    bronnen.every((b) => status.get(b) === 'feit') ? 'feit' : 'aanname';
  const posten: ParkeerPost[] = [];
  const telling = (
    soort: 'bewoners_1' | 'bewoners_2' | 'bezoekers' | 'bedrijven',
    gebied?: string,
  ) =>
    p.aantallen.gebieden
      .filter((g) => !gebied || g.tariefgebied === gebied)
      .reduce((s, g) => s + g[soort], 0);

  for (const v of p.vergunningen) {
    const gebieden = v.per_tariefgebied ? Object.keys(v.tarief) : ['alle'];
    for (const gebied of gebieden) {
      const t = v.tarief[gebied];
      if (!t) continue;
      const geteld = ['bewoners_1', 'bewoners_2', 'bezoekers', 'bedrijven'].includes(v.id);
      const aantal = v.aantal
        ? v.aantal.waarde
        : geteld
          ? telling(v.id as 'bewoners_1', v.per_tariefgebied ? gebied : undefined)
          : 0;
      const peiljaar = v.aantal ? v.aantal.peiljaar : p.aantallen.peiljaar;
      const bronAantal = v.aantal ? v.aantal.bron : p.aantallen.bron;
      const geindexeerd = indexeer(p, t.bedrag, t.prijspeil);
      const opmerkingen: string[] = [];
      if (t.prijspeil !== p.begrotingsjaar)
        opmerkingen.push(
          geindexeerd.volledig
            ? `Tarief van ${t.prijspeil}, geïndexeerd naar ${p.begrotingsjaar}.`
            : `Tarief van ${t.prijspeil}; de indexatie naar ${p.begrotingsjaar} ontbreekt.`,
        );
      if (peiljaar !== p.begrotingsjaar) opmerkingen.push(`Aantal vergunningen uit ${peiljaar}.`);
      if (t.aanname) opmerkingen.push(t.aanname);
      const bronnen = [...new Set([t.bron, bronAantal])];
      posten.push({
        id: v.per_tariefgebied ? `${v.id}:${gebied}` : v.id,
        naam: v.per_tariefgebied ? `${v.naam} (${GEBIED_KORT[gebied] ?? gebied})` : v.naam,
        groep: 'vergunning',
        vergunning: v.id,
        ...(v.per_tariefgebied ? { tariefgebied: gebied } : {}),
        basis: aantal * geindexeerd.bedrag,
        tarief: geindexeerd.bedrag,
        bronTarief: { bedrag: t.bedrag, prijspeil: t.prijspeil },
        aantal,
        peiljaar,
        min: v.min_pct,
        max: v.max_pct,
        uitleg: v.uitleg,
        zekerheid: t.aanname ? 'aanname' : zeker(bronnen),
        bronnen,
        opmerkingen,
      });
    }
  }

  const begroting = p.bronnen.find((b) => b.id.startsWith('begroting'))?.id ?? '';
  const totaal = vanMln(data.index.belastingen.get(p.opbrengst.belasting)?.opbrengst_mln ?? 0);
  const kengetal = (data.kengetallen as Record<string, unknown>)[
    p.opbrengst.kengetal_parkeerbelasting
  ];
  const belasting = typeof kengetal === 'number' ? vanDuizend(kengetal) : totaal;
  const vergunningen = posten.reduce((s, x) => s + x.basis, 0);
  posten.push({
    id: 'kortparkeren',
    naam: p.kortparkeren.naam,
    groep: 'kortparkeren',
    basis: Math.max(0, belasting - vergunningen),
    min: p.kortparkeren.min_pct,
    max: p.kortparkeren.max_pct,
    uitleg: p.kortparkeren.uitleg,
    zekerheid: 'aanname',
    bronnen: [begroting],
    opmerkingen: [
      'Afgeleid: de parkeerbelasting uit de kerngegevens min de vergunningen hierboven.',
      ...p.parkeerzones
        .filter((z) => z.uurtarief)
        .map(
          (z) =>
            `${z.naam}: € ${z.uurtarief?.bedrag.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} per uur (${z.uurtarief?.prijspeil}).`,
        ),
    ],
  });
  posten.push({
    id: 'garages',
    naam: p.garages.naam,
    groep: 'garages',
    basis: Math.max(0, totaal - belasting),
    min: p.garages.min_pct,
    max: p.garages.max_pct,
    uitleg: p.garages.uitleg,
    zekerheid: 'aanname',
    bronnen: [begroting],
    opmerkingen: [p.opbrengst.garages_toelichting],
  });
  cache.set(data, posten);
  return posten;
}

/** De parkeerpost bij een bron als "t5:bewoners_1:tweede", of undefined. */
export function parkeerPostVan(data: Data, bron: string): ParkeerPost | undefined {
  if (!bron.startsWith(PARKEER_PREFIX)) return undefined;
  const id = bron.slice(PARKEER_PREFIX.length);
  return parkeerPosten(data).find((p) => p.id === id);
}

/** Het gewogen gemiddelde van de parkeerkeuzes: wat de schuif t5 zou zijn. */
export function parkeerGemiddelde(data: Data, parkeren: Record<string, number>): number {
  const posten = parkeerPosten(data);
  const totaal = posten.reduce((s, x) => s + x.basis, 0);
  if (!totaal) return 0;
  const som = posten.reduce((s, x) => s + x.basis * (parkeren[x.id] ?? 0), 0);
  return Math.round((som / totaal) * 1000) / 1000;
}

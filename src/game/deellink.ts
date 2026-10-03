/**
 * De keuzes van een speler als deelbare link: compact JSON, gecomprimeerd met lz-string, in de
 * parameter `b` van de URL. Ongeldige of onbekende waarden worden genegeerd (de rekenmotor past de
 * grenzen toe). Een link van een ander begrotingsjaar geeft een melding.
 */
import LZString from 'lz-string';
import { GEEN_KEUZES, type Keuzes } from '../engine';
import type { Beginpunt } from './nulbasis';

export const PARAM = 'b';
const VERSIE = 1;

type Compact = {
  v: number;
  j: number;
  o?: Record<string, number>;
  t?: Record<string, number>;
  /** parkeren per post (zie engine/parkeren.ts) */
  p?: Record<string, number>;
  k?: string[];
  s?: Keuzes['scenario'];
  r?: [number, number];
  /** 1 = begonnen bij nul; zonder: met de begroting van het college (zo waren oude links) */
  n?: 1;
  /** programma's in het Beleidshuis die stilstaan */
  g?: string[];
};

export function codeer(keuzes: Keuzes, jaar: number, beginpunt: Beginpunt = 'college'): string {
  const c: Compact = { v: VERSIE, j: jaar };
  if (beginpunt === 'nul') c.n = 1;
  if (keuzes.gestopt?.length) c.g = keuzes.gestopt;
  if (Object.keys(keuzes.onderdelen).length) c.o = keuzes.onderdelen;
  if (Object.keys(keuzes.belastingen).length) c.t = keuzes.belastingen;
  if (keuzes.parkeren && Object.keys(keuzes.parkeren).length) c.p = keuzes.parkeren;
  if (keuzes.kaarten.length) c.k = keuzes.kaarten;
  if (keuzes.scenario !== 'midden') c.s = keuzes.scenario;
  if (keuzes.reserve)
    c.r = [
      Math.round(keuzes.reserve.structureel / 1000),
      Math.round(keuzes.reserve.eenmalig / 1000),
    ];
  return LZString.compressToEncodedURIComponent(JSON.stringify(c));
}

export type Gelezen = { keuzes: Keuzes; jaar: number; beginpunt: Beginpunt };

const getallen = (x: unknown): Record<string, number> => {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return {};
  return Object.fromEntries(
    Object.entries(x).filter(
      (e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]),
    ),
  );
};

export function decodeer(tekst: string): Gelezen | undefined {
  try {
    const json = LZString.decompressFromEncodedURIComponent(tekst);
    if (!json) return undefined;
    const c = JSON.parse(json) as Partial<Compact>;
    if (c.v !== VERSIE || typeof c.j !== 'number') return undefined;
    const scenario = c.s === 'voorzichtig' || c.s === 'optimistisch' ? c.s : 'midden';
    const r =
      Array.isArray(c.r) && c.r.length === 2 && c.r.every((x) => typeof x === 'number')
        ? c.r
        : undefined;
    return {
      jaar: c.j,
      beginpunt: c.n === 1 ? 'nul' : 'college',
      keuzes: {
        ...GEEN_KEUZES,
        onderdelen: getallen(c.o),
        belastingen: getallen(c.t),
        ...(Object.keys(getallen(c.p)).length ? { parkeren: getallen(c.p) } : {}),
        kaarten: Array.isArray(c.k) ? c.k.filter((x): x is string => typeof x === 'string') : [],
        scenario,
        ...(r ? { reserve: { structureel: r[0] * 1000, eenmalig: r[1] * 1000 } } : {}),
        ...(Array.isArray(c.g) && c.g.length
          ? { gestopt: c.g.filter((x): x is string => typeof x === 'string') }
          : {}),
      },
    };
  } catch {
    return undefined;
  }
}

export function leesUitUrl(url: string): Gelezen | undefined {
  const b = new URL(url).searchParams.get(PARAM);
  return b ? decodeer(b) : undefined;
}

export function maakLink(
  basis: string,
  keuzes: Keuzes,
  jaar: number,
  beginpunt: Beginpunt = 'college',
): string {
  const url = new URL(basis);
  url.hash = '';
  url.searchParams.set(PARAM, codeer(keuzes, jaar, beginpunt));
  return url.toString();
}

/**
 * De keuzes van een speler als deelbare link: compact JSON, gecomprimeerd met lz-string, in de
 * parameter `b` van de URL. Ongeldige of onbekende waarden worden genegeerd (de rekenmotor past de
 * grenzen toe). Een link van een ander begrotingsjaar geeft een melding.
 */
import LZString from 'lz-string';
import { GEEN_KEUZES, type Keuzes } from '../engine';

export const PARAM = 'b';
const VERSIE = 1;

type Compact = {
  v: number;
  j: number;
  o?: Record<string, number>;
  t?: Record<string, number>;
  k?: string[];
  s?: Keuzes['scenario'];
  r?: [number, number];
  m?: string;
};

export function codeer(keuzes: Keuzes, jaar: number, missie?: string): string {
  const c: Compact = { v: VERSIE, j: jaar };
  if (Object.keys(keuzes.onderdelen).length) c.o = keuzes.onderdelen;
  if (Object.keys(keuzes.belastingen).length) c.t = keuzes.belastingen;
  if (keuzes.kaarten.length) c.k = keuzes.kaarten;
  if (keuzes.scenario !== 'midden') c.s = keuzes.scenario;
  if (keuzes.reserve)
    c.r = [
      Math.round(keuzes.reserve.structureel / 1000),
      Math.round(keuzes.reserve.eenmalig / 1000),
    ];
  if (missie) c.m = missie;
  return LZString.compressToEncodedURIComponent(JSON.stringify(c));
}

export type Gelezen = { keuzes: Keuzes; jaar: number; missie?: string };

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
      keuzes: {
        ...GEEN_KEUZES,
        onderdelen: getallen(c.o),
        belastingen: getallen(c.t),
        kaarten: Array.isArray(c.k) ? c.k.filter((x): x is string => typeof x === 'string') : [],
        scenario,
        ...(r ? { reserve: { structureel: r[0] * 1000, eenmalig: r[1] * 1000 } } : {}),
      },
      ...(typeof c.m === 'string' ? { missie: c.m } : {}),
    };
  } catch {
    return undefined;
  }
}

export function leesUitUrl(url: string): Gelezen | undefined {
  const b = new URL(url).searchParams.get(PARAM);
  return b ? decodeer(b) : undefined;
}

export function maakLink(basis: string, keuzes: Keuzes, jaar: number, missie?: string): string {
  const url = new URL(basis);
  url.hash = '';
  url.searchParams.set(PARAM, codeer(keuzes, jaar, missie));
  return url.toString();
}

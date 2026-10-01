import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { laadData, metExtraKaarten, type Data } from '../laadData';
import { GEEN_KEUZES, type Effect, type Keuzes, type Resultaat } from '../types';

export const DATA_MAP = resolve(import.meta.dirname, '../../../data');

export const haalUitData = async (pad: string): Promise<unknown> =>
  JSON.parse(readFileSync(resolve(DATA_MAP, pad), 'utf8'));

export const leesJson = (pad: string): unknown =>
  JSON.parse(readFileSync(resolve(DATA_MAP, pad), 'utf8'));

let cache: Promise<Data> | undefined;
export function echteData(): Promise<Data> {
  cache ??= laadData(haalUitData);
  return cache;
}

export function keuzes(deel: Partial<Keuzes> = {}): Keuzes {
  return { ...GEEN_KEUZES, ...deel };
}

/** Euro's naar miljoenen, afgerond op 6 decimalen, voor leesbare verwachtingen. */
export const mln = (euro: number): number => Math.round((euro / 1e6) * 1e6) / 1e6;

/** Kopie van de data met een aangepaste begroting (voor testgevallen). */
export function metAangepasteBegroting(
  data: Data,
  aanpassen: (b: Data['begroting']) => void,
): Data {
  const begroting = structuredClone(data.begroting);
  aanpassen(begroting);
  return metExtraKaarten({ ...data, begroting }, []);
}

/** Som van de effecten van één bron of verband per jaar, in miljoenen. */
export function perJaarMln(
  r: Resultaat,
  filter: (e: Effect) => boolean,
  jaren: number[],
): number[] {
  return jaren.map((j) =>
    mln(r.effecten.filter((e) => e.jaar === j && filter(e)).reduce((s, e) => s + e.bedrag, 0)),
  );
}

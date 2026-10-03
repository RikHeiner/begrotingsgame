import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { laadData, metExtraKaarten, type Data } from '../laadData';
import { GEEN_KEUZES, type Effect, type Keuzes, type Resultaat } from '../types';

export const DATA_MAP = resolve(import.meta.dirname, '../../../data');

export const haalUitData = async (pad: string): Promise<unknown> =>
  JSON.parse(readFileSync(resolve(DATA_MAP, pad), 'utf8'));

export const leesJson = (pad: string): unknown =>
  JSON.parse(readFileSync(resolve(DATA_MAP, pad), 'utf8'));

/**
 * De rekentests rekenen met de begroting 2026: vaste bedragen, zodat een nieuwe begroting de
 * verwachtingen niet verandert. De actieve begroting (config.json) testen data.test.ts en
 * begroting-2027.test.ts.
 */
export const CONFIG_2026 = {
  actiefJaar: 2026,
  begroting: 'begroting-2026.json',
  vergelijking: ['tegenbegroting-vvd-2026.json'],
  meerjarenHorizon: [2026, 2027, 2028, 2029],
  scenario: 'midden',
  vergelijkingTonen: true,
  tarieven: 'tarieven-2026.json',
  parkeren: 'parkeren-2026.json',
  woonlasten: 'woonlasten-2026.json',
};

export const haalUitData2026 = async (pad: string): Promise<unknown> =>
  pad === 'config.json' ? structuredClone(CONFIG_2026) : haalUitData(pad);

let cache: Promise<Data> | undefined;
export function echteData(): Promise<Data> {
  cache ??= laadData(haalUitData2026);
  return cache;
}

let actief: Promise<Data> | undefined;
/** De begroting die de game nu gebruikt (config.json). */
export function actieveData(): Promise<Data> {
  actief ??= laadData(haalUitData);
  return actief;
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

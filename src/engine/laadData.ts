/**
 * Laadt en valideert alle data voor het actieve begrotingsjaar. Pure code: het ophalen van bestanden
 * gebeurt via een meegegeven functie, zodat dit in de browser (fetch) en in Node (fs) werkt.
 */
import {
  begrotingSchema,
  configSchema,
  dwarsverbandenSchema,
  gebiedenSchema,
  gebouwenSchema,
  leesKengetallen,
  metersSchema,
  personasSchema,
  tegenbegrotingSchema,
  type Actiekaart,
  type Begroting,
  type Belasting,
  type Config,
  type Deelprogramma,
  type Dwarsverband,
  type Dwarsverbanden,
  type Gebouw,
  type GebiedenData,
  type Kengetallen,
  type MeterId,
  type MetersData,
  type Onderdeel,
  type PersonasData,
  type Tegenbegroting,
} from './schema';
import type { ZodType } from 'zod';

export type Data = {
  config: Config;
  begroting: Begroting;
  kengetallen: Kengetallen;
  dwarsverbanden: Dwarsverbanden;
  meters: MetersData;
  personas: PersonasData;
  gebouwen: Gebouw[];
  gebieden: GebiedenData;
  vergelijking: { bestand: string; tegenbegroting: Tegenbegroting }[];
  /** Jaren van de meerjarenraming, bijvoorbeeld [2026, 2027, 2028, 2029]. */
  jaren: number[];
  index: {
    onderdelen: Map<string, Onderdeel>;
    belastingen: Map<string, Belasting>;
    kaarten: Map<string, Actiekaart>;
    deelprogrammas: Map<string, Deelprogramma>;
    verbanden: Map<string, Dwarsverband>;
    meterPerKort: Map<string, MeterId>;
  };
};

/** Haalt een JSON-bestand op, met een pad relatief aan de map data/. */
export type HaalJson = (pad: string) => Promise<unknown>;

export const SPEL_BESTANDEN = {
  meters: 'spel/meters.json',
  gebouwen: 'spel/gebouwen.json',
  gebieden: 'spel/gebieden.json',
  personas: 'spel/personas.json',
} as const;

export class DataFout extends Error {
  constructor(
    readonly bestand: string,
    readonly details: string[],
  ) {
    super(`${bestand} is niet geldig:\n- ${details.join('\n- ')}`);
    this.name = 'DataFout';
  }
}

/** Valideert met Zod en geeft een leesbare foutmelding met het pad in het bestand. */
export function valideer<T>(schema: ZodType<T>, ruw: unknown, bestand: string): T {
  const uitkomst = schema.safeParse(ruw);
  if (uitkomst.success) return uitkomst.data;
  throw new DataFout(
    bestand,
    uitkomst.error.issues.map((i) => `${i.path.join('.') || '(hoofdniveau)'}: ${i.message}`),
  );
}

export type RuweData = {
  config: unknown;
  begroting: unknown;
  dwarsverbanden: unknown;
  meters: unknown;
  gebouwen: unknown;
  gebieden: unknown;
  personas: unknown;
  vergelijking: { bestand: string; inhoud: unknown }[];
};

/** Maakt het Data-object uit ruwe JSON. Gooit een DataFout bij ongeldige data. */
export function maakData(ruw: RuweData): Data {
  const config = valideer(configSchema, ruw.config, 'config.json');
  const begroting = valideer(begrotingSchema, ruw.begroting, config.begroting);
  if (begroting.begrotingsjaar !== config.actiefJaar) {
    throw new DataFout(config.begroting, [
      `dit is de begroting ${begroting.begrotingsjaar}, maar config.json verwacht ${config.actiefJaar}`,
    ]);
  }
  let kengetallen: Kengetallen;
  try {
    kengetallen = leesKengetallen(begroting);
  } catch {
    throw new DataFout(config.begroting, [
      `kengetallen_${begroting.begrotingsjaar} ontbreekt of is onvolledig`,
    ]);
  }
  const dwarsverbanden = valideer(dwarsverbandenSchema, ruw.dwarsverbanden, 'dwarsverbanden.json');
  const meters = valideer(metersSchema, ruw.meters, SPEL_BESTANDEN.meters);
  const gebouwen = valideer(gebouwenSchema, ruw.gebouwen, SPEL_BESTANDEN.gebouwen).gebouwen;
  const personas = valideer(personasSchema, ruw.personas, SPEL_BESTANDEN.personas);
  const gebieden = valideer(gebiedenSchema, ruw.gebieden, SPEL_BESTANDEN.gebieden);
  const vergelijking = ruw.vergelijking.map(({ bestand, inhoud }) => ({
    bestand,
    tegenbegroting: valideer(tegenbegrotingSchema, inhoud, bestand),
  }));

  return {
    config,
    begroting,
    kengetallen,
    dwarsverbanden,
    meters,
    personas,
    gebouwen,
    gebieden,
    vergelijking,
    jaren: [...config.meerjarenHorizon],
    index: maakIndex(begroting, dwarsverbanden, meters),
  };
}

function maakIndex(begroting: Begroting, dwarsverbanden: Dwarsverbanden, meters: MetersData) {
  return {
    onderdelen: new Map(begroting.onderdelen.map((o) => [o.id, o])),
    belastingen: new Map(begroting.belastingen.map((b) => [b.id, b])),
    kaarten: new Map(begroting.actiekaarten.map((k) => [k.id, k])),
    deelprogrammas: new Map(begroting.deelprogrammas.map((d) => [d.code, d])),
    verbanden: new Map(dwarsverbanden.dwarsverbanden.map((v) => [v.id, v])),
    meterPerKort: new Map(meters.meters.map((m) => [m.kort, m.id])),
  };
}

/** Geeft een kopie van de data met extra actiekaarten (bijvoorbeeld de posten van een tegenbegroting). */
export function metExtraKaarten(data: Data, kaarten: Actiekaart[]): Data {
  const begroting = {
    ...data.begroting,
    actiekaarten: [...data.begroting.actiekaarten, ...kaarten],
  };
  return { ...data, begroting, index: maakIndex(begroting, data.dwarsverbanden, data.meters) };
}

/** Laadt alle bestanden voor het jaar uit config.json. */
export async function laadData(haal: HaalJson): Promise<Data> {
  const ruweConfig = await haal('config.json');
  const config = valideer(configSchema, ruweConfig, 'config.json');
  const [begroting, dwarsverbanden, meters, gebouwen, gebieden, personas, ...vergelijking] =
    await Promise.all([
      haal(config.begroting),
      haal('dwarsverbanden.json'),
      haal(SPEL_BESTANDEN.meters),
      haal(SPEL_BESTANDEN.gebouwen),
      haal(SPEL_BESTANDEN.gebieden),
      haal(SPEL_BESTANDEN.personas),
      ...config.vergelijking.map((b) => haal(b)),
    ]);
  return maakData({
    config: ruweConfig,
    begroting,
    dwarsverbanden,
    meters,
    gebouwen,
    gebieden,
    personas,
    vergelijking: config.vergelijking.map((bestand, i) => ({ bestand, inhoud: vergelijking[i] })),
  });
}

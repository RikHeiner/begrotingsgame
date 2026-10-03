/** Hulpfuncties om de data in Node te lezen (voor de scripts). */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { maakData, SPEL_BESTANDEN, valideer, type Data } from '../src/engine/laadData';
import { idMappingSchema, type IdMapping } from '../src/engine/schema';

export const DATA_MAP = resolve(import.meta.dirname, '../data');

export function leesJson(pad: string): unknown {
  return JSON.parse(readFileSync(resolve(DATA_MAP, pad), 'utf8'));
}

/**
 * Laadt de data zoals config.json die beschrijft. Met `begrotingBestand` wordt een ander
 * begrotingsbestand gebruikt (bijvoorbeeld een nieuwe begroting die nog niet actief is); het
 * actieve jaar en de horizon komen dan uit dat bestand.
 */
export function laadDataNode(begrotingBestand?: string): Data {
  const config = leesJson('config.json') as Record<string, unknown>;
  let begroting: unknown;
  if (begrotingBestand) {
    begroting = JSON.parse(readFileSync(resolve(begrotingBestand), 'utf8'));
    const b = begroting as {
      begrotingsjaar?: number;
      totalen?: { lasten_excl_reserves_x1000?: object };
    };
    const jaren = Object.keys(b.totalen?.lasten_excl_reserves_x1000 ?? {})
      .map(Number)
      .sort();
    config.actiefJaar = b.begrotingsjaar;
    config.begroting = basename(begrotingBestand);
    config.meerjarenHorizon = jaren;
    const vergelijking = (config.vergelijking as string[]).filter((v) =>
      v.includes(String(b.begrotingsjaar)),
    );
    config.vergelijking = vergelijking.filter((v) => existsSync(resolve(DATA_MAP, v)));
    const tarieven = `tarieven-${b.begrotingsjaar}.json`;
    if (existsSync(resolve(DATA_MAP, tarieven))) config.tarieven = tarieven;
    else delete config.tarieven;
    const parkeren = `parkeren-${b.begrotingsjaar}.json`;
    if (existsSync(resolve(DATA_MAP, parkeren))) config.parkeren = parkeren;
    else delete config.parkeren;
    const woonlasten = `woonlasten-${b.begrotingsjaar}.json`;
    if (existsSync(resolve(DATA_MAP, woonlasten))) config.woonlasten = woonlasten;
    else delete config.woonlasten;
    // De uitgaven van andere gemeenten zijn van een eerder jaar; houd het bestand uit config.json.
  } else {
    begroting = leesJson(config.begroting as string);
  }
  return maakData({
    config,
    begroting,
    dwarsverbanden: leesJson('dwarsverbanden.json'),
    ...(Object.fromEntries(
      Object.entries(SPEL_BESTANDEN).map(([k, pad]) => [k, leesJson(pad)]),
    ) as Record<keyof typeof SPEL_BESTANDEN, unknown>),
    ...(typeof config.tarieven === 'string'
      ? { tarieven: { bestand: config.tarieven, inhoud: leesJson(config.tarieven) } }
      : {}),
    ...(typeof config.parkeren === 'string'
      ? { parkeren: { bestand: config.parkeren, inhoud: leesJson(config.parkeren) } }
      : {}),
    ...(typeof config.woonlasten === 'string'
      ? { woonlasten: { bestand: config.woonlasten, inhoud: leesJson(config.woonlasten) } }
      : {}),
    ...(typeof config.belastingenNederland === 'string'
      ? {
          belastingenNederland: {
            bestand: config.belastingenNederland,
            inhoud: leesJson(config.belastingenNederland),
          },
        }
      : {}),
    ...(typeof config.apparaat === 'string'
      ? { apparaat: { bestand: config.apparaat, inhoud: leesJson(config.apparaat) } }
      : {}),
    ...(typeof config.uitgaven === 'string'
      ? { uitgaven: { bestand: config.uitgaven, inhoud: leesJson(config.uitgaven) } }
      : {}),
    vergelijking: (config.vergelijking as string[]).map((bestand) => ({
      bestand,
      inhoud: leesJson(bestand),
    })),
  });
}

export function leesBuurtcodes(): string[] {
  const geo = leesJson('gemeente-groningen-buurten.geojson') as {
    features: { properties: { code: string } }[];
  };
  return geo.features.map((f) => f.properties.code);
}

/** Alle mappings in data/mappings/ die naar het gegeven jaar gaan. */
export function leesMappings(naarJaar?: number): IdMapping[] {
  const map = resolve(DATA_MAP, 'mappings');
  if (!existsSync(map)) return [];
  return readdirSync(map)
    .filter((f) => /^id-mapping-\d{4}-\d{4}\.json$/.test(f))
    .map((f) => valideer(idMappingSchema, leesJson(`mappings/${f}`), `mappings/${f}`))
    .filter((m) => naarJaar === undefined || m.naar_jaar === naarJaar);
}

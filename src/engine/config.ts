/**
 * Configuratie van het actieve begrotingsjaar (`data/config.json`).
 * Pure code: geen DOM, geen React. De volledige Zod-schema's volgen in fase 1.
 */

export type Scenario = 'voorzichtig' | 'midden' | 'optimistisch';

export type Config = {
  actiefJaar: number;
  begroting: string;
  vergelijking: string[];
  meerjarenHorizon: number[];
  scenario: Scenario;
};

const SCENARIOS: readonly Scenario[] = ['voorzichtig', 'midden', 'optimistisch'];

function isRecord(waarde: unknown): waarde is Record<string, unknown> {
  return typeof waarde === 'object' && waarde !== null && !Array.isArray(waarde);
}

function isBestandsnaam(waarde: unknown): waarde is string {
  return typeof waarde === 'string' && /^[\w.-]+\.json$/.test(waarde);
}

/** Controleert de ruwe JSON en geeft een getypeerde config terug, of gooit een duidelijke fout. */
export function leesConfig(ruw: unknown): Config {
  if (!isRecord(ruw)) throw new Error('config.json is geen object.');
  const { actiefJaar, begroting, vergelijking, meerjarenHorizon, scenario } = ruw;

  if (typeof actiefJaar !== 'number' || !Number.isInteger(actiefJaar)) {
    throw new Error('config.json: "actiefJaar" moet een jaartal zijn.');
  }
  if (!isBestandsnaam(begroting)) {
    throw new Error('config.json: "begroting" moet een bestandsnaam op .json zijn.');
  }
  if (!Array.isArray(vergelijking) || !vergelijking.every(isBestandsnaam)) {
    throw new Error('config.json: "vergelijking" moet een lijst met bestandsnamen zijn.');
  }
  if (
    !Array.isArray(meerjarenHorizon) ||
    meerjarenHorizon.length === 0 ||
    !meerjarenHorizon.every((j, i) => j === actiefJaar + i)
  ) {
    throw new Error(
      'config.json: "meerjarenHorizon" moet opeenvolgende jaren bevatten, beginnend bij "actiefJaar".',
    );
  }
  const gekozenScenario = scenario ?? 'midden';
  if (!SCENARIOS.includes(gekozenScenario as Scenario)) {
    throw new Error(`config.json: "scenario" moet een van ${SCENARIOS.join(', ')} zijn.`);
  }

  return {
    actiefJaar,
    begroting,
    vergelijking: [...vergelijking],
    meerjarenHorizon: [...meerjarenHorizon],
    scenario: gekozenScenario as Scenario,
  };
}

/** Minimale kop van een begrotingsbestand, genoeg voor fase 0. */
export type BegrotingKop = {
  begrotingsjaar: number;
  document: string;
  bronUrl: string;
};

export function leesBegrotingKop(ruw: unknown, config: Config): BegrotingKop {
  if (!isRecord(ruw)) throw new Error(`${config.begroting} is geen object.`);
  const { begrotingsjaar, document, bron_url } = ruw;
  if (typeof begrotingsjaar !== 'number') {
    throw new Error(`${config.begroting}: "begrotingsjaar" ontbreekt.`);
  }
  if (begrotingsjaar !== config.actiefJaar) {
    throw new Error(
      `${config.begroting} is de begroting ${begrotingsjaar}, maar config.json verwacht ${config.actiefJaar}.`,
    );
  }
  return {
    begrotingsjaar,
    document: typeof document === 'string' ? document : '',
    bronUrl: typeof bron_url === 'string' ? bron_url : '',
  };
}

/** Haalt JSON op via een meegegeven functie, zodat dit zonder browser te testen is. */
export type HaalJson = (bestand: string) => Promise<unknown>;

export async function laadActieveBegroting(
  haal: HaalJson,
): Promise<{ config: Config; kop: BegrotingKop }> {
  const config = leesConfig(await haal('config.json'));
  const kop = leesBegrotingKop(await haal(config.begroting), config);
  return { config, kop };
}

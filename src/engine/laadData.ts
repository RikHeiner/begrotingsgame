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
  kaartSchema,
  badgesSchema,
  tekstenSchema,
  reactiesSchema,
  leesKengetallen,
  metersSchema,
  personasSchema,
  tegenbegrotingSchema,
  gebeurtenissenSchema,
  tarievenSchema,
  parkerenSchema,
  woonlastenSchema,
  type ParkerenData,
  type Woonlasten,
  type Tarieven,
  type Actiekaart,
  type Gebeurtenis,
  type Begroting,
  type Belasting,
  type Config,
  type Deelprogramma,
  type Dwarsverband,
  type Dwarsverbanden,
  type Gebouw,
  type KaartData,
  type BadgesData,
  type Teksten,
  type Reactie,
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
  kaart: KaartData;
  reacties: Reactie[];
  badges: BadgesData;
  teksten: Teksten;
  /** gebeurteniskaarten voor de campagnemodus */
  gebeurtenissen: Gebeurtenis[];
  /** tarieven van de lokale heffingen, als config.json ze noemt */
  tarieven?: Tarieven;
  /** parkeren per vergunning en tariefgebied, als config.json het noemt */
  parkeren?: ParkerenData;
  /** woonlasten per gemeente, als config.json ze noemt */
  woonlasten?: Woonlasten;
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
    gebeurtenissen: Map<string, Gebeurtenis>;
  };
};

/** Haalt een JSON-bestand op, met een pad relatief aan de map data/. */
export type HaalJson = (pad: string) => Promise<unknown>;

export const SPEL_BESTANDEN = {
  meters: 'spel/meters.json',
  gebouwen: 'spel/gebouwen.json',
  gebieden: 'spel/gebieden.json',
  kaart: 'spel/kaart.json',
  reacties: 'spel/reacties.json',
  badges: 'spel/badges.json',
  teksten: 'spel/teksten.json',
  personas: 'spel/personas.json',
  gebeurtenissen: 'spel/gebeurtenissen.json',
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
  kaart: unknown;
  reacties: unknown;
  badges: unknown;
  teksten: unknown;
  personas: unknown;
  gebeurtenissen: unknown;
  tarieven?: { bestand: string; inhoud: unknown };
  parkeren?: { bestand: string; inhoud: unknown };
  woonlasten?: { bestand: string; inhoud: unknown };
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
  const kaart = valideer(kaartSchema, ruw.kaart, SPEL_BESTANDEN.kaart);
  const reacties = valideer(reactiesSchema, ruw.reacties, SPEL_BESTANDEN.reacties).reacties;
  const badges = valideer(badgesSchema, ruw.badges, SPEL_BESTANDEN.badges);
  const teksten = valideer(tekstenSchema, ruw.teksten, SPEL_BESTANDEN.teksten);
  const gebeurtenissen = valideer(
    gebeurtenissenSchema,
    ruw.gebeurtenissen,
    SPEL_BESTANDEN.gebeurtenissen,
  ).gebeurtenissen;
  const onbekend: string[] = [];
  for (const g of gebeurtenissen)
    for (const { basis } of g.effecten) {
      if (basis.soort === 'lasten')
        for (const id of basis.posten)
          if (!begroting.onderdelen.some((o) => o.id === id))
            onbekend.push(`${g.id}: post "${id}" bestaat niet`);
      if (basis.soort === 'belasting' && !begroting.belastingen.some((x) => x.id === basis.id))
        onbekend.push(`${g.id}: belasting "${basis.id}" bestaat niet`);
    }
  if (onbekend.length) throw new DataFout(SPEL_BESTANDEN.gebeurtenissen, onbekend);
  const tarieven = ruw.tarieven
    ? valideer(tarievenSchema, ruw.tarieven.inhoud, ruw.tarieven.bestand)
    : undefined;
  if (ruw.tarieven && tarieven && tarieven.begrotingsjaar !== config.actiefJaar)
    throw new DataFout(ruw.tarieven.bestand, [
      `dit zijn de tarieven van ${tarieven.begrotingsjaar}, maar config.json verwacht ${config.actiefJaar}`,
    ]);
  const parkeren = ruw.parkeren
    ? valideer(parkerenSchema, ruw.parkeren.inhoud, ruw.parkeren.bestand)
    : undefined;
  if (ruw.parkeren && parkeren) {
    const fout: string[] = [];
    if (parkeren.begrotingsjaar !== config.actiefJaar)
      fout.push(
        `dit is parkeren ${parkeren.begrotingsjaar}, maar config.json verwacht ${config.actiefJaar}`,
      );
    if (!begroting.belastingen.some((x) => x.id === parkeren.opbrengst.belasting))
      fout.push(`belasting "${parkeren.opbrengst.belasting}" bestaat niet`);
    if (!gebouwen.some((g) => g.id === parkeren.opbrengst.gebouw))
      fout.push(`gebouw "${parkeren.opbrengst.gebouw}" bestaat niet`);
    const gebieden = new Set(parkeren.tariefgebieden.map((t) => t.id));
    for (const v of parkeren.vergunningen)
      for (const g of Object.keys(v.tarief))
        if (g !== 'alle' && !gebieden.has(g)) fout.push(`${v.id}: onbekend tariefgebied "${g}"`);
    for (const g of parkeren.aantallen.gebieden)
      if (!gebieden.has(g.tariefgebied))
        fout.push(`${g.naam}: onbekend tariefgebied "${g.tariefgebied}"`);
    if (fout.length) throw new DataFout(ruw.parkeren.bestand, fout);
  }
  const woonlasten = ruw.woonlasten
    ? valideer(woonlastenSchema, ruw.woonlasten.inhoud, ruw.woonlasten.bestand)
    : undefined;
  if (ruw.woonlasten && woonlasten) {
    const fout: string[] = [];
    if (woonlasten.jaar !== config.actiefJaar)
      fout.push(
        `dit zijn de woonlasten van ${woonlasten.jaar}, maar config.json verwacht ${config.actiefJaar}`,
      );
    const bronnen = new Set(woonlasten.bronnen.map((b) => b.id));
    const h = woonlasten.handmatig;
    if (h) {
      for (const b of [h.landelijk_gemiddelde.bron, h.gemeente.bron])
        if (!bronnen.has(b)) fout.push(`onbekende bron "${b}"`);
      if (!woonlasten.gemeenten.some((g) => g.code === h.gemeente.code))
        fout.push(`gemeente "${h.gemeente.code}" staat niet in de lijst`);
    }
    if (fout.length) throw new DataFout(ruw.woonlasten.bestand, fout);
  }
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
    kaart,
    reacties,
    badges,
    teksten,
    gebeurtenissen,
    ...(tarieven ? { tarieven } : {}),
    ...(parkeren ? { parkeren } : {}),
    ...(woonlasten ? { woonlasten } : {}),
    vergelijking,
    jaren: [...config.meerjarenHorizon],
    index: maakIndex(begroting, dwarsverbanden, meters, gebeurtenissen),
  };
}

function maakIndex(
  begroting: Begroting,
  dwarsverbanden: Dwarsverbanden,
  meters: MetersData,
  gebeurtenissen: Gebeurtenis[],
) {
  return {
    onderdelen: new Map(begroting.onderdelen.map((o) => [o.id, o])),
    belastingen: new Map(begroting.belastingen.map((b) => [b.id, b])),
    kaarten: new Map(begroting.actiekaarten.map((k) => [k.id, k])),
    deelprogrammas: new Map(begroting.deelprogrammas.map((d) => [d.code, d])),
    verbanden: new Map(dwarsverbanden.dwarsverbanden.map((v) => [v.id, v])),
    meterPerKort: new Map(meters.meters.map((m) => [m.kort, m.id])),
    gebeurtenissen: new Map(gebeurtenissen.map((g) => [g.id, g])),
  };
}

/** Geeft een kopie van de data met extra actiekaarten (bijvoorbeeld de posten van een tegenbegroting). */
export function metExtraKaarten(data: Data, kaarten: Actiekaart[]): Data {
  const begroting = {
    ...data.begroting,
    actiekaarten: [...data.begroting.actiekaarten, ...kaarten],
  };
  return {
    ...data,
    begroting,
    index: maakIndex(begroting, data.dwarsverbanden, data.meters, data.gebeurtenissen),
  };
}

/** Laadt alle bestanden voor het jaar uit config.json. */
export async function laadData(haal: HaalJson): Promise<Data> {
  const ruweConfig = await haal('config.json');
  const config = valideer(configSchema, ruweConfig, 'config.json');
  const spelSleutels = Object.keys(SPEL_BESTANDEN) as (keyof typeof SPEL_BESTANDEN)[];
  const [begroting, dwarsverbanden, spel, vergelijking, tarieven, parkeren, woonlasten] =
    await Promise.all([
      haal(config.begroting),
      haal('dwarsverbanden.json'),
      Promise.all(spelSleutels.map((k) => haal(SPEL_BESTANDEN[k]))),
      Promise.all(config.vergelijking.map((b) => haal(b))),
      config.tarieven ? haal(config.tarieven) : Promise.resolve(undefined),
      config.parkeren ? haal(config.parkeren) : Promise.resolve(undefined),
      config.woonlasten ? haal(config.woonlasten) : Promise.resolve(undefined),
    ]);
  const spelData = Object.fromEntries(spelSleutels.map((k, i) => [k, spel[i]])) as Record<
    keyof typeof SPEL_BESTANDEN,
    unknown
  >;
  return maakData({
    config: ruweConfig,
    begroting,
    dwarsverbanden,
    ...spelData,
    ...(config.tarieven ? { tarieven: { bestand: config.tarieven, inhoud: tarieven } } : {}),
    ...(config.parkeren ? { parkeren: { bestand: config.parkeren, inhoud: parkeren } } : {}),
    ...(config.woonlasten
      ? { woonlasten: { bestand: config.woonlasten, inhoud: woonlasten } }
      : {}),
    vergelijking: config.vergelijking.map((bestand, i) => ({ bestand, inhoud: vergelijking[i] })),
  });
}

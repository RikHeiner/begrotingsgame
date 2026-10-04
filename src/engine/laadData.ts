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
  tarievenSchema,
  parkerenSchema,
  woonlastenSchema,
  uitgavenSchema,
  type Uitgaven,
  routeSchema,
  gevolgenSchema,
  minigamesSchema,
  ergernissenSchema,
  type Ergernis,
  type Minigame,
  type SpelPost,
  type Gevolgen,
  belastingenNederlandSchema,
  apparaatSchema,
  type Apparaat,
  type Route,
  type BelastingenNederland,
  type ParkerenData,
  type Woonlasten,
  type Tarieven,
  type Actiekaart,
  type Programma,
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
  /** tarieven van de lokale heffingen, als config.json ze noemt */
  tarieven?: Tarieven;
  /** parkeren per vergunning en tariefgebied, als config.json het noemt */
  parkeren?: ParkerenData;
  /** woonlasten per gemeente, als config.json ze noemt */
  woonlasten?: Woonlasten;
  /** uitgaven per inwoner van andere gemeenten, als config.json ze noemt */
  uitgaven?: Uitgaven;
  /** landelijke gemiddelden van de gemeentebelastingen, als config.json ze noemt */
  belastingenNederland?: BelastingenNederland;
  /** het ambtenarenapparaat en andere gemeenten, als config.json het noemt */
  apparaat?: Apparaat;
  /** de route langs de gebouwen bij nul: eerst de belasting, dan de rest in een vaste volgorde */
  route: Route;
  /** wat de speler merkt van een keuze, ten opzichte van nu */
  gevolgen: Gevolgen;
  /** minigames over geld, in bekende gebouwen van de gemeente */
  minigames: Minigame[];
  /** posten met een naam die iedereen begrijpt, voor de minigames */
  spelPosten: SpelPost[];
  /** ergernissen van VVD Groningen over het college (voor "Groninger erger je niet") */
  ergernissen: Ergernis[];
  /** keuze van de fractie: welke plannen onnodig zijn (weg), met minder kunnen, of niet onnodig */
  onnodig: { weg: string[]; minder: string[]; niet: string[] };
  vergelijking: { bestand: string; tegenbegroting: Tegenbegroting }[];
  /** Jaren van de meerjarenraming, bijvoorbeeld [2026, 2027, 2028, 2029]. */
  jaren: number[];
  index: {
    onderdelen: Map<string, Onderdeel>;
    belastingen: Map<string, Belasting>;
    kaarten: Map<string, Actiekaart>;
    programmas: Map<string, Programma>;
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
  kaart: 'spel/kaart.json',
  reacties: 'spel/reacties.json',
  badges: 'spel/badges.json',
  teksten: 'spel/teksten.json',
  personas: 'spel/personas.json',
  route: 'spel/route.json',
  gevolgen: 'spel/gevolgen.json',
  minigames: 'spel/minigames.json',
  ergernissen: 'spel/ergernissen.json',
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
  route: unknown;
  gevolgen: unknown;
  minigames: unknown;
  ergernissen: unknown;
  tarieven?: { bestand: string; inhoud: unknown };
  parkeren?: { bestand: string; inhoud: unknown };
  woonlasten?: { bestand: string; inhoud: unknown };
  uitgaven?: { bestand: string; inhoud: unknown };
  belastingenNederland?: { bestand: string; inhoud: unknown };
  apparaat?: { bestand: string; inhoud: unknown };
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
  const tarieven = ruw.tarieven
    ? valideer(tarievenSchema, ruw.tarieven.inhoud, ruw.tarieven.bestand)
    : undefined;
  if (ruw.tarieven && tarieven && tarieven.begrotingsjaar !== config.actiefJaar)
    throw new DataFout(ruw.tarieven.bestand, [
      `dit zijn de tarieven van ${tarieven.begrotingsjaar}, maar config.json verwacht ${config.actiefJaar}`,
    ]);
  // Programma's: de post bestaat en kan bewegen, en samen passen ze boven de ondergrens.
  const programmaFouten: string[] = [];
  const perPost = new Map<string, number>();
  for (const p of begroting.beleidsprogrammas ?? []) {
    const o = begroting.onderdelen.find((x) => x.id === p.post);
    if (!o) programmaFouten.push(`${p.id}: post "${p.post}" bestaat niet`);
    else if (o.vergrendeld || o.min_pct === null)
      programmaFouten.push(`${p.id}: post "${p.post}" zit vast`);
    else if (p.structureel_of_incidenteel === 'S')
      perPost.set(o.id, (perPost.get(o.id) ?? 0) + p.bedrag_mln);
  }
  for (const [id, som] of perPost) {
    const o = begroting.onderdelen.find((x) => x.id === id);
    const ruimte = o ? (o.lasten_mln * -(o.min_pct ?? 0)) / 100 : 0;
    if (som > ruimte + 1e-6)
      programmaFouten.push(
        `post "${id}": de programma's (${som.toFixed(3)} mln) zijn meer dan het deel boven de ondergrens (${ruimte.toFixed(3)} mln)`,
      );
  }
  if (programmaFouten.length) throw new DataFout(config.begroting, programmaFouten);
  if (
    (begroting.beleidsprogrammas ?? []).length &&
    !gebouwen.some((g) => g.soort === 'beleidshuis')
  )
    throw new DataFout(SPEL_BESTANDEN.gebouwen, [
      "programma's in de begroting, maar geen Beleidshuis",
    ]);

  const hondKaart = tarieven?.hondenbelasting?.kaart;
  if (ruw.tarieven && hondKaart && !begroting.actiekaarten.some((k) => k.id === hondKaart))
    throw new DataFout(ruw.tarieven.bestand, [`actiekaart "${hondKaart}" bestaat niet`]);
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
    // De vergelijking van een vorig jaar mag (COELO verschijnt pas in het voorjaar); de game noemt
    // het jaartal. Een later jaar dan de begroting kan niet.
    if (woonlasten.jaar > config.actiefJaar || woonlasten.jaar < config.actiefJaar - 1)
      fout.push(
        `dit zijn de woonlasten van ${woonlasten.jaar}, maar config.json verwacht ${config.actiefJaar} (of het jaar ervoor)`,
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
  const uitgaven = ruw.uitgaven
    ? valideer(uitgavenSchema, ruw.uitgaven.inhoud, ruw.uitgaven.bestand)
    : undefined;
  if (ruw.uitgaven && uitgaven) {
    const fout: string[] = [];
    // Cijfers van andere gemeenten zijn er pas later dan de eigen begroting. Ouder dan drie jaar
    // zeggen ze te weinig; nieuwer dan de begroting kan niet.
    if (uitgaven.jaar > config.actiefJaar || uitgaven.jaar < config.actiefJaar - 3)
      fout.push(
        `dit zijn cijfers van ${uitgaven.jaar}, maar config.json verwacht ${config.actiefJaar} of hooguit drie jaar eerder`,
      );
    const gebouwIds = new Set(gebouwen.map((g) => g.id));
    const themaIds = new Set<string>();
    for (const t of uitgaven.themas) {
      if (themaIds.has(t.id)) fout.push(`thema "${t.id}" staat er twee keer in`);
      themaIds.add(t.id);
      for (const g of t.gebouwen)
        if (!gebouwIds.has(g)) fout.push(`thema "${t.id}": onbekend gebouw "${g}"`);
    }
    const codes = new Set(uitgaven.gemeenten.map((g) => g.code));
    for (const c of [uitgaven.gemeente, ...uitgaven.vergelijk_met])
      if (!codes.has(c)) fout.push(`gemeente "${c}" staat niet in de lijst`);
    for (const g of uitgaven.gemeenten)
      for (const t of themaIds)
        if (g.lasten_x1000[t] === undefined) fout.push(`${g.naam}: geen bedrag voor thema "${t}"`);
    if (fout.length) throw new DataFout(ruw.uitgaven.bestand, fout);
  }
  const route = valideer(routeSchema, ruw.route, SPEL_BESTANDEN.route);
  {
    const fout: string[] = [];
    const gezien = new Set<string>();
    for (const st of route.stappen) {
      if (!gebouwen.some((g) => g.id === st.gebouw)) fout.push(`onbekend gebouw "${st.gebouw}"`);
      if (gezien.has(st.gebouw)) fout.push(`gebouw "${st.gebouw}" staat er twee keer in`);
      gezien.add(st.gebouw);
    }
    if (fout.length) throw new DataFout(SPEL_BESTANDEN.route, fout);
  }
  const gevolgen = valideer(gevolgenSchema, ruw.gevolgen, SPEL_BESTANDEN.gevolgen);
  {
    const fout: string[] = [];
    const cats = new Set(Object.keys(gevolgen.categorieen));
    const check = (c: string | undefined, waar: string) => {
      if (c !== undefined && !cats.has(c)) fout.push(`${waar}: onbekende categorie "${c}"`);
    };
    for (const [id, c] of Object.entries(gevolgen.gebouwen)) {
      if (!gebouwen.some((g) => g.id === id)) fout.push(`onbekend gebouw "${id}"`);
      check(c, id);
    }
    for (const [id, c] of Object.entries(gevolgen.meters)) check(c, `meter ${id}`);
    for (const [id, p] of Object.entries(gevolgen.posten)) {
      // Een post die dit jaar niet bestaat, mag: spel/ geldt voor meer begrotingsjaren.
      check(p.categorie, id);
    }
    if (fout.length) throw new DataFout(SPEL_BESTANDEN.gevolgen, fout);
  }
  const mg = valideer(minigamesSchema, ruw.minigames, SPEL_BESTANDEN.minigames);
  const minigames = mg.minigames;
  {
    const ids = new Set<string>();
    const fout: string[] = [];
    for (const m of minigames) {
      if (ids.has(m.id) || gebouwen.some((g) => g.id === m.id))
        fout.push(`id "${m.id}" is niet uniek (ook gebouwen tellen mee)`);
      ids.add(m.id);
      if (m.bij && !gebouwen.some((g) => g.id === m.bij?.gebouw))
        fout.push(`${m.id}: onbekend gebouw "${m.bij.gebouw}"`);
    }
    if (fout.length) throw new DataFout(SPEL_BESTANDEN.minigames, fout);
  }
  const belastingenNederland = ruw.belastingenNederland
    ? valideer(
        belastingenNederlandSchema,
        ruw.belastingenNederland.inhoud,
        ruw.belastingenNederland.bestand,
      )
    : undefined;
  const apparaat = ruw.apparaat
    ? valideer(apparaatSchema, ruw.apparaat.inhoud, ruw.apparaat.bestand)
    : undefined;
  if (ruw.apparaat && apparaat && apparaat.begrotingsjaar !== config.actiefJaar)
    throw new DataFout(ruw.apparaat.bestand, [
      `dit is het apparaat van ${apparaat.begrotingsjaar}, maar config.json verwacht ${config.actiefJaar}`,
    ]);
  if (ruw.belastingenNederland && belastingenNederland) {
    const fout: string[] = [];
    if (
      belastingenNederland.jaar > config.actiefJaar ||
      belastingenNederland.jaar < config.actiefJaar - 3
    )
      fout.push(
        `dit zijn cijfers van ${belastingenNederland.jaar}, maar config.json verwacht ${config.actiefJaar} of hooguit drie jaar eerder`,
      );
    for (const id of Object.keys(belastingenNederland.belastingen))
      if (!begroting.belastingen.some((b) => b.id === id)) fout.push(`onbekende belasting "${id}"`);
    if (fout.length) throw new DataFout(ruw.belastingenNederland.bestand, fout);
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
    ...(tarieven ? { tarieven } : {}),
    ...(parkeren ? { parkeren } : {}),
    ...(woonlasten ? { woonlasten } : {}),
    ...(uitgaven ? { uitgaven } : {}),
    ...(belastingenNederland ? { belastingenNederland } : {}),
    ...(apparaat ? { apparaat } : {}),
    route,
    gevolgen,
    minigames,
    spelPosten: mg.posten,
    ergernissen: valideer(ergernissenSchema, ruw.ergernissen, SPEL_BESTANDEN.ergernissen)
      .ergernissen,
    onnodig: mg.onnodig,
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
    programmas: new Map((begroting.beleidsprogrammas ?? []).map((p) => [p.id, p])),
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
  return {
    ...data,
    begroting,
    index: maakIndex(begroting, data.dwarsverbanden, data.meters),
  };
}

/** Laadt alle bestanden voor het jaar uit config.json. */
export async function laadData(haal: HaalJson): Promise<Data> {
  const ruweConfig = await haal('config.json');
  const config = valideer(configSchema, ruweConfig, 'config.json');
  const spelSleutels = Object.keys(SPEL_BESTANDEN) as (keyof typeof SPEL_BESTANDEN)[];
  const [
    begroting,
    dwarsverbanden,
    spel,
    vergelijking,
    tarieven,
    parkeren,
    woonlasten,
    uitgaven,
    belastingenNederland,
    apparaat,
  ] = await Promise.all([
    haal(config.begroting),
    haal('dwarsverbanden.json'),
    Promise.all(spelSleutels.map((k) => haal(SPEL_BESTANDEN[k]))),
    Promise.all(config.vergelijking.map((b) => haal(b))),
    config.tarieven ? haal(config.tarieven) : Promise.resolve(undefined),
    config.parkeren ? haal(config.parkeren) : Promise.resolve(undefined),
    config.woonlasten ? haal(config.woonlasten) : Promise.resolve(undefined),
    config.uitgaven ? haal(config.uitgaven) : Promise.resolve(undefined),
    config.belastingenNederland ? haal(config.belastingenNederland) : Promise.resolve(undefined),
    config.apparaat ? haal(config.apparaat) : Promise.resolve(undefined),
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
    ...(config.uitgaven ? { uitgaven: { bestand: config.uitgaven, inhoud: uitgaven } } : {}),
    ...(config.belastingenNederland
      ? {
          belastingenNederland: {
            bestand: config.belastingenNederland,
            inhoud: belastingenNederland,
          },
        }
      : {}),
    ...(config.apparaat ? { apparaat: { bestand: config.apparaat, inhoud: apparaat } } : {}),
    vergelijking: config.vergelijking.map((bestand, i) => ({ bestand, inhoud: vergelijking[i] })),
  });
}

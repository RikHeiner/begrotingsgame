/**
 * Haalt de uitgaven per thema van de grote gemeenten op en schrijft data/uitgaven-gemeenten-JJJJ.json.
 * De game zet die bij de gebouwen naast Groningen, altijd met het jaartal erbij.
 *
 *   npm run uitgaven:ophalen              (begroting van het jaar vóór het actieve jaar)
 *   npm run uitgaven:ophalen -- 2026
 *   npm run uitgaven:ophalen -- 2025 jaarrekening
 *
 * Bronnen:
 * - CBS, "Gemeenten JJJJ onbewerkte Iv3-data": wat gemeenten zelf aan het CBS doorgeven, per
 *   taakveld en per soort uitgave (Informatie voor derden, Iv3). Het CBS bewerkt deze cijfers niet.
 * - CBS StatLine 70072ned (Regionale kerncijfers): het aantal inwoners op 1 januari.
 *
 * De lasten per thema zijn de lasten op de taakvelden van dat thema, zonder de mutaties van reserves
 * (L7.1) en zonder interne verrekeningen (L7.4 toegerekende rente, L7.5 overige verrekeningen).
 * Inkomsten (heffingen, rijksgeld) gaan er niet af. De thema's staan in het bestaande bestand en
 * blijven staan; zonder bestand gelden de thema's hieronder.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { uitgavenSchema, type Uitgaven } from '../src/engine/schema';
import { DATA_MAP, leesJson } from './lees';

const actief = (leesJson('config.json') as { actiefJaar: number }).actiefJaar;
const jaar = Number(process.argv[2] ?? actief - 1);
const verslagsoort = (process.argv[3] ?? 'begroting') as Uitgaven['verslagsoort'];
const BESTAND = `uitgaven-gemeenten-${jaar}.json`;
/** Gemeenten met minstens zoveel inwoners doen mee. */
const MIN_INWONERS = 100_000;
const GRONINGEN = '0014';
const ZONDER = new Set(['L7.1', 'L7.4', 'L7.5']);

/** CBS-tabellen met de onbewerkte Iv3-data van gemeenten, per verslagjaar. */
const TABELLEN: Record<number, string> = {
  2024: '45067NED',
  2025: '45071NED',
  2026: '45078NED',
};
const CBS_DERDEN = 'https://dataderden.cbs.nl/ODataApi/OData';
const CBS_INWONERS = `https://opendata.cbs.nl/ODataApi/odata/70072ned/TypedDataSet?$filter=Perioden eq '${jaar}JJ00' and substringof('GM',RegioS)&$select=RegioS,TotaleBevolking_1`;

const STANDAARD_THEMAS: Uitgaven['themas'] = [
  {
    id: 'bestuur',
    naam: 'Bestuur en burgerzaken',
    gebouwen: ['stadhuis'],
    taakvelden: ['0.1', '0.2'],
  },
  {
    id: 'overhead',
    naam: 'Overhead (staf, ICT, huisvesting, HR)',
    gebouwen: ['stadhuis'],
    taakvelden: ['0.4'],
    let_op:
      'Gemeenten boeken overhead niet allemaal op dezelfde manier. Sommige zetten bijna alles onder overhead, andere verdelen het over de andere taken. Kijk daarom vooral naar de middelste gemeente.',
  },
  {
    id: 'economie',
    naam: 'Economie',
    gebouwen: ['winkel'],
    taakvelden: ['3.1', '3.2', '3.3', '3.4'],
  },
  {
    id: 'verkeer',
    naam: 'Verkeer, parkeren en openbaar vervoer',
    gebouwen: ['parkeer'],
    taakvelden: ['2.1', '2.2', '2.5'],
    let_op:
      'Hieronder valt ook het onderhoud van straten en wegen. Dat staat in de game bij het Park.',
  },
  {
    id: 'werk',
    naam: 'Werk en inkomen (met de bijstand)',
    gebouwen: ['werk'],
    taakvelden: ['6.3', '6.4', '6.5'],
    let_op:
      'Groningen heeft veel inwoners met een bijstandsuitkering. Het Rijk betaalt de uitkeringen grotendeels terug; dat geld is hier niet van afgehaald.',
  },
  { id: 'sport', naam: 'Sport', gebouwen: ['zwembad'], taakvelden: ['5.1', '5.2'] },
  {
    id: 'sociaal',
    naam: 'Zorg, jeugdhulp en welzijn',
    gebouwen: ['zorg', 'buurt'],
    taakvelden: [
      '6.1',
      '6.21',
      '6.22',
      '6.23',
      '6.60',
      '6.711',
      '6.712',
      '6.713',
      '6.714',
      '6.751',
      '6.752',
      '6.753',
      '6.761',
      '6.762',
      '6.763',
      '6.791',
      '6.792',
      '6.811',
      '6.812',
      '6.821',
      '6.822',
      '6.91',
      '6.92',
    ],
    let_op:
      'Groningen regelt beschermd wonen en de opvang van dak- en thuislozen voor de hele provincie. Daar krijgt de gemeente geld van het Rijk voor. Daardoor zijn de uitgaven per inwoner hoger. Wijkteams, welzijn, Wmo en jeugdhulp staan hier samen, omdat gemeenten ze verschillend boeken.',
  },
  { id: 'gezondheid', naam: 'Gezondheid (GGD)', gebouwen: ['zorg'], taakvelden: ['7.1'] },
  {
    id: 'veiligheid',
    naam: 'Brandweer en veiligheid',
    gebouwen: ['politie'],
    taakvelden: ['1.1', '1.2'],
  },
  {
    id: 'cultuur',
    naam: 'Cultuur',
    gebouwen: ['theater'],
    taakvelden: ['5.3', '5.4', '5.5', '5.6'],
  },
  {
    id: 'onderwijs',
    naam: 'Onderwijs en schoolgebouwen',
    gebouwen: ['school'],
    taakvelden: ['4.1', '4.2', '4.3'],
  },
  { id: 'groen', naam: 'Groen en recreatie', gebouwen: ['park'], taakvelden: ['5.7'] },
  { id: 'riolering', naam: 'Riolering', gebouwen: ['park'], taakvelden: ['7.2'] },
  { id: 'afval', naam: 'Afval', gebouwen: ['park'], taakvelden: ['7.3'] },
  {
    id: 'ruimte',
    naam: 'Wonen, bouwen, ruimte en milieu',
    gebouwen: ['bouw'],
    taakvelden: ['7.4', '8.1', '8.3'],
    let_op:
      'Klimaat en energie boeken gemeenten soms bij milieu en soms bij wonen; daarom staan ze samen.',
  },
];

/** Standaard in de lijst: grote gemeenten die op Groningen lijken (studentenstad of centrum van de regio). */
const STANDAARD_VERGELIJK = ['0344', '0772', '0855', '0268', '0193', '0080', '0153', '0935'];

async function json<T>(url: string): Promise<T> {
  const r = await fetch(encodeURI(url));
  const t = await r.text();
  if (!r.ok || !t.startsWith('{')) throw new Error(`${url}: HTTP ${r.status} ${t.slice(0, 200)}`);
  return JSON.parse(t) as T;
}

type Rij = {
  TaakveldBalanspost: string;
  Categorie: string;
  k_1ePlaatsing_1: number | null;
  k_2ePlaatsing_2: number | null;
};

/** Alle lastenregels van één gemeente. Per hoofdtaakveld, want het CBS geeft hooguit 10.000 regels. */
async function lastenVan(tabel: string, soort: string, code: string): Promise<Rij[]> {
  const delen = await Promise.all(
    [0, 1, 2, 3, 4, 5, 6, 7, 8].map(async (h) => {
      const rijen: Rij[] = [];
      let url: string | undefined =
        `${CBS_DERDEN}/${tabel}/TypedDataSet?$format=json&$filter=Verslagsoort eq '${soort}' and Gemeenten eq 'GM${code}   ' and startswith(TaakveldBalanspost,'${h}.') and startswith(Categorie,'L')&$select=TaakveldBalanspost,Categorie,k_1ePlaatsing_1,k_2ePlaatsing_2`;
      while (url) {
        const j: { value: Rij[]; 'odata.nextLink'?: string } = await json(url);
        rijen.push(...j.value);
        url = j['odata.nextLink'] ? decodeURI(j['odata.nextLink']) : undefined;
      }
      return rijen;
    }),
  );
  return delen.flat();
}

async function main() {
  const tabel = TABELLEN[jaar];
  if (!tabel) throw new Error(`geen CBS-tabel bekend voor ${jaar}; vul TABELLEN aan`);
  const pad = resolve(DATA_MAP, BESTAND);
  const oud = existsSync(pad) ? (JSON.parse(readFileSync(pad, 'utf8')) as Partial<Uitgaven>) : {};
  const themas = oud.themas ?? STANDAARD_THEMAS;

  console.log(`Uitgaven ${verslagsoort} ${jaar} ophalen (CBS ${tabel})`);
  const verslagsoorten = await json<{ value: { Key: string; Title: string }[] }>(
    `${CBS_DERDEN}/${tabel}/Verslagsoort?$format=json`,
  );
  const soort = verslagsoorten.value.find((v) => v.Title.toLowerCase() === verslagsoort)?.Key;
  if (!soort) throw new Error(`verslagsoort "${verslagsoort}" niet gevonden in ${tabel}`);
  const namen = await json<{ value: { Key: string; Title: string }[] }>(
    `${CBS_DERDEN}/${tabel}/Gemeenten?$format=json`,
  );
  const naamVan = new Map(
    namen.value.map((g) => [
      g.Key.trim().replace(/^GM/, ''),
      g.Title.replace(/ \(gemeente\)$/, ''),
    ]),
  );

  console.log(`- CBS: inwoners op 1 januari ${jaar}`);
  const cbs = await json<{ value: { RegioS: string; TotaleBevolking_1: number | null }[] }>(
    CBS_INWONERS,
  );
  const groot = cbs.value
    .filter((v) => (v.TotaleBevolking_1 ?? 0) >= MIN_INWONERS)
    .map((v) => ({
      code: v.RegioS.trim().replace(/^GM/, ''),
      inwoners: v.TotaleBevolking_1 as number,
    }))
    .filter((g) => naamVan.has(g.code));

  const waarschuwingen: string[] = [];
  const gemeenten: Uitgaven['gemeenten'] = [];
  for (const g of groot) {
    const naam = naamVan.get(g.code) ?? g.code;
    const rijen = await lastenVan(tabel, soort, g.code);
    const metWaarde = rijen.filter((r) => (r.k_2ePlaatsing_2 ?? r.k_1ePlaatsing_1) !== null);
    if (!metWaarde.length) {
      waarschuwingen.push(`${naam}: geen ${verslagsoort} ${jaar} bij het CBS, niet meegenomen`);
      continue;
    }
    const lasten: Record<string, number> = {};
    for (const t of themas) {
      const velden = new Set(t.taakvelden);
      lasten[t.id] = metWaarde
        .filter((r) => velden.has(r.TaakveldBalanspost.trim()) && !ZONDER.has(r.Categorie.trim()))
        .reduce((s, r) => s + (r.k_2ePlaatsing_2 ?? r.k_1ePlaatsing_1 ?? 0), 0);
    }
    gemeenten.push({ code: g.code, naam, inwoners: g.inwoners, lasten_x1000: lasten });
    console.log(`  ${naam}`);
  }
  gemeenten.sort((a, b) => b.inwoners - a.inwoners);

  const vandaag = new Date().toISOString().slice(0, 10);
  const uit: Uitgaven = uitgavenSchema.parse({
    jaar,
    verslagsoort,
    toelichting:
      oud.toelichting ??
      `Uitgaven per thema van de gemeenten met ${MIN_INWONERS.toLocaleString('nl-NL')} inwoners of meer, uit hun ${verslagsoort} ${jaar}. Gemaakt met npm run uitgaven:ophalen.`,
    definitie:
      oud.definitie ??
      'Lasten op de taakvelden van het thema (Iv3), zonder reserves en interne verrekeningen, gedeeld door het aantal inwoners op 1 januari. Inkomsten zoals heffingen en geld van het Rijk zijn er niet vanaf gehaald.',
    bronnen: [
      {
        id: 'iv3',
        titel: `CBS, Gemeenten ${jaar} onbewerkte Iv3-data (${tabel}), ${verslagsoort} ${jaar}`,
        url: `${CBS_DERDEN}/${tabel}`,
        pagina: `https://iv3statline.cbs.nl/#/IV3/nl/dataset/${tabel}/table`,
        opgehaald: vandaag,
        status: 'feit',
      },
      {
        id: 'cbs',
        titel: `CBS StatLine 70072ned, Regionale kerncijfers: bevolking op 1 januari ${jaar}`,
        url: 'https://opendata.cbs.nl/statline/#/CBS/nl/dataset/70072ned/table',
        opgehaald: vandaag,
        status: 'feit',
      },
    ],
    gemeente: oud.gemeente ?? GRONINGEN,
    vergelijk_met: (oud.vergelijk_met ?? STANDAARD_VERGELIJK).filter((c) =>
      gemeenten.some((g) => g.code === c),
    ),
    groep: oud.groep ?? `gemeenten met ${MIN_INWONERS.toLocaleString('nl-NL')} inwoners of meer`,
    themas,
    gemeenten,
  });
  writeFileSync(pad, JSON.stringify(uit, null, 1));
  console.log(`${BESTAND} geschreven: ${gemeenten.length} gemeenten, ${themas.length} thema's.`);
  if (waarschuwingen.length) {
    console.log(`\n${waarschuwingen.length} waarschuwing(en):`);
    for (const w of waarschuwingen) console.log(`- ${w}`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

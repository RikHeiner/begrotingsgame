/**
 * Haalt de woonlasten per gemeente op en schrijft data/woonlasten-JJJJ.json (BEVINDINGEN punt 49).
 *
 *   npm run woonlasten:ophalen            (jaar uit config.json)
 *   npm run woonlasten:ophalen -- 2027
 *
 * Bronnen:
 * - COELO, Atlas van de lokale lasten: het databestand "Gemeentelijke belastingen JJJJ" (xlsx) met
 *   per gemeente de OZB, afvalstoffenheffing, rioolheffing, heffingskorting en woonlasten voor een
 *   huishouden met een koopwoning.
 * - CBS StatLine 70072ned (Regionale kerncijfers): het aantal inwoners op 1 januari, om de grote
 *   steden te kiezen.
 *
 * De landelijke gemiddelden en de woonlasten van huurders staan niet in het databestand. Die staan
 * op de site van COELO (als tekst en als plaatje) en worden met de hand overgenomen in
 * `handmatig` in het bestaande bestand. Het script laat dat deel staan.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { woonlastenSchema, type Woonlasten } from '../src/engine/schema';
import { DATA_MAP, leesJson } from './lees';

const jaar = Number(
  process.argv[2] ?? (leesJson('config.json') as { actiefJaar: number }).actiefJaar,
);
const COELO_XLSX = `https://www.coelo.nl/images/Gemeentelijke_belastingen_${jaar}.xlsx`;
const COELO_BIJLAGEN = `https://coelo.nl/atlas-lokale-lasten-${jaar}/bijlagen-${jaar}-en-databestanden/`;
const CBS = `https://opendata.cbs.nl/ODataApi/odata/70072ned/TypedDataSet?$filter=Perioden eq '${jaar}JJ00' and substringof('GM',RegioS)&$select=RegioS,TotaleBevolking_1`;
const BESTAND = `woonlasten-${jaar}.json`;

/** Provinciecodes in het databestand van COELO (dezelfde volgorde als op hun site). */
const PROVINCIES = [
  'Groningen',
  'Fryslân',
  'Drenthe',
  'Overijssel',
  'Gelderland',
  'Utrecht',
  'Noord-Holland',
  'Zuid-Holland',
  'Zeeland',
  'Noord-Brabant',
  'Limburg',
  'Flevoland',
];

/** Kolommen in het blad "Gegevens per gemeente": letter, groep (rij 2) en kop (rij 3). */
const KOLOMMEN = {
  provincie: ['A', '', 'Provinciecode'],
  code: ['B', '', 'Gemeente code'],
  naam: ['C', '', 'Gemeentenaam'],
  ozb: ['L', 'OZB', 'Gemiddeld betaalde ozb woningen'],
  afval_een: ['N', 'Afvalstoffenheffing', 'Eénpersoonshuishouden'],
  afval_meer: ['P', 'Afvalstoffenheffing', 'Meerpersoonshuishouden'],
  riool_een: ['S', 'Rioolheffing huishoudens', 'Eénpersoonshuishouden'],
  riool_meer: ['U', 'Rioolheffing huishoudens', 'Meerpersoonshuishouden'],
  korting_een: ['AP', 'Woonlasten', 'Heffingskorting éénpersoonshuishouden'],
  korting_meer: ['AQ', 'Woonlasten', 'Heffingskorting meerpersoonshuishouden'],
  koop_een: ['AR', 'Woonlasten', 'Woonlasten éénpersoonshuishouden'],
  koop_meer: ['AT', 'Woonlasten', 'Woonlasten meerpersoonshuishouden'],
} as const;
type Kolom = keyof typeof KOLOMMEN;

async function haal(url: string): Promise<Response> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r;
}

const ontsnap = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

/** Leest één werkblad als rijen van {kolomletter: tekst}. Genoeg voor dit bestand, geen algemene xlsx-lezer. */
async function leesBlad(
  xlsx: ArrayBuffer,
  naam: string,
): Promise<Map<number, Record<string, string>>> {
  const zip = await JSZip.loadAsync(xlsx);
  const tekst = async (pad: string) => {
    const f = zip.file(pad);
    if (!f) throw new Error(`${pad} ontbreekt in het xlsx-bestand`);
    return f.async('string');
  };
  const gedeeld = [...(await tekst('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(
    (m) =>
      ontsnap([...(m[1] ?? '').matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
  );
  const werkboek = await tekst('xl/workbook.xml');
  const rels = await tekst('xl/_rels/workbook.xml.rels');
  const rid = werkboek.match(new RegExp(`<sheet [^>]*name="${naam}"[^>]*r:id="([^"]+)"`))?.[1];
  const doel = rid && rels.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`))?.[1];
  if (!doel) throw new Error(`werkblad "${naam}" niet gevonden`);
  const blad = await tekst(`xl/${doel.replace(/^\/?xl\//, '')}`);
  const rijen = new Map<number, Record<string, string>>();
  for (const r of blad.matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rij: Record<string, string> = {};
    for (const c of (r[2] ?? '').matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const v = (c[3] ?? '').match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (v === undefined) continue;
      rij[c[1] ?? ''] = /t="s"/.test(c[2] ?? '') ? (gedeeld[Number(v)] ?? '') : ontsnap(v);
    }
    rijen.set(Number(r[1]), rij);
  }
  return rijen;
}

const bedrag = (x: string | undefined, wat: string): number => {
  const n = Number(x);
  if (x === undefined || x === '' || !Number.isFinite(n))
    throw new Error(`${wat}: geen getal (${x})`);
  return Math.round(n * 100) / 100;
};

async function main() {
  console.log(`Woonlasten ${jaar} ophalen`);
  console.log(`- COELO: ${COELO_XLSX}`);
  const rijen = await leesBlad(
    await (await haal(COELO_XLSX)).arrayBuffer(),
    'Gegevens per gemeente',
  );

  // De kolommen moeten nog op dezelfde plek staan; anders liever stoppen dan verkeerde cijfers.
  const groepen = rijen.get(2) ?? {};
  const koppen = rijen.get(3) ?? {};
  let groep = '';
  const groepVan = new Map<string, string>();
  const letters = Object.keys(koppen).sort((a, b) => a.length - b.length || a.localeCompare(b));
  for (const l of letters) {
    groep = groepen[l] ?? groep;
    groepVan.set(l, groep);
  }
  for (const [naam, [letter, g, kop]] of Object.entries(KOLOMMEN)) {
    if (koppen[letter] !== kop || (g && groepVan.get(letter) !== g))
      throw new Error(
        `kolom ${letter} (${naam}): verwacht "${g} / ${kop}", gevonden "${groepVan.get(letter)} / ${koppen[letter]}". Is de opmaak van het bestand veranderd?`,
      );
  }

  console.log(`- CBS: inwoners op 1 januari ${jaar}`);
  const cbs = (await (await haal(encodeURI(CBS))).json()) as {
    value: { RegioS: string; TotaleBevolking_1: number | null }[];
  };
  const inwoners = new Map(
    cbs.value
      .filter((v) => v.TotaleBevolking_1)
      .map((v) => [v.RegioS.trim().replace(/^GM/, ''), v.TotaleBevolking_1 as number]),
  );

  const waarde = (rij: Record<string, string>, k: Kolom) => rij[KOLOMMEN[k][0]];
  const gemeenten: Woonlasten['gemeenten'] = [];
  const waarschuwingen: string[] = [];
  for (const [nr, rij] of rijen) {
    if (nr <= 4 || !waarde(rij, 'code')) continue;
    const code = String(waarde(rij, 'code')).padStart(4, '0');
    const naam = String(waarde(rij, 'naam'));
    const getal = (k: Kolom) => bedrag(waarde(rij, k), `${naam} ${k}`);
    const g = {
      code,
      naam,
      provincie: PROVINCIES[Number(waarde(rij, 'provincie')) - 1] ?? '?',
      inwoners: inwoners.get(code) ?? null,
      ozb: getal('ozb'),
      afval_een: getal('afval_een'),
      afval_meer: getal('afval_meer'),
      riool_een: getal('riool_een'),
      riool_meer: getal('riool_meer'),
      korting_een: getal('korting_een'),
      korting_meer: getal('korting_meer'),
      koop_een: getal('koop_een'),
      koop_meer: getal('koop_meer'),
    };
    for (const p of ['een', 'meer'] as const) {
      const som = g.ozb + g[`afval_${p}`] + g[`riool_${p}`] - g[`korting_${p}`];
      if (Math.abs(som - g[`koop_${p}`]) > 0.05)
        waarschuwingen.push(`${naam}: woonlasten ${p} ${g[`koop_${p}`]} ≠ som ${som.toFixed(2)}`);
    }
    if (g.inwoners === null) waarschuwingen.push(`${naam} (${code}): geen inwonertal bij CBS`);
    if (g.provincie === '?') waarschuwingen.push(`${naam}: onbekende provinciecode`);
    gemeenten.push(g);
  }
  gemeenten.sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));

  const pad = resolve(DATA_MAP, BESTAND);
  const oud = existsSync(pad) ? (JSON.parse(readFileSync(pad, 'utf8')) as Partial<Woonlasten>) : {};
  const vandaag = new Date().toISOString().slice(0, 10);
  const uit: Woonlasten = woonlastenSchema.parse({
    jaar,
    toelichting:
      oud.toelichting ??
      `Woonlasten per gemeente in ${jaar} voor de vergelijking in "Wat betekent het voor mij?". Gemaakt met npm run woonlasten:ophalen; het deel "handmatig" is overgenomen van de site van COELO.`,
    definitie:
      oud.definitie ??
      'Woonlasten volgens COELO: gemiddeld betaalde OZB (bij de gemiddelde WOZ-waarde van een koopwoning in de gemeente) + afvalstoffenheffing + rioolheffing − heffingskorting. Een meerpersoonshuishouden bestaat uit drie personen.',
    bronnen: [
      {
        id: 'coelo',
        titel: `COELO, Atlas van de lokale lasten ${jaar}: databestand Gemeentelijke belastingen ${jaar}`,
        url: COELO_XLSX,
        pagina: COELO_BIJLAGEN,
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
      ...(oud.bronnen ?? []).filter((b) => b.id !== 'coelo' && b.id !== 'cbs'),
    ],
    handmatig: oud.handmatig ?? null,
    gemeenten,
  });
  writeFileSync(pad, JSON.stringify(uit, null, 1));
  console.log(`${BESTAND} geschreven: ${gemeenten.length} gemeenten.`);
  if (!uit.handmatig)
    console.log(
      'Let op: "handmatig" (landelijke gemiddelden en huurders) is leeg. Neem die over van de site van COELO.',
    );
  if (waarschuwingen.length) {
    console.log(`\n${waarschuwingen.length} waarschuwing(en):`);
    for (const w of waarschuwingen) console.log(`- ${w}`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

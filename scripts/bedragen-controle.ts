/**
 * npm run bedragen:controle
 * De laatste controle van alle bedragen voor de lancering (fase 8). Schrijft
 * docs/CONTROLE-BEDRAGEN.md: elk bedrag uit de game met zijn bron en status, en een paar
 * onderlinge controles. Iemand van de fractie kan zo elk getal naast het boekwerk leggen.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bereken, berekenCampagne, GEEN_KEUZES, metExtraKaarten } from '../src/engine';
import { alsTekst, controleer, heeftFouten } from '../src/engine/controle';
import { alsKaarten, totalen } from '../src/engine/tegenbegroting';
import { laadDataNode, leesBuurtcodes, leesMappings } from './lees';

const data = laadDataNode();
const b = data.begroting;
const k = data.kengetallen;
const jaar = b.begrotingsjaar;
const mln = (x: number, d = 3) =>
  x
    .toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d })
    .replace('-', '−');
const duizendNaarMln = (x: number) => mln(x / 1000);
const regels: string[] = [];
const kop = (t: string) => regels.push('', `## ${t}`, '');
const tabel = (koppen: string[], rijen: (string | number)[][]) => {
  regels.push(`| ${koppen.join(' | ')} |`, `| ${koppen.map(() => '---').join(' | ')} |`);
  for (const r of rijen)
    regels.push(`| ${r.map((c) => String(c).replace(/\|/g, '/')).join(' | ')} |`);
};

// ---------------------------------------------------------------------------------------------
// 1. Automatische controles
// ---------------------------------------------------------------------------------------------
const bevindingen = controleer({
  data,
  buurtcodes: leesBuurtcodes(),
  mappings: leesMappings(jaar),
});
const fouten = bevindingen.filter((x) => x.niveau === 'fout').length;
const waarschuwingen = bevindingen.filter((x) => x.niveau === 'waarschuwing').length;

const controles: [string, boolean, string][] = [];
const vergelijk = (naam: string, a: number, z: number, marge = 0.05) =>
  controles.push([naam, Math.abs(a - z) <= marge, `${mln(a)} tegenover ${mln(z)} mln`]);
const kengetal = (naam: string) => Number((k as Record<string, unknown>)[naam] ?? NaN) / 1000;
const belasting = (id: string) => b.belastingen.find((x) => x.id === id)?.opbrengst_mln ?? NaN;
vergelijk('OZB (schuif t1) en kengetal OZB', belasting('t1'), kengetal('ozb_x1000'));
vergelijk(
  'Toeristenbelasting (t2) en kengetal logiesbelasting',
  belasting('t2'),
  kengetal('logiesbelasting_x1000'),
);
vergelijk('Reclamebelasting (t3) en kengetal', belasting('t3'), kengetal('reclamebelasting_x1000'));
vergelijk(
  'Precariobelasting (t4) en kengetal',
  belasting('t4'),
  kengetal('precariobelasting_x1000'),
);
vergelijk(
  'Parkeertarieven (t5) en kengetal parkeerbelasting',
  belasting('t5'),
  kengetal('parkeerbelasting_x1000'),
);

const leeg = bereken(data, GEEN_KEUZES);
controles.push([
  'Zonder keuzes is het saldo in elk jaar € 0',
  data.jaren.every(
    (j) =>
      Math.abs(leeg.perJaar[j]?.structureel ?? 1) < 1 &&
      Math.abs(leeg.perJaar[j]?.incidenteel ?? 1) < 1,
  ),
  'het saldo telt ten opzichte van de begroting',
]);
const vier = berekenCampagne(
  data,
  data.jaren.map((j) => ({ vanaf: j, keuzes: { ...GEEN_KEUZES, onderdelen: { h1: -10 } } })),
);
const direct = bereken(data, { ...GEEN_KEUZES, onderdelen: { h1: -10 } });
controles.push([
  'Campagne met dezelfde keuzes = gewone begroting',
  data.jaren.every(
    (j) =>
      Math.abs((vier.perJaar[j]?.structureel ?? 0) - (direct.perJaar[j]?.structureel ?? 0)) < 1,
  ),
  'overhead −10% in vier rondes',
]);
for (const { tegenbegroting: tb } of data.vergelijking) {
  const t = totalen(tb);
  const kaarten = alsKaarten(tb);
  const r = bereken(metExtraKaarten(data, kaarten), {
    ...GEEN_KEUZES,
    kaarten: kaarten.map((x) => x.id),
  });
  const s = (r.perJaar[jaar]?.structureel ?? 0) / 1e6;
  controles.push([
    `${tb.titel}: saldo structureel in de game = tabel van de fractie`,
    Math.abs(s - (t.ombuigingenS - t.uitgavenS)) < 0.001,
    `${mln(s)} tegenover ${mln(t.ombuigingenS - t.uitgavenS)} mln`,
  ]);
}

// ---------------------------------------------------------------------------------------------
// Rapport
// ---------------------------------------------------------------------------------------------
regels.push(
  `# Controle van alle bedragen (begroting ${jaar})`,
  '',
  `Gemaakt met \`npm run bedragen:controle\` op ${new Date().toISOString().slice(0, 10)}. Dit bestand wordt`,
  'elke keer opnieuw gemaakt; zet vinkjes en opmerkingen dus in een kopie, of in BEVINDINGEN.md.',
  '',
  "Bedragen in miljoenen euro's, tenzij anders vermeld. Bron: " + `[${b.document}](${b.bron_url}).`,
);

kop('1. Automatische controles');
regels.push(
  `- \`data:check\`: **${fouten} fouten, ${waarschuwingen} waarschuwingen**${heeftFouten(bevindingen) ? ' ✗' : ' ✓'}`,
  '',
);
tabel(
  ['Controle', 'Uitkomst', 'Toelichting'],
  controles.map(([n, ok, t]) => [n, ok ? '✓ klopt' : '✗ **controleren**', t]),
);
const wrsch = bevindingen.filter((x) => x.niveau !== 'info');
if (wrsch.length) regels.push('', '```', alsTekst(wrsch).trim(), '```');

kop('2. Totalen en kengetallen');
tabel(
  ['Wat', ...data.jaren.map(String), 'Bron'],
  [
    [
      'Lasten (excl. reserves)',
      ...data.jaren.map((j) =>
        duizendNaarMln(b.totalen.lasten_excl_reserves_x1000[String(j)] ?? 0),
      ),
      b.totalen.bron,
    ],
    [
      'Baten (excl. reserves)',
      ...data.jaren.map((j) => duizendNaarMln(b.totalen.baten_excl_reserves_x1000[String(j)] ?? 0)),
      b.totalen.bron,
    ],
  ],
);
regels.push('');
tabel(
  ['Kengetal', 'Waarde', 'Bron'],
  Object.entries(k)
    .filter(([n]) => n !== 'bron')
    .map(([n, w]) => [n, typeof w === 'number' ? w.toLocaleString('nl-NL') : String(w), k.bron]),
);

kop("3. Deelprogramma's");
tabel(
  ['Code', 'Naam', `Lasten ${jaar}`, `Baten ${jaar}`, 'Som van de posten (lasten)', 'Bron'],
  b.deelprogrammas.map((d) => {
    const som = b.onderdelen
      .filter((o) => o.deelprogramma === d.code)
      .reduce((s, o) => s + o.lasten_mln, 0);
    return [
      d.code,
      d.naam,
      duizendNaarMln(d.lasten_x1000[String(jaar)] ?? 0),
      duizendNaarMln(d.baten_x1000[String(jaar)] ?? 0),
      som ? mln(som) : '–',
      d.bron,
    ];
  }),
);

kop('4. Posten (schuiven)');
regels.push(
  'Lasten en meebewegende baten per post. ✓ = gecontroleerd tegen het boekwerk (in te vullen).',
  '',
);
tabel(
  ['✓', 'Id', 'Post', 'Dp.', 'Lasten', 'Baten', 'Grenzen', 'Bron'],
  b.onderdelen.map((o) => [
    '☐',
    o.id,
    o.naam,
    o.deelprogramma,
    mln(o.lasten_mln),
    o.gekoppelde_baten_mln ? mln(o.gekoppelde_baten_mln) : '–',
    o.vergrendeld ? '🔒 vast' : `${o.min_pct}% tot +${o.max_pct}%`,
    o.bron ?? '**geen bron**',
  ]),
);

kop('5. Belastingen');
tabel(
  ['✓', 'Id', 'Belasting', 'Opbrengst', 'Grenzen'],
  b.belastingen.map((x) => [
    '☐',
    x.id,
    x.naam,
    mln(x.opbrengst_mln),
    `${x.min_pct}% tot +${x.max_pct}%`,
  ]),
);

kop('6. Actiekaarten');
tabel(
  ['✓', 'Id', 'Kaart', 'Bedrag', 'S/I', 'Bron'],
  b.actiekaarten.map((x) => [
    '☐',
    x.id,
    x.naam,
    `${x.soort === 'opbrengst' ? '+' : '−'} ${mln(Math.abs(x.bedrag_mln))}`,
    x.structureel_of_incidenteel,
    x.bron ?? '**geen bron**',
  ]),
);

kop('7. Aannames in de kettingeffecten');
regels.push(
  'Parameters met status "aanname" of "te onderzoeken". Deze bedragen staan in de game met ⚠︎.',
  '',
);
tabel(
  ['Verband', 'Parameter', 'Waarde', 'Status', 'Toelichting'],
  data.dwarsverbanden.dwarsverbanden.flatMap((v) =>
    Object.entries(v.parameters)
      .filter(([, p]) => p.status !== 'feit')
      .map(([n, p]) => [v.id, n, JSON.stringify(p.waarde), p.status, p.toelichting ?? '']),
  ),
);

kop('8. Gebeurteniskaarten (campagne)');
regels.push('Percentage van een bedrag uit de begroting. Het percentage is een scenario.', '');
tabel(
  ['Kaart', 'S/I', 'Basis', 'Percentage (laag / midden / hoog)', 'Bedrag (midden)'],
  data.gebeurtenissen.flatMap((g) =>
    g.effecten.map((e) => {
      const basis =
        e.basis.soort === 'lasten'
          ? e.basis.posten.reduce(
              (s, id) => s + (data.index.onderdelen.get(id)?.lasten_mln ?? 0),
              0,
            )
          : e.basis.soort === 'belasting'
            ? (data.index.belastingen.get(e.basis.id)?.opbrengst_mln ?? 0)
            : k.gemeentefonds_x1000 / 1000;
      const naam =
        e.basis.soort === 'lasten'
          ? `lasten ${e.basis.posten.join(', ')}`
          : e.basis.soort === 'belasting'
            ? `opbrengst ${e.basis.id}`
            : 'gemeentefonds';
      const pct = (x: number) => `${(x * 100).toLocaleString('nl-NL')}%`;
      return [
        g.naam,
        g.soort,
        `${naam} (${mln(basis)})`,
        `${pct(e.pct.laag)} / ${pct(e.pct.waarde)} / ${pct(e.pct.hoog)}`,
        `${e.richting === 'kosten' ? '−' : '+'} ${mln(basis * e.pct.waarde)}`,
      ];
    }),
  ),
);

if (data.tarieven) {
  const t = data.tarieven;
  kop(`9. Tarieven (${t.status})`);
  regels.push(`Bron: [${t.bron}](${t.bron_url}).`, '');
  tabel(
    ['✓', 'Tarief', 'Bedrag'],
    [
      [
        '☐',
        'OZB woningen, eigenaar',
        `${t.ozb_woning_eigenaar_pct.toLocaleString('nl-NL')}% van de WOZ-waarde`,
      ],
      [
        '☐',
        'Afvalstoffenheffing, 1 persoon',
        `€ ${t.afvalstoffenheffing.een_persoon.toLocaleString('nl-NL')}`,
      ],
      [
        '☐',
        'Afvalstoffenheffing, 2 personen',
        `€ ${t.afvalstoffenheffing.twee_personen.toLocaleString('nl-NL')}`,
      ],
      [
        '☐',
        'Afvalstoffenheffing, 3 of meer',
        `€ ${t.afvalstoffenheffing.drie_of_meer.toLocaleString('nl-NL')}`,
      ],
      ['☐', 'Rioolheffing, eigenaar', `€ ${t.rioolheffing_eigenaar.toLocaleString('nl-NL')}`],
      ...t.parkeervergunning_bewoners.map((z) => [
        '☐',
        `Bewonersvergunning ${z.kort}`,
        `€ ${z.eerste.toLocaleString('nl-NL')}${z.tweede !== null ? `, tweede € ${z.tweede.toLocaleString('nl-NL')}` : ''}`,
      ]),
    ],
  );
}

const pad = resolve(import.meta.dirname, '../docs/CONTROLE-BEDRAGEN.md');
writeFileSync(pad, regels.join('\n') + '\n');
const mis = controles.filter(([, ok]) => !ok);
console.log(
  `docs/CONTROLE-BEDRAGEN.md geschreven. ${controles.length - mis.length} van ${controles.length} controles kloppen.`,
);
for (const [n, , t] of mis) console.log(`✗ ${n}: ${t}`);
process.exit(heeftFouten(bevindingen) ? 1 : 0);

/**
 * Word-export (.docx) van de tegenbegroting, in de huisstijl en opbouw van de tegenbegroting van VVD
 * Groningen ('Het kan en moet anders'): voorblad met de pijlen, inhoudsopgave, tussenbladen met een
 * foto, Besparingen en Investeringen met kopjes en ▶-punten, en het financieel overzicht met twee
 * tabellen (x1 miljoen). Wordt in de browser pas geladen als de speler op de knop drukt; werkt ook in
 * Node zonder beelden (voor de tests).
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { mlnTabel, type TabelRij, type Tegenbegroting, type ThemaGroep } from './document';

const BLAUW = '0A2CCA';
const ORANJE = 'FF6400';
const ORANJE_TEKST = 'C44D00';
const INKT = '242424';
const LETTER = 'Lucida Sans Unicode';
const KOPLETTER = 'Trebuchet MS';

/** De beelden van de huisstijl (public/huisstijl), als ze er zijn. */
export type Beelden = {
  pijltje: Uint8Array;
  pijl: Uint8Array;
  voorblad: Uint8Array[];
  tussenbladen: { besparingen: Uint8Array; investeringen: Uint8Array; financieel: Uint8Array };
};

/** Bestandsnamen in public/huisstijl, voor het ophalen in de browser. */
export const BEELD_BESTANDEN = {
  pijltje: 'pijltje.png',
  pijl: 'pijl.png',
  voorblad: ['voorblad-straat.png', 'voorblad-sportcentrum.png', 'voorblad-martinitoren.png'],
  tussenbladen: {
    besparingen: 'tussenblad-besparingen.jpg',
    investeringen: 'tussenblad-investeringen.jpg',
    financieel: 'tussenblad-financieel.jpg',
  },
} as const;

const run = (
  tekst: string,
  o: { vet?: boolean; kleur?: string; grootte?: number; letter?: string; cursief?: boolean } = {},
) =>
  new TextRun({
    text: tekst,
    bold: o.vet,
    italics: o.cursief,
    color: o.kleur ?? INKT,
    size: o.grootte ?? 21,
    font: o.letter ?? LETTER,
  });

const p = (tekst: string, o: { klein?: boolean; cursief?: boolean; vet?: boolean } = {}) =>
  new Paragraph({
    spacing: { after: 160, line: 300 },
    children: [
      run(tekst, {
        grootte: o.klein ? 17 : 21,
        cursief: o.cursief,
        vet: o.vet,
        kleur: o.klein ? '4B5070' : INKT,
      }),
    ],
  });

const paginaEinde = () => new Paragraph({ children: [new PageBreak()] });

/** Kop 1: het oranje-blauwe pijltje en de titel in VVD-blauw, groot. */
const kop1 = (tekst: string, b?: Beelden) =>
  new Paragraph({
    spacing: { before: 240, after: 240 },
    keepNext: true,
    children: [
      ...(b
        ? [
            new ImageRun({
              type: 'png',
              data: b.pijltje,
              transformation: { width: 26, height: 30 },
              altText: { name: 'pijltje', description: '', title: '' },
            }),
            run('  ', { grootte: 60 }),
          ]
        : []),
      run(tekst, { vet: true, kleur: BLAUW, grootte: 60, letter: KOPLETTER }),
    ],
  });

/** Kop 2: oranje. */
const kop2 = (tekst: string) =>
  new Paragraph({
    spacing: { before: 280, after: 120 },
    keepNext: true,
    children: [run(tekst, { vet: true, kleur: ORANJE_TEKST, grootte: 28, letter: KOPLETTER })],
  });

/** Een maatregel: ▶ Titel. Toelichting */
const punt = (titel: string, toelichting: string) =>
  new Paragraph({
    spacing: { after: 140, line: 300 },
    indent: { left: 360, hanging: 360 },
    children: [
      run('▶\t', { kleur: ORANJE }),
      run(titel, { vet: true }),
      run(toelichting ? ` ${toelichting}` : ''),
    ],
  });

function maatregelen(groepen: ThemaGroep[], leeg: string): Paragraph[] {
  if (!groepen.length) return [p(leeg)];
  return groepen.flatMap((g) => [
    kop2(g.thema),
    p(g.intro),
    ...g.regels.map((r) =>
      punt(
        `${r.zekerheid !== 'feit' ? '⚠︎ ' : ''}${r.naam}${r.wijziging ? ` (${r.wijziging})` : ''}.`,
        r.toelichting,
      ),
    ),
  ]);
}

const rand = { style: BorderStyle.SINGLE, size: 4, color: 'C9CEE6' };
const geen = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const randen = { top: geen, bottom: rand, left: geen, right: geen };

function cel(
  tekst: string,
  o: {
    vet?: boolean;
    uitlijning?: 'links' | 'rechts' | 'midden';
    kop?: boolean;
    breedte?: number;
  } = {},
) {
  return new TableCell({
    borders: randen,
    ...(o.breedte ? { width: { size: o.breedte, type: WidthType.PERCENTAGE } } : {}),
    ...(o.kop ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: BLAUW } } : {}),
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment:
          o.uitlijning === 'rechts'
            ? AlignmentType.RIGHT
            : o.uitlijning === 'midden'
              ? AlignmentType.CENTER
              : AlignmentType.LEFT,
        children: [
          run(tekst, { vet: o.vet || o.kop, kleur: o.kop ? 'FFFFFF' : INKT, grootte: 19 }),
        ],
      }),
    ],
  });
}

/** De tabel van de fractie: Omschrijving | jaar | Structureel/incidenteel, met een totaal. */
function geldTabel(rijen: TabelRij[], jaar: number, totaal: number): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cel('Omschrijving', { kop: true, breedte: 64 }),
          cel(String(jaar), { kop: true, uitlijning: 'rechts', breedte: 14 }),
          cel('Structureel/incidenteel', { kop: true, uitlijning: 'midden', breedte: 22 }),
        ],
      }),
      ...rijen.map(
        (r) =>
          new TableRow({
            cantSplit: true,
            children: [
              cel(`${r.aanname ? '⚠︎ ' : ''}${r.omschrijving}`),
              cel(mlnTabel(r.bedrag), { uitlijning: 'rechts' }),
              cel(r.soort, { uitlijning: 'midden' }),
            ],
          }),
      ),
      new TableRow({
        children: [
          cel('Totaal', { vet: true }),
          cel(mlnTabel(totaal), { vet: true, uitlijning: 'rechts' }),
          cel(''),
        ],
      }),
    ],
  });
}

/** Een tussenblad: een foto (staand bijgesneden) en de titel in een oranje balk. */
function tussenblad(titel: string, foto: Uint8Array | undefined): Paragraph[] {
  return [
    ...(foto
      ? [
          new Paragraph({
            children: [
              new ImageRun({
                type: 'jpg',
                data: foto,
                transformation: { width: 600, height: 760 },
                crop: { left: 22, right: 22, top: 0, bottom: 0 },
                altText: { name: titel, description: '', title: '' },
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      spacing: { before: 120 },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: ORANJE },
      children: [run(` ${titel}`, { vet: true, kleur: 'FFFFFF', grootte: 64, letter: KOPLETTER })],
    }),
    paginaEinde(),
  ];
}

export function maakWord(tb: Tegenbegroting, b?: Beelden): Document {
  const d = tb.teksten;
  const f = tb.financieel;
  const t = f.totalen;
  const kinderen = [
    // 1. Voorblad
    new Paragraph({
      spacing: { before: 600, after: 200 },
      children: [run(tb.titel, { vet: true, kleur: BLAUW, grootte: 72, letter: KOPLETTER })],
    }),
    new Paragraph({
      spacing: { after: 480 },
      children: [run(d.ondertitel, { vet: true, kleur: ORANJE_TEKST, grootte: 28 })],
    }),
    ...(b
      ? [
          new Paragraph({
            spacing: { after: 720 },
            children: [b.pijl, ...b.voorblad].map(
              (data, i) =>
                new ImageRun({
                  type: 'png',
                  data,
                  transformation: { width: i === 0 ? 132 : 150, height: i === 0 ? 150 : 177 },
                  altText: { name: `voorblad ${i + 1}`, description: '', title: '' },
                }),
            ),
          }),
        ]
      : []),
    new Paragraph({
      spacing: { before: 1200 },
      border: { top: { style: BorderStyle.SINGLE, size: 36, color: ORANJE, space: 12 } },
      children: [
        run(`${d.soort}${tb.naam ? ` ${tb.naam}` : ''}`, {
          vet: true,
          kleur: BLAUW,
          grootte: 36,
          letter: KOPLETTER,
        }),
      ],
    }),
    new Paragraph({ children: [run(tb.ondertitel, { vet: true, kleur: ORANJE_TEKST })] }),
    paginaEinde(),
    // 2. Inhoudsopgave en wie het opstelde
    kop1('Inhoudsopgave', b),
    ...[d.besparingen.titel, d.investeringen.titel, d.financieel.titel].map(
      (x, i) =>
        new Paragraph({
          spacing: { after: 120 },
          children: [run(`${i + 1}  `, { vet: true, kleur: ORANJE_TEKST }), run(x, { vet: true })],
        }),
    ),
    kop1(d.opgesteld_door, b),
    ...(tb.naam ? [p(tb.naam, { vet: true })] : []),
    p(d.makers),
    paginaEinde(),
    // 3. Besparingen
    ...tussenblad(d.besparingen.titel, b?.tussenbladen.besparingen),
    kop1(d.besparingen.titel, b),
    p(d.besparingen.intro),
    ...maatregelen(tb.besparingen, 'Geen besparingen.'),
    paginaEinde(),
    // 4. Investeringen
    ...tussenblad(d.investeringen.titel, b?.tussenbladen.investeringen),
    kop1(d.investeringen.titel, b),
    p(d.investeringen.intro),
    ...maatregelen(tb.investeringen, 'Geen investeringen.'),
    ...(tb.ideeen ? [kop2('Mijn eigen ideeën'), ...tb.ideeen.split(/\n+/).map((x) => p(x))] : []),
    paginaEinde(),
    // 5. Financieel overzicht
    ...tussenblad(d.financieel.titel, b?.tussenbladen.financieel),
    kop1(d.financieel.titel, b),
    p(d.financieel.intro),
    ...tb.inleiding.map((x) => p(x)),
    kop2('Ombuigingen en opbrengsten (x1 miljoen)'),
    geldTabel(f.ombuigingen, f.jaar, t.ombuigingenS + t.ombuigingenI),
    kop2('Uitgaven (x1 miljoen)'),
    geldTabel(f.uitgaven, f.jaar, t.uitgavenS + t.uitgavenI),
    kop2('Saldo (x1 miljoen)'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cel('Structureel (elk jaar)', { vet: true, breedte: 78 }),
            cel(mlnTabel(t.saldoS), { vet: true, uitlijning: 'rechts', breedte: 22 }),
          ],
        }),
        new TableRow({
          children: [
            cel('Incidenteel (eenmalig)', { vet: true }),
            cel(mlnTabel(t.saldoI), { vet: true, uitlijning: 'rechts' }),
          ],
        }),
      ],
    }),
    kop2('Meerjarig (x1 miljoen)'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            cel('Saldo', { kop: true, breedte: 32 }),
            ...f.meerjarig.map((m) => cel(String(m.jaar), { kop: true, uitlijning: 'rechts' })),
          ],
        }),
        new TableRow({
          children: [
            cel('Structureel'),
            ...f.meerjarig.map((m) => cel(mlnTabel(m.structureel), { uitlijning: 'rechts' })),
          ],
        }),
        new TableRow({
          children: [
            cel('Incidenteel'),
            ...f.meerjarig.map((m) => cel(mlnTabel(m.incidenteel), { uitlijning: 'rechts' })),
          ],
        }),
      ],
    }),
    ...(tb.kettingeffecten.length
      ? [
          kop2('Kettingeffecten'),
          p('⚠︎ Deze bedragen zijn aannames of spelregels, geen getallen uit de begroting.', {
            klein: true,
          }),
          ...tb.kettingeffecten.map((r) => punt(`⚠︎ ${r.naam}.`, r.toelichting)),
        ]
      : []),
    kop2('Bronnen en uitleg'),
    p(tb.aanname, { klein: true }),
    ...tb.bronnen.map((x) => p(x, { klein: true })),
  ];
  return new Document({
    creator: 'Begrotingsgame van VVD Groningen',
    title: `${d.soort}: ${tb.titel}`,
    description: tb.ondertitel,
    styles: { default: { document: { run: { font: LETTER, size: 21, color: INKT } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        children: kinderen,
      },
    ],
  });
}

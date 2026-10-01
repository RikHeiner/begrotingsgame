/**
 * Word-export (.docx) van de tegenbegroting, met echte koppen en tabellen: oranje koppen en een
 * blauwe titel, zoals de tegenbegroting van de fractie. Wordt in de browser pas geladen als de speler
 * op de knop drukt; werkt ook in Node (voor de tests).
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
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

const BLAUW = '1233C4';
const ORANJE = 'FF6A00';
const INKT = '15193A';
const LETTER = 'Calibri';

const p = (tekst: string, opties: { vet?: boolean; klein?: boolean; cursief?: boolean } = {}) =>
  new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: tekst,
        bold: opties.vet,
        italics: opties.cursief,
        size: opties.klein ? 18 : 22,
        font: LETTER,
        color: INKT,
      }),
    ],
  });

const kop = (tekst: string, niveau: 1 | 2 = 1) =>
  new Paragraph({
    heading: niveau === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    spacing: { before: niveau === 1 ? 360 : 240, after: 120 },
    children: [
      new TextRun({
        text: tekst,
        bold: true,
        color: niveau === 1 ? ORANJE : BLAUW,
        size: niveau === 1 ? 32 : 26,
        font: LETTER,
      }),
    ],
  });

const rand = { style: BorderStyle.SINGLE, size: 4, color: 'B8BCD8' };
const randen = { top: rand, bottom: rand, left: rand, right: rand };

function cel(
  tekst: string,
  opties: { vet?: boolean; rechts?: boolean; kop?: boolean; breedte?: number } = {},
) {
  return new TableCell({
    borders: randen,
    ...(opties.breedte ? { width: { size: opties.breedte, type: WidthType.PERCENTAGE } } : {}),
    ...(opties.kop ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: BLAUW } } : {}),
    children: [
      new Paragraph({
        alignment: opties.rechts ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [
          new TextRun({
            text: tekst,
            bold: opties.vet || opties.kop,
            color: opties.kop ? 'FFFFFF' : INKT,
            size: 20,
            font: LETTER,
          }),
        ],
      }),
    ],
  });
}

function geldTabel(
  titel: string,
  rijen: TabelRij[],
  jaar: number,
  totaalS: number,
  totaalI: number,
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cel(titel, { kop: true, breedte: 70 }),
          cel(String(jaar), { kop: true, rechts: true, breedte: 18 }),
          cel('S/I', { kop: true, breedte: 12 }),
        ],
      }),
      ...rijen.map(
        (r) =>
          new TableRow({
            children: [
              cel(`${r.aanname ? '⚠︎ ' : ''}${r.omschrijving}`),
              cel(mlnTabel(r.bedrag), { rechts: true }),
              cel(r.soort),
            ],
          }),
      ),
      new TableRow({
        children: [
          cel('Totaal structureel', { vet: true }),
          cel(mlnTabel(totaalS), { vet: true, rechts: true }),
          cel('S', { vet: true }),
        ],
      }),
      new TableRow({
        children: [
          cel('Totaal incidenteel', { vet: true }),
          cel(mlnTabel(totaalI), { vet: true, rechts: true }),
          cel('I', { vet: true }),
        ],
      }),
      new TableRow({
        children: [
          cel('Totaal', { vet: true }),
          cel(mlnTabel(totaalS + totaalI), { vet: true, rechts: true }),
          cel(''),
        ],
      }),
    ],
  });
}

function maatregelen(groepen: ThemaGroep[], leeg: string): Paragraph[] {
  if (!groepen.length) return [p(leeg)];
  return groepen.flatMap((g) => [
    kop(g.thema, 2),
    ...g.regels.map(
      (r) =>
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: '▶ ', color: ORANJE, font: LETTER, size: 22 }),
            new TextRun({
              text: `${r.naam}${r.wijziging ? ` (${r.wijziging})` : ''}.`,
              bold: true,
              font: LETTER,
              size: 22,
              color: INKT,
            }),
            new TextRun({
              text: r.toelichting ? ` ${r.toelichting}` : '',
              font: LETTER,
              size: 22,
              color: INKT,
            }),
          ],
        }),
    ),
  ]);
}

export function maakWord(tb: Tegenbegroting): Document {
  const f = tb.financieel;
  const t = f.totalen;
  const kinderen = [
    // 1. Voorblad
    new Paragraph({
      spacing: { before: 2400, after: 200 },
      children: [
        new TextRun({ text: 'Tegenbegroting', bold: true, size: 64, color: ORANJE, font: LETTER }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: tb.titel, bold: true, size: 48, color: BLAUW, font: LETTER })],
    }),
    p(tb.ondertitel),
    ...(tb.naam ? [p(tb.naam, { vet: true })] : []),
    new Paragraph({ children: [new PageBreak()] }),
    // 2. Inleiding
    kop('Inleiding'),
    ...tb.inleiding.map((x) => p(x)),
    // 3 en 4. Maatregelen
    kop('Besparingen en opbrengsten'),
    ...maatregelen(tb.besparingen, 'Geen besparingen.'),
    kop('Investeringen en lastenverlichting'),
    ...maatregelen(tb.investeringen, 'Geen investeringen.'),
    // 5. Kettingeffecten
    kop('Kettingeffecten'),
    ...(tb.kettingeffecten.length
      ? [
          p('⚠︎ Deze bedragen zijn aannames of spelregels, geen getallen uit de begroting.', {
            cursief: true,
          }),
          ...tb.kettingeffecten.map(
            (r) =>
              new Paragraph({
                spacing: { after: 100 },
                children: [
                  new TextRun({ text: '▶ ', color: ORANJE, font: LETTER, size: 22 }),
                  new TextRun({
                    text: `⚠︎ ${r.naam}.`,
                    bold: true,
                    font: LETTER,
                    size: 22,
                    color: INKT,
                  }),
                  new TextRun({ text: ` ${r.toelichting}`, font: LETTER, size: 22, color: INKT }),
                ],
              }),
          ),
        ]
      : [p('Geen kettingeffecten.')]),
    // 6. Eigen ideeën
    kop('Mijn eigen ideeën'),
    ...(tb.ideeen ? tb.ideeen.split(/\n+/).map((x) => p(x)) : [p('Geen eigen ideeën ingevuld.')]),
    // 7. Gevolgen
    kop('Wat merken de inwoners?'),
    p(tb.gevolgen.uitleg, { klein: true }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            cel('Inwoner', { kop: true, breedte: 25 }),
            cel('Wat merkt hij of zij?', { kop: true, breedte: 75 }),
          ],
        }),
        ...tb.gevolgen.inwoners.map(
          (x) =>
            new TableRow({
              children: [cel(x.naam), cel(x.zin)],
            }),
        ),
      ],
    }),
    // 8. Financieel overzicht
    kop('Financieel overzicht'),
    geldTabel(
      'Ombuigingen en opbrengsten (x € 1 miljoen)',
      f.ombuigingen,
      f.jaar,
      t.ombuigingenS,
      t.ombuigingenI,
    ),
    p(''),
    geldTabel('Uitgaven (x € 1 miljoen)', f.uitgaven, f.jaar, t.uitgavenS, t.uitgavenI),
    p(''),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cel('Saldo structureel', { vet: true, breedte: 70 }),
            cel(mlnTabel(t.saldoS), { vet: true, rechts: true, breedte: 30 }),
          ],
        }),
        new TableRow({
          children: [
            cel('Saldo eenmalig', { vet: true }),
            cel(mlnTabel(t.saldoI), { vet: true, rechts: true }),
          ],
        }),
      ],
    }),
    kop('Meerjarig', 2),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            cel('Saldo (x € 1 miljoen)', { kop: true, breedte: 40 }),
            ...f.meerjarig.map((m) => cel(String(m.jaar), { kop: true, rechts: true })),
          ],
        }),
        new TableRow({
          children: [
            cel('Structureel'),
            ...f.meerjarig.map((m) => cel(mlnTabel(m.structureel), { rechts: true })),
          ],
        }),
        new TableRow({
          children: [
            cel('Eenmalig'),
            ...f.meerjarig.map((m) => cel(mlnTabel(m.incidenteel), { rechts: true })),
          ],
        }),
      ],
    }),
    // 9. Bronnen
    kop('Bronnen en uitleg'),
    p(tb.aanname),
    ...tb.bronnen.map((b) => p(b, { klein: true })),
  ];
  return new Document({
    creator: 'Begrotingsgame gemeente Groningen',
    title: `Tegenbegroting: ${tb.titel}`,
    description: tb.ondertitel,
    styles: { default: { document: { run: { font: LETTER, size: 22, color: INKT } } } },
    sections: [{ children: kinderen }],
  });
}

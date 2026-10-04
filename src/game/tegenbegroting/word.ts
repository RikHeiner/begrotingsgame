/**
 * Word-export (.docx) van de tegenbegroting, precies in de huisstijl en opbouw van de tegenbegroting
 * van VVD Groningen 2026 ('Het kan en moet anders'). De opmaakprofielen (Kop 1, Kop 2, Hoofdtekst,
 * Inhopg 1 en 2) komen uit dat document zelf (tb-stijlen.xml), net als de paginamarges.
 *
 * Opbouw: voorblad met de pijl en de foto's; inhoudsopgave met paginanummers en 'Opgesteld door';
 * tussenbladen met een foto over de hele pagina en de titel groot in wit; Besparingen en
 * Investeringen met oranje kopjes, een vette inleiding en ▶-punten; het financieel overzicht met de
 * oranje tabellen (x1 miljoen). Paginanummers rechtsonder, niet op het voorblad en de tussenbladen.
 *
 * Wordt in de browser pas geladen als de speler op de knop drukt; werkt ook in Node zonder beelden.
 */
import {
  AlignmentType,
  BorderStyle,
  Bookmark,
  Document,
  Footer,
  HorizontalPositionRelativeFrom,
  ImageRun,
  LeaderType,
  PageNumber,
  PageReference,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  TextWrappingType,
  VerticalPositionRelativeFrom,
  WidthType,
  type ISectionOptions,
} from 'docx';
import { mlnTabel, type TabelRij, type Tegenbegroting, type ThemaGroep } from './document';
import { TB_STIJLEN as stijlen } from './tbStijlen';

const BLAUW = '0A2CCA';
const ORANJE = 'FF6400';
const KOPLETTER = 'Trebuchet MS';

/** A4 en de marges van de tegenbegroting 2026 (twips). */
const PAGINA = { width: 11910, height: 16840 };
const MARGE = { top: 1120, right: 940, bottom: 600, left: 680, footer: 414, header: 0 };
/** A4 in beeldpunten (96 per inch), voor beelden over de hele pagina. */
const A4_PX = { breedte: 794, hoogte: 1123 };
/** Een centimeter in EMU (de eenheid van Word voor plaatsen). */
const CM = 360000;

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
    besparingen: 'tussenblad-besparingen-staand.jpg',
    investeringen: 'tussenblad-investeringen-staand.jpg',
    financieel: 'tussenblad-financieel-staand.jpg',
  },
} as const;

type Kop = { tekst: string; niveau: 1 | 2; id: string };

/** Houdt de koppen bij, voor de inhoudsopgave met paginanummers. */
class Inhoud {
  koppen: Kop[] = [];
  private n = 0;
  nieuw(tekst: string, niveau: 1 | 2): Kop {
    const k = { tekst, niveau, id: `_Toc${100000 + ++this.n}` };
    this.koppen.push(k);
    return k;
  }
}

const tekst = (
  t: string,
  o: { vet?: boolean; kleur?: string; grootte?: number; cursief?: boolean } = {},
) => new TextRun({ text: t, bold: o.vet, italics: o.cursief, color: o.kleur, size: o.grootte });

const zonderAuto = { beforeAutoSpacing: false, afterAutoSpacing: false };

/** Platte tekst (Hoofdtekst: Lucida Sans Unicode 11, uitgevuld). */
const alinea = (t: string, o: { vet?: boolean; klein?: boolean; cursief?: boolean } = {}) =>
  new Paragraph({
    style: 'Hoofdtekst',
    spacing: { before: 0, after: 160, ...zonderAuto },
    children: [tekst(t, { vet: o.vet, cursief: o.cursief, grootte: o.klein ? 18 : undefined })],
  });

const pijltje = (b?: Beelden) =>
  b
    ? [
        new ImageRun({
          type: 'png',
          data: b.pijltje,
          transformation: { width: 20, height: 23 },
          altText: { name: 'pijltje', description: '', title: '' },
        }),
        new TextRun({ text: ' ' }),
      ]
    : [];

/** Kop 1: het oranje-blauwe pijltje en de titel in VVD-blauw (40 pt), met een bladwijzer. */
function kop1(kop: Kop, b?: Beelden): Paragraph {
  return new Paragraph({
    style: 'Kop1',
    keepNext: true,
    spacing: { before: 0, after: 200, ...zonderAuto },
    children: [...pijltje(b), new Bookmark({ id: kop.id, children: [tekst(kop.tekst)] })],
  });
}

/** Kop 2: oranje, Trebuchet MS 16 vet. */
function kop2(inhoud: Inhoud, t: string): Paragraph {
  const kop = inhoud.nieuw(t, 2);
  return new Paragraph({
    style: 'Kop2',
    keepNext: true,
    spacing: { before: 240, after: 120, ...zonderAuto },
    children: [new Bookmark({ id: kop.id, children: [tekst(t)] })],
  });
}

/** Een maatregel zoals in de tegenbegroting: oranje ▶, tab, vette titel, dan de toelichting. */
const punt = (titel: string, toelichting: string) =>
  new Paragraph({
    style: 'Hoofdtekst',
    spacing: { before: 0, after: 200, ...zonderAuto },
    children: [
      tekst('▶', { kleur: ORANJE }),
      new TextRun({ children: ['\t'] }),
      tekst(titel, { vet: true }),
      ...(toelichting ? [tekst(` ${toelichting}`)] : []),
    ],
  });

function maatregelen(inhoud: Inhoud, groepen: ThemaGroep[], leeg: string): Paragraph[] {
  if (!groepen.length) return [alinea(leeg)];
  return groepen.flatMap((g) => [
    kop2(inhoud, g.thema),
    alinea(g.intro, { vet: true }),
    ...g.regels.map((r) =>
      punt(
        `${r.zekerheid !== 'feit' ? '⚠︎ ' : ''}${r.naam}${r.wijziging ? ` (${r.wijziging})` : ''}.`,
        r.toelichting,
      ),
    ),
  ]);
}

// Tabellen zoals in de tegenbegroting: oranje kop met witte letters, dunne zwarte lijnen.
const lijn = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const randen = { top: lijn, bottom: lijn, left: lijn, right: lijn };

function cel(
  t: string,
  o: { vet?: boolean; rechts?: boolean; kop?: boolean; breedte?: number } = {},
): TableCell {
  return new TableCell({
    borders: randen,
    ...(o.breedte ? { width: { size: o.breedte, type: WidthType.PERCENTAGE } } : {}),
    ...(o.kop ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: ORANJE } } : {}),
    margins: { top: 20, bottom: 20, left: 70, right: 70 },
    verticalAlign: 'bottom',
    children: [
      new Paragraph({
        alignment: o.rechts ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [
          new TextRun({
            text: t,
            bold: o.vet || o.kop,
            color: o.kop ? 'FFFFFF' : '000000',
            size: 20,
          }),
        ],
      }),
    ],
  });
}

const kopRij = (eerste: string, jaar: number) =>
  new TableRow({
    tableHeader: true,
    children: [
      cel(eerste, { kop: true, breedte: 64 }),
      cel(String(jaar), { kop: true, rechts: true, breedte: 12 }),
      cel('Structureel/ incidenteel', { kop: true, breedte: 24 }),
    ],
  });

/** Omschrijving | jaar | Structureel/incidenteel, met een totaal. */
function geldTabel(rijen: TabelRij[], jaar: number, totaal: number): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      kopRij('Omschrijving', jaar),
      ...rijen.map(
        (r) =>
          new TableRow({
            cantSplit: true,
            children: [
              cel(`${r.aanname ? '⚠︎ ' : ''}${r.omschrijving}`),
              cel(mlnTabel(r.bedrag), { rechts: true }),
              cel(r.soort, { rechts: true }),
            ],
          }),
      ),
      new TableRow({
        children: [
          cel('Totaal', { vet: true }),
          cel(mlnTabel(totaal), { vet: true, rechts: true }),
          cel(''),
        ],
      }),
    ],
  });
}

const geenVoettekst = () => ({ default: new Footer({ children: [new Paragraph({})] }) });
const paginanummer = () => ({
  default: new Footer({
    children: [
      new Paragraph({
        style: 'Voettekst',
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })],
      }),
    ],
  }),
});

const marges = { page: { size: PAGINA, margin: MARGE } };

/**
 * Een tussenblad: een foto over de hele pagina (achter de tekst) en de titel groot in wit,
 * zoals in de tegenbegroting 2026.
 */
function tussenblad(titel: string, foto: Uint8Array | undefined): ISectionOptions {
  return {
    properties: { page: { size: PAGINA, margin: { ...MARGE, top: 1700 } } },
    footers: geenVoettekst(),
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          ...(foto
            ? [
                new ImageRun({
                  type: 'jpg',
                  data: foto,
                  transformation: { width: A4_PX.breedte, height: A4_PX.hoogte },
                  altText: { name: titel, description: `Foto bij ${titel}`, title: titel },
                  floating: {
                    horizontalPosition: {
                      relative: HorizontalPositionRelativeFrom.PAGE,
                      offset: 0,
                    },
                    verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
                    behindDocument: true,
                    allowOverlap: true,
                    wrap: { type: TextWrappingType.NONE },
                  },
                }),
              ]
            : []),
          new TextRun({
            text: titel,
            bold: true,
            color: foto ? 'FFFFFF' : BLAUW,
            size: 116,
            font: KOPLETTER,
          }),
        ],
      }),
    ],
  };
}

/** Het voorblad: titel, ondertitel, de pijl met drie foto's, en voor wie en welk jaar. */
function voorblad(tb: Tegenbegroting, b?: Beelden): ISectionOptions {
  const d = tb.teksten;
  // De pijl en de foto's in een rij die in elkaar grijpt, zoals in de tegenbegroting.
  const strook = b
    ? [b.pijl, ...b.voorblad].map(
        (data, i) =>
          new ImageRun({
            type: 'png',
            data,
            transformation: { width: 172, height: 203 },
            altText: { name: `voorblad ${i + 1}`, description: '', title: '' },
            floating: {
              horizontalPosition: {
                relative: HorizontalPositionRelativeFrom.MARGIN,
                offset: Math.round(i * 4.35 * CM),
              },
              verticalPosition: {
                relative: VerticalPositionRelativeFrom.PAGE,
                offset: Math.round(10.2 * CM),
              },
              allowOverlap: true,
              wrap: { type: TextWrappingType.NONE },
            },
          }),
      )
    : [];
  return {
    properties: marges,
    footers: geenVoettekst(),
    children: [
      new Paragraph({
        spacing: { before: 400, after: 160, line: 1300, lineRule: 'exact', ...zonderAuto },
        children: [
          new TextRun({ text: tb.titel, bold: true, color: BLAUW, size: 120, font: KOPLETTER }),
        ],
      }),
      new Paragraph({
        style: 'Stijl1',
        alignment: AlignmentType.BOTH,
        spacing: { before: 0, after: 0, ...zonderAuto },
        children: [tekst(d.ondertitel), ...strook],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 7600, after: 80 },
        children: [
          new TextRun({
            text: `${d.soort}${tb.naam ? ` ${tb.naam}` : ''}`,
            bold: true,
            color: ORANJE,
            size: 40,
            font: KOPLETTER,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: tb.ondertitel, color: BLAUW, size: 32, font: KOPLETTER })],
      }),
    ],
  };
}

/** De inhoudsopgave: Kop 1 en Kop 2 met puntjes en het paginanummer (Word vult die in). */
function inhoudsopgave(inhoud: Inhoud): Paragraph[] {
  return inhoud.koppen.map(
    (k) =>
      new Paragraph({
        style: k.niveau === 1 ? 'Inhopg1' : 'Inhopg2',
        tabStops: [{ type: TabStopType.RIGHT, position: 10280, leader: LeaderType.DOT }],
        children: [
          new TextRun({ text: k.tekst }),
          new TextRun({ children: ['\t'] }),
          new PageReference(k.id),
        ],
      }),
  );
}

export function maakWord(tb: Tegenbegroting, b?: Beelden): Document {
  const d = tb.teksten;
  const f = tb.financieel;
  const t = f.totalen;
  const inhoud = new Inhoud();

  // Eerst de inhoud, zodat de inhoudsopgave alle koppen kent.
  const kopInhoud = inhoud.nieuw('Inhoudsopgave', 1);
  // 'Opgesteld door' staat op dezelfde pagina als de inhoudsopgave: niet nog eens in de lijst.
  const opgesteld = kop1({ tekst: d.opgesteld_door, niveau: 1, id: '_Toc099999' }, b);
  const besparingen = [
    kop1(inhoud.nieuw(d.besparingen.titel, 1), b),
    alinea(d.besparingen.intro, { vet: true }),
    ...maatregelen(inhoud, tb.besparingen, 'Geen besparingen.'),
  ];
  const investeringen = [
    kop1(inhoud.nieuw(d.investeringen.titel, 1), b),
    alinea(d.investeringen.intro, { vet: true }),
    ...maatregelen(inhoud, tb.investeringen, 'Geen investeringen.'),
    ...(tb.ideeen
      ? [kop2(inhoud, 'Mijn eigen ideeën'), ...tb.ideeen.split(/\n+/).map((x) => alinea(x))]
      : []),
  ];
  const financieel = [
    kop1(inhoud.nieuw(d.financieel.titel, 1), b),
    alinea(d.financieel.intro, { vet: true }),
    ...tb.inleiding.map((x) => alinea(x)),
    kop2(inhoud, 'Ombuigingen en opbrengsten (x1 miljoen)'),
    geldTabel(f.ombuigingen, f.jaar, t.ombuigingenS + t.ombuigingenI),
    kop2(inhoud, 'Uitgaven (x1 miljoen)'),
    geldTabel(f.uitgaven, f.jaar, t.uitgavenS + t.uitgavenI),
    kop2(inhoud, 'Saldo (x1 miljoen)'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        kopRij('Saldo', f.jaar),
        new TableRow({
          children: [
            cel('Elk jaar'),
            cel(mlnTabel(t.saldoS), { rechts: true }),
            cel('S', { rechts: true }),
          ],
        }),
        new TableRow({
          children: [
            cel('Eenmalig'),
            cel(mlnTabel(t.saldoI), { rechts: true }),
            cel('I', { rechts: true }),
          ],
        }),
      ],
    }),
    kop2(inhoud, 'Meerjarig (x1 miljoen)'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            cel('Saldo', { kop: true, breedte: 36 }),
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
            cel('Incidenteel'),
            ...f.meerjarig.map((m) => cel(mlnTabel(m.incidenteel), { rechts: true })),
          ],
        }),
      ],
    }),
    ...(tb.kettingeffecten.length
      ? [
          kop2(inhoud, 'Kettingeffecten'),
          alinea('⚠︎ Deze bedragen zijn aannames of spelregels, geen getallen uit de begroting.', {
            klein: true,
          }),
          ...tb.kettingeffecten.map((r) => punt(`⚠︎ ${r.naam}.`, r.toelichting)),
        ]
      : []),
    kop2(inhoud, 'Bronnen en uitleg'),
    alinea(tb.aanname, { klein: true }),
    ...tb.bronnen.map((x) => alinea(x, { klein: true })),
  ];

  const doorlopend = (kinderen: (Paragraph | Table)[]): ISectionOptions => ({
    properties: marges,
    footers: paginanummer(),
    children: kinderen,
  });

  return new Document({
    creator: 'Begrotingsgame van VVD Groningen',
    title: `${d.soort}: ${tb.titel}`,
    description: tb.ondertitel,
    externalStyles: stijlen,
    // Word werkt bij het openen de paginanummers in de inhoudsopgave bij.
    features: { updateFields: true },
    sections: [
      voorblad(tb, b),
      doorlopend([
        kop1(kopInhoud, b),
        ...inhoudsopgave(inhoud),
        new Paragraph({ spacing: { before: 400 } }),
        opgesteld,
        ...(tb.naam ? [alinea(tb.naam)] : []),
        alinea(d.makers),
      ]),
      tussenblad(d.besparingen.titel, b?.tussenbladen.besparingen),
      doorlopend(besparingen),
      tussenblad(d.investeringen.titel, b?.tussenbladen.investeringen),
      doorlopend(investeringen),
      tussenblad(d.financieel.titel, b?.tussenbladen.financieel),
      doorlopend(financieel),
    ],
  });
}

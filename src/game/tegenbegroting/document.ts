/**
 * De tegenbegroting die uit de game rolt (opdracht 8.10), als documentmodel. De opbouw volgt de
 * VVD-tegenbegroting "Het kan en moet anders". Word, PDF en afbeelding worden hieruit gemaakt, zodat
 * alle exports dezelfde inhoud en dezelfde bedragen hebben.
 *
 * Bedragen in euro's; + is gunstig voor de gemeente. In de tabellen staan ze als positieve bedragen
 * in de tabel waar ze horen (ombuigingen en opbrengsten, of uitgaven).
 */
import { EIGEN_PREFIX, formatPct, parkeerPostVan, type Data, type Resultaat } from '../../engine';
import type { Zekerheid } from '../../engine/schema';
import { personaZinnen, THEMA_BELASTINGEN, themaVan } from '../score';
import type { Meta } from '../state/store';

export type Regel = {
  id: string;
  naam: string;
  /** bijvoorbeeld "−20%", "eenmalig" of "elk jaar" */
  wijziging: string;
  toelichting: string;
  thema: string;
  soort: 'S' | 'I';
  /** bedrag in het eerste jaar (euro's, + = gunstig) */
  bedrag: number;
  /** bedrag per jaar van de horizon */
  perJaar: number[];
  zekerheid: Zekerheid;
  kettingeffect: boolean;
};

/** Een kopje in een hoofdstuk (zoals "Werken moet lonen"), met de maatregelen eronder. */
export type ThemaGroep = { thema: string; intro: string; regels: Regel[] };

/** De vaste teksten van het document (spel/teksten.json, onderdeel document). */
export type DocumentTeksten = Data['teksten']['document'];

export type TabelRij = { omschrijving: string; bedrag: number; soort: 'S' | 'I'; aanname: boolean };

export type Tegenbegroting = {
  /** de vaste teksten: slogan, hoofdstukken en hun inleidingen */
  teksten: DocumentTeksten;
  titel: string;
  naam: string;
  begrotingsjaar: number;
  ondertitel: string;
  inleiding: string[];
  besparingen: ThemaGroep[];
  investeringen: ThemaGroep[];
  kettingeffecten: Regel[];
  ideeen: string;
  gevolgen: {
    inwoners: { naam: string; zin: string }[];
    uitleg: string;
  };
  financieel: {
    jaar: number;
    ombuigingen: TabelRij[];
    uitgaven: TabelRij[];
    totalen: {
      ombuigingenS: number;
      ombuigingenI: number;
      uitgavenS: number;
      uitgavenI: number;
      saldoS: number;
      saldoI: number;
    };
    meerjarig: { jaar: number; structureel: number; incidenteel: number }[];
  };
  bronnen: string[];
  aanname: string;
};

/** Zonder eigen titel: de slogan van de tegenbegroting van VVD Groningen. */
export const STANDAARD_TITEL = 'Het kan en moet anders.';

const nlMln = (euro: number) =>
  (Math.abs(euro) / 1e6).toLocaleString('nl-NL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

/** Een bedrag in miljoenen (zoals in de begroting) als "€ 12,3 mln". */
const mlnTekst = (mln: number) =>
  `€ ${Math.abs(mln).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mln`;

/**
 * Wat een maatregel oplevert of kost, in woorden: "Levert € 5,2 mln per jaar op." of "Kost eenmalig
 * € 2,0 mln." Groeit het bedrag nog, dan ook het bedrag in het laatste jaar.
 */
export function geldZin(perJaar: number[], soort: 'S' | 'I', jaren: number[]): string {
  const eerste = perJaar[0] ?? 0;
  const laatste = perJaar.at(-1) ?? 0;
  const groot = Math.abs(laatste) > Math.abs(eerste) + 0.05e6 ? laatste : eerste;
  if (Math.abs(groot) < 0.05e6) return '';
  const bedrag = `€ ${nlMln(groot)} mln`;
  const zin =
    groot > 0
      ? soort === 'S'
        ? `Levert ${bedrag} per jaar op.`
        : `Levert eenmalig ${bedrag} op.`
      : soort === 'S'
        ? `Kost ${bedrag} per jaar.`
        : `Kost eenmalig ${bedrag}.`;
  if (groot === laatste && Math.abs(laatste - eerste) > 0.05e6)
    return `${zin.slice(0, -1)} vanaf ${jaren.at(-1)} (in ${jaren[0]}: € ${nlMln(eerste)} mln).`;
  return zin;
}

/** Maakt de tegenbegroting uit het resultaat van de rekenmotor en de velden van de speler. */
export function maakTegenbegroting(data: Data, r: Resultaat, meta: Meta): Tegenbegroting {
  const k = r.keuzes;
  const jaren = data.jaren;
  const eerste = jaren[0] ?? data.config.actiefJaar;

  // Directe effecten per bron, en kettingeffecten per dwarsverband
  const perBron = new Map<
    string,
    { perJaar: number[]; soort: 'S' | 'I'; zekerheid: Zekerheid; ketting: boolean }
  >();
  for (const e of r.effecten) {
    const sleutel = e.verband ?? e.bron;
    const j = jaren.indexOf(e.jaar);
    if (j < 0) continue;
    const item = perBron.get(sleutel) ?? {
      perJaar: jaren.map(() => 0),
      soort: e.soort,
      zekerheid: e.zekerheid,
      ketting: e.stap === 'dwarsverband',
    };
    item.perJaar[j] = (item.perJaar[j] ?? 0) + e.bedrag;
    if (e.zekerheid !== 'feit')
      item.zekerheid =
        e.zekerheid === 'te onderzoeken'
          ? 'te onderzoeken'
          : item.zekerheid === 'feit'
            ? 'aanname'
            : item.zekerheid;
    perBron.set(sleutel, item);
  }

  const regels: Regel[] = [];
  for (const [id, item] of perBron) {
    const bedrag = item.perJaar[0] ?? 0;
    const o = data.index.onderdelen.get(id);
    const b = data.index.belastingen.get(id);
    const kaart = data.index.kaarten.get(id);
    const parkeerPost = parkeerPostVan(data, id);
    let info = { naam: id, toelichting: '', wijziging: '' };
    if (o) {
      const pct = k.onderdelen[id] ?? 0;
      const uitleg = data.spelPosten.find((x) => x.post === id)?.uitleg;
      info = {
        naam: o.naam,
        wijziging: formatPct(pct),
        toelichting: [
          uitleg ? `Wat is het? ${uitleg}` : '',
          `Nu ${mlnTekst(o.lasten_mln)} per jaar (begroting ${data.begroting.begrotingsjaar}); dat wordt ${mlnTekst(o.lasten_mln * (1 + pct / 100))}.`,
          o.gekoppelde_baten_mln > 0 && pct !== 0
            ? `Er horen ook ${mlnTekst(o.gekoppelde_baten_mln)} inkomsten bij die meeveranderen.`
            : '',
          (pct < 0 ? o.tekst_bezuinigen : o.tekst_investeren) ?? '',
        ]
          .filter(Boolean)
          .join(' '),
      };
    } else if (b) {
      const pct = k.belastingen[id] ?? 0;
      info = {
        naam: b.naam,
        wijziging: formatPct(pct),
        toelichting: `${b.uitleg} Opbrengst nu ${mlnTekst(b.opbrengst_mln)} per jaar (begroting ${data.begroting.begrotingsjaar}); dat wordt ${mlnTekst(b.opbrengst_mln * (1 + pct / 100))}.`,
      };
    } else if (parkeerPost) {
      const pct = k.parkeren?.[parkeerPost.id] ?? 0;
      info = {
        naam: parkeerPost.naam,
        wijziging: formatPct(pct),
        toelichting:
          parkeerPost.tarief !== undefined
            ? `${parkeerPost.uitleg} Tarief nu € ${parkeerPost.tarief.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per jaar, nieuw € ${(parkeerPost.tarief * (1 + pct / 100)).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
            : parkeerPost.uitleg,
      };
    } else if (kaart) {
      info = {
        naam: kaart.naam,
        wijziging: kaart.structureel_of_incidenteel === 'S' ? 'elk jaar' : 'eenmalig',
        toelichting: kaart.uitleg,
      };
    } else if (id.startsWith(EIGEN_PREFIX)) {
      const v = k.eigen?.find((x) => `${EIGEN_PREFIX}${x.id}` === id);
      info = {
        naam: v?.naam ?? 'Eigen voorstel',
        wijziging: item.soort === 'S' ? 'elk jaar' : 'eenmalig',
        toelichting:
          v?.plek === 'veiling'
            ? 'Eigen voorstel: de gemeente verkoopt dit. Het bedrag is een eigen schatting.'
            : 'Eigen voorstel: de gemeente doet dit niet meer. Het bedrag is een eigen schatting.',
      };
    } else if (id === 'reserve') {
      info = {
        naam: 'Geld in de reserve storten',
        wijziging: item.soort === 'S' ? 'elk jaar' : 'eenmalig',
        toelichting:
          'Een grotere buffer, zodat een tegenvaller niet meteen tot bezuinigingen leidt.',
      };
    } else if (item.ketting) {
      const v = data.index.verbanden.get(id);
      const laatste = item.perJaar.at(-1) ?? 0;
      info = {
        naam: v?.naam ?? id,
        wijziging: '',
        toelichting:
          `${v?.mechanisme ?? ''} In ${jaren.at(-1)}: ${laatste >= 0 ? '+' : '−'} € ${nlMln(laatste)} mln.`.trim(),
      };
    }
    // Bij elke maatregel wat hij oplevert of kost (kettingeffecten noemen dat zelf al)
    if (!item.ketting) {
      const geld = geldZin(item.perJaar, item.soort, jaren);
      if (geld) info = { ...info, toelichting: `${geld} ${info.toelichting}`.trim() };
    }
    regels.push({
      id,
      ...info,
      thema: item.ketting ? 'Kettingeffecten' : id === 'reserve' ? 'Financiën' : themaVan(data, id),
      soort: item.soort,
      bedrag,
      perJaar: item.perJaar,
      zekerheid: item.zekerheid,
      kettingeffect: item.ketting,
    });
  }

  const opBedrag = (a: Regel, b: Regel) =>
    Math.abs(b.bedrag) - Math.abs(a.bedrag) || a.naam.localeCompare(b.naam);
  // De kopjes van het document (zoals "Werken moet lonen"): elk kopje noemt zijn thema's; het
  // laatste kopje van een hoofdstuk krijgt de rest.
  const doc = data.teksten.document;
  const groepeer = (lijst: Regel[], kopjes: DocumentTeksten['besparingen']['kopjes']) => {
    const plek = (thema: string) => {
      const i = kopjes.findIndex((kop) => kop.themas.includes(thema));
      return i >= 0 ? i : kopjes.length - 1;
    };
    return kopjes
      .map((kop, i) => ({
        thema: kop.titel,
        intro: kop.intro,
        regels: [...lijst].filter((x) => plek(x.thema) === i).sort(opBedrag),
      }))
      .filter((g) => g.regels.length > 0);
  };
  const maatregelen = regels.filter((x) => !x.kettingeffect);
  // Een maatregel die pas later iets oplevert (bijvoorbeeld door een ingroeipad), telt naar het teken van het laatste jaar.
  const teken = (x: Regel) => (x.bedrag !== 0 ? x.bedrag : (x.perJaar.find((y) => y !== 0) ?? 0));
  const besparingen = groepeer(
    maatregelen.filter((x) => teken(x) > 0),
    doc.besparingen.kopjes,
  );
  const investeringen = groepeer(
    maatregelen.filter((x) => teken(x) < 0),
    doc.investeringen.kopjes,
  );
  const kettingeffecten = regels.filter((x) => x.kettingeffect).sort(opBedrag);

  // De inleidingen volgen de richting van de keuzes: komt het geld vooral uit hogere lasten, of
  // gaan de lasten juist niet omlaag, dan past de inleiding zich aan.
  const lasten = (lijst: Regel[]) =>
    lijst.filter((x) => x.thema === THEMA_BELASTINGEN).reduce((a, x) => a + Math.abs(teken(x)), 0);
  const totaal = (lijst: Regel[]) => lijst.reduce((a, x) => a + Math.abs(teken(x)), 0);
  const plus = maatregelen.filter((x) => teken(x) > 0);
  const min = maatregelen.filter((x) => teken(x) < 0);
  const teksten: DocumentTeksten = {
    ...doc,
    besparingen: {
      ...doc.besparingen,
      intro:
        doc.besparingen.intro_anders && totaal(plus) > 0 && lasten(plus) >= totaal(plus) / 2
          ? doc.besparingen.intro_anders
          : doc.besparingen.intro,
    },
    investeringen: {
      ...doc.investeringen,
      intro:
        doc.investeringen.intro_anders && lasten(min) === 0
          ? doc.investeringen.intro_anders
          : doc.investeringen.intro,
    },
  };

  // Financieel overzicht: eerste jaar, alle regels die in dat jaar iets doen
  const rij = (x: Regel): TabelRij => ({
    omschrijving:
      x.wijziging && x.wijziging !== 'elk jaar' && x.wijziging !== 'eenmalig'
        ? `${x.naam} (${x.wijziging})`
        : x.naam,
    bedrag: Math.abs(x.bedrag),
    soort: x.soort,
    aanname: x.zekerheid !== 'feit',
  });
  const inEersteJaar = [...regels].filter((x) => Math.abs(x.bedrag) >= 0.5).sort(opBedrag);
  const ombuigingen = inEersteJaar.filter((x) => x.bedrag > 0).map(rij);
  const uitgaven = inEersteJaar.filter((x) => x.bedrag < 0).map(rij);
  const som = (lijst: TabelRij[], s: 'S' | 'I') =>
    lijst.filter((x) => x.soort === s).reduce((a, x) => a + x.bedrag, 0);
  const totalen = {
    ombuigingenS: som(ombuigingen, 'S'),
    ombuigingenI: som(ombuigingen, 'I'),
    uitgavenS: som(uitgaven, 'S'),
    uitgavenI: som(uitgaven, 'I'),
    saldoS: r.perJaar[eerste]?.structureel ?? 0,
    saldoI: r.perJaar[eerste]?.incidenteel ?? 0,
  };

  // Inleiding (sjabloon)
  const vrij = totalen.ombuigingenS + totalen.ombuigingenI;
  const ingezet = totalen.uitgavenS + totalen.uitgavenI;
  const grootste = [...maatregelen].sort(opBedrag).slice(0, 3);
  const opsomming = (namen: string[]) =>
    namen.length <= 1 ? (namen[0] ?? '') : `${namen.slice(0, -1).join(', ')} en ${namen.at(-1)}`;
  const inleiding: string[] = [];
  if (!regels.length) {
    inleiding.push(
      `Deze tegenbegroting verandert nog niets aan de ontwerpbegroting ${data.begroting.begrotingsjaar}.`,
    );
  } else {
    inleiding.push(
      `In ${eerste} maak ik met deze tegenbegroting € ${nlMln(vrij)} mln vrij en zet ik € ${nlMln(ingezet)} mln anders in.` +
        (grootste.length
          ? ` Mijn ${grootste.length === 1 ? 'grootste keuze is' : `${grootste.length} grootste keuzes zijn`}: ${opsomming(grootste.map((x) => `${x.naam}${x.wijziging ? ` (${x.wijziging})` : ''}`))}.`
          : ''),
    );
    const s = totalen.saldoS;
    inleiding.push(
      s >= -0.5
        ? `Structureel houd ik € ${nlMln(s)} mln per jaar over. ${r.regels.sluitend ? `De begroting sluit in alle jaren van ${jaren[0]} tot en met ${jaren.at(-1)}.` : 'Let op: niet alle jaren sluiten.'}`
        : `Structureel kom ik € ${nlMln(s)} mln per jaar tekort. Daarvoor is nog dekking nodig.`,
    );
  }

  const titel = meta.titel.trim() || STANDAARD_TITEL;
  return {
    teksten,
    titel,
    naam: meta.naam.trim(),
    begrotingsjaar: data.begroting.begrotingsjaar,
    ondertitel: `Ontwerpbegroting ${data.begroting.begrotingsjaar} Gemeente Groningen`,
    inleiding,
    besparingen,
    investeringen,
    kettingeffecten,
    ideeen: meta.idee.trim(),
    gevolgen: {
      inwoners: personaZinnen(data, r).map((p) => ({ naam: p.naam, zin: p.zin })),
      uitleg: data.teksten.inwoners_uitleg,
    },
    financieel: {
      jaar: eerste,
      ombuigingen,
      uitgaven,
      totalen,
      meerjarig: jaren.map((j) => ({
        jaar: j,
        structureel: r.perJaar[j]?.structureel ?? 0,
        incidenteel: r.perJaar[j]?.incidenteel ?? 0,
      })),
    },
    bronnen: [
      `${data.begroting.document}: ${data.begroting.bron_url}`,
      ...data.vergelijking.map((v) => `${v.tegenbegroting.titel}: ${v.tegenbegroting.bron_url}`),
      'Gemaakt met de Begrotingsgame, een initiatief van VVD Groningen.',
    ],
    aanname:
      'S = structureel: elk jaar. I = incidenteel: eenmalig. Bedragen uit de begroting zijn feiten. Kettingeffecten (⚠︎) zijn aannames of spelregels; ze zijn berekend met het scenario "' +
      k.scenario +
      '". ' +
      data.teksten.fout_melden.tekst,
  };
}

/**
 * Bedrag in miljoenen zoals in de tabellen van de fractie (16,4 · 0,25 · 1,625): hooguit drie
 * decimalen, zonder overbodige nullen, met een echt minteken.
 */
export const mlnTabel = (euro: number) =>
  (euro / 1e6)
    .toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 3 })
    .replace('-', '−');

/** Bestandsnaam op basis van de titel. */
export function bestandsnaam(titel: string, extensie: string): string {
  const basis =
    titel
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 60) || 'tegenbegroting';
  return `${basis}.${extensie}`;
}

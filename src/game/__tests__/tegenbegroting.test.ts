import JSZip from 'jszip';
import { Packer } from 'docx';
import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, metExtraKaarten, type Data } from '../../engine';
import { alsKaarten } from '../../engine/tegenbegroting';
import { echteData, keuzes, mln } from '../../engine/__tests__/hulp';
import { bestandsnaam, maakTegenbegroting, STANDAARD_TITEL } from '../tegenbegroting/document';
import { BEELD_BESTANDEN, maakWord } from '../tegenbegroting/word';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});
const meta = { titel: '', naam: '', idee: '' };

async function wordTekst(doc: ReturnType<typeof maakWord>): Promise<string> {
  const zip = await JSZip.loadAsync(await Packer.toBuffer(doc));
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? '';
  return xml
    .replace(/<w:tab\/>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

describe('tegenbegroting: de VVD-testcase', () => {
  it('geeft hetzelfde financiële overzicht als het origineel (op de bekende afwijkingen na)', async () => {
    const tb = data.vergelijking[0]?.tegenbegroting;
    if (!tb) throw new Error('geen tegenbegroting');
    const kaarten = alsKaarten(tb);
    const metVvd = metExtraKaarten(data, kaarten);
    const r = bereken(metVvd, keuzes({ kaarten: kaarten.map((k) => k.id) }));
    const doc = maakTegenbegroting(metVvd, r, {
      titel: 'Het kan en moet anders',
      naam: 'VVD Groningen',
      idee: '',
    });
    const t = doc.financieel.totalen;

    expect(doc.financieel.ombuigingen).toHaveLength(tb.ombuigingen_en_opbrengsten.length);
    expect(doc.financieel.uitgaven).toHaveLength(tb.uitgaven.length);
    expect(mln(t.ombuigingenS)).toBeCloseTo(tb.controle.ombuigingen_structureel, 6);
    expect(mln(t.ombuigingenI)).toBeCloseTo(tb.controle.ombuigingen_incidenteel, 6);
    expect(mln(t.uitgavenS)).toBeCloseTo(tb.controle.uitgaven_structureel, 6);
    expect(mln(t.uitgavenI)).toBeCloseTo(tb.controle.uitgaven_incidenteel, 6);
    // Bekende afwijkingen: structureel tekort van 0,059; uitgaven tellen op tot 70,0 (document noemt 69,6).
    expect(mln(t.saldoS)).toBeCloseTo(-0.059, 6);
    expect(mln(t.saldoI)).toBeCloseTo(-0.369, 6);
    expect(mln(t.uitgavenS + t.uitgavenI)).toBeCloseTo(70.0, 6);

    // En precies zo in het Word-bestand
    const tekst = await wordTekst(maakWord(doc));
    for (const s of [
      'Ombuigingen en opbrengsten (x1 miljoen)',
      'Uitgaven (x1 miljoen)',
      // Zoals de fractie: alleen een totaal per tabel (69,6 en 70,0), en het saldo
      '69,572',
      'Totaal70,0',
      '−0,059',
      '−0,369',
    ]) {
      expect(tekst, s).toContain(s);
    }
    for (const p of [...tb.ombuigingen_en_opbrengsten, ...tb.uitgaven])
      expect(tekst, p.omschrijving).toContain(p.omschrijving);
  });
});

describe('tegenbegroting van een speler', () => {
  it('volgt de opbouw van de fractie, met kettingeffecten apart', async () => {
    const r = bereken(
      data,
      keuzes({
        onderdelen: { h1: -10, m2: -100, s3: 10 },
        belastingen: { t1: -5 },
        kaarten: ['k_warm', 'k_licht'],
      }),
    );
    const doc = maakTegenbegroting(data, r, {
      titel: 'Groningen kan het',
      naam: 'Anne',
      idee: 'Meer bankjes.\nEn bomen.',
    });
    expect(doc.ondertitel).toBe('Ontwerpbegroting 2026 Gemeente Groningen');
    // Kopjes zoals in de tegenbegroting van de fractie, met een inleiding.
    expect(doc.besparingen.map((g) => g.thema)).toContain('Een slanke en efficiënte gemeente');
    expect(doc.investeringen.map((g) => g.thema)).toContain(
      'Lagere lasten voor inwoners en ondernemers',
    );
    expect(doc.besparingen.every((g) => g.intro.length > 20)).toBe(true);
    expect(doc.besparingen.flatMap((g) => g.regels.map((x) => x.id))).toEqual(
      expect.arrayContaining(['h1', 'k_warm']),
    );
    expect(doc.investeringen.flatMap((g) => g.regels.map((x) => x.id))).toEqual(
      expect.arrayContaining(['t1', 'm2', 's3', 'k_licht']),
    );
    expect(doc.kettingeffecten.map((x) => x.id)).toEqual(
      expect.arrayContaining(['vh_parkeerhandhaving', 'wia_reintegratie']),
    );
    expect(doc.kettingeffecten.every((x) => x.zekerheid !== 'feit')).toBe(true);
    // Ombuigingen min uitgaven is het saldo
    const t = doc.financieel.totalen;
    expect(t.ombuigingenS - t.uitgavenS).toBeCloseTo(t.saldoS, 2);
    expect(t.ombuigingenI - t.uitgavenI).toBeCloseTo(t.saldoI, 2);
    expect(doc.inleiding[0]).toMatch(/maak ik met deze tegenbegroting € [\d,]+ mln vrij/);
    expect(doc.inleiding[0]).toMatch(/Overhead/);

    const tekst = await wordTekst(maakWord(doc));
    // De opbouw van de tegenbegroting van VVD Groningen
    for (const s of [
      'Tegenbegroting Anne',
      'Groningen kan het',
      'Voor een veilige, ondernemende en financieel verstandige gemeente.',
      'Inhoudsopgave',
      'Opgesteld door',
      'Besparingen',
      'Een slanke en efficiënte gemeente',
      'Investeringen',
      'Lagere lasten voor inwoners en ondernemers',
      'Kettingeffecten',
      'Mijn eigen ideeën',
      'Meer bankjes.',
      'Financieel overzicht',
      'Ombuigingen en opbrengsten (x1 miljoen)',
      'Uitgaven (x1 miljoen)',
      'Structureel/ incidenteel',
      'Meerjarig',
      'Bronnen en uitleg',
      '▶',
      '⚠︎',
    ]) {
      expect(tekst, s).toContain(s);
    }
    // "Wat merken de inwoners?" staat niet meer in de tegenbegroting (besluit fractie).
    expect(tekst).not.toContain('Wat merken de inwoners?');
  });

  it("Word met de foto's en pijlen van de huisstijl", async () => {
    const lees = (naam: string) =>
      new Uint8Array(readFileSync(resolve(import.meta.dirname, '../../../public/huisstijl', naam)));
    const doc = maakTegenbegroting(data, bereken(data, keuzes({ onderdelen: { h1: -10 } })), meta);
    const word = maakWord(doc, {
      pijltje: lees(BEELD_BESTANDEN.pijltje),
      pijl: lees(BEELD_BESTANDEN.pijl),
      voorblad: BEELD_BESTANDEN.voorblad.map(lees),
      tussenbladen: {
        besparingen: lees(BEELD_BESTANDEN.tussenbladen.besparingen),
        investeringen: lees(BEELD_BESTANDEN.tussenbladen.investeringen),
        financieel: lees(BEELD_BESTANDEN.tussenbladen.financieel),
      },
    });
    const zip = await JSZip.loadAsync(await Packer.toBuffer(word));
    const media = Object.keys(zip.files).filter((x) => x.startsWith('word/media/'));
    expect(media.length).toBeGreaterThanOrEqual(8);
    expect(await wordTekst(word)).toContain(STANDAARD_TITEL);
  });

  it('zonder titel krijgt de tegenbegroting een standaardtitel; bestandsnaam uit de titel', () => {
    const doc = maakTegenbegroting(data, bereken(data, keuzes()), meta);
    expect(doc.titel).toBe(STANDAARD_TITEL);
    expect(doc.inleiding[0]).toMatch(/verandert nog niets/);
    expect(bestandsnaam('Groningen kan & moet het: beter!', 'docx')).toBe(
      'groningen-kan-moet-het-beter.docx',
    );
    expect(bestandsnaam('   ', 'pdf')).toBe('tegenbegroting.pdf');
    expect(bestandsnaam('Één café', 'png')).toBe('een-cafe.png');
  });
});

describe('tegenbegroting: de tekst volgt de richting van de keuzes', () => {
  it('hogere lasten staan onder een eigen kopje, met een passende inleiding', () => {
    const r = bereken(data, keuzes({ belastingen: { t1: 10 } }));
    const doc = maakTegenbegroting(data, r, meta);
    expect(doc.besparingen.map((g) => g.thema)).toEqual([
      'Hogere lasten voor inwoners en ondernemers',
    ]);
    expect(doc.teksten.besparingen.intro).toContain('hogere gemeentelijke lasten');
    expect(doc.investeringen).toHaveLength(0);
    expect(doc.teksten.investeringen.intro).not.toContain('Lagere lasten');
  });

  it('lagere lasten: de gewone inleidingen', () => {
    const r = bereken(data, keuzes({ belastingen: { t1: -5 }, onderdelen: { h1: -10 } }));
    const doc = maakTegenbegroting(data, r, meta);
    expect(doc.teksten.besparingen.intro).toContain('slankere en doelmatigere gemeente');
    expect(doc.teksten.investeringen.intro).toContain('Lagere lasten');
    expect(doc.investeringen.map((g) => g.thema)).toContain(
      'Lagere lasten voor inwoners en ondernemers',
    );
  });
});

describe('tegenbegroting: bij elke maatregel bedragen en een toelichting', () => {
  it('een post: wat het oplevert, wat het is, nu en straks', () => {
    const r = bereken(data, keuzes({ onderdelen: { h1: -10 }, belastingen: { t1: -5 } }));
    const doc = maakTegenbegroting(data, r, meta);
    const alle = [...doc.besparingen, ...doc.investeringen].flatMap((g) => g.regels);
    const h1 = alle.find((x) => x.id === 'h1');
    const o = data.index.onderdelen.get('h1');
    expect(h1?.toelichting).toMatch(/^Levert € [\d,]+ mln per jaar op\./);
    expect(h1?.toelichting).toContain(
      `Nu € ${o?.lasten_mln.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mln per jaar`,
    );
    const t1 = alle.find((x) => x.id === 't1');
    expect(t1?.toelichting).toMatch(/^Kost € [\d,]+ mln per jaar\./);
    expect(t1?.toelichting).toContain('Opbrengst nu €');
  });
});

import JSZip from 'jszip';
import { Packer } from 'docx';
import { beforeAll, describe, expect, it } from 'vitest';
import { bereken, metExtraKaarten, type Data } from '../../engine';
import { alsKaarten } from '../../engine/tegenbegroting';
import { echteData, keuzes, mln } from '../../engine/__tests__/hulp';
import { bestandsnaam, maakTegenbegroting, STANDAARD_TITEL } from '../tegenbegroting/document';
import { maakWord } from '../tegenbegroting/word';

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
      'Ombuigingen en opbrengsten (x € 1 miljoen)',
      'Uitgaven (x € 1 miljoen)',
      '53,970',
      '15,602',
      '54,029',
      '15,971',
      '69,572',
      '70,000',
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
    expect(doc.ondertitel).toBe('Op de ontwerpbegroting 2026 van de gemeente Groningen');
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
    for (const s of [
      'Tegenbegroting',
      'Groningen kan het',
      'Anne',
      'Inleiding',
      'Besparingen en opbrengsten',
      'Investeringen en lastenverlichting',
      'Kettingeffecten',
      'Mijn eigen ideeën',
      'Meer bankjes.',
      'Wat merken de inwoners?',
      'Financieel overzicht',
      'Meerjarig',
      'Bronnen en uitleg',
      'Peter en Tineke',
      '⚠︎',
    ]) {
      expect(tekst, s).toContain(s);
    }
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

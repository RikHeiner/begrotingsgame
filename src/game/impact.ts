/**
 * "Wat betekent het voor mij?" (opdracht 8.11): wat de keuzes van de speler betekenen voor één
 * huishouden. Alleen voor heffingen waarvan het tarief in de data staat. Er wordt niets opgeslagen.
 */
import { parkeerPosten, type Data, type Keuzes, type ParkeerPost } from '../engine';
import type { Tarieven } from '../engine/schema';

export type Huishouden = {
  woning: 'koop' | 'huur';
  /** WOZ-waarde in euro's (alleen bij een koophuis) */
  woz: number;
  volwassenen: 1 | 2;
  kinderen: number;
  /** id van het tariefgebied (data/parkeren), of undefined zonder auto of vergunning */
  vergunning?: string;
  vergunningen: 1 | 2;
  /** koopt een bezoekersvergunning */
  bezoekers: boolean;
  /** inkomen rond of onder het sociaal minimum */
  minimum: boolean;
};

export type ImpactRij = {
  naam: string;
  /** euro's per jaar nu, of undefined als het tarief niet bekend is */
  nu?: number;
  /** euro's per jaar met de keuzes van de speler */
  straks?: number;
  uitleg: string;
};

export function standaardHuishouden(data: Data): Huishouden {
  return {
    woning: 'koop',
    woz: data.kengetallen.gemiddelde_woz,
    volwassenen: 2,
    kinderen: 0,
    vergunningen: 1,
    bezoekers: false,
    minimum: false,
  };
}

const rond = (x: number) => Math.round(x * 100) / 100;

/** De parkeerposten die het paneel gebruikt: alleen vergunningen met een bekend tarief. */
export function impactPosten(data: Data): ParkeerPost[] {
  return parkeerPosten(data).filter((p) => p.groep === 'vergunning' && p.tarief !== undefined);
}

function wijziging(pct: number, wat: string): string {
  return pct === -100
    ? `Je maakt de ${wat} gratis.`
    : pct
      ? `Je verandert de ${wat} met ${pct > 0 ? '+' : '−'}${Math.abs(pct)}%.`
      : `Je verandert de ${wat} niet.`;
}

export function berekenImpact(
  tarieven: Tarieven,
  keuzes: Keuzes,
  h: Huishouden,
  /** de parkeerposten uit `impactPosten`; zonder posten geen regels voor parkeren */
  parkeren: ParkeerPost[] = [],
): ImpactRij[] {
  const rijen: ImpactRij[] = [];
  const kwijt = (soort: Tarieven['kwijtschelding']['belastingen'][number]) =>
    h.minimum && tarieven.kwijtschelding.belastingen.includes(soort);
  const ozbPct = keuzes.belastingen.t1 ?? 0;

  if (h.woning === 'koop') {
    const nu = (h.woz * tarieven.ozb_woning_eigenaar_pct) / 100;
    rijen.push(
      kwijt('ozb')
        ? { naam: 'OZB', nu: 0, straks: 0, uitleg: 'Met kwijtschelding betaal je geen OZB.' }
        : {
            naam: 'OZB',
            nu: rond(nu),
            straks: rond(nu * (1 + ozbPct / 100)),
            uitleg: ozbPct
              ? `Je verandert de OZB met ${ozbPct > 0 ? '+' : '−'}${Math.abs(ozbPct)}%.`
              : 'Je verandert de OZB niet.',
          },
    );
  } else {
    rijen.push({
      naam: 'OZB',
      uitleg:
        'Huurders betalen geen OZB. De verhuurder betaalt die, en rekent dat mogelijk door in de huur. Hoeveel, is niet te zeggen.',
    });
  }

  const personen = h.volwassenen + h.kinderen;
  const afval =
    personen <= 1
      ? tarieven.afvalstoffenheffing.een_persoon
      : personen === 2
        ? tarieven.afvalstoffenheffing.twee_personen
        : tarieven.afvalstoffenheffing.drie_of_meer;
  rijen.push(
    kwijt('afvalstoffenheffing')
      ? {
          naam: 'Afvalstoffenheffing',
          nu: 0,
          straks: 0,
          uitleg: 'Met kwijtschelding betaal je dit niet.',
        }
      : {
          naam: 'Afvalstoffenheffing',
          nu: afval,
          straks: afval,
          uitleg: `Voor een huishouden van ${personen} ${personen === 1 ? 'persoon' : 'personen'}. Dit is een doelbelasting: het geld gaat alleen naar afval. Daarom kun je hem in de game niet veranderen.`,
        },
  );

  if (h.woning === 'koop')
    rijen.push(
      kwijt('rioolheffing')
        ? {
            naam: 'Rioolheffing',
            nu: 0,
            straks: 0,
            uitleg: 'Met kwijtschelding betaal je dit niet.',
          }
        : {
            naam: 'Rioolheffing',
            nu: tarieven.rioolheffing_eigenaar,
            straks: tarieven.rioolheffing_eigenaar,
            uitleg: 'Betalen eigenaren. Ook een doelbelasting: in de game blijft hij gelijk.',
          },
    );

  // Parkeren: het tarief per tariefgebied en de keuze per post (zie engine/parkeren.ts).
  const post = (vergunning: string, gebied?: string) =>
    parkeren.find((p) => p.vergunning === vergunning && (!gebied || p.tariefgebied === gebied));
  const pctVan = (p: ParkeerPost) => keuzes.parkeren?.[p.id] ?? 0;
  const regel = (naam: string, p: ParkeerPost, wat: string, extra = ''): ImpactRij => {
    const nu = p.tarief ?? 0;
    return {
      naam,
      nu: rond(nu),
      straks: rond(nu * Math.max(0, 1 + pctVan(p) / 100)),
      uitleg: `${wijziging(pctVan(p), wat)}${extra}`,
    };
  };
  if (h.vergunning) {
    const eerste = post('bewoners_1', h.vergunning);
    const tweede = post('bewoners_2', h.vergunning);
    if (eerste) rijen.push(regel('Parkeervergunning', eerste, 'bewonersvergunning in jouw zone'));
    if (h.vergunningen === 2)
      rijen.push(
        tweede
          ? regel('Tweede parkeervergunning', tweede, 'tweede vergunning in jouw zone')
          : {
              naam: 'Tweede parkeervergunning',
              uitleg:
                'Het tarief voor een tweede vergunning in deze zone staat (nog) niet in de data.',
            },
      );
  }
  const bezoek = post('bezoekers');
  if (h.bezoekers && bezoek)
    rijen.push(
      regel(
        'Bezoekersvergunning',
        bezoek,
        'bezoekersvergunning',
        ' Het jaartarief; bijgekochte uren tellen hier niet mee.',
      ),
    );
  return rijen;
}

export function totaal(rijen: ImpactRij[]): { nu: number; straks: number } {
  return rijen.reduce((t, r) => ({ nu: t.nu + (r.nu ?? 0), straks: t.straks + (r.straks ?? 0) }), {
    nu: 0,
    straks: 0,
  });
}

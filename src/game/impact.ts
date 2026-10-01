/**
 * "Wat betekent het voor mij?" (opdracht 8.11): wat de keuzes van de speler betekenen voor één
 * huishouden. Alleen voor heffingen waarvan het tarief in de data staat. Er wordt niets opgeslagen.
 */
import type { Data, Keuzes } from '../engine';
import type { Tarieven } from '../engine/schema';

export type Huishouden = {
  woning: 'koop' | 'huur';
  /** WOZ-waarde in euro's (alleen bij een koophuis) */
  woz: number;
  volwassenen: 1 | 2;
  kinderen: number;
  /** id van de vergunningzone, of undefined zonder auto of vergunning */
  vergunning?: string;
  vergunningen: 1 | 2;
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
    minimum: false,
  };
}

const rond = (x: number) => Math.round(x * 100) / 100;

export function berekenImpact(tarieven: Tarieven, keuzes: Keuzes, h: Huishouden): ImpactRij[] {
  const rijen: ImpactRij[] = [];
  const kwijt = (soort: Tarieven['kwijtschelding']['belastingen'][number]) =>
    h.minimum && tarieven.kwijtschelding.belastingen.includes(soort);
  const ozbPct = keuzes.belastingen.t1 ?? 0;
  const parkeerPct = keuzes.belastingen.t5 ?? 0;

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

  const zone = tarieven.parkeervergunning_bewoners.find((z) => z.id === h.vergunning);
  if (zone) {
    const tweede = h.vergunningen === 2 ? zone.tweede : 0;
    if (tweede === null) {
      rijen.push({
        naam: 'Parkeervergunning',
        uitleg: 'Het tarief voor een tweede vergunning in deze zone staat (nog) niet in de data.',
      });
    } else {
      const nu = zone.eerste + tweede;
      rijen.push({
        naam: h.vergunningen === 2 ? 'Twee parkeervergunningen' : 'Parkeervergunning',
        nu,
        straks: rond(nu * Math.max(0, 1 + parkeerPct / 100)),
        uitleg:
          parkeerPct === -100
            ? 'Je maakt parkeren overal gratis.'
            : parkeerPct
              ? `Je verandert de parkeertarieven met ${parkeerPct > 0 ? '+' : '−'}${Math.abs(parkeerPct)}%. De game gaat ervan uit dat vergunningen net zo veranderen.`
              : 'Je verandert de parkeertarieven niet.',
      });
    }
  }
  return rijen;
}

export function totaal(rijen: ImpactRij[]): { nu: number; straks: number } {
  return rijen.reduce((t, r) => ({ nu: t.nu + (r.nu ?? 0), straks: t.straks + (r.straks ?? 0) }), {
    nu: 0,
    straks: 0,
  });
}

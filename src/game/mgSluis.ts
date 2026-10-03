/**
 * Oostersluis: "Sluiswachter". Het waterpeil is het saldo van de gemeente: 1 streep = € 1 mln.
 * Elke ronde gebeurt er iets met een echte post of inkomstenbron uit de begroting. De procenten
 * (hoeveel duurder, hoeveel meer of minder) zijn een spelregel; de bedragen waar ze op rekenen
 * komen uit de begroting.
 */
import type { Data } from '../engine';
import type { Onderdeel } from '../engine/schema';

/** Het peil kan niet hoger of lager dan dit (de wanden van de sluis). */
export const WAND = 20;
/** Binnen deze band is het peil veilig (spelregel). */
export const VEILIG = 8;
/** Bezuinigen haalt dit deel van een post weg (spelregel). */
export const BEZUINIG_PCT = 5;
/** Meer OZB: zoveel procent extra opbrengst (spelregel). */
export const OZB_PCT = 5;

export type SluisGebeurtenis = {
  id: string;
  /** korte tekst over wat er gebeurt */
  tekst: string;
  /** waar het bedrag op rekent */
  bron: string;
  /** het bedrag uit de begroting, in mln */
  basisMln: number;
  /** procent van dat bedrag (spelregel); negatief = geld gaat eruit */
  pct: number;
  /** verandering van het peil, in mln (= streepjes) */
  peil: number;
};

type Recept =
  | { soort: 'post'; id: string; pct: number; tekst: string }
  | { soort: 'fonds'; pct: number; tekst: string }
  | { soort: 'belasting'; id: string; pct: number; tekst: string };

/** De acht rondes. */
const RECEPTEN: Recept[] = [
  { soort: 'post', id: 'z1', pct: -8, tekst: 'Meer kinderen hebben jeugdzorg nodig.' },
  { soort: 'fonds', pct: 1, tekst: 'Het Rijk stuurt wat meer geld via het gemeentefonds.' },
  { soort: 'post', id: 's1', pct: -4, tekst: 'Meer mensen hebben een bijstandsuitkering.' },
  { soort: 'post', id: 'o1', pct: -10, tekst: 'Straten en groen hebben extra onderhoud nodig.' },
  { soort: 'belasting', id: 't5', pct: 10, tekst: 'Parkeren brengt meer op dan verwacht.' },
  { soort: 'post', id: 'z3', pct: -10, tekst: 'De Wmo (hulp in huis) wordt duurder.' },
  { soort: 'fonds', pct: -1.5, tekst: 'Het Rijk stuurt minder geld via het gemeentefonds.' },
  {
    soort: 'belasting',
    id: 't1',
    pct: 3,
    tekst: 'Er zijn nieuwe woningen: de OZB brengt meer op.',
  },
];

const rond = (x: number): number => Math.round(x * 10) / 10;

/** De gebeurtenissen voor het spel. Een post die niet in de data staat, slaan we over. */
export function sluisGebeurtenissen(data: Data): SluisGebeurtenis[] {
  const uit: SluisGebeurtenis[] = [];
  RECEPTEN.forEach((r, i) => {
    let basisMln: number | undefined;
    let bron: string | undefined;
    if (r.soort === 'post') {
      const o = data.begroting.onderdelen.find((x) => x.id === r.id);
      basisMln = o?.lasten_mln;
      bron = o?.naam;
    } else if (r.soort === 'belasting') {
      const b = data.begroting.belastingen.find((x) => x.id === r.id);
      basisMln = b?.opbrengst_mln;
      bron = b?.naam;
    } else {
      basisMln = data.kengetallen.gemeentefonds_x1000 / 1000;
      bron = 'Gemeentefonds (geld van het Rijk)';
    }
    if (basisMln === undefined || bron === undefined || basisMln <= 0) return;
    uit.push({
      id: `${r.soort}-${i}`,
      tekst: r.tekst,
      bron,
      basisMln,
      pct: r.pct,
      peil: rond((basisMln * r.pct) / 100),
    });
  });
  return uit;
}

/**
 * Posten om op te bezuinigen: grote posten die niet op slot zitten, de grootste eerst. Elke ronde
 * een andere.
 */
export function bezuinigPosten(data: Data, minMln = 40): Onderdeel[] {
  return data.begroting.onderdelen
    .filter((o) => !o.vergrendeld && o.lasten_mln >= minMln)
    .sort((a, b) => b.lasten_mln - a.lasten_mln);
}

/** Hoeveel bezuinigen op een post het peil laat stijgen. */
export function bezuinigPeil(o: Onderdeel): number {
  return rond((o.lasten_mln * BEZUINIG_PCT) / 100);
}

/** Hoeveel meer OZB het peil laat stijgen. */
export function ozbPeil(data: Data): number {
  return rond((data.kengetallen.ozb_x1000 / 1000) * (OZB_PCT / 100));
}

/** Het nieuwe peil, tussen de wanden. */
export function nieuwPeil(peil: number, verandering: number): number {
  return rond(Math.max(-WAND, Math.min(WAND, peil + verandering)));
}

export function isVeilig(peil: number): boolean {
  return Math.abs(peil) <= VEILIG;
}

/** Score: elke veilige ronde telt even zwaar, samen 100. */
export function sluisScore(veiligeRondes: number, rondes: number): number {
  return rondes > 0 ? Math.round((veiligeRondes / rondes) * 100) : 0;
}

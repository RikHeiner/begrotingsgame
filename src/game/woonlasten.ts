/**
 * Woonlasten vergeleken met andere gemeenten (BEVINDINGEN punt 49), voor "Wat betekent het voor
 * mij?". De cijfers komen uit data/woonlasten-JJJJ.json (COELO, Atlas van de lokale lasten). Het
 * gaat om een standaardhuishouden van COELO, niet om het huishouden dat de speler invult: alleen
 * zo zijn de gemeenten met elkaar te vergelijken.
 */
import type { Keuzes } from '../engine';
import type { Woonlasten } from '../engine/schema';

/** Gemeentecode van Groningen; geldt als het bestand geen andere gemeente noemt. */
const GRONINGEN = '0014';
/** Zoveel grootste gemeenten (naar inwoners) komen in de lijst met grote steden. */
export const AANTAL_STEDEN = 12;

export type Soort = 'koop' | 'huur';
export type Grootte = 'een' | 'meer';

export type Rij = { code: string; naam: string; bedrag: number; eigen: boolean };

export type Vergelijking = {
  jaar: number;
  soort: Soort;
  grootte: Grootte;
  naam: string;
  nu: number;
  /** met de OZB-keuze van de speler (afval en riool zijn in de game vast) */
  straks: number;
  gemiddelde?: number;
  /** rangnummer, 1 = laagste woonlasten */
  rang?: { nu: number; straks: number; aantal: number };
  /** grote steden, van laag naar hoog, met de eigen gemeente op het bedrag met de keuzes */
  steden: Rij[];
  /** de gemeenten in dezelfde provincie, van laag naar hoog */
  provincie: Rij[];
  provincieNaam: string;
  bronnen: string[];
};

export const grootteVan = (personen: number): Grootte => (personen <= 1 ? 'een' : 'meer');

/** Rangnummer van een bedrag tussen andere bedragen: 1 + het aantal dat lager is. */
export const rangnummer = (bedrag: number, anderen: number[]): number =>
  1 + anderen.filter((x) => x < bedrag - 0.005).length;

export function vergelijkWoonlasten(
  w: Woonlasten,
  keuzes: Keuzes,
  soort: Soort,
  grootte: Grootte,
): Vergelijking | undefined {
  const code = w.handmatig?.gemeente.code ?? GRONINGEN;
  const eigen = w.gemeenten.find((g) => g.code === code);
  if (!eigen) return undefined;
  const bron = (id: string) => w.bronnen.find((b) => b.id === id)?.titel;
  const ozbPct = Math.max(-100, keuzes.belastingen.t1 ?? 0);
  const anderen = w.gemeenten.filter((g) => g.code !== code);
  const rij = (g: (typeof w.gemeenten)[number], bedrag: number): Rij => ({
    code: g.code,
    naam: g.naam,
    bedrag,
    eigen: g.code === code,
  });

  if (soort === 'huur') {
    const h = w.handmatig;
    if (!h) return undefined;
    const nu = h.gemeente[`huur_${grootte}`];
    return {
      jaar: w.jaar,
      soort,
      grootte,
      naam: eigen.naam,
      nu,
      straks: nu,
      gemiddelde: h.landelijk_gemiddelde[`huur_${grootte}`],
      ...(grootte === 'meer'
        ? {
            rang: {
              nu: h.gemeente.rang_huur_meer,
              straks: h.gemeente.rang_huur_meer,
              aantal: w.gemeenten.length,
            },
          }
        : {}),
      steden: [],
      provincie: [],
      provincieNaam: eigen.provincie,
      bronnen: [bron(h.gemeente.bron), bron(h.landelijk_gemiddelde.bron)].filter(
        (b): b is string => !!b,
      ),
    };
  }

  const sleutel = `koop_${grootte}` as const;
  const nu = eigen[sleutel];
  const straks = Math.round((nu + (eigen.ozb * ozbPct) / 100) * 100) / 100;
  const bedragVan = (g: (typeof w.gemeenten)[number]) => (g.code === code ? straks : g[sleutel]);
  const oplopend = (a: Rij, b: Rij) => a.bedrag - b.bedrag || a.naam.localeCompare(b.naam, 'nl');
  const grootste = [...w.gemeenten]
    .filter((g) => g.inwoners)
    .sort((a, b) => (b.inwoners ?? 0) - (a.inwoners ?? 0))
    .slice(0, AANTAL_STEDEN);
  if (!grootste.some((g) => g.code === code)) grootste.push(eigen);
  const anderenBedrag = anderen.map((g) => g[sleutel]);
  return {
    jaar: w.jaar,
    soort,
    grootte,
    naam: eigen.naam,
    nu,
    straks,
    ...(w.handmatig ? { gemiddelde: w.handmatig.landelijk_gemiddelde[sleutel] } : {}),
    rang: {
      nu: rangnummer(nu, anderenBedrag),
      straks: rangnummer(straks, anderenBedrag),
      aantal: w.gemeenten.length,
    },
    steden: grootste.map((g) => rij(g, bedragVan(g))).sort(oplopend),
    provincie: w.gemeenten
      .filter((g) => g.provincie === eigen.provincie)
      .map((g) => rij(g, bedragVan(g)))
      .sort(oplopend),
    provincieNaam: eigen.provincie,
    bronnen: [
      bron('coelo'),
      w.handmatig ? bron(w.handmatig.landelijk_gemiddelde.bron) : undefined,
      bron('cbs'),
    ].filter((b): b is string => !!b),
  };
}

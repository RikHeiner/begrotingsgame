/**
 * Groninger Museum, "Moet of mag?": is een post verplicht van de wet, een eigen keuze van de
 * gemeente, of levert hij geld op? Overlap: "levert geld op" gaat voor "verplicht", en dat gaat
 * voor "eigen keuze".
 */
import { grensOnderdeel, type Data } from '../engine';
import type { Belasting, Onderdeel } from '../engine/schema';
import { schud, vraagPosten } from './minigames';

export type Categorie = 'verplicht' | 'keuze' | 'geld';

export const CATEGORIEEN: { id: Categorie; tekst: string }[] = [
  { id: 'verplicht', tekst: 'Verplicht van de wet' },
  { id: 'keuze', tekst: 'Eigen keuze van de gemeente' },
  { id: 'geld', tekst: 'Levert geld op' },
];

export const KAARTEN = 10;

export type MuseumKaart = {
  id: string;
  naam: string;
  belasting: boolean;
  /** kosten (post) of opbrengst (belasting), in miljoenen */
  bedragMln: number;
  /** inkomsten die bij de post horen, in miljoenen */
  batenMln: number;
  categorie: Categorie;
  /** de reden van het minimum, als die er is */
  reden?: string;
};

export function isVerplicht(o: Onderdeel): boolean {
  return (
    o.wettelijke_taak || o.vergrendeld || o.minimum?.soort === 'wet' || o.minimum?.soort === 'gr'
  );
}

/** De categorie van een post, of undefined als hij in geen enkele categorie past. */
export function categorieVan(o: Onderdeel): Categorie | undefined {
  if (o.gekoppelde_baten_mln > o.lasten_mln) return 'geld';
  if (isVerplicht(o)) return 'verplicht';
  if (grensOnderdeel(o).min <= -100 && !o.minimum) return 'keuze';
  return undefined;
}

function redenVan(o: Onderdeel): string | undefined {
  const g = grensOnderdeel(o);
  return g.minReden ?? (o.vergrendeld ? o.reden_vergrendeld : null) ?? o.minimum?.reden;
}

export function kaartVanPost(o: Onderdeel): MuseumKaart | undefined {
  const categorie = categorieVan(o);
  if (!categorie) return undefined;
  const reden = redenVan(o);
  return {
    id: o.id,
    naam: o.naam,
    belasting: false,
    bedragMln: o.lasten_mln,
    batenMln: o.gekoppelde_baten_mln,
    categorie,
    ...(reden ? { reden } : {}),
  };
}

export function kaartVanBelasting(b: Belasting): MuseumKaart {
  return {
    id: b.id,
    naam: b.naam,
    belasting: true,
    bedragMln: b.opbrengst_mln,
    batenMln: b.opbrengst_mln,
    categorie: 'geld',
  };
}

/** Alle kaarten die mee kunnen doen. */
export function alleKaarten(data: Data): MuseumKaart[] {
  const posten = vraagPosten(data)
    .map(kaartVanPost)
    .filter((k): k is MuseumKaart => !!k);
  return [...posten, ...data.begroting.belastingen.map(kaartVanBelasting)];
}

/** Kaarten voor één spel: elke categorie minstens drie keer (als dat kan), daarna willekeurig. */
export function museumKaarten(
  data: Data,
  aantal = KAARTEN,
  kans: () => number = Math.random,
): MuseumKaart[] {
  const alle = schud(alleKaarten(data), kans);
  const perSoort = Math.floor(aantal / CATEGORIEEN.length);
  const gekozen: MuseumKaart[] = [];
  for (const { id } of CATEGORIEEN)
    gekozen.push(...alle.filter((k) => k.categorie === id).slice(0, perSoort));
  for (const k of alle) {
    if (gekozen.length >= aantal) break;
    if (!gekozen.includes(k)) gekozen.push(k);
  }
  return schud(gekozen, kans);
}

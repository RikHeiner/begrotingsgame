/**
 * Beginnen bij nul: elke post op het laagste niveau dat kan. Wettelijke taken op hun minimum, vaste
 * posten (bijstand, Veiligheidsregio, rente) blijven, de rest gaat naar nul. De belastingen blijven
 * zoals in de begroting. De speler verdeelt daarna zelf het geld dat vrijkomt.
 */
import { grensOnderdeel, GEEN_KEUZES, type Data, type Keuzes, type Resultaat } from '../engine';
import { themaVan, THEMA_BELASTINGEN, THEMA_KAARTEN } from './score';

export function nulbasisKeuzes(data: Data): Keuzes {
  const onderdelen: Record<string, number> = {};
  for (const o of data.begroting.onderdelen) {
    const g = grensOnderdeel(o);
    if (g.min < 0) onderdelen[o.id] = g.min;
  }
  return { ...GEEN_KEUZES, onderdelen, scenario: data.config.scenario };
}

export type CollegeRij = {
  thema: string;
  /** uitgaven (of bij belastingen: inkomsten) in de begroting van het college, euro's */
  college: number;
  /** hetzelfde met de keuzes van de speler */
  jij: number;
};

/**
 * Jouw begroting naast die van het college, per thema, in het eerste jaar. Uitgaven per thema,
 * en apart de inkomsten uit belastingen en de losse maatregelen (kaarten).
 */
export function vergelijkMetCollege(data: Data, r: Resultaat): CollegeRij[] {
  const jaar = data.jaren[0];
  const rijen = new Map<string, CollegeRij>();
  const rij = (thema: string) => {
    const bestaand = rijen.get(thema) ?? { thema, college: 0, jij: 0 };
    rijen.set(thema, bestaand);
    return bestaand;
  };
  for (const o of data.begroting.onderdelen) {
    const x = rij(themaVan(data, o.id));
    const lasten = (o.lasten_per_jaar_mln?.[String(jaar)] ?? o.lasten_mln) * 1e6;
    x.college += lasten;
    x.jij += lasten;
  }
  const belasting = rij(THEMA_BELASTINGEN);
  for (const b of data.begroting.belastingen) {
    belasting.college += b.opbrengst_mln * 1e6;
    belasting.jij += b.opbrengst_mln * 1e6;
  }
  for (const e of r.effecten) {
    if (e.jaar !== jaar || e.stap !== 'direct') continue;
    const thema = themaVan(data, e.bron);
    // Bij uitgaven betekent een gunstig effect (+) minder uitgeven; bij inkomsten meer inkomsten.
    if (thema === THEMA_BELASTINGEN) rij(thema).jij += e.bedrag;
    else if (thema === THEMA_KAARTEN) rij(thema).jij -= e.bedrag;
    else if (e.kant === 'lasten') rij(thema).jij -= e.bedrag;
  }
  return [...rijen.values()].filter((x) => Math.abs(x.college) > 1 || Math.abs(x.jij) > 1);
}

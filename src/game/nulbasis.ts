/**
 * Beginnen bij nul (de standaard): elke post op het laagste niveau dat kan. Wettelijke taken op het
 * minimum dat de wet vraagt, vaste posten (bijstand, Veiligheidsregio, rente) blijven, de rest gaat
 * naar nul. Posten die meer opleveren dan ze kosten blijven staan: schrappen kost dan geld. Ook de
 * belastingen staan op hun wettelijke minimum (nul). De speler kiest daarna zelf wat er weer bij
 * komt, en welke belastingen hij heft om dat te betalen.
 */
import {
  bereken,
  grensBelasting,
  grensOnderdeel,
  GEEN_KEUZES,
  type Data,
  type Keuzes,
  type Resultaat,
} from '../engine';
import { parkeerPosten } from '../engine/parkeren';
import { programmaPct } from './beleidshuis';
import { themaVan, THEMA_BELASTINGEN, THEMA_KAARTEN } from './score';

/** Waar de speler begint: bij nul, of met de begroting van het college. */
export type Beginpunt = 'nul' | 'college';

const collegeKeuzes = (data: Data): Keuzes => ({ ...GEEN_KEUZES, scenario: data.config.scenario });

/** Het structurele saldo over alle jaren samen. */
const saldoOverJaren = (data: Data, r: Resultaat) =>
  data.jaren.reduce((s, j) => s + (r.perJaar[j]?.structureel ?? 0), 0);

/**
 * Posten waarvan schrappen geld kost: alleen deze post naar zijn minimum, en dan is het saldo over
 * alle jaren samen niet beter. Bijvoorbeeld bedrijfsafval (de inkomsten zijn hoger dan de kosten)
 * en parkeercontrole (zonder controle betaalt bijna niemand voor parkeren).
 */
/**
 * De belastingen en parkeertarieven op hun minimum. De Gemeentewet zegt bij de OZB, de
 * parkeerbelasting, de toeristenbelasting, de precario en de reclamebelasting dat de gemeente ze
 * "kan" heffen: het wettelijke minimum is nul. Afval en riool zitten vast (kostendekkend).
 */
function belastingenOpMinimum(data: Data): Pick<Keuzes, 'belastingen' | 'parkeren'> {
  const belastingen: Record<string, number> = {};
  for (const b of data.begroting.belastingen) {
    if (data.parkeren && b.id === data.parkeren.opbrengst.belasting) continue;
    const g = grensBelasting(b);
    if (g.min < 0) belastingen[b.id] = g.min;
  }
  const parkeren: Record<string, number> = {};
  for (const p of parkeerPosten(data)) if (p.min < 0) parkeren[p.id] = p.min;
  return { belastingen, ...(Object.keys(parkeren).length ? { parkeren } : {}) };
}

/**
 * Posten waarvan schrappen geld kost: alleen deze post naar zijn minimum, en dan is het saldo over
 * alle jaren samen niet beter. Bijvoorbeeld bedrijfsafval (de inkomsten zijn hoger dan de kosten).
 * Gerekend met de belastingen al op hun minimum, zoals bij nul.
 */
export function postenDieOpleveren(data: Data): Set<string> {
  const basis = { ...collegeKeuzes(data), ...belastingenOpMinimum(data) };
  const nul = saldoOverJaren(data, bereken(data, basis));
  const uit = new Set<string>();
  for (const o of data.begroting.onderdelen) {
    const g = grensOnderdeel(o);
    if (g.min >= 0) continue;
    const r = bereken(data, { ...basis, onderdelen: { [o.id]: g.min } });
    if (saldoOverJaren(data, r) <= nul + 1) uit.add(o.id);
  }
  return uit;
}

// Eén keer per dataset uitrekenen (ongeveer 90 berekeningen).
const cache = new WeakMap<Data, Keuzes>();

export function nulbasisKeuzes(data: Data): Keuzes {
  const bewaard = cache.get(data);
  if (bewaard) return bewaard;
  const houden = postenDieOpleveren(data);
  const onderdelen: Record<string, number> = {};
  for (const o of data.begroting.onderdelen) {
    const g = grensOnderdeel(o);
    if (g.min < 0 && !houden.has(o.id)) onderdelen[o.id] = g.min;
  }
  // De programma's in het Beleidshuis lopen, zoals de gemeente ze nu uitvoert: hun geld blijft in
  // de post (structureel) of komt eenmalig in het eerste jaar (zie rekenen.ts). De speler kan ze
  // stopzetten.
  for (const p of data.index.programmas.values()) {
    if (p.structureel_of_incidenteel !== 'S' || onderdelen[p.post] === undefined) continue;
    onderdelen[p.post] =
      Math.round(((onderdelen[p.post] ?? 0) + programmaPct(data, p)) * 1e4) / 1e4;
  }
  const k = {
    ...collegeKeuzes(data),
    ...belastingenOpMinimum(data),
    onderdelen,
    nulbasis: true,
  };
  cache.set(data, k);
  return k;
}

/** De keuzes waarmee de game begint. */
export function beginKeuzes(data: Data, beginpunt: Beginpunt): Keuzes {
  return beginpunt === 'nul' ? nulbasisKeuzes(data) : collegeKeuzes(data);
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

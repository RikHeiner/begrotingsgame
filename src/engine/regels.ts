/**
 * Spelregels: grenzen per post (vergrendeld, wettelijke taak, min/max), structureel sluitend,
 * eenmalig geld niet voor vaste lasten, en het weerstandsvermogen.
 */
import { parkeerGemiddelde, parkeerPosten } from './parkeren';
import { EPSILON, vanDuizend, vanMln } from './eenheden';
import { formatMln, formatPct } from './format';
import type { Data } from './laadData';
import type { Belasting, Onderdeel } from './schema';
import { vanMln as mln } from './eenheden';
import type { Keuzes } from './types';

export type Grens = {
  min: number;
  max: number;
  /** waarom er een maximum is, of waarom de post vastzit */
  reden?: string;
  /** waarom het niet lager kan dan min (zie `minimum` in de data) */
  minReden?: string;
};

export function grensOnderdeel(o: Onderdeel): Grens {
  if (o.vergrendeld || o.min_pct === null) {
    return {
      min: 0,
      max: 0,
      reden: `🔒 ${o.reden_vergrendeld ?? 'Deze post kun je in de game niet aanpassen.'}`,
    };
  }
  // Zonder max_pct is er geen maximum: meer uitgeven mag, als er dekking is.
  return {
    min: o.min_pct,
    max: o.max_pct ?? Infinity,
    ...(o.max_reden ? { reden: o.max_reden } : {}),
    ...(o.minimum && o.min_pct > -100 ? { minReden: o.minimum.reden } : {}),
  };
}

export function grensBelasting(b: Belasting): Grens {
  return { min: b.min_pct, max: b.max_pct ?? Infinity };
}

/** Uitleg waarom een percentage buiten de grens valt, of undefined als het mag. */
export function buitenGrens(
  naam: string,
  pct: number,
  grens: Grens,
  wettelijk: boolean,
): string | undefined {
  if (grens.min === 0 && grens.max === 0 && pct !== 0) return grens.reden;
  if (pct < grens.min) {
    if (grens.minReden)
      return `${wettelijk ? '🔒 ' : ''}Bij ${naam} kan het niet lager dan ${formatPct(grens.min)}. ${grens.minReden}`;
    return wettelijk
      ? `🔒 ${naam} is een wettelijke taak. De gemeente moet dit blijven doen. Verder dan ${formatPct(grens.min)} kan niet.`
      : `Bij ${naam} kan het niet verder omlaag dan ${formatPct(grens.min)}.`;
  }
  if (pct > grens.max)
    return `Bij ${naam} kan het niet verder omhoog dan ${formatPct(grens.max)}.${grens.reden ? ` ${grens.reden}` : ''}`;
  return undefined;
}

const klem = (x: number, min: number, max: number): number => Math.min(max, Math.max(min, x));

/**
 * Past de grenzen toe: percentages worden afgekapt, onbekende ids en nul-waarden vallen weg,
 * dubbele kaarten worden één kaart. Geeft ook terug wat er is aangepast.
 */
export function normaliseer(data: Data, keuzes: Keuzes): { keuzes: Keuzes; correcties: string[] } {
  const correcties: string[] = [];
  const onderdelen: Record<string, number> = {};
  for (const [id, pct] of Object.entries(keuzes.onderdelen)) {
    const o = data.index.onderdelen.get(id);
    if (!o) {
      correcties.push(`Onbekende post "${id}" is overgeslagen.`);
      continue;
    }
    if (!Number.isFinite(pct)) {
      correcties.push(`${o.naam}: geen geldig percentage.`);
      continue;
    }
    const grens = grensOnderdeel(o);
    const reden = buitenGrens(o.naam, pct, grens, o.wettelijke_taak);
    if (reden) correcties.push(reden);
    const waarde = klem(pct, grens.min, grens.max);
    if (waarde !== 0) onderdelen[id] = waarde;
  }

  const belastingen: Record<string, number> = {};
  for (const [id, pct] of Object.entries(keuzes.belastingen)) {
    const b = data.index.belastingen.get(id);
    if (!b) {
      correcties.push(`Onbekende belasting "${id}" is overgeslagen.`);
      continue;
    }
    if (!Number.isFinite(pct)) {
      correcties.push(`${b.naam}: geen geldig percentage.`);
      continue;
    }
    const grens = grensBelasting(b);
    const reden = buitenGrens(b.naam, pct, grens, false);
    if (reden) correcties.push(reden);
    const waarde = klem(pct, grens.min, grens.max);
    if (waarde !== 0) belastingen[id] = waarde;
  }

  // Parkeren: de keuzes per post, met t5 als gewogen gemiddelde. Een oude keuze voor t5 zonder
  // posten (bijvoorbeeld uit een deellink) geldt voor alle posten.
  let parkeren: Record<string, number> | undefined;
  if (data.parkeren) {
    const posten = new Map(parkeerPosten(data).map((x) => [x.id, x]));
    const invoer = keuzes.parkeren;
    parkeren = {};
    if (invoer && Object.keys(invoer).length) {
      for (const [id, pct] of Object.entries(invoer)) {
        const post = posten.get(id);
        if (!post) {
          correcties.push(`Onbekende parkeerpost "${id}" is overgeslagen.`);
          continue;
        }
        if (!Number.isFinite(pct)) continue;
        const grens = { min: post.min, max: post.max };
        const reden = buitenGrens(post.naam, pct, grens, false);
        if (reden) correcties.push(reden);
        const waarde = klem(pct, grens.min, grens.max);
        if (waarde !== 0) parkeren[id] = waarde;
      }
    } else if (belastingen.t5) {
      for (const post of posten.values())
        parkeren[post.id] = klem(belastingen.t5, post.min, post.max);
    }
    delete belastingen.t5;
    const gemiddeld = parkeerGemiddelde(data, parkeren);
    if (gemiddeld) belastingen.t5 = gemiddeld;
  }

  const gestopt = [...new Set(keuzes.gestopt ?? [])]
    .filter((id) => {
      if (data.index.programmas.has(id)) return true;
      correcties.push(`Onbekend programma "${id}" is overgeslagen.`);
      return false;
    })
    .sort();

  const kaarten: string[] = [];
  for (const id of keuzes.kaarten) {
    if (!data.index.kaarten.has(id)) {
      correcties.push(`Onbekende actiekaart "${id}" is overgeslagen.`);
      continue;
    }
    if (!kaarten.includes(id)) kaarten.push(id);
  }
  kaarten.sort();

  return {
    keuzes: {
      onderdelen,
      belastingen,
      ...(parkeren && Object.keys(parkeren).length ? { parkeren } : {}),
      ...(keuzes.nulbasis ? { nulbasis: true } : {}),
      kaarten,
      scenario: keuzes.scenario,
      ...normaliseerReserve(keuzes.reserve, correcties),
      ...(gestopt.length ? { gestopt } : {}),
    },
    correcties,
  };
}

function normaliseerReserve(
  reserve: Keuzes['reserve'],
  correcties: string[],
): Pick<Keuzes, 'reserve'> {
  if (!reserve) return {};
  const geldig = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0);
  const structureel = geldig(reserve.structureel);
  const eenmalig = geldig(reserve.eenmalig);
  if (structureel !== reserve.structureel || eenmalig !== reserve.eenmalig) {
    correcties.push('Een storting in de reserve kan niet negatief zijn.');
  }
  return structureel || eenmalig ? { reserve: { structureel, eenmalig } } : {};
}

/**
 * Stortingen in de algemene reserve per jaar, in euro's: de reservekeuze van de speler en de
 * actiekaarten in de `van` van fin_reserves (zoals "Reserves aanvullen").
 */
export function stortingenInReserve(data: Data, keuzes: Keuzes): Record<number, number> {
  const uit: Record<number, number> = {};
  const erbij = (jaar: number, bedrag: number) => (uit[jaar] = (uit[jaar] ?? 0) + bedrag);
  const van = data.index.verbanden.get('fin_reserves')?.van ?? [];
  for (const id of keuzes.kaarten) {
    const k = data.index.kaarten.get(id);
    if (!k || !van.includes(id) || k.soort !== 'uitgave') continue;
    data.jaren.forEach((jaar, j) => {
      if (k.structureel_of_incidenteel === 'S' || j === 0) erbij(jaar, Math.abs(mln(k.bedrag_mln)));
    });
  }
  if (keuzes.reserve) {
    data.jaren.forEach((jaar, j) => {
      erbij(
        jaar,
        (keuzes.reserve?.structureel ?? 0) + (j === 0 ? (keuzes.reserve?.eenmalig ?? 0) : 0),
      );
    });
  }
  return uit;
}

/** Controleert of de begroting sluit, per jaar. Saldo's in euro's. */
export function controleerSluitend(
  jaren: number[],
  saldo: Record<number, { structureel: number; incidenteel: number }>,
): { sluitend: boolean; perJaarSluitend: Record<number, boolean>; overtredingen: string[] } {
  const perJaarSluitend: Record<number, boolean> = {};
  const overtredingen: string[] = [];
  for (const jaar of jaren) {
    const s = saldo[jaar] ?? { structureel: 0, incidenteel: 0 };
    const structureelOk = s.structureel >= -EPSILON;
    const totaalOk = s.structureel + s.incidenteel >= -EPSILON;
    perJaarSluitend[jaar] = structureelOk && totaalOk;
    if (!structureelOk && totaalOk) {
      overtredingen.push(
        `${jaar}: je dekt vaste lasten met eenmalig geld. Structureel kom je ${formatMln(-s.structureel)} tekort.`,
      );
    } else if (!structureelOk) {
      overtredingen.push(`${jaar}: structureel kom je ${formatMln(-s.structureel)} tekort.`);
    } else if (!totaalOk) {
      overtredingen.push(
        `${jaar}: je eenmalige uitgaven zijn ${formatMln(-(s.structureel + s.incidenteel))} hoger dan je dekking.`,
      );
    }
  }
  return {
    sluitend: jaren.every((j) => perJaarSluitend[j]),
    perJaarSluitend,
    overtredingen,
  };
}

/** Parameters van het dwarsverband fin_reserves, met terugval op de kengetallen. */
export function weerstandBasis(data: Data): {
  reserve: number;
  ratio: number;
  benodigd: number;
  ondergrens: number;
} {
  const params = data.index.verbanden.get('fin_reserves')?.parameters ?? {};
  const getal = (naam: string): number | null => {
    const w = params[naam]?.waarde;
    return typeof w === 'number' ? w : null;
  };
  const reserve =
    getal('algemene_reserve') !== null
      ? vanMln(getal('algemene_reserve') ?? 0)
      : vanDuizend(data.kengetallen.algemene_reserve_x1000);
  const ratio =
    getal(`ratio_${data.begroting.begrotingsjaar}`) ?? data.kengetallen.ratio_weerstandsvermogen;
  return { reserve, ratio, benodigd: reserve / ratio, ondergrens: getal('ondergrens_ratio') ?? 1 };
}

/**
 * Weerstandsvermogen per jaar (spelregel, zie data/SCHEMA.md): de algemene reserve groeit alleen met
 * stortingen die de speler kiest. Een overschot is vrije ruimte en gaat niet vanzelf naar de reserve;
 * een tekort gaat er wel af. De benodigde weerstandscapaciteit blijft gelijk.
 */
export function weerstandPerJaar(
  data: Data,
  jaren: number[],
  saldo: Record<number, { structureel: number; incidenteel: number }>,
  stortingen: Record<number, number>,
): Record<number, number> {
  const { reserve, benodigd } = weerstandBasis(data);
  let stand = reserve;
  const uit: Record<number, number> = {};
  for (const jaar of jaren) {
    const s = saldo[jaar] ?? { structureel: 0, incidenteel: 0 };
    stand += Math.min(0, s.structureel + s.incidenteel) + (stortingen[jaar] ?? 0);
    uit[jaar] = stand / benodigd;
  }
  return uit;
}

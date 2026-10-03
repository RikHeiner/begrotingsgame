/**
 * Badges, sterren en de teksten op het eindscherm. Pure functies over het resultaat van de
 * rekenmotor; geen bedragen in de code, de drempels staan in data/spel/badges.json.
 */
import {
  bereken,
  EIGEN_PREFIX,
  formatMln,
  formatPct,
  PARKEER_PREFIX,
  parkeerPostVan,
  type Data,
  type Keuzes,
  type Resultaat,
} from '../engine';
import { evalueer, parseer } from '../engine/expressie';
import type { Persona } from '../engine/schema';
import { alsGezamenlijkeKeuzes } from '../engine/vvd';
import { maakLezer } from './reacties/context';
import { gebouwStanden } from './toestand';

export type Lezer = (naam: string) => number;

export function lezerVoor(data: Data, r: Resultaat): Lezer {
  return maakLezer(data, r, gebouwStanden(data, data.kaart, r));
}

const waar = (voorwaarde: string, lees: Lezer) => evalueer(parseer(voorwaarde), lees) !== 0;

export function behaaldeBadges(data: Data, lees: Lezer) {
  return data.badges.badges.filter((b) => waar(b.voorwaarde, lees));
}

export type Ster = { id: string; label: string; gehaald: boolean };

/**
 * Drie sterren voor een gezonde begroting. Geen missies en geen meters meer (besluit 1 oktober
 * 2026): iedereen maakt zijn eigen begroting.
 */
export function sterren(data: Data, r: Resultaat): Ster[] {
  const s = data.badges.score;
  const jaren = data.jaren.map((j) => r.perJaar[j]);
  const sluitendTotaal = jaren.every((j) => (j?.structureel ?? 0) + (j?.incidenteel ?? 0) >= -0.5);
  const structureelSluitend = jaren.every((j) => (j?.structureel ?? 0) >= -0.5);
  const minimum = Math.min(...jaren.map((j) => j?.structureel ?? 0));
  return [
    { id: 'sluitend', label: 'Je begroting sluit in alle jaren', gehaald: sluitendTotaal },
    {
      id: 'gezond',
      label: `Elk jaar minstens ${formatMln(s.gezond_mln * 1e6)} over`,
      gehaald: minimum >= s.gezond_mln * 1e6,
    },
    { id: 'eenmalig', label: 'Geen eenmalig geld voor vaste lasten', gehaald: structureelSluitend },
  ];
}

// ---------------------------------------------------------------------------------------------
// Inwoners
// ---------------------------------------------------------------------------------------------

/** id: de post, belasting of kaart waar het over gaat */
export type Invloed = { waarde: number; tekst: string; id: string };

/** Wat een inwoner merkt van jouw keuzes, het sterkst eerst (gewicht × wijziging, + = blij). */
export function personaInvloeden(data: Data, r: Resultaat, p: Persona): Invloed[] {
  const k = r.keuzes;
  const uit: Invloed[] = [];
  for (const [id, w] of Object.entries(p.posten)) {
    const o = data.index.onderdelen.get(id);
    const b = data.index.belastingen.get(id);
    const kaart = data.index.kaarten.get(id);
    const parkeer = parkeerPostVan(data, id);
    const pct = o
      ? (k.onderdelen[id] ?? 0)
      : b
        ? (k.belastingen[id] ?? 0)
        : parkeer
          ? (k.parkeren?.[parkeer.id] ?? 0)
          : k.kaarten.includes(id)
            ? 100
            : 0;
    if (!pct) continue;
    const tekst = o
      ? `${pct < 0 ? 'minder' : 'meer'} geld voor ${kleineLetters(o.naam)} (${formatPct(pct)})`
      : b
        ? `een ${pct < 0 ? 'lagere' : 'hogere'} ${kleineLetters(b.naam.split(' (')[0] ?? '')} (${formatPct(pct)})`
        : parkeer
          ? `een ${pct < 0 ? 'lagere' : 'hogere'} prijs voor de ${kleineLetters(parkeer.naam)} (${formatPct(pct)})`
          : `de keuze "${kaart?.naam ?? id}"`;
    uit.push({ waarde: w * pct, tekst, id });
  }
  return uit.sort((a, z) => Math.abs(z.waarde) - Math.abs(a.waarde));
}

/** Een zin per inwoner over wat hij of zij het meest merkt. Kwalitatief: geen verzonnen bedragen. */
export function personaZinnen(
  data: Data,
  r: Resultaat,
): { id: string; naam: string; zin: string }[] {
  return data.personas.personas.map((p) => {
    const beste = personaInvloeden(data, r, p)[0];
    const naam = p.naam;
    const meervoud = / en /.test(naam);
    const zin = !beste
      ? `${naam} ${meervoud ? 'merken' : 'merkt'} weinig van jouw begroting.`
      : beste.waarde > 0
        ? `${naam} ${meervoud ? 'zijn' : 'is'} vooral blij met ${beste.tekst}.`
        : `${naam} ${meervoud ? 'gaan' : 'gaat'} erop achteruit door ${beste.tekst}.`;
    return { id: p.id, naam, zin };
  });
}

/**
 * Een naam midden in een zin: alleen het eerste woord krijgt een kleine letter. Bevat de naam
 * (buiten de haakjes) een eigennaam, zoals "Groninger Archieven", dan blijft hij zoals hij is.
 * Afkortingen als ICT en OZB blijven altijd hoofdletters.
 */
export function kleineLetters(tekst: string): string {
  const [eerste = '', ...rest] = tekst.split(' ');
  const zonderHaakjes = rest.join(' ').replace(/\([^)]*\)/g, '');
  if (/[A-Z]{2,}/.test(eerste) || /(^|\s)[A-Z]/.test(zonderHaakjes)) return tekst;
  return [eerste.toLowerCase(), ...rest].join(' ');
}

// ---------------------------------------------------------------------------------------------
// Wat stopt en wat komt erbij
// ---------------------------------------------------------------------------------------------

export type Maatregel = {
  id: string;
  naam: string;
  wijziging: string;
  tekst: string;
  bedrag: number;
  soort: 'S' | 'I';
};

function directBedrag(data: Data, r: Resultaat, bron: string): number {
  const jaar = data.jaren[0];
  return r.effecten
    .filter((e) => e.jaar === jaar && e.stap === 'direct' && e.bron === bron)
    .reduce((s, e) => s + e.bedrag, 0);
}

/** Bezuinigingen en opbrengsten ("dit doet de gemeente niet meer") en investeringen en lastenverlichting. */
export function maatregelen(
  data: Data,
  r: Resultaat,
): { minder: Maatregel[]; meer: Maatregel[]; belasting: Maatregel[] } {
  const k = r.keuzes;
  const minder: Maatregel[] = [];
  const meer: Maatregel[] = [];
  const belasting: Maatregel[] = [];
  for (const [id, pct] of Object.entries(k.onderdelen)) {
    const o = data.index.onderdelen.get(id);
    if (!o) continue;
    const m = {
      id,
      naam: o.naam,
      wijziging: formatPct(pct),
      tekst: (pct < 0 ? o.tekst_bezuinigen : o.tekst_investeren) ?? '',
      bedrag: directBedrag(data, r, id),
      soort: 'S' as const,
    };
    (pct < 0 ? minder : meer).push(m);
  }
  for (const [id, pct] of Object.entries(k.belastingen)) {
    const b = data.index.belastingen.get(id);
    if (!b || id === data.parkeren?.opbrengst.belasting) continue;
    const m = {
      id,
      naam: b.naam,
      wijziging: formatPct(pct),
      tekst: b.uitleg,
      bedrag: directBedrag(data, r, id),
      soort: 'S' as const,
    };
    (pct < 0 ? meer : belasting).push(m);
  }
  // Parkeren per vergunning en zone (zie engine/parkeren.ts)
  for (const [id, pct] of Object.entries(k.parkeren ?? {})) {
    const post = parkeerPostVan(data, `${PARKEER_PREFIX}${id}`);
    if (!post || !pct) continue;
    const m = {
      id: `${PARKEER_PREFIX}${id}`,
      naam: post.naam,
      wijziging: formatPct(pct),
      tekst: post.uitleg,
      bedrag: directBedrag(data, r, `${PARKEER_PREFIX}${id}`),
      soort: 'S' as const,
    };
    (pct < 0 ? meer : belasting).push(m);
  }
  for (const id of k.kaarten) {
    const kaart = data.index.kaarten.get(id);
    if (!kaart) continue;
    const m = {
      id,
      naam: kaart.naam,
      wijziging: kaart.structureel_of_incidenteel === 'S' ? 'elk jaar' : 'eenmalig',
      tekst: kaart.uitleg,
      bedrag: directBedrag(data, r, id),
      soort: kaart.structureel_of_incidenteel,
    };
    (kaart.soort === 'opbrengst' ? minder : meer).push(m);
  }
  const opBedrag = (a: Maatregel, b: Maatregel) =>
    Math.abs(b.bedrag) - Math.abs(a.bedrag) || a.id.localeCompare(b.id);
  return {
    minder: minder.sort(opBedrag),
    meer: meer.sort(opBedrag),
    belasting: belasting.sort(opBedrag),
  };
}

/** Structureel saldo in het laatste jaar bij elk scenario. */
export function gevoeligheid(
  data: Data,
  keuzes: Keuzes,
): Record<'voorzichtig' | 'midden' | 'optimistisch', number> {
  const laatste = data.jaren.at(-1) ?? 0;
  const s = (scenario: Keuzes['scenario']) =>
    bereken(data, { ...keuzes, scenario }).perJaar[laatste]?.structureel ?? 0;
  return { voorzichtig: s('voorzichtig'), midden: s('midden'), optimistisch: s('optimistisch') };
}

// ---------------------------------------------------------------------------------------------
// Vergelijking per thema
// ---------------------------------------------------------------------------------------------

export const THEMA_BELASTINGEN = 'Belastingen';
export const THEMA_KAARTEN = 'Losse maatregelen';
export const THEMA_OVERIG = 'Niet in de game';
export const THEMA_EIGEN = 'Eigen voorstellen';

export function themaVan(data: Data, id: string | null): string {
  if (!id) return THEMA_OVERIG;
  const o = data.index.onderdelen.get(id);
  if (o) return data.gebouwen.find((g) => g.id === o.gebouw)?.thema ?? THEMA_OVERIG;
  if (data.index.belastingen.has(id) || id.startsWith(PARKEER_PREFIX)) return THEMA_BELASTINGEN;
  if (data.index.kaarten.has(id)) return THEMA_KAARTEN;
  if (id.startsWith(EIGEN_PREFIX)) return THEMA_EIGEN;
  return THEMA_OVERIG;
}

export type ThemaRij = { thema: string; jij: number; vergelijking: number };

/**
 * Jouw keuzes per thema naast een tegenbegroting (eerste jaar, directe effecten, + = levert op).
 * De begroting van het college is per definitie 0: dat is de ontwerpbegroting zelf.
 */
export function vergelijkPerThema(
  data: Data,
  r: Resultaat,
  tegenbegroting?: Data['vergelijking'][number]['tegenbegroting'],
): ThemaRij[] {
  const jaar = data.jaren[0];
  const rijen = new Map<string, ThemaRij>();
  const rij = (thema: string) => {
    const bestaand = rijen.get(thema) ?? { thema, jij: 0, vergelijking: 0 };
    rijen.set(thema, bestaand);
    return bestaand;
  };
  for (const g of data.gebouwen) if (g.onderdelen.length) rij(g.thema);
  for (const e of r.effecten) {
    if (e.jaar !== jaar || e.stap !== 'direct') continue;
    rij(themaVan(data, e.bron)).jij += e.bedrag;
  }
  if (tegenbegroting) {
    for (const p of tegenbegroting.ombuigingen_en_opbrengsten)
      rij(themaVan(data, p.game_koppeling)).vergelijking += p.bedrag_mln * 1e6;
    for (const p of tegenbegroting.uitgaven)
      rij(themaVan(data, p.game_koppeling)).vergelijking -= p.bedrag_mln * 1e6;
  }
  return [...rijen.values()].filter((x) => Math.abs(x.jij) > 1 || Math.abs(x.vergelijking) > 1);
}

/** De keuzes die bij een tegenbegroting horen (voor "speel de VVD-begroting"). */
export function keuzesVanTegenbegroting(
  data: Data,
  tb: Data['vergelijking'][number]['tegenbegroting'],
): Keuzes {
  return alsGezamenlijkeKeuzes(data, tb);
}

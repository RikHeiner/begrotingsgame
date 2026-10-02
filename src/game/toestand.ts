/**
 * Toestand van een gebouw op de kaart (opdracht 8.3), afgeleid van het gewogen gemiddelde
 * percentage van zijn posten (gewogen naar lasten, alleen niet-vergrendelde posten).
 * De drempels staan in data/spel/kaart.json.
 */
import { PARKEER_PREFIX, type Data, type Resultaat } from '../engine';
import type { Gebouw, KaartData } from '../engine/schema';

export type Toestand = 'bloeiend' | 'beter' | 'normaal' | 'versoberd' | 'gesloten';
export const TOESTANDEN: readonly Toestand[] = [
  'gesloten',
  'versoberd',
  'normaal',
  'beter',
  'bloeiend',
];

export const TOESTAND_NAAM: Record<Toestand, string> = {
  bloeiend: 'Bloeiend',
  beter: 'Beter',
  normaal: 'Normaal',
  versoberd: 'Versoberd',
  gesloten: 'Gesloten',
};

/** Gewogen gemiddeld percentage van de posten van een gebouw. */
export function gebouwScore(
  data: Data,
  gebouw: Gebouw,
  onderdelen: Record<string, number>,
): number {
  let totaal = 0;
  let gewogen = 0;
  for (const id of gebouw.onderdelen) {
    const o = data.index.onderdelen.get(id);
    if (!o || o.vergrendeld) continue;
    totaal += o.lasten_mln;
    gewogen += o.lasten_mln * (onderdelen[id] ?? 0);
  }
  return totaal > 0 ? gewogen / totaal : 0;
}

export function toestandBij(score: number, d: KaartData['toestanden']): Toestand {
  if (score <= d.gesloten_tot) return 'gesloten';
  if (score < d.versoberd_tot) return 'versoberd';
  if (score <= d.normaal_tot) return 'normaal';
  if (score <= d.beter_tot) return 'beter';
  return 'bloeiend';
}

/** Netto effect van een gebouw op het saldo in een jaar (standaard het eerste; euro's, + = gunstig). */
export function gebouwBedrag(
  data: Data,
  gebouw: Gebouw,
  r: Resultaat,
  jaar = data.jaren[0],
): number {
  const bronnen = new Set<string>(
    gebouw.soort === 'loket'
      ? data.begroting.belastingen.map((b) => b.id)
      : gebouw.soort === 'veilinghuis' || gebouw.soort === 'beleidshuis'
        ? data.begroting.actiekaarten
            .filter((k) =>
              gebouw.soort === 'beleidshuis'
                ? k.gebouw === gebouw.id
                : !k.gebouw || k.gebouw === gebouw.id,
            )
            .map((k) => k.id)
        : gebouw.onderdelen,
  );
  // Parkeren per vergunning en zone hoort bij het gebouw uit de parkeerdata, niet bij het loket.
  const parkeren = data.parkeren?.opbrengst.gebouw === gebouw.id;
  return r.effecten
    .filter(
      (e) =>
        e.jaar === jaar &&
        e.stap === 'direct' &&
        (bronnen.has(e.bron) || (parkeren && e.bron.startsWith(PARKEER_PREFIX))),
    )
    .reduce((s, e) => s + e.bedrag, 0);
}

export type GebouwStand = { id: string; score: number; toestand: Toestand; bedrag: number };

export function gebouwStanden(
  data: Data,
  kaart: KaartData,
  r: Resultaat,
  /** het jaar van het bedrag bij het gebouw */
  jaar = data.jaren[0],
): Record<string, GebouwStand> {
  const uit: Record<string, GebouwStand> = {};
  for (const g of data.gebouwen) {
    const score =
      g.soort === 'loket'
        ? -gemiddeldeBelasting(data, r.keuzes.belastingen)
        : g.soort === 'beleidshuis'
          ? -gestoptAandeel(data, r.keuzes.gestopt ?? [])
          : gebouwScore(data, g, r.keuzes.onderdelen);
    uit[g.id] = {
      id: g.id,
      score,
      toestand: toestandBij(score, kaart.toestanden),
      bedrag: gebouwBedrag(data, g, r, jaar),
    };
  }
  return uit;
}

/** Voor het Beleidshuis: welk deel van het geld van de programma's stilstaat (0 tot 100). */
function gestoptAandeel(data: Data, gestopt: string[]): number {
  let totaal = 0;
  let stil = 0;
  for (const p of data.index.programmas.values()) {
    totaal += p.bedrag_mln;
    if (gestopt.includes(p.id)) stil += p.bedrag_mln;
  }
  return totaal > 0 ? (100 * stil) / totaal : 0;
}

/** Voor het belastingloket: gewogen gemiddelde wijziging van de belastingen (hoger = slechter). */
function gemiddeldeBelasting(data: Data, belastingen: Record<string, number>): number {
  let totaal = 0;
  let gewogen = 0;
  for (const b of data.begroting.belastingen) {
    totaal += b.opbrengst_mln;
    gewogen += b.opbrengst_mln * (belastingen[b.id] ?? 0);
  }
  return totaal > 0 ? gewogen / totaal : 0;
}

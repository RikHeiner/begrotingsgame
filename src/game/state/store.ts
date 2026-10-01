/**
 * De toestand van de speler (Zustand). Elke wijziging gaat langs magWijzigen (het slot op de pot);
 * het resultaat van de rekenmotor en de toestand van de gebouwen worden direct bijgewerkt.
 * Na elke wijziging beschrijft `actie` wat er gebeurde, zodat de interface kan reageren
 * (muntjes, schudden, een lijn tussen gebouwen, een melding over een kettingeffect).
 */
import { create } from 'zustand';
import {
  bereken,
  GEEN_KEUZES,
  magWijzigen,
  type Data,
  type Keuzes,
  type Melding,
  type Resultaat,
} from '../../engine';
import type { Scenario } from '../../engine/schema';
import { gebouwStanden, type GebouwStand } from '../toestand';

export type Weergave = 'kaart' | 'lijst';
export type Fase = 'spelen' | 'eindscherm' | 'document';

export type Lijn = { van: string; naar: string; positief: boolean };

export type Actie = {
  teller: number;
  /** het gebouw waar de wijziging vandaan kwam */
  gebouw?: string;
  /** verandering van het structurele saldo in het eerste jaar (euro's) */
  delta: number;
  geweigerd: boolean;
  /** kettingeffecten die door deze wijziging zichtbaar worden: van gebouw naar gebouw */
  lijnen: Lijn[];
  /** hoogstens één melding over een kettingeffect */
  melding?: Melding;
};

export type Meta = { titel: string; naam: string; idee: string };

type Spel = {
  data?: Data;
  keuzes: Keuzes;
  resultaat?: Resultaat;
  standen: Record<string, GebouwStand>;
  /** reden waarom de laatste wijziging niet mocht */
  melding?: string;
  actie?: Actie;
  /** de laatste melding over een kettingeffect, met het nummer van de actie */
  kettingMelding?: { melding: Melding; teller: number };
  gekozenGebouw?: string;
  /** heeft de speler al eens een gebouw gekozen (voor de tutorial) */
  ooitGekozen: boolean;
  weergave: Weergave;
  fase: Fase;
  /** het startscherm met uitleg staat open */
  startscherm: boolean;
  zetStartscherm(open: boolean): void;
  geluid: boolean;
  /** titel, naam en eigen idee voor de tegenbegroting */
  meta: Meta;
  /** de keuzes (als JSON) die al zijn ingestuurd, om dubbel insturen te voorkomen */
  ingestuurd?: string;
  markeerIngestuurd(): void;
  zetMeta(m: Partial<Meta>): void;
  start(data: Data, keuzes?: Keuzes): void;
  probeer(nieuw: Keuzes, gebouw?: string): boolean;
  zetOnderdeel(id: string, pct: number): boolean;
  zetBelasting(id: string, pct: number): boolean;
  /** een parkeerpost (zie engine/parkeren.ts), bijvoorbeeld "bewoners_1:tweede" */
  zetParkeerpost(id: string, pct: number): boolean;
  wisselKaart(id: string): boolean;
  zetReserve(reserve: { structureel: number; eenmalig: number }): boolean;
  zetScenario(s: Scenario): void;
  kiesGebouw(id?: string): void;
  zetWeergave(w: Weergave): void;
  zetGeluid(aan: boolean): void;
  indienen(): void;
  toonDocument(): void;
  terugNaarGemeente(): void;
  opnieuw(): void;
  wisMelding(): void;
};

function leesOpslag(sleutel: string): string | null {
  try {
    return localStorage.getItem(sleutel);
  } catch {
    return null;
  }
}
function schrijfOpslag(sleutel: string, waarde: string): void {
  try {
    localStorage.setItem(sleutel, waarde);
  } catch {
    // privévenster of geen opslag: geen probleem
  }
}

export const OPSLAG_GELUID = 'begrotingsgame:geluid';
export const OPSLAG_START = 'begrotingsgame:start';

/** Het gebouw waar een effect landt: het gebouw van de post, of het loket en het veilinghuis. */
export function gebouwVanDoel(data: Data, doel: string): string | undefined {
  const id = doel.startsWith('baten:') ? doel.slice(6) : doel;
  const o = data.index.onderdelen.get(id);
  if (o) return o.gebouw;
  if (data.index.belastingen.has(id)) return data.gebouwen.find((g) => g.soort === 'loket')?.id;
  return undefined;
}

/** Kettingeffecten die door een wijziging actief worden, en de lijnen die daarbij horen. */
export function nieuweKetting(
  data: Data,
  voor: Resultaat | undefined,
  na: Resultaat,
  gebouw: string | undefined,
  getoond: Set<string>,
): { lijnen: Lijn[]; melding?: Melding } {
  const nieuw = Object.entries(na.verbanden)
    .filter(
      ([id, u]) =>
        u.status !== 'niet actief' &&
        u.status !== 'wacht op nieuwe post' &&
        voor?.verbanden[id]?.status !== u.status,
    )
    .map(([id]) => id);
  const lijnen: Lijn[] = [];
  const jaar = data.jaren.at(-1);
  for (const id of nieuw) {
    const somPerDoel = new Map<string, number>();
    for (const e of na.effecten) {
      if (e.verband !== id || e.jaar !== jaar) continue;
      const naar = gebouwVanDoel(data, e.doel);
      if (naar) somPerDoel.set(naar, (somPerDoel.get(naar) ?? 0) + e.bedrag);
    }
    for (const [naar, som] of somPerDoel) {
      if (gebouw && naar !== gebouw && Math.abs(som) > 1)
        lijnen.push({ van: gebouw, naar, positief: som > 0 });
    }
  }
  const kandidaten = na.meldingen.filter((m) => nieuw.includes(m.verband));
  const melding = kandidaten.find((m) => !getoond.has(m.verband)) ?? undefined;
  return { lijnen, ...(melding ? { melding } : {}) };
}

/** Het jaar waar de speler over beslist: het eerste jaar van de meerjarenraming. */
export function huidigJaar(data: Data): number {
  return data.jaren[0] ?? data.config.actiefJaar;
}

export const useSpel = create<Spel>((set, get) => {
  const reken = (data: Data, keuzes: Keuzes) => {
    const resultaat = bereken(data, keuzes);
    return {
      keuzes: resultaat.keuzes,
      resultaat,
      standen: gebouwStanden(data, data.kaart, resultaat),
    };
  };
  const getoond = new Set<string>();
  let teller = 0;
  const saldo = (r: Resultaat | undefined, data: Data) =>
    r?.perJaar[huidigJaar(data)]?.structureel ?? 0;

  return {
    keuzes: GEEN_KEUZES,
    standen: {},
    weergave: 'kaart',
    fase: 'spelen',
    // Bij het eerste bezoek de uitleg; een gedeelde link opent direct de begroting (zie Spel).
    startscherm: leesOpslag(OPSLAG_START) !== 'gezien',
    zetStartscherm(open) {
      if (!open) schrijfOpslag(OPSLAG_START, 'gezien');
      set({ startscherm: open });
    },
    geluid: leesOpslag(OPSLAG_GELUID) === 'aan',
    meta: { titel: '', naam: '', idee: '' },
    ooitGekozen: false,
    zetMeta(m) {
      set({ meta: { ...get().meta, ...m } });
    },
    start(data, keuzes = { ...GEEN_KEUZES, scenario: data.config.scenario }) {
      getoond.clear();
      set({
        data,
        ...reken(data, keuzes),
        melding: undefined,
        actie: undefined,
        fase: 'spelen',
      });
    },
    probeer(nieuw, gebouw) {
      const { data, keuzes, resultaat } = get();
      if (!data) return false;
      const m = magWijzigen(data, keuzes, nieuw);
      if (!m.ok) {
        set({
          melding: m.reden ?? 'Dit kan niet.',
          actie: {
            teller: ++teller,
            ...(gebouw ? { gebouw } : {}),
            delta: 0,
            geweigerd: true,
            lijnen: [],
          },
        });
        return false;
      }
      const uit = reken(data, nieuw);
      const ketting = nieuweKetting(data, resultaat, uit.resultaat, gebouw, getoond);
      if (ketting.melding) getoond.add(ketting.melding.verband);
      const nieuwTeller = teller + 1;
      set({
        ...uit,
        melding: undefined,
        ...(ketting.melding
          ? { kettingMelding: { melding: ketting.melding, teller: nieuwTeller } }
          : {}),
        actie: {
          teller: ++teller,
          ...(gebouw ? { gebouw } : {}),
          delta: saldo(uit.resultaat, data) - saldo(resultaat, data),
          geweigerd: false,
          ...ketting,
        },
      });
      return true;
    },
    zetOnderdeel(id, pct) {
      const { keuzes: k, data } = get();
      return get().probeer(
        { ...k, onderdelen: { ...k.onderdelen, [id]: pct } },
        data?.index.onderdelen.get(id)?.gebouw,
      );
    },
    zetBelasting(id, pct) {
      const { keuzes: k, data } = get();
      return get().probeer(
        { ...k, belastingen: { ...k.belastingen, [id]: pct } },
        data?.gebouwen.find((g) => g.soort === 'loket')?.id,
      );
    },
    zetParkeerpost(id, pct) {
      const { keuzes: k, data } = get();
      return get().probeer(
        { ...k, parkeren: { ...k.parkeren, [id]: pct } },
        data?.parkeren?.opbrengst.gebouw,
      );
    },
    wisselKaart(id) {
      const { keuzes: k, data } = get();
      const kaarten = k.kaarten.includes(id)
        ? k.kaarten.filter((x) => x !== id)
        : [...k.kaarten, id];
      return get().probeer(
        { ...k, kaarten },
        data?.gebouwen.find((g) => g.soort === 'veilinghuis')?.id,
      );
    },
    zetReserve(reserve) {
      const k = get().keuzes;
      return get().probeer({ ...k, reserve }, 'stadhuis');
    },
    zetScenario(scenario) {
      const { data, keuzes } = get();
      if (!data) return;
      // Een ander scenario is geen keuze van de speler: het slot geldt hier niet.
      set({ ...reken(data, { ...keuzes, scenario }) });
    },
    kiesGebouw(id) {
      set({ gekozenGebouw: id, melding: undefined, ...(id ? { ooitGekozen: true } : {}) });
    },
    zetWeergave(weergave) {
      set({ weergave });
    },
    zetGeluid(aan) {
      schrijfOpslag(OPSLAG_GELUID, aan ? 'aan' : 'uit');
      set({ geluid: aan });
    },
    indienen() {
      set({ fase: 'eindscherm', gekozenGebouw: undefined });
    },
    toonDocument() {
      set({ fase: 'document' });
    },
    markeerIngestuurd() {
      set({ ingestuurd: JSON.stringify(get().keuzes) });
    },
    terugNaarGemeente() {
      set({ fase: 'spelen' });
    },
    opnieuw() {
      const { data } = get();
      if (data) get().start(data, { ...GEEN_KEUZES, scenario: data.config.scenario });
    },
    wisMelding() {
      set({ melding: undefined });
    },
  };
});

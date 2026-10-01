/**
 * De toestand van de speler (Zustand). Elke wijziging gaat langs magWijzigen (het slot op de pot);
 * het resultaat van de rekenmotor en de toestand van de gebouwen worden direct bijgewerkt.
 */
import { create } from 'zustand';
import {
  bereken,
  GEEN_KEUZES,
  magWijzigen,
  type Data,
  type Keuzes,
  type Resultaat,
} from '../../engine';
import { gebouwStanden, type GebouwStand } from '../toestand';

export type Weergave = 'kaart' | 'lijst';

type Spel = {
  data?: Data;
  keuzes: Keuzes;
  resultaat?: Resultaat;
  standen: Record<string, GebouwStand>;
  /** reden waarom de laatste wijziging niet mocht */
  melding?: string;
  gekozenGebouw?: string;
  weergave: Weergave;
  start(data: Data, keuzes?: Keuzes): void;
  probeer(nieuw: Keuzes): boolean;
  zetOnderdeel(id: string, pct: number): boolean;
  zetBelasting(id: string, pct: number): boolean;
  wisselKaart(id: string): boolean;
  kiesGebouw(id?: string): void;
  zetWeergave(w: Weergave): void;
  wisMelding(): void;
};

export const useSpel = create<Spel>((set, get) => {
  const reken = (data: Data, keuzes: Keuzes) => {
    const resultaat = bereken(data, keuzes);
    return {
      keuzes: resultaat.keuzes,
      resultaat,
      standen: gebouwStanden(data, data.kaart, resultaat),
    };
  };
  return {
    keuzes: GEEN_KEUZES,
    standen: {},
    weergave: 'kaart',
    start(data, keuzes = GEEN_KEUZES) {
      set({ data, ...reken(data, keuzes), melding: undefined });
    },
    probeer(nieuw) {
      const { data, keuzes } = get();
      if (!data) return false;
      const m = magWijzigen(data, keuzes, nieuw);
      if (!m.ok) {
        set({ melding: m.reden ?? 'Dit kan niet.' });
        return false;
      }
      set({ ...reken(data, nieuw), melding: undefined });
      return true;
    },
    zetOnderdeel(id, pct) {
      const k = get().keuzes;
      return get().probeer({ ...k, onderdelen: { ...k.onderdelen, [id]: pct } });
    },
    zetBelasting(id, pct) {
      const k = get().keuzes;
      return get().probeer({ ...k, belastingen: { ...k.belastingen, [id]: pct } });
    },
    wisselKaart(id) {
      const k = get().keuzes;
      const kaarten = k.kaarten.includes(id)
        ? k.kaarten.filter((x) => x !== id)
        : [...k.kaarten, id];
      return get().probeer({ ...k, kaarten });
    },
    kiesGebouw(id) {
      set({ gekozenGebouw: id, melding: undefined });
    },
    zetWeergave(weergave) {
      set({ weergave });
    },
    wisMelding() {
      set({ melding: undefined });
    },
  };
});

/**
 * Waar inzendingen heen gaan. Met VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY is dat Supabase.
 * Zonder die instellingen, tijdens ontwikkelen of met VITE_OPSLAG=lokaal, is het de browser (demo).
 * Anders staat insturen uit. De Supabase-client wordt pas geladen als hij nodig is.
 */
import type { Aanmelding, IdeeStatus, Inzending, NieuweInzending } from './types';

export type Opslag = {
  soort: 'supabase' | 'lokaal';
  insturen(i: NieuweInzending): Promise<void>;
  // Voor het dashboard
  inloggen(email: string, terug: string): Promise<void>;
  gebruiker(): Promise<string | undefined>;
  opWijziging(f: (email: string | undefined) => void): () => void;
  uitloggen(): Promise<void>;
  isFractie(): Promise<boolean>;
  inzendingen(): Promise<Inzending[]>;
  zetStatus(id: string, status: IdeeStatus): Promise<void>;
  aanmeldingen(): Promise<Aanmelding[]>;
};

type Omgeving = { url?: string; sleutel?: string; lokaal: boolean };

export function omgeving(): Omgeving {
  const env = import.meta.env;
  return {
    url: env.VITE_SUPABASE_URL as string | undefined,
    sleutel: env.VITE_SUPABASE_ANON_KEY as string | undefined,
    lokaal: env.DEV || env.VITE_OPSLAG === 'lokaal',
  };
}

export function insturenMogelijk(o = omgeving()): boolean {
  return Boolean((o.url && o.sleutel) || o.lokaal);
}

export async function kiesOpslag(dashboard = false, o = omgeving()): Promise<Opslag | undefined> {
  if (o.url && o.sleutel) {
    const { supabaseOpslag } = await import('./supabase');
    return supabaseOpslag(o.url, o.sleutel, dashboard);
  }
  if (o.lokaal) {
    const { lokaleOpslag } = await import('./lokaal');
    return lokaleOpslag();
  }
  return undefined;
}

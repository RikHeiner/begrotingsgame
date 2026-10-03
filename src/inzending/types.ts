/** Inzendingen van spelers en wat het dashboard van de fractie ervan ziet. */
import type { Keuzes } from '../engine';

export type IdeeStatus = 'geen' | 'nieuw' | 'verdacht' | 'goedgekeurd' | 'verborgen';

/** Wat de game instuurt (zie public.insturen in supabase/migrations). */
export type NieuweInzending = {
  begrotingsjaar: number;
  keuzes: Keuzes;
  missie?: string;
  gebied?: string;
  idee?: string;
  email?: string;
  email_toestemming?: boolean;
  toestemming: boolean;
  toestemming_versie: number;
  /** hoe lang de speler bezig was, in milliseconden (spamfilter) */
  duur_ms: number;
  /** verborgen veld: mensen vullen het niet in, robots wel (spamfilter) */
  website: string;
};

/** Een opgeslagen inzending, zoals het dashboard hem leest. */
export type Inzending = {
  id: string;
  aangemaakt: string;
  begrotingsjaar: number;
  keuzes: Keuzes;
  missie: string | null;
  gebied: string | null;
  idee: string | null;
  idee_status: IdeeStatus;
  toestemming_versie: number;
};

export type Aanmelding = { id: string; aangemaakt: string; email: string };

export type FoutSoort = 'te_vaak' | 'ongeldig' | 'netwerk';

export class InstuurFout extends Error {
  constructor(
    message: string,
    public soort: FoutSoort,
  ) {
    super(message);
  }
}

/**
 * Opslag in Supabase. Spelers roepen alleen de functie `insturen` aan; het dashboard leest de
 * tabellen, wat row level security alleen toestaat voor genodigden van de fractie.
 */
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import type { Opslag } from './opslag';
import { InstuurFout, type Aanmelding, type Inzending } from './types';

const PAGINA = 1000;

function fout(e: PostgrestError): InstuurFout {
  if (e.code === 'PT429') return new InstuurFout(e.message, 'te_vaak');
  if (e.code === '22023' || e.code === '23514' || e.code === '22P02')
    return new InstuurFout(e.message, 'ongeldig');
  return new InstuurFout(
    'Er ging iets mis met de verbinding. Probeer het later nog eens.',
    'netwerk',
  );
}

export function supabaseOpslag(url: string, sleutel: string, dashboard: boolean): Opslag {
  // In de game is er geen login; dan bewaren we ook niets in de browser.
  const client = createClient(url, sleutel, {
    auth: dashboard
      ? { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' }
      : { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return {
    soort: 'supabase',
    async insturen(inzending) {
      const { error } = await client.rpc('insturen', { inzending });
      if (error) throw fout(error);
    },
    async inloggen(email, terug) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: terug },
      });
      if (error) throw new Error(error.message);
    },
    async gebruiker() {
      const { data } = await client.auth.getSession();
      return data.session?.user.email ?? undefined;
    },
    opWijziging(f) {
      const { data } = client.auth.onAuthStateChange((_e, sessie) => f(sessie?.user.email));
      return () => data.subscription.unsubscribe();
    },
    async uitloggen() {
      await client.auth.signOut();
    },
    async isFractie() {
      const { data, error } = await client.rpc('is_fractie');
      if (error) throw fout(error);
      return data === true;
    },
    async inzendingen() {
      const alles: Inzending[] = [];
      for (let van = 0; ; van += PAGINA) {
        const { data, error } = await client
          .from('inzendingen')
          .select(
            'id, aangemaakt, begrotingsjaar, keuzes, missie, gebied, idee, idee_status, toestemming_versie',
          )
          .order('aangemaakt', { ascending: true })
          .range(van, van + PAGINA - 1);
        if (error) throw fout(error);
        alles.push(...(data as Inzending[]));
        if (data.length < PAGINA) return alles;
      }
    },
    async zetStatus(id, status) {
      const { error } = await client
        .from('inzendingen')
        .update({ idee_status: status })
        .eq('id', id);
      if (error) throw fout(error);
    },
    async aanmeldingen() {
      const { data, error } = await client
        .from('aanmeldingen')
        .select('id, aangemaakt, email')
        .order('aangemaakt');
      if (error) throw fout(error);
      return data as Aanmelding[];
    },
  };
}

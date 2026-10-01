/**
 * Opslag in de browser, voor ontwikkelen, de tests en een demo zonder Supabase. Volgt dezelfde
 * regels als de database, zodat het dashboard er hetzelfde uitziet. Niet voor echte inzendingen.
 */
import { ideeVerdacht } from './filter';
import type { Opslag } from './opslag';
import { InstuurFout, type Aanmelding, type IdeeStatus, type Inzending } from './types';

const SLEUTEL = 'begrotingsgame:demo-inzendingen';
const SLEUTEL_AANMELDINGEN = 'begrotingsgame:demo-aanmeldingen';

function lees<T>(sleutel: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(sleutel) ?? '[]') as T[];
  } catch {
    return [];
  }
}
const schrijf = (sleutel: string, x: unknown) => localStorage.setItem(sleutel, JSON.stringify(x));

export function lokaleOpslag(): Opslag {
  return {
    soort: 'lokaal',
    async insturen(i) {
      if (i.website || i.duur_ms < 3000) throw new InstuurFout('Inzending geweigerd.', 'ongeldig');
      if (!i.toestemming)
        throw new InstuurFout('Zonder toestemming kunnen we niets opslaan.', 'ongeldig');
      const email = i.email?.trim().toLowerCase();
      if (email && !i.email_toestemming)
        throw new InstuurFout('Voor je e-mailadres is een aparte toestemming nodig.', 'ongeldig');
      const idee = i.idee?.trim() || null;
      const rij: Inzending = {
        id: crypto.randomUUID(),
        aangemaakt: new Date().toISOString(),
        begrotingsjaar: i.begrotingsjaar,
        keuzes: {
          onderdelen: i.keuzes.onderdelen,
          belastingen: i.keuzes.belastingen,
          ...(i.keuzes.parkeren ? { parkeren: i.keuzes.parkeren } : {}),
          kaarten: i.keuzes.kaarten,
          scenario: i.keuzes.scenario,
          ...(i.keuzes.reserve ? { reserve: i.keuzes.reserve } : {}),
        },
        missie: i.missie || null,
        gebied: i.gebied || null,
        idee,
        idee_status: !idee ? 'geen' : ideeVerdacht(idee) ? 'verdacht' : 'nieuw',
        toestemming_versie: i.toestemming_versie,
      };
      schrijf(SLEUTEL, [...lees<Inzending>(SLEUTEL), rij]);
      if (email) {
        const a = lees<Aanmelding>(SLEUTEL_AANMELDINGEN);
        if (!a.some((x) => x.email === email))
          schrijf(SLEUTEL_AANMELDINGEN, [
            ...a,
            { id: crypto.randomUUID(), aangemaakt: rij.aangemaakt, email },
          ]);
      }
    },
    async inloggen() {},
    async gebruiker() {
      return 'demo (lokaal)';
    },
    opWijziging() {
      return () => {};
    },
    async uitloggen() {},
    async isFractie() {
      return true;
    },
    async inzendingen() {
      return lees<Inzending>(SLEUTEL);
    },
    async zetStatus(id: string, status: IdeeStatus) {
      schrijf(
        SLEUTEL,
        lees<Inzending>(SLEUTEL).map((r) => (r.id === id ? { ...r, idee_status: status } : r)),
      );
    },
    async aanmeldingen() {
      return lees<Aanmelding>(SLEUTEL_AANMELDINGEN);
    },
  };
}

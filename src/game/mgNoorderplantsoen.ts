/**
 * Noorderplantsoen, "Gaten en lantaarns": er gaat steeds iets kapot. Snel repareren kost € 1,
 * wachten maakt het erger en kost € 3. Dat zijn spelregels, geen bedragen uit de begroting.
 */
export const SPEELTIJD_MS = 30_000;
export const BREUK_ELKE_MS = 1_200;
export const ERGER_NA_MS = 4_000;
export const PRIJS_SNEL = 1;
export const PRIJS_ERGER = 3;

export type Soort = 'pad' | 'gras' | 'lamp';

/** Het plantsoen: 4 bij 4 tegels. */
export const PLATTEGROND: Soort[] = [
  'gras', 'pad', 'gras', 'lamp',
  'pad', 'pad', 'pad', 'pad',
  'lamp', 'pad', 'gras', 'pad',
  'gras', 'pad', 'lamp', 'gras',
]; // prettier-ignore

export type Tegel = {
  soort: Soort;
  /** sinds wanneer kapot (ms na de start), of undefined als hij heel is */
  kapotSinds?: number;
  erger: boolean;
};

export type Park = {
  tegels: Tegel[];
  volgendeBreuk: number;
  /** wat je hebt betaald voor reparaties */
  betaald: number;
  /** het deel daarvan dat je extra betaalde omdat je wachtte */
  extra: number;
  gerepareerd: number;
  klaar: boolean;
};

export function nieuwPark(): Park {
  return {
    tegels: PLATTEGROND.map((soort) => ({ soort, erger: false })),
    volgendeBreuk: BREUK_ELKE_MS,
    betaald: 0,
    extra: 0,
    gerepareerd: 0,
    klaar: false,
  };
}

/** Kan er iets kapot op deze tegel? (een pad of een lantaarn) */
export const kanKapot = (t: Tegel): boolean => t.soort !== 'gras';

/** Laat de tijd lopen tot `nu` (ms na de start): breuken, erger worden en het einde. */
export function stap(park: Park, nu: number, kans: () => number = Math.random): Park {
  if (park.klaar) return park;
  let tegels = park.tegels;
  let volgendeBreuk = park.volgendeBreuk;
  while (volgendeBreuk <= nu && volgendeBreuk < SPEELTIJD_MS) {
    const heel = tegels.flatMap((t, i) => (kanKapot(t) && t.kapotSinds === undefined ? [i] : []));
    const i = heel[Math.floor(kans() * heel.length)];
    if (i !== undefined) {
      tegels = tegels.map((t, j) =>
        j === i ? { ...t, kapotSinds: volgendeBreuk, erger: false } : t,
      );
    }
    volgendeBreuk += BREUK_ELKE_MS;
  }
  if (
    tegels.some((t) => t.kapotSinds !== undefined && !t.erger && nu - t.kapotSinds >= ERGER_NA_MS)
  )
    tegels = tegels.map((t) =>
      t.kapotSinds !== undefined && !t.erger && nu - t.kapotSinds >= ERGER_NA_MS
        ? { ...t, erger: true }
        : t,
    );
  return { ...park, tegels, volgendeBreuk, klaar: nu >= SPEELTIJD_MS };
}

export const prijs = (t: Tegel): number => (t.erger ? PRIJS_ERGER : PRIJS_SNEL);

/** Repareer tegel `i`. Geeft het park terug en wat het kostte (0 als er niets kapot was). */
export function repareer(park: Park, i: number): { park: Park; kosten: number } {
  const t = park.tegels[i];
  if (park.klaar || !t || t.kapotSinds === undefined) return { park, kosten: 0 };
  const kosten = prijs(t);
  return {
    kosten,
    park: {
      ...park,
      tegels: park.tegels.map((x, j) => (j === i ? { soort: x.soort, erger: false } : x)),
      betaald: park.betaald + kosten,
      extra: park.extra + kosten - PRIJS_SNEL,
      gerepareerd: park.gerepareerd + 1,
    },
  };
}

export type Uitslag = {
  /** alles samen, ook wat nog kapot is (dat wordt alleen maar erger: tegen de hoge prijs) */
  totaal: number;
  /** extra door wachten */
  extra: number;
  nogKapot: number;
  gerepareerd: number;
  score: number;
};

/**
 * De rekening aan het einde. Score 0–100: 100 min het deel van de meerkosten dat je betaalde
 * (alles meteen gerepareerd: 100; alles laten liggen: 0; niets kapot gegaan: 0).
 */
export function uitslag(park: Park): Uitslag {
  const nogKapot = park.tegels.filter((t) => t.kapotSinds !== undefined).length;
  const totaal = park.betaald + nogKapot * PRIJS_ERGER;
  const extra = park.extra + nogKapot * (PRIJS_ERGER - PRIJS_SNEL);
  const maxExtra = (park.gerepareerd + nogKapot) * (PRIJS_ERGER - PRIJS_SNEL);
  const score =
    maxExtra === 0 ? 0 : Math.max(0, Math.min(100, Math.round(100 - (extra / maxExtra) * 100)));
  return { totaal, extra, nogKapot, gerepareerd: park.gerepareerd, score };
}

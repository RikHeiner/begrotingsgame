/**
 * "Groninger erger je niet": Mens erger je niet op een bord van 11 bij 11 vakjes. Jij speelt met de
 * blauwe pionnen van VVD Groningen, de computer met de rode pionnen van het college. Op de oranje
 * ergernisvakjes komt een ergernis van VVD Groningen over het college voorbij (met de bron). Komt
 * jouw pion daar, dan ga je twee vakjes terug; komt het college daar, dan zet het door en gaat het
 * twee vakjes vooruit. Dat is een spelregel.
 *
 * Een pion staat thuis (stap -1), op de baan (stap 0 tot 39, vanaf het eigen startvakje) of in het
 * eigen eindvak (stap 40 tot 43). Een pion in het eindvak is binnen.
 */
import { schud } from './minigames';

export type Speler = 'vvd' | 'college';
export const SPELERS: Speler[] = ['vvd', 'college'];

/** Zoveel pionnen per speler (twee: dan duurt een spel een paar minuten). */
export const PIONNEN = 2;
/** Vakjes op de baan. */
export const BAAN = 40;
/** Plekken in het eindvak. */
export const EIND = 4;
/** De laatste stap: de diepste plek in het eindvak. */
export const LAATSTE = BAAN + EIND - 1;
/** Het startvakje van elke speler op de baan. */
export const START: Record<Speler, number> = { vvd: 6, college: 26 };
/** De ergernisvakjes op de baan (niet op een startvakje). */
export const ERGER_VAKKEN = [2, 9, 14, 18, 22, 29, 34, 38] as const;
/** Spelregel: zoveel vakjes terug (VVD) of vooruit (college) op een ergernisvakje. */
export const ERGER_STAPPEN = 2;

export type Pion = { speler: Speler; nr: number; stap: number };
export type Stand = { pionnen: Pion[] };

export type Zet = { speler: Speler; nr: number; van: number; naar: number };

export type Gevolg = {
  stand: Stand;
  /** een pion van de ander die terug naar huis moet */
  geslagen?: Pion;
  /** de pion kwam op een ergernisvakje (het baanvakje) */
  ergernisVak?: number;
  /** de stap na het ergernisvakje (terug of vooruit), als dat kon */
  naErgernis?: number;
};

export function beginStand(): Stand {
  return {
    pionnen: SPELERS.flatMap((speler) =>
      Array.from({ length: PIONNEN }, (_, nr) => ({ speler, nr, stap: -1 })),
    ),
  };
}

/** Het vakje op de baan (0 tot 39) bij een stap, of undefined (thuis of in het eindvak). */
export function baanVak(speler: Speler, stap: number): number | undefined {
  if (stap < 0 || stap >= BAAN) return undefined;
  return (START[speler] + stap) % BAAN;
}

export const isErgernisVak = (vak: number | undefined): boolean =>
  vak !== undefined && (ERGER_VAKKEN as readonly number[]).includes(vak);

/** Plek op het bord (kolom, rij; 0 tot 10) van een baanvakje, met de klok mee vanaf linksonder. */
export function vakPlek(vak: number): { k: number; r: number } {
  const i = ((vak % BAAN) + BAAN) % BAAN;
  if (i <= 10) return { k: 0, r: 10 - i };
  if (i <= 20) return { k: i - 10, r: 0 };
  if (i <= 30) return { k: 10, r: i - 20 };
  return { k: 40 - i, r: 10 };
}

/** De thuisvakjes en het eindvak van elke speler (kolom, rij). */
export const THUIS: Record<Speler, { k: number; r: number }[]> = {
  vvd: [
    { k: 1, r: 8 },
    { k: 2, r: 9 },
  ],
  college: [
    { k: 9, r: 2 },
    { k: 8, r: 1 },
  ],
};
const EINDVAK: Record<Speler, { k: number; r: number }[]> = {
  vvd: [1, 2, 3, 4].map((k) => ({ k, r: 5 })),
  college: [9, 8, 7, 6].map((k) => ({ k, r: 5 })),
};

/** Plek op het bord van een pion. */
export function pionPlek(p: Pion): { k: number; r: number } {
  if (p.stap < 0) return THUIS[p.speler][p.nr] ?? { k: 5, r: 5 };
  if (p.stap >= BAAN) return EINDVAK[p.speler][p.stap - BAAN] ?? { k: 5, r: 5 };
  return vakPlek(baanVak(p.speler, p.stap) ?? 0);
}

const binnen = (p: Pion): boolean => p.stap >= BAAN;

/** Alle zetten die mogen met deze worp. */
export function mogelijkeZetten(stand: Stand, speler: Speler, worp: number): Zet[] {
  const eigen = stand.pionnen.filter((p) => p.speler === speler);
  const bezet = new Set(eigen.map((p) => p.stap));
  const zetten: Zet[] = [];
  for (const p of eigen) {
    let naar: number;
    if (p.stap < 0) {
      // naar buiten kan alleen met een zes
      if (worp !== 6) continue;
      naar = 0;
    } else {
      naar = p.stap + worp;
      if (naar > LAATSTE) continue;
    }
    // niet op een eigen pion
    if (bezet.has(naar)) continue;
    zetten.push({ speler, nr: p.nr, van: p.stap, naar });
  }
  return zetten;
}

/** De pion van de ander op dit baanvakje, als die er staat. */
function anderOp(stand: Stand, speler: Speler, vak: number): Pion | undefined {
  return stand.pionnen.find(
    (p) => p.speler !== speler && p.stap >= 0 && baanVak(p.speler, p.stap) === vak,
  );
}

/** Doet een zet: slaan, en daarna het ergernisvakje (terug of vooruit, als dat vakje vrij is). */
export function doeZet(stand: Stand, zet: Zet): Gevolg {
  const pionnen = stand.pionnen.map((p) => ({ ...p }));
  const pion = pionnen.find((p) => p.speler === zet.speler && p.nr === zet.nr);
  if (!pion) return { stand };
  pion.stap = zet.naar;
  const uit: Gevolg = { stand: { pionnen } };
  const vak = baanVak(pion.speler, pion.stap);
  if (vak !== undefined) {
    const ander = anderOp({ pionnen }, pion.speler, vak);
    if (ander && ander !== pion) {
      ander.stap = -1;
      uit.geslagen = { ...ander };
    }
    if (isErgernisVak(vak)) {
      uit.ergernisVak = vak;
      const richting = pion.speler === 'vvd' ? -ERGER_STAPPEN : ERGER_STAPPEN;
      const doel = Math.max(0, Math.min(LAATSTE, pion.stap + richting));
      const doelVak = baanVak(pion.speler, doel);
      const vrij =
        !pionnen.some((p) => p !== pion && p.speler === pion.speler && p.stap === doel) &&
        (doelVak === undefined || !anderOp({ pionnen }, pion.speler, doelVak));
      if (vrij && doel !== pion.stap) {
        pion.stap = doel;
        uit.naErgernis = doel;
      }
    }
  }
  return uit;
}

/** Wie heeft gewonnen (alle pionnen binnen), of undefined. */
export function winnaar(stand: Stand): Speler | undefined {
  return SPELERS.find((s) => stand.pionnen.filter((p) => p.speler === s).every((p) => binnen(p)));
}

/** Hoe ver een speler is, van 0 (alles thuis) tot 1 (alles binnen). */
export function voortgang(stand: Stand, speler: Speler): number {
  const eigen = stand.pionnen.filter((p) => p.speler === speler);
  return (
    eigen.reduce((s, p) => s + Math.max(0, Math.min(BAAN, p.stap + 1)), 0) / (eigen.length * BAAN)
  );
}

/**
 * De keuze van het college (de computer): slaan gaat voor, dan binnenkomen, dan een nieuwe pion
 * buiten zetten, dan op een ergernisvakje (daar zet het college door), anders de voorste pion.
 */
export function kiesZet(stand: Stand, zetten: Zet[]): Zet | undefined {
  const punten = (z: Zet): number => {
    const vak = baanVak(z.speler, z.naar);
    let p = z.naar / 100;
    if (vak !== undefined && anderOp(stand, z.speler, vak)) p += 10;
    if (z.naar >= BAAN && z.van < BAAN) p += 8;
    if (z.van < 0) p += 6;
    if (isErgernisVak(vak)) p += 3;
    return p;
  };
  return [...zetten].sort((a, b) => punten(b) - punten(a))[0];
}

/** Een worp van de dobbelsteen. */
export const gooi = (kans: () => number = Math.random): number => 1 + Math.floor(kans() * 6);

/** Score voor de uitslag (van 100): winnen 100, anders hoe ver je kwam (hooguit 80). */
export function score(stand: Stand): number {
  if (winnaar(stand) === 'vvd') return 100;
  return Math.round(voortgang(stand, 'vvd') * 80);
}

/** Een ergernis: wat het college deed en wat VVD Groningen ervan vond, met de bron. */
export type { Ergernis } from '../engine/schema';

/** De ergernissen in een willekeurige volgorde; een stapel die je één voor één afpakt. */
export function stapel<T>(lijst: readonly T[], kans: () => number = Math.random): T[] {
  return schud(lijst, kans);
}

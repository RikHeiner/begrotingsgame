/**
 * Goudkantoor, "Geldzoeker" (zoals Gold Miner): een grijper zwaait boven de grond, jij laat hem
 * zakken. Elk level begint met een tekort; graaf genoeg goud op om in de plus te komen voordat de
 * tijd op is.
 *
 * Het goud zijn uitgaven die VVD Groningen wil schrappen: uit het verkiezingsprogramma (met de
 * bedragen uit de begroting 2027) en uit de tegenbegroting van VVD Groningen 2026 (met de bedragen
 * van 2026, en dat staat er ook bij). De stenen zijn kerntaken: daar bezuinigt de VVD niet op. Ze
 * zijn zwaar en leveren niets op. Een zak met een vraagteken geeft extra tijd of een sterkere
 * grijper (een spelelement, geen geld).
 */
import type { Data } from '../engine';
import { schud } from './minigames';

// Het speelveld in beeldpunten (het canvas schaalt mee).
export const BREEDTE = 480;
export const HOOGTE = 360;
export const DRAAIPUNT = { x: BREEDTE / 2, y: 58 };
/** De grijper zwaait tussen -MAX_HOEK en +MAX_HOEK graden (0 is recht omlaag). */
export const MAX_HOEK = 72;
/** Zo lang is het touw als je niets raakt: tot de rand van het veld. */
export const MAX_LENGTE = 330;

export type Schat = {
  id: string;
  naam: string;
  bedragMln: number;
  /** het jaar van het bedrag */
  jaar: number;
  /** waar het standpunt staat */
  bron: string;
  /** een zin uit het verkiezingsprogramma, als die er is */
  vvd?: string;
  pagina?: number;
  /** eenmalig (I) of elk jaar (S) */
  soort: 'I' | 'S';
};

export type Steen = { id: string; naam: string; bedragMln: number; vvd: string; pagina: number };

export type Ding =
  { soort: 'goud'; schat: Schat } | { soort: 'steen'; steen: Steen } | { soort: 'zak'; id: string };

/** Een ding in de grond: plek (beeldpunten) en straal. */
export type Plek = Ding & { id: string; x: number; y: number; r: number };

export type Level = {
  nr: number;
  naam: string;
  uitleg: string;
  /** seconden */
  tijd: number;
  /** zo vaak graven, als de tijd niet telt (bij minder beweging) */
  beurten: number;
  /** het tekort aan het begin (mln): haal het weg om in de plus te komen */
  tekortMln: number;
  plekken: Plek[];
};

export const LEVELS = [
  {
    naam: 'Eenmalig geld',
    uitleg: 'Tijdelijke uitgaven en bezit dat de gemeente kan verkopen.',
    tijd: 60,
    beurten: 9,
    deel: 0.5,
    stenen: 3,
    zakken: 1,
  },
  {
    naam: 'Elk jaar geld',
    uitleg: 'Uitgaven die elk jaar terugkomen. Dat scheelt de gemeente jaar na jaar.',
    tijd: 55,
    beurten: 9,
    deel: 0.55,
    stenen: 4,
    zakken: 2,
  },
  {
    naam: 'De grote klappers',
    uitleg: 'Alles door elkaar, minder tijd en meer stenen.',
    tijd: 45,
    beurten: 8,
    deel: 0.65,
    stenen: 4,
    zakken: 1,
  },
] as const;

/** Al het goud: programma (bedragen begroting 2027) en tegenbegroting VVD 2026 (bedragen 2026). */
export function schatten(data: Data): Schat[] {
  const mg = data.minigames.find((m) => m.goud);
  const uitProgramma: Schat[] = (mg?.goud?.schatten ?? []).flatMap((s) => {
    const k = data.begroting.actiekaarten.find((x) => x.id === s.kaart);
    if (!k || k.bedrag_mln <= 0) return [];
    return [
      {
        id: k.id,
        naam: k.naam,
        bedragMln: k.bedrag_mln,
        jaar: data.begroting.begrotingsjaar,
        bron: mg?.goud?.bron ?? 'Verkiezingsprogramma VVD Groningen',
        vvd: s.vvd,
        pagina: s.pagina,
        soort: k.structureel_of_incidenteel === 'S' ? 'S' : 'I',
      },
    ];
  });
  const tb = mg?.goud?.tegenbegroting;
  const uitTegenbegroting: Schat[] = (tb?.posten ?? []).map((p, i) => ({
    id: `tb${i}`,
    naam: p.naam,
    bedragMln: p.bedrag_mln,
    jaar: tb?.jaar ?? 2026,
    bron: tb?.bron ?? 'Tegenbegroting VVD Groningen',
    soort: p.soort,
  }));
  return [...uitProgramma, ...uitTegenbegroting];
}

/** De kerntaken (stenen), met de bedragen uit de begroting. */
export function stenen(data: Data): Steen[] {
  const mg = data.minigames.find((m) => m.goud);
  return (mg?.goud?.stenen ?? []).flatMap((s) => {
    const o = data.index.onderdelen.get(s.post);
    return o
      ? [{ id: o.id, naam: o.naam, bedragMln: o.lasten_mln, vvd: s.vvd, pagina: s.pagina }]
      : [];
  });
}

/** Hoe groot een klomp is: groter bij meer geld (logaritmisch). */
export const straal = (mln: number): number => Math.min(27, 7 + 9 * Math.log10(1 + mln * 5));

/** Het goud van een level: eenmalig, elk jaar, of de grootste van allemaal. */
export function goudVoorLevel(alles: Schat[], nr: number): Schat[] {
  if (nr === 1) return alles.filter((s) => s.soort === 'I');
  if (nr === 2) return alles.filter((s) => s.soort === 'S');
  return [...alles].sort((a, b) => b.bedragMln - a.bedragMln).slice(0, 9);
}

/** Hoek (graden) vanaf het draaipunt naar een punt; 0 is recht omlaag, positief naar rechts. */
export const hoekNaar = (x: number, y: number): number =>
  (Math.atan2(x - DRAAIPUNT.x, y - DRAAIPUNT.y) * 180) / Math.PI;

/** Legt de dingen neer: niet op elkaar, binnen het bereik van de grijper. */
export function leg(dingen: (Ding & { r: number })[], kans: () => number = Math.random): Plek[] {
  const plekken: Plek[] = [];
  // grote dingen eerst, die passen anders niet meer
  const volgorde = [...dingen].sort((a, b) => b.r - a.r);
  for (const d of volgorde) {
    let beste: { x: number; y: number; ruimte: number } | undefined;
    for (let poging = 0; poging < 80; poging++) {
      const x = 26 + d.r + kans() * (BREEDTE - 52 - 2 * d.r);
      const y = 112 + d.r + kans() * (HOOGTE - 124 - 2 * d.r);
      if (Math.abs(hoekNaar(x, y)) > MAX_HOEK - 4) continue;
      if (Math.hypot(x - DRAAIPUNT.x, y - DRAAIPUNT.y) > MAX_LENGTE - d.r) continue;
      const ruimte = Math.min(
        Infinity,
        ...plekken.map((p) => Math.hypot(p.x - x, p.y - y) - p.r - d.r),
      );
      if (ruimte >= 8) {
        beste = { x, y, ruimte };
        break;
      }
      if (!beste || ruimte > beste.ruimte) beste = { x, y, ruimte };
    }
    const id = d.soort === 'goud' ? d.schat.id : d.soort === 'steen' ? d.steen.id : d.id;
    if (beste) plekken.push({ ...d, id, x: beste.x, y: beste.y } as Plek);
  }
  return plekken;
}

/** Maakt level `nr` (1, 2 of 3). */
export function maakLevel(data: Data, nr: number, kans: () => number = Math.random): Level {
  const instelling = LEVELS[Math.min(LEVELS.length, Math.max(1, nr)) - 1] ?? LEVELS[0];
  const goud = goudVoorLevel(schatten(data), nr);
  const kern = schud(stenen(data), kans).slice(0, instelling.stenen);
  const dingen: (Ding & { r: number })[] = [
    ...goud.map((schat) => ({ soort: 'goud' as const, schat, r: straal(schat.bedragMln) })),
    ...kern.map((steen, i) => ({ soort: 'steen' as const, steen, r: 17 + (i % 2) * 4 })),
    ...Array.from({ length: instelling.zakken }, (_, i) => ({
      soort: 'zak' as const,
      id: `zak${i}`,
      r: 11,
    })),
  ];
  const totaal = goud.reduce((s, g) => s + g.bedragMln, 0);
  return {
    nr,
    naam: instelling.naam,
    uitleg: instelling.uitleg,
    tijd: instelling.tijd,
    beurten: instelling.beurten,
    tekortMln: Math.round(totaal * instelling.deel * 10) / 10,
    plekken: leg(dingen, kans),
  };
}

/**
 * Wat de grijper raakt als hij in richting `hoek` zakt: het eerste ding op zijn pad, en hoe ver
 * het touw dan uitrolt. Niets geraakt: het touw rolt helemaal uit.
 */
export function raak(
  plekken: readonly Plek[],
  hoek: number,
  weg: ReadonlySet<string>,
): { plek?: Plek; lengte: number } {
  const r = (hoek * Math.PI) / 180;
  const dx = Math.sin(r);
  const dy = Math.cos(r);
  let beste: { plek: Plek; lengte: number } | undefined;
  for (const p of plekken) {
    if (weg.has(p.id)) continue;
    const vx = p.x - DRAAIPUNT.x;
    const vy = p.y - DRAAIPUNT.y;
    const langs = vx * dx + vy * dy;
    if (langs <= 0) continue;
    const naast = Math.abs(vx * dy - vy * dx);
    // de grijper is zelf ook een paar beeldpunten breed
    const marge = p.r + 5;
    if (naast > marge) continue;
    const lengte = langs - Math.sqrt(marge * marge - naast * naast) + 4;
    if (!beste || lengte < beste.lengte) beste = { plek: p, lengte };
  }
  return beste ?? { lengte: lengteTotRand(hoek) };
}

/** Hoe ver het touw kan uitrollen tot de rand van het veld. */
export function lengteTotRand(hoek: number): number {
  const r = (hoek * Math.PI) / 180;
  const dx = Math.sin(r);
  const dy = Math.cos(r);
  const naarOnder = (HOOGTE - 6 - DRAAIPUNT.y) / Math.max(0.01, dy);
  const naarZij =
    dx === 0 ? Infinity : (dx > 0 ? BREEDTE - 6 - DRAAIPUNT.x : DRAAIPUNT.x - 6) / Math.abs(dx);
  return Math.min(MAX_LENGTE, naarOnder, naarZij);
}

/** Zo snel komt de grijper terug (beeldpunten per seconde): goud is zwaar, stenen nog zwaarder. */
export function ophaalSnelheid(p: Plek | undefined, sterk = false): number {
  const basis = !p
    ? 560
    : p.soort === 'steen'
      ? 70
      : p.soort === 'zak'
        ? 320
        : Math.max(95, 440 - p.r * 13);
  return basis * (sterk ? 1.6 : 1);
}
export const UITROL_SNELHEID = 420;

/** De richting van een zwaaiende grijper op tijd t (ms): heen en weer, één keer per 2,8 s. */
export function zwaaiHoek(t: number): number {
  return MAX_HOEK * Math.sin((2 * Math.PI * t) / 2800);
}

/** Wat er in een zak zit: extra tijd of een sterkere grijper. */
export type Verrassing = 'tijd' | 'kracht';
export const verrassing = (kans: () => number = Math.random): Verrassing =>
  kans() < 0.5 ? 'tijd' : 'kracht';

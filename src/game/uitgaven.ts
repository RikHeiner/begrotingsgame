/**
 * Uitgaven per inwoner van de gemeente naast die van andere grote gemeenten, per thema, voor de
 * gebouwen. De cijfers komen uit data/uitgaven-gemeenten-JJJJ.json (CBS, Iv3) en zijn van een
 * eerder jaar dan de begroting in de game. Daarom rekenen we hier niets met de keuzes van de
 * speler: dat zou twee jaren en twee indelingen door elkaar halen.
 */
import type { Uitgaven } from '../engine/schema';
import { rangnummer } from './woonlasten';

export type UitgavenRij = { code: string; naam: string; perInwoner: number; eigen: boolean };

export type ThemaVergelijking = {
  id: string;
  naam: string;
  letOp?: string;
  /** de eigen gemeente */
  eigen: UitgavenRij;
  /** de middelste waarde (mediaan) van alle gemeenten in de groep, de eigen gemeente meegeteld */
  middelste: number;
  /** rangnummer van de eigen gemeente, 1 = laagste uitgaven per inwoner */
  rang: number;
  aantal: number;
  /** de eigen gemeente en de gemeenten uit vergelijk_met, van laag naar hoog */
  kort: UitgavenRij[];
  /** alle gemeenten, van laag naar hoog */
  alle: UitgavenRij[];
};

export type UitgavenVergelijking = {
  jaar: number;
  verslagsoort: Uitgaven['verslagsoort'];
  groep: string;
  definitie: string;
  bronnen: string[];
  themas: ThemaVergelijking[];
};

export function mediaan(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
}

/** De vergelijking voor de thema's van één gebouw; undefined als het gebouw er geen heeft. */
export function vergelijkUitgaven(u: Uitgaven, gebouw: string): UitgavenVergelijking | undefined {
  const themas = u.themas.filter((t) => t.gebouwen.includes(gebouw));
  const eigenGemeente = u.gemeenten.find((g) => g.code === u.gemeente);
  if (!themas.length || !eigenGemeente) return undefined;
  const oplopend = (a: UitgavenRij, b: UitgavenRij) =>
    a.perInwoner - b.perInwoner || a.naam.localeCompare(b.naam, 'nl');
  const kortCodes = new Set([u.gemeente, ...u.vergelijk_met]);

  return {
    jaar: u.jaar,
    verslagsoort: u.verslagsoort,
    groep: u.groep,
    definitie: u.definitie,
    bronnen: u.bronnen.map((b) => b.titel),
    themas: themas.map((t) => {
      const alle = u.gemeenten
        .map((g) => ({
          code: g.code,
          naam: g.naam,
          perInwoner: ((g.lasten_x1000[t.id] ?? 0) * 1000) / g.inwoners,
          eigen: g.code === u.gemeente,
        }))
        .sort(oplopend);
      const eigen = alle.find((r) => r.eigen) as UitgavenRij;
      return {
        id: t.id,
        naam: t.naam,
        ...(t.let_op ? { letOp: t.let_op } : {}),
        eigen,
        middelste: mediaan(alle.map((r) => r.perInwoner)),
        rang: rangnummer(
          eigen.perInwoner,
          alle.filter((r) => !r.eigen).map((r) => r.perInwoner),
        ),
        aantal: alle.length,
        kort: alle.filter((r) => kortCodes.has(r.code)),
        alle,
      };
    }),
  };
}

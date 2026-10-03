/**
 * Goudkantoor, "Goudzoeker": een grijper zwaait boven de grond. Het goud zijn eenmalige uitgaven
 * uit de begroting die VVD Groningen wil schrappen (met een zin uit het verkiezingsprogramma). De
 * stenen zijn kerntaken die de VVD juist wil houden. De lijst staat in spel/minigames.json; namen
 * en bedragen komen uit de begroting zelf.
 */
import type { Data } from '../engine';
import { schud } from './minigames';

/** Zo vaak mag je graven. */
export const BEURTEN = 7;
/** De grijper zwaait tussen -MAX_HOEK en +MAX_HOEK graden (0 is recht omlaag). */
export const MAX_HOEK = 66;

type Basis = { id: string; naam: string; bedragMln: number; vvd: string; pagina: number };
export type Vondst = (Basis & { soort: 'goud'; uitleg: string }) | (Basis & { soort: 'steen' });
/** Een vondst in de grond: richting (graden), diepte (0 tot 1) en grootte (1 is gewoon). */
export type Plek = Vondst & { hoek: number; diepte: number; grootte: number };

/** Het goud en de stenen die in deze begroting voorkomen. Onbekende ids slaan we over. */
export function vondsten(data: Data): Vondst[] {
  const mg = data.minigames.find((m) => m.goud);
  if (!mg?.goud) return [];
  const goud: Vondst[] = mg.goud.schatten.flatMap((s) => {
    const k = data.begroting.actiekaarten.find((x) => x.id === s.kaart);
    if (!k || k.structureel_of_incidenteel !== 'I') return [];
    return [
      {
        soort: 'goud' as const,
        id: k.id,
        naam: k.naam,
        bedragMln: k.bedrag_mln,
        uitleg: k.uitleg,
        vvd: s.vvd,
        pagina: s.pagina,
      },
    ];
  });
  const stenen: Vondst[] = mg.goud.stenen.flatMap((s) => {
    const o = data.index.onderdelen.get(s.post);
    return o
      ? [
          {
            soort: 'steen' as const,
            id: o.id,
            naam: o.naam,
            bedragMln: o.lasten_mln,
            vvd: s.vvd,
            pagina: s.pagina,
          },
        ]
      : [];
  });
  return [...goud, ...stenen];
}

/** Hoe groot een klomp goud is: groter bij meer geld (logaritmisch), tussen 0,8 en 1,8. */
export function grootte(v: Vondst): number {
  if (v.soort === 'steen') return 1.25;
  return Math.min(1.8, Math.max(0.8, 1.1 + 0.45 * Math.log10(v.bedragMln / 0.3)));
}

/**
 * Verdeelt de vondsten over vaste richtingen, geschud, elk op een eigen diepte. De richtingen
 * liggen ver genoeg uit elkaar om ze apart te raken.
 */
export function maakVeld(data: Data, kans: () => number = Math.random): Plek[] {
  const lijst = schud(vondsten(data), kans);
  const n = lijst.length;
  const stap = n > 1 ? (2 * (MAX_HOEK - 6)) / (n - 1) : 0;
  return lijst.map((v, i) => ({
    ...v,
    hoek: Math.round(-(MAX_HOEK - 6) + i * stap),
    diepte: 0.5 + 0.4 * kans(),
    grootte: grootte(v),
  }));
}

/** Hoe ver een vondst naast de richting mag liggen om hem nog te raken (graden). */
export const raakMarge = (p: Plek): number => 3 + 3 * p.grootte;

/** Wat de grijper raakt in deze richting: de vondst die het minst diep ligt, of niets. */
export function raak(veld: readonly Plek[], hoek: number, weg: ReadonlySet<string>) {
  return veld
    .filter((p) => !weg.has(p.id) && Math.abs(p.hoek - hoek) <= raakMarge(p))
    .sort((a, b) => a.diepte - b.diepte)[0];
}

/** Hoe lang het ophalen duurt (ms): een grote klomp of een steen is zwaar. */
export const ophaalTijd = (p: Plek | undefined): number => (p ? 450 + 650 * p.grootte : 500);

/** De richting van een zwaaiende grijper op tijd t (ms): heen en weer, één keer per 2,6 s. */
export function zwaaiHoek(t: number): number {
  return MAX_HOEK * Math.sin((2 * Math.PI * t) / 2600);
}

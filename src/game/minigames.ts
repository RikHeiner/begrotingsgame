/**
 * Hulp voor de minigames: posten uit de begroting om vragen mee te maken, en schudden. De
 * minigames rekenen alleen met de bedragen van de begroting zelf; aannames zeggen ze erbij.
 */
import type { Data } from '../engine';
import type { Onderdeel } from '../engine/schema';

/** Inwoners van de gemeente (CBS, 1 januari van het jaar van de landelijke gemiddelden). */
export function inwoners(data: Data): number {
  return (
    data.belastingenNederland?.inwoners ??
    data.uitgaven?.gemeenten.find((g) => g.code === data.uitgaven?.gemeente)?.inwoners ??
    244_427
  );
}

/** Posten die zich lenen voor een vraag: met een bedrag van minstens `minMln`. */
export function vraagPosten(data: Data, minMln = 0.5): Onderdeel[] {
  return data.begroting.onderdelen.filter((o) => o.lasten_mln >= minMln);
}

/** Euro per inwoner per jaar voor een post. */
export function perInwoner(data: Data, o: Onderdeel): number {
  return (o.lasten_mln * 1e6) / inwoners(data);
}

/** Een geschudde kopie (Fisher-Yates). `kans` is voor tests. */
export function schud<T>(lijst: readonly T[], kans: () => number = Math.random): T[] {
  const uit = [...lijst];
  for (let i = uit.length - 1; i > 0; i--) {
    const j = Math.floor(kans() * (i + 1));
    [uit[i], uit[j]] = [uit[j] as T, uit[i] as T];
  }
  return uit;
}

/** Een post met een begrijpelijke naam (spel/minigames.json), met het bedrag uit de begroting. */
export type BekendePost = {
  id: string;
  naam: string;
  uitleg: string;
  /** moet van de wet, of een eigen keuze (leeg: niet eenduidig) */
  soort?: 'wet' | 'keuze';
  wet?: string;
  /** uitgaven per jaar, in miljoenen */
  bedragMln: number;
  /** inkomsten die bij de post horen (zoals de afvalstoffenheffing), in miljoenen */
  batenMln: number;
  /** de naam in de begroting */
  begrotingsnaam: string;
};

/** De posten met een naam die iedereen begrijpt, met de bedragen uit de begroting. */
export function bekendePosten(data: Data): BekendePost[] {
  return data.spelPosten.flatMap((p) => {
    const o = data.index.onderdelen.get(p.post);
    if (!o) return [];
    return [
      {
        id: o.id,
        naam: p.naam,
        uitleg: p.uitleg,
        ...(p.soort ? { soort: p.soort } : {}),
        ...(p.wet ? { wet: p.wet } : {}),
        bedragMln: o.lasten_mln,
        batenMln: o.gekoppelde_baten_mln,
        begrotingsnaam: o.naam,
      },
    ];
  });
}

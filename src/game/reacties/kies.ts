/**
 * Kiest de volgende tekstballon (opdracht 8.5): een willekeurige inwoner, een reactie waarvan de
 * voorwaarde klopt en die bij die inwoner past, nooit twee keer achter elkaar dezelfde.
 * Het toeval komt van buiten (rng), zodat dit te testen is.
 */
import type { Reactie } from '../../engine/schema';
import { evalueer, parseer, type Knoop } from '../../engine/expressie';

export type GecompileerdeReactie = Reactie & { boom: Knoop };

export function compileer(reacties: Reactie[]): GecompileerdeReactie[] {
  return reacties.map((r) => ({ ...r, boom: parseer(r.voorwaarde) }));
}

export function geldig(
  reacties: GecompileerdeReactie[],
  lees: (naam: string) => number,
  persona: string,
): GecompileerdeReactie[] {
  return reacties.filter(
    (r) => (!r.personas || r.personas.includes(persona)) && evalueer(r.boom, lees) !== 0,
  );
}

export function kiesReactie(
  reacties: GecompileerdeReactie[],
  lees: (naam: string) => number,
  personas: string[],
  vorige: string | undefined,
  rng: () => number,
): { persona: string; reactie: GecompileerdeReactie } | undefined {
  // Probeer de inwoners in willekeurige volgorde tot er één iets te zeggen heeft.
  const volgorde = [...personas];
  for (let i = volgorde.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [volgorde[i], volgorde[j]] = [volgorde[j] as string, volgorde[i] as string];
  }
  for (const persona of volgorde) {
    const kandidaten = geldig(reacties, lees, persona).filter((r) => r.id !== vorige);
    if (!kandidaten.length) continue;
    // Specifieke reacties (met een voorwaarde) wegen zwaarder dan algemene.
    const totaal = kandidaten.reduce((s, r) => s + r.gewicht, 0);
    let x = rng() * totaal;
    for (const r of kandidaten) {
      x -= r.gewicht;
      if (x <= 0) return { persona, reactie: r };
    }
    const laatste = kandidaten.at(-1);
    if (laatste) return { persona, reactie: laatste };
  }
  return undefined;
}

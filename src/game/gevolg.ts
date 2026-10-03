/**
 * Wat merk je van een keuze, ten opzichte van nu (spel/gevolgen.json)? Bijvoorbeeld "Onveiliger
 * dan nu" bij de boa's, met het aantal boa's nu en met jouw keuze. "Nu" is de begroting van de
 * gemeente als er niets verandert: het percentage van de schuif is 0.
 */
import type { Data } from '../engine';

export type Richting = 'meer' | 'minder' | 'gelijk';

export type Gevolg = {
  icoon: string;
  tekst: string;
  richting: Richting;
  /** een aantal, zoals boa's: nu en met de keuze van de speler */
  eenheid?: { naam: string; nu: number; straks: number; aanname: boolean; uitleg: string };
};

const metVeel = (zin: string) => `Veel ${zin.charAt(0).toLowerCase()}${zin.slice(1)}`;

/** Het gevolg van een post of belasting bij `pct` procent ten opzichte van nu. */
export function gevolgVan(data: Data, id: string, pct: number): Gevolg | undefined {
  const g = data.gevolgen;
  const o = data.index.onderdelen.get(id);
  const b = data.index.belastingen.get(id);
  if (!o && !b) return undefined;
  const post = g.posten[id];
  const gebouw = o?.gebouw ?? (b ? data.gebouwen.find((x) => x.soort === 'loket')?.id : undefined);
  const meter = o
    ? Object.entries(o.meters).sort((a, c) => Math.abs(c[1]) - Math.abs(a[1]))[0]?.[0]
    : undefined;
  const meterId = meter ? data.index.meterPerKort.get(meter) : undefined;
  const categorie =
    post?.categorie ??
    (gebouw ? g.gebouwen[gebouw] : undefined) ??
    (meterId ? g.meters[meterId] : undefined);
  const zinnen = categorie ? g.categorieen[categorie] : undefined;
  if (!zinnen) return undefined;
  const richting: Richting =
    pct >= g.drempel_pct ? 'meer' : pct <= -g.drempel_pct ? 'minder' : 'gelijk';
  const zin = zinnen[richting];
  const e = post?.eenheid;
  return {
    icoon: zinnen.icoon,
    // "Veel" alleen als meer en minder echt iets anders zeggen (niet bij vaste lasten).
    tekst:
      richting !== 'gelijk' && Math.abs(pct) >= g.veel_pct && zinnen.meer !== zinnen.minder
        ? ((richting === 'meer' ? zinnen.veel_meer : zinnen.veel_minder) ?? metVeel(zin))
        : zin,
    richting,
    ...(e
      ? {
          eenheid: {
            naam: e.naam,
            nu: e.nu,
            straks: Math.max(0, Math.round(e.nu * (1 + pct / 100))),
            aanname: e.zekerheid === 'aanname',
            uitleg: e.uitleg,
          },
        }
      : {}),
  };
}

/**
 * Scenario's voor aannames (opdracht 6.4). Elke parameter met status "aanname" of "te onderzoeken"
 * heeft een bandbreedte: `waarde` is het midden, `laag` en `hoog` staan in de data of zijn standaard
 * 50% en 150% van de waarde. Een feit heeft geen bandbreedte.
 *
 * Voorzichtig en optimistisch kiezen per dwarsverband de kant van de bandbreedte die het minst of het
 * meest gunstig is voor het saldo van de gemeente (zie dwarsverbanden.ts).
 */
import type { Parameter, Scenario } from './schema';

export type Eind = 'laag' | 'midden' | 'hoog';

export const STANDAARD_LAAG = 0.5;
export const STANDAARD_HOOG = 1.5;

export function heeftBandbreedte(p: Parameter): boolean {
  return p.status !== 'feit' && typeof p.waarde === 'number' && p.waarde !== 0;
}

export function bandbreedte(p: Parameter): { laag: number; midden: number; hoog: number } | null {
  if (typeof p.waarde !== 'number') return null;
  if (!heeftBandbreedte(p)) return { laag: p.waarde, midden: p.waarde, hoog: p.waarde };
  return {
    laag: p.laag ?? p.waarde * STANDAARD_LAAG,
    midden: p.waarde,
    hoog: p.hoog ?? p.waarde * STANDAARD_HOOG,
  };
}

/** De waarde van een getal-parameter bij een eind van de bandbreedte, of null als hij ontbreekt. */
export function waardeBij(p: Parameter, eind: Eind): number | null {
  const b = bandbreedte(p);
  return b ? b[eind] : null;
}

export const SCENARIO_NAMEN: Record<Scenario, string> = {
  voorzichtig: 'Voorzichtig',
  midden: 'Midden',
  optimistisch: 'Optimistisch',
};

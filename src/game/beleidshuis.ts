/**
 * Het Beleidshuis: programma's binnen posten die je kunt stopzetten of (bij nul) weer aanzetten.
 * Een programma is een snelkoppeling naar de schuif van zijn post: stopzetten verlaagt de post met
 * het bedrag van het programma, aanzetten verhoogt hem weer. De lijst `gestopt` in de keuzes is
 * alleen het label; het geld zit in de schuif, dus er wordt niets dubbel geteld.
 */
import { grensOnderdeel, type Data, type Keuzes } from '../engine';
import type { Programma } from '../engine/schema';

const afgerond = (x: number) => (Math.abs(x) < 1e-6 ? 0 : Math.round(x * 1e4) / 1e4);

/** Het programma als percentage van zijn post. */
export function programmaPct(data: Data, p: Programma): number {
  const o = data.index.onderdelen.get(p.post);
  return o && o.lasten_mln > 0 ? (p.bedrag_mln / o.lasten_mln) * 100 : 0;
}

export function isGestopt(keuzes: Keuzes, id: string): boolean {
  return (keuzes.gestopt ?? []).includes(id);
}

/** De keuzes na het stopzetten of weer aanzetten van een programma. */
export function wisselProgramma(data: Data, keuzes: Keuzes, id: string): Keuzes {
  const p = data.index.programmas.get(id);
  if (!p) return keuzes;
  const gestopt = isGestopt(keuzes, id);
  const pct = afgerond(
    (keuzes.onderdelen[p.post] ?? 0) + (gestopt ? 1 : -1) * programmaPct(data, p),
  );
  const onderdelen = Object.fromEntries(
    Object.entries({ ...keuzes.onderdelen, [p.post]: pct }).filter(([, x]) => x !== 0),
  );
  const lijst = gestopt
    ? (keuzes.gestopt ?? []).filter((x) => x !== id)
    : [...(keuzes.gestopt ?? []), id].sort();
  const uit: Keuzes = { ...keuzes, onderdelen };
  if (lijst.length) uit.gestopt = lijst;
  else delete uit.gestopt;
  return uit;
}

/** Bij nul staan de programma's stil waarvan de post op zijn minimum staat. */
export function gestoptBijMinimum(data: Data, onderdelen: Record<string, number>): string[] {
  const uit: string[] = [];
  for (const p of data.index.programmas.values()) {
    const o = data.index.onderdelen.get(p.post);
    if (!o) continue;
    const pct = onderdelen[p.post];
    if (pct !== undefined && pct <= grensOnderdeel(o).min) uit.push(p.id);
  }
  return uit.sort();
}

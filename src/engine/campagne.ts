/**
 * Campagnemodus (opdracht 8.6): vier rondes, één per jaar. In elke ronde kan de speler bijsturen,
 * maar alleen vanaf het jaar van die ronde: eerdere jaren liggen vast. Wat eerder is gekozen, werkt
 * door, met de ingroei vanaf het jaar waarin het werd gekozen.
 *
 * Werkwijze: de eerste ronde wordt gewoon doorgerekend. Voor elke volgende ronde rekenen we de
 * nieuwe en de vorige keuzes allebei door op een horizon die in het jaar van die ronde begint, en
 * tellen we het verschil op. Een keuze die niet verandert, geeft dan geen verschil en loopt dus
 * door zoals in de ronde waarin hij werd gekozen. Een nieuwe keuze begint met ingroei in het jaar
 * van de ronde. Een gebeurteniskaart werkt zo vanaf het jaar waarin hij is getrokken.
 */
import type { Data } from './laadData';
import { bereken, perJaarResultaat } from './rekenen';
import {
  controleerSluitend,
  stortingenInReserve,
  weerstandBasis,
  weerstandPerJaar,
} from './regels';
import type { Effect, Jaar, Keuzes, Resultaat } from './types';

export type CampagneStap = { vanaf: Jaar; keuzes: Keuzes };

const sleutel = (e: Effect) =>
  [e.bron, e.doel, e.jaar, e.soort, e.stap, e.kant, e.verband ?? ''].join('|');

/** Telt effecten met dezelfde bron, hetzelfde doel en jaar op; de tekst komt van de laatste. */
function samenvoegen(effecten: Effect[]): Effect[] {
  const m = new Map<string, Effect>();
  for (const e of effecten) {
    const k = sleutel(e);
    const was = m.get(k);
    m.set(k, was ? { ...e, bedrag: was.bedrag + e.bedrag } : { ...e });
  }
  return [...m.values()].filter((e) => Math.abs(e.bedrag) >= 0.005);
}

export function berekenCampagne(data: Data, stappen: CampagneStap[]): Resultaat {
  const eerste = stappen[0];
  if (!eerste)
    return bereken(data, { onderdelen: {}, belastingen: {}, kaarten: [], scenario: 'midden' });
  const basis = bereken(data, eerste.keuzes);
  if (stappen.length === 1) return basis;

  const effecten: Effect[] = [...basis.effecten];
  const stortingen: Record<number, number> = { ...stortingenInReserve(data, basis.keuzes) };
  const grootheden: Record<string, number[]> = Object.fromEntries(
    Object.entries(basis.grootheden).map(([k, v]) => [k, [...v]]),
  );
  let laatste = basis;
  for (let i = 1; i < stappen.length; i++) {
    const stap = stappen[i];
    const vorige = stappen[i - 1];
    if (!stap || !vorige) continue;
    const index = data.jaren.indexOf(stap.vanaf);
    if (index < 0) continue;
    const deel: Data = { ...data, jaren: data.jaren.slice(index) };
    const nieuw = bereken(deel, stap.keuzes);
    const oud = bereken(deel, vorige.keuzes);
    effecten.push(...nieuw.effecten, ...oud.effecten.map((e) => ({ ...e, bedrag: -e.bedrag })));
    for (const [jaar, b] of Object.entries(stortingenInReserve(deel, nieuw.keuzes)))
      stortingen[Number(jaar)] = (stortingen[Number(jaar)] ?? 0) + b;
    for (const [jaar, b] of Object.entries(stortingenInReserve(deel, oud.keuzes)))
      stortingen[Number(jaar)] = (stortingen[Number(jaar)] ?? 0) - b;
    for (const naam of new Set([
      ...Object.keys(nieuw.grootheden),
      ...Object.keys(oud.grootheden),
    ])) {
      const rij = (grootheden[naam] ??= data.jaren.map(() => 0));
      deel.jaren.forEach((_, j) => {
        rij[index + j] =
          (rij[index + j] ?? 0) +
          (nieuw.grootheden[naam]?.[j] ?? 0) -
          (oud.grootheden[naam]?.[j] ?? 0);
      });
    }
    laatste = nieuw;
  }

  const samen = samenvoegen(effecten);
  const saldo: Record<number, { structureel: number; incidenteel: number }> = {};
  for (const jaar of data.jaren) saldo[jaar] = { structureel: 0, incidenteel: 0 };
  for (const e of samen) {
    const s = saldo[e.jaar];
    if (!s) continue;
    if (e.soort === 'S') s.structureel += e.bedrag;
    else s.incidenteel += e.bedrag;
  }
  const weerstand = weerstandPerJaar(data, data.jaren, saldo, stortingen);
  const regels = controleerSluitend(data.jaren, saldo);
  const { ondergrens } = weerstandBasis(data);
  for (const jaar of data.jaren) {
    const ratio = weerstand[jaar] ?? 0;
    if (ratio < ondergrens)
      regels.overtredingen.push(
        `${jaar}: het weerstandsvermogen zakt onder ${Math.round(ondergrens * 100)}% (${Math.round(ratio * 100)}%).`,
      );
  }
  const eind = data.jaren.at(-1) ?? data.config.actiefJaar;
  // Meters, inwoners en kettingeffecten volgen de keuzes van de laatste ronde.
  return {
    ...laatste,
    perJaar: perJaarResultaat(data, samen, weerstand),
    effecten: samen,
    regels,
    weerstandsvermogen: weerstand[eind] ?? weerstandBasis(data).ratio,
    grootheden,
  };
}

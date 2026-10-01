/**
 * Campagnemodus (opdracht 8.6): vier rondes van 2026 tot en met 2029. Elke ronde trekt de speler
 * één of twee gebeurteniskaarten en stuurt bij. Keuzes gelden vanaf het jaar van de ronde.
 */
import {
  berekenCampagne,
  type CampagneStap,
  type Data,
  type Keuzes,
  type Resultaat,
} from '../engine';

export type Campagne = {
  /** 1 tot en met het aantal jaren van de horizon */
  ronde: number;
  /** maakt het trekken van kaarten herhaalbaar */
  seed: number;
  /** de keuzes aan het eind van elke afgeronde ronde */
  vastgelegd: Keuzes[];
  /** de getrokken kaarten per ronde */
  getrokken: string[][];
};

/** Eenvoudige, herhaalbare toevalsgenerator (mulberry32). */
export function toeval(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Trekt één of twee kaarten die nog niet eerder zijn getrokken. */
export function trekKaarten(data: Data, seed: number, ronde: number, al: string[]): string[] {
  const r = toeval(seed * 31 + ronde);
  const over = data.gebeurtenissen.map((g) => g.id).filter((id) => !al.includes(id));
  const aantal = Math.min(over.length, r() < 0.5 ? 1 : 2);
  const uit: string[] = [];
  for (let i = 0; i < aantal; i++) {
    const j = Math.floor(r() * over.length);
    const [id] = over.splice(j, 1);
    if (id) uit.push(id);
  }
  return uit;
}

export function jaarVanRonde(data: Data, ronde: number): number {
  return data.jaren[ronde - 1] ?? data.jaren.at(-1) ?? data.config.actiefJaar;
}

export function stappen(data: Data, c: Campagne, keuzes: Keuzes): CampagneStap[] {
  return [
    ...c.vastgelegd.map((k, i) => ({ vanaf: jaarVanRonde(data, i + 1), keuzes: k })),
    { vanaf: jaarVanRonde(data, c.ronde), keuzes },
  ];
}

export function rekenCampagne(data: Data, c: Campagne, keuzes: Keuzes): Resultaat {
  return berekenCampagne(data, stappen(data, c, keuzes));
}

/** Wat een kaart kost of oplevert in het jaar van de ronde (+ = gunstig). */
export function kaartBedrag(
  r: Resultaat,
  id: string,
  jaar: number,
): { bedrag: number; soort: 'S' | 'I' } {
  let bedrag = 0;
  let soort: 'S' | 'I' = 'S';
  for (const e of r.effecten)
    if (e.bron === id && e.jaar === jaar) {
      bedrag += e.bedrag;
      soort = e.soort;
    }
  return { bedrag, soort };
}

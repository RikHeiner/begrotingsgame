/**
 * Tekent een gebouw in een van de vijf toestanden (opdracht 8.3), in wereldeenheden rond (0, 0).
 * Als een blokje in 3D (2,5D): een voorgevel, een zijgevel naar achteren en een schuin dak, met
 * licht van linksboven en een schaduw naar rechtsachter. Speciale gebouwen: park, zwembad,
 * Stadhuis met Martinitoren, nieuwbouw met kraan, veilinghuis met molen.
 */
import type { Tekenaar } from './canvasTekenaar';
import type { Gebouw } from '../../engine/schema';
import type { Toestand } from '../toestand';

export const GEBOUW_B = 50;
export const GEBOUW_H = 32;
/** Zo veel groter tekent de kaart een gebouw dan in deze tekening (wereldeenheden). */
export const GEBOUW_SCHAAL = 1.8;
/** Hoe ver boven het midden van een gebouw het nummer van de route staat (wereldeenheden). */
export const BOVEN_DAK = (GEBOUW_H / 2 + 22) * GEBOUW_SCHAAL;
/** Ruimte om een gebouw heen (toren, kraan, molen, vlag en schaduw), in wereldeenheden. */
export const GEBOUW_KADER = { links: 45, rechts: 70, boven: 60, onder: 30 };

const GRIJS = 0x9aa0a8;
/** De diepte van een gebouw: zo ver loopt de zijgevel naar rechtsachter (2,5D). */
const DIEPTE = { x: 11, y: -8 };
const ZWART = 0x15193a;
const RAND = { width: 1.6, color: ZWART, alpha: 0.35, join: 'round' as const };

function hex(kleur: string | undefined, standaard: number): number {
  return kleur ? Number.parseInt(kleur.slice(1), 16) : standaard;
}

/** Mengt een kleur met grijs (versoberd) of met wit (beter). */
function meng(kleur: number, met: number, deel: number): number {
  const r = (kleur >> 16) & 255;
  const g = (kleur >> 8) & 255;
  const b = kleur & 255;
  const mr = (met >> 16) & 255;
  const mg = (met >> 8) & 255;
  const mb = met & 255;
  const m = (x: number, y: number) => Math.round(x + (y - x) * deel);
  return (m(r, mr) << 16) | (m(g, mg) << 8) | m(b, mb);
}

export type TekenOpties = { toestand: Toestand; zwembadLeeg?: boolean };

export function tekenGebouw(g: Tekenaar, gebouw: Gebouw, o: TekenOpties): void {
  g.clear();
  const w = GEBOUW_B;
  const h = GEBOUW_H;
  const x = -w / 2;
  const y = -h / 2;
  const somber = o.toestand === 'versoberd' || o.toestand === 'gesloten';
  const fel = o.toestand === 'beter' || o.toestand === 'bloeiend';
  let muur = hex(gebouw.kleur, 0xe9d8b4);
  let dak = hex(gebouw.dak, 0x1233c4);
  if (somber) {
    muur = meng(muur, GRIJS, o.toestand === 'gesloten' ? 0.65 : 0.45);
    dak = meng(dak, GRIJS, o.toestand === 'gesloten' ? 0.65 : 0.45);
  } else if (fel) {
    muur = meng(muur, 0xffffff, 0.25);
  }

  const { x: dx, y: dy } = DIEPTE;
  // schaduw op de grond, naar rechtsachter
  g.poly([
    x - 2,
    y + h + 1,
    x + w + 2,
    y + h + 1,
    x + w + dx + 10,
    y + h + dy + 4,
    x + dx + 6,
    y + h + dy + 4,
  ]).fill({ color: 0x000000, alpha: 0.18 });

  if (gebouw.soort === 'park') {
    tekenPark(g, o.toestand, x, y, w, h);
    return;
  }

  // zijgevel (in de schaduw) met twee ramen
  const zij = meng(muur, ZWART, 0.28);
  g.poly([x + w, y, x + w + dx, y + dy, x + w + dx, y + h + dy, x + w, y + h])
    .fill(zij)
    .stroke(RAND);
  for (let r = 0; r < 2; r++) {
    const ry = y + 6 + r * 9;
    const donker = o.toestand === 'gesloten' || (o.toestand === 'versoberd' && r === 0);
    g.poly([x + w + 3, ry - 1, x + w + 8, ry - 4.6, x + w + 8, ry + 0.9, x + w + 3, ry + 4.5]).fill(
      donker ? 0x2c3140 : 0xe8c45f,
    );
  }
  // schuin dak naar achteren, daarna de voorgevel en de geveltop
  g.poly([0, y - 14, dx, y - 14 + dy, x + w + 4 + dx, y + 2 + dy, x + w + 4, y + 2])
    .fill(meng(dak, ZWART, 0.22))
    .stroke(RAND);
  g.rect(x, y, w, h).fill(muur).stroke(RAND);
  // licht van links: een smalle lichte rand op de voorgevel
  g.rect(x + 1, y + 1, 3, h - 2).fill({ color: 0xffffff, alpha: 0.25 });
  g.poly([x - 4, y + 2, 0, y - 14, x + w + 4, y + 2])
    .fill(dak)
    .stroke(RAND);
  g.poly([x - 1, y + 1, 0, y - 11, 6, y - 7]).fill({ color: 0xffffff, alpha: 0.18 });

  // ramen: bij versoberd de helft donker, bij gesloten alles donker; met een vensterbank
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const i = r * 4 + c;
      const donker = o.toestand === 'gesloten' || (o.toestand === 'versoberd' && i % 2 === 0);
      g.rect(x + 6 + c * 11, y + 6 + r * 9, 7, 5.5).fill(donker ? 0x3b4252 : 0xffe27a);
      g.rect(x + 6 + c * 11, y + 6 + r * 9, 7, 1.5).fill({ color: 0x000000, alpha: 0.18 });
      g.rect(x + 5.5 + c * 11, y + 11.5 + r * 9, 8, 1).fill({ color: 0xffffff, alpha: 0.5 });
    }
  }
  // deur
  g.roundRect(-4.5, y + h - 11, 9, 11, 2).fill(0x6b4a2b);

  if (gebouw.id === 'stadhuis') tekenMartinitoren(g, x + w + 8, y + h);
  if (gebouw.id === 'bouw') tekenKraan(g, x - 10, y + h, somber);
  if (gebouw.id === 'veiling') tekenMolen(g, x + w + 12, y + h);
  if (gebouw.id === 'zwembad') tekenBad(g, x + w + 4, y + h - 12, o.zwembadLeeg === true);

  if (o.toestand === 'gesloten') {
    // dichtgetimmerd
    g.rect(x + 2, y + 9, w - 4, 5).fill(0x8b5a2b);
    g.rect(x + 2, y + h - 14, w - 4, 5).fill(0x8b5a2b);
  }
  if (fel) {
    // bloembakken
    for (let c = 0; c < 4; c++) {
      const bx = x + 6 + c * 11;
      g.rect(bx - 0.5, y + h - 2.5, 8, 2.5).fill(0x8b5a2b);
      g.circle(bx + 2, y + h - 3.5, 1.6).fill(0xff6a8a);
      g.circle(bx + 5.5, y + h - 3.5, 1.6).fill(0xffd23f);
    }
  }
  if (o.toestand === 'bloeiend') {
    // vlag op het dak
    g.rect(-0.8, y - 26, 1.6, 13).fill(0x15193a);
    g.poly([0.8, y - 26, 12, y - 22.5, 0.8, y - 19]).fill(0xff6a00);
    // bouwkraan bij investeren (als er nog geen kraan staat)
    if (gebouw.id !== 'bouw')
      tekenKraan(g, x + w + (gebouw.id === 'stadhuis' ? 20 : 6), y + h, false, 0.7);
  }
}

function tekenPark(
  g: Tekenaar,
  toestand: Toestand,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const gras = toestand === 'gesloten' ? 0xa7b48f : toestand === 'versoberd' ? 0x8fbf6e : 0x6dbb55;
  // een plak gras met een aarden rand eronder
  g.roundRect(x, y + 1, w, h + 4, 10).fill(0x7a5c3e);
  g.roundRect(x, y - 4, w, h + 4, 10)
    .fill(gras)
    .stroke({ width: 2, color: 0x15193a, alpha: 0.2 });
  g.ellipse(x + w - 13, y + h - 9, 8, 4).fill(0x4a9fd8);
  const bomen: [number, number, number][] = [
    [x + 11, y + 6, 7],
    [x + 34, y + 9, 8],
    [x + 22, y + 18, 6.5],
  ];
  for (const [bx, by, r] of bomen) {
    g.ellipse(bx + 4, by + 7, r * 0.9, 2.2).fill({ color: 0x000000, alpha: 0.2 });
    g.rect(bx - 1.2, by, 2.4, 7).fill(0x6b4a2b);
    g.circle(bx, by, r).fill(toestand === 'gesloten' ? 0x5b7446 : 0x267a38);
    // licht van linksboven
    g.circle(bx - r * 0.3, by - r * 0.3, r * 0.6).fill(
      toestand === 'gesloten' ? 0x7f9a63 : 0x3fa152,
    );
  }
  if (toestand === 'versoberd' || toestand === 'gesloten') {
    // gaten in de weg en zwerfafval
    g.ellipse(x + 8, y + h - 4, 3, 1.6).fill(0x3b3b3b);
    g.rect(x + 28, y + h - 7, 3, 3).fill(0xd9d9d9);
    g.rect(x + 33, y + h - 5, 2.5, 2.5).fill(0xf2c94c);
  }
  if (toestand === 'beter' || toestand === 'bloeiend') {
    const kleuren = [0xff6a8a, 0xffd23f, 0xffffff, 0xb57bff];
    for (let i = 0; i < (toestand === 'bloeiend' ? 10 : 5); i++) {
      g.circle(x + 5 + ((i * 9) % (w - 10)), y + h - 3 - (i % 2) * 3, 1.5).fill(
        kleuren[i % 4] ?? 0xffffff,
      );
    }
  }
}

function tekenMartinitoren(g: Tekenaar, x: number, onder: number): void {
  g.poly([x + 5, onder - 46, x + 9, onder - 49, x + 9, onder - 3, x + 5, onder]).fill(0x8a6440);
  g.rect(x - 5, onder - 46, 10, 46)
    .fill(0xb98b5e)
    .stroke({ width: 1.5, color: 0x6b4a2b });
  g.rect(x - 3.5, onder - 56, 7, 10)
    .fill(0xa67a50)
    .stroke({ width: 1.5, color: 0x6b4a2b });
  g.poly([x - 3, onder - 56, x, onder - 66, x + 3, onder - 56])
    .fill(0x3e7d6a)
    .stroke({ width: 1.5, color: 0x6b4a2b });
  g.circle(x, onder - 34, 3)
    .fill(0xffffff)
    .stroke({ width: 1, color: 0x6b4a2b });
}

function tekenKraan(g: Tekenaar, x: number, onder: number, stil: boolean, schaal = 1): void {
  const kleur = stil ? 0xb0a27a : 0xf2b705;
  const s = schaal;
  g.rect(x - 1.2 * s, onder - 44 * s, 2.4 * s, 44 * s).fill(kleur);
  g.rect(x - 4 * s, onder - 44 * s, 26 * s, 2.2 * s).fill(kleur);
  g.rect(x + 18 * s, onder - 42 * s, 0.8 * s, 14 * s).fill(0x15193a);
  g.rect(x + 16 * s, onder - 28 * s, 5 * s, 4 * s).fill(0x6b4a2b);
}

function tekenMolen(g: Tekenaar, x: number, onder: number): void {
  g.poly([x - 6, onder, x - 3.5, onder - 22, x + 3.5, onder - 22, x + 6, onder]).fill(0x7a5b3a);
  g.circle(x, onder - 22, 2).fill(0x15193a);
  for (const [dx, dy] of [
    [0, -14],
    [14, 0],
    [0, 14],
    [-14, 0],
  ] as const) {
    g.moveTo(x, onder - 22)
      .lineTo(x + dx, onder - 22 + dy)
      .stroke({ width: 2.4, color: 0xf6f7fc });
  }
}

function tekenBad(g: Tekenaar, x: number, y: number, leeg: boolean): void {
  g.roundRect(x, y, 16, 11, 2)
    .fill(leeg ? 0xd7dde3 : 0x4a9fd8)
    .stroke({ width: 1.5, color: 0xffffff });
  if (leeg) {
    // hek dicht
    for (let i = 0; i <= 4; i++) g.rect(x - 1 + i * 4.5, y - 3, 1, 15).fill(0x6b7280);
    g.rect(x - 1, y + 2, 19, 1).fill(0x6b7280);
  }
}

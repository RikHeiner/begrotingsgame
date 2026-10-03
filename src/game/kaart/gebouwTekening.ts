/**
 * Tekent een gebouw in een van de vijf toestanden (opdracht 8.3), in wereldeenheden rond (0, 0).
 * Als een blokje in 3D (2,5D): een voorgevel, een zijgevel naar achteren en een schuin dak, met
 * licht van linksboven en een schaduw naar rechtsachter. Speciale gebouwen: park, zwembad,
 * Stadhuis met Martinitoren, nieuwbouw met kraan, veilinghuis met molen.
 */
import type { Tekenaar } from './canvasTekenaar';
import type { Gebouw, Minigame } from '../../engine/schema';
import type { Toestand } from '../toestand';

import { GEBOUW_B, GEBOUW_H } from './maten';

export { BOVEN_DAK, GEBOUW_B, GEBOUW_H, GEBOUW_SCHAAL } from './maten';
/** Ruimte om een gebouw heen (toren, kraan, molen, vlag en schaduw), in wereldeenheden. */
export const GEBOUW_KADER = { links: 45, rechts: 70, boven: 60, onder: 30 };

type MinigameVorm = Minigame['vorm'];

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

/**
 * Een blokje in 3D: voorgevel, zijgevel (donkerder) en bovenkant (lichter), met de diepte naar
 * rechtsachter zoals bij de gebouwen.
 */
function blok(
  g: Tekenaar,
  x: number,
  y: number,
  b: number,
  h: number,
  kleur: number,
  diepte = 0.7,
): void {
  const dx = DIEPTE.x * diepte;
  const dy = DIEPTE.y * diepte;
  g.poly([x + b, y, x + b + dx, y + dy, x + b + dx, y + h + dy, x + b, y + h])
    .fill(meng(kleur, ZWART, 0.28))
    .stroke(RAND);
  g.poly([x, y, x + dx, y + dy, x + b + dx, y + dy, x + b, y])
    .fill(meng(kleur, 0xffffff, 0.3))
    .stroke(RAND);
  g.rect(x, y, b, h).fill(kleur).stroke(RAND);
}

function grondSchaduw(g: Tekenaar, b: number, onder = GEBOUW_H / 2): void {
  g.poly([
    -b / 2 - 2,
    onder + 1,
    b / 2 + 2,
    onder + 1,
    b / 2 + 16,
    onder - 5,
    -b / 2 + 12,
    onder - 5,
  ]).fill({
    color: 0x000000,
    alpha: 0.18,
  });
}

/**
 * De bekende gebouwen van Groningen waar een minigame in zit, rond (0, 0) met de onderkant op
 * GEBOUW_H / 2, net als de andere gebouwen.
 */
export function tekenBezienswaardigheid(g: Tekenaar, vorm: MinigameVorm): void {
  g.clear();
  const onder = GEBOUW_H / 2;
  switch (vorm) {
    case 'toren': {
      // De Martinitoren: vier lagen, steeds smaller, met een groene spits en een klok.
      grondSchaduw(g, 18, onder);
      blok(g, -9, onder - 34, 18, 34, 0xc89b6d);
      blok(g, -7, onder - 50, 14, 16, 0xb98b5e);
      blok(g, -5, onder - 62, 10, 12, 0xa67a50, 0.5);
      g.poly([-5, onder - 62, 0, onder - 76, 5, onder - 62])
        .fill(0x3e7d6a)
        .stroke(RAND);
      g.circle(0, onder - 42, 3.6)
        .fill(0xffffff)
        .stroke({ width: 1, color: 0x6b4a2b });
      g.moveTo(0, onder - 42)
        .lineTo(0, onder - 44.5)
        .stroke({ width: 0.8, color: ZWART });
      g.moveTo(0, onder - 42)
        .lineTo(1.8, onder - 42)
        .stroke({ width: 0.8, color: ZWART });
      for (let i = 0; i < 3; i++) g.rect(-6 + i * 5, onder - 28, 2.6, 7).fill(0x6b4a2b);
      g.rect(-2.5, onder - 9, 5, 9).fill(0x6b4a2b);
      return;
    }
    case 'markt': {
      // Kramen op de Grote Markt met gestreepte luifels.
      grondSchaduw(g, 52, onder);
      g.poly([-28, onder, 28, onder, 36, onder - 8, -20, onder - 8])
        .fill(0xd9cdb4)
        .stroke(RAND);
      const kleuren = [0xd2465e, 0x1233c4, 0x15875a];
      for (let i = 0; i < 3; i++) {
        const x = -24 + i * 17;
        blok(g, x, onder - 10, 13, 9, 0x8b5a2b, 0.4);
        g.poly([x - 2, onder - 10, x + 15, onder - 10, x + 13, onder - 18, x, onder - 18])
          .fill(kleuren[i] ?? 0xd2465e)
          .stroke(RAND);
        for (let s = 0; s < 3; s++)
          g.rect(x + 1 + s * 4.5, onder - 17, 2, 6.5).fill({ color: 0xffffff, alpha: 0.85 });
        g.circle(x + 4, onder - 7, 1.6).fill(0xe8a33c);
        g.circle(x + 8, onder - 7, 1.6).fill(0xf2c94c);
      }
      return;
    }
    case 'station': {
      // Het Hoofdstation: een lange gevel met een middenstuk, een klok en twee torentjes.
      grondSchaduw(g, 60, onder);
      blok(g, -30, onder - 20, 60, 20, 0xb5542b);
      blok(g, -9, onder - 30, 18, 30, 0xc0653a);
      g.poly([-11, onder - 30, 0, onder - 38, 11, onder - 30])
        .fill(0x5b6470)
        .stroke(RAND);
      g.circle(0, onder - 24, 3.5)
        .fill(0xffffff)
        .stroke({ width: 1, color: ZWART });
      for (const tx of [-28, 24]) {
        blok(g, tx, onder - 26, 6, 26, 0xa04a24, 0.4);
        g.poly([tx - 1, onder - 26, tx + 3, onder - 33, tx + 7, onder - 26]).fill(0x5b6470);
      }
      for (let i = 0; i < 5; i++) {
        const x = -26 + i * 5 + (i > 1 ? 30 : 0);
        if (x > 24) break;
        g.roundRect(x, onder - 15, 3.4, 8, 1.7).fill(0xffe27a);
      }
      g.roundRect(-4, onder - 12, 8, 12, 4).fill(0x3b4252);
      return;
    }
    case 'forum': {
      // Het Forum: een hoog, schuin afgesneden blok met lichte stroken.
      grondSchaduw(g, 30, onder);
      g.poly([15, onder, 23, onder - 6, 23, onder - 58, 15, onder - 46])
        .fill(0x4a5162)
        .stroke(RAND);
      g.poly([-15, onder - 56, -7, onder - 62, 23, onder - 58, 15, onder - 46])
        .fill(0x8a93a6)
        .stroke(RAND);
      g.poly([-15, onder, 15, onder, 15, onder - 46, -15, onder - 56])
        .fill(0x5d6578)
        .stroke(RAND);
      for (let r = 0; r < 6; r++)
        g.rect(-12, onder - 8 - r * 7.5, 24, 2.2).fill({ color: 0xffe27a, alpha: 0.7 });
      g.rect(-4, onder - 7, 8, 7).fill(0x2c3140);
      return;
    }
    case 'stadion': {
      // De Euroborg: een ovale tribune in groen en wit met een veld.
      g.ellipse(6, onder + 2, 34, 9).fill({ color: 0x000000, alpha: 0.18 });
      g.ellipse(0, onder - 4, 32, 12)
        .fill(0x0b6b3a)
        .stroke(RAND);
      g.ellipse(0, onder - 9, 32, 12)
        .fill(0x15875a)
        .stroke(RAND);
      g.ellipse(0, onder - 9, 26, 8.5).fill(0xffffff);
      g.ellipse(0, onder - 9, 22, 6.5).fill(0x4fae55);
      g.moveTo(0, onder - 15.5)
        .lineTo(0, onder - 2.5)
        .stroke({ width: 0.8, color: 0xffffff });
      g.ellipse(0, onder - 9, 3.2, 1.8).stroke({ width: 0.8, color: 0xffffff });
      for (const lx of [-30, 30]) {
        g.rect(lx - 0.6, onder - 34, 1.2, 24).fill(0x5b6470);
        g.rect(lx - 3, onder - 36, 6, 3).fill(0xffe27a);
      }
      return;
    }
    case 'plantsoen': {
      // Het Noorderplantsoen: gras, een vijver, bomen en een bankje.
      g.roundRect(-28, onder - 18, 56, 22, 10).fill(0x7a5c3e);
      g.roundRect(-28, onder - 22, 56, 22, 10)
        .fill(0x6dbb55)
        .stroke(RAND);
      g.ellipse(10, onder - 9, 10, 4).fill(0x4a9fd8);
      g.rect(-10, onder - 9, 9, 1.6).fill(0x8b5a2b);
      g.rect(-9, onder - 8, 1, 3).fill(0x6b4a2b);
      g.rect(-3, onder - 8, 1, 3).fill(0x6b4a2b);
      for (const [bx, by, r] of [
        [-20, onder - 22, 7],
        [-6, onder - 26, 8],
        [20, onder - 24, 7],
      ] as const) {
        g.ellipse(bx + 4, by + 8, r * 0.9, 2.2).fill({ color: 0x000000, alpha: 0.2 });
        g.rect(bx - 1.2, by, 2.4, 8).fill(0x6b4a2b);
        g.circle(bx, by, r).fill(0x267a38);
        g.circle(bx - r * 0.3, by - r * 0.3, r * 0.6).fill(0x3fa152);
      }
      return;
    }
    case 'museum': {
      // Het Groninger Museum: kleurige blokken op het water, met de gouden toren.
      g.ellipse(4, onder - 2, 34, 7).fill(0x4a9fd8);
      blok(g, -26, onder - 14, 18, 14, 0xd2465e, 0.5);
      blok(g, -8, onder - 40, 14, 40, 0xf2c94c, 0.5);
      blok(g, 8, onder - 18, 18, 18, 0x1d86c8, 0.5);
      g.poly([8, onder - 18, 14, onder - 26, 26, onder - 18])
        .fill(0xb4bccb)
        .stroke(RAND);
      for (let r = 0; r < 4; r++) g.rect(-5, onder - 34 + r * 8, 8, 3).fill(0xffffff);
      return;
    }
    case 'academie': {
      // Het Academiegebouw: een stenen gevel met zuilen, een fronton en een koepel.
      grondSchaduw(g, 50, onder);
      blok(g, -25, onder - 26, 50, 26, 0xe9d8b4);
      for (let i = 0; i < 6; i++) g.rect(-21 + i * 8, onder - 22, 3, 20).fill(0xf6f0e0);
      g.poly([-27, onder - 26, 0, onder - 38, 27, onder - 26])
        .fill(0xd9c49a)
        .stroke(RAND);
      g.rect(-6, onder - 46, 12, 9)
        .fill(0xd9c49a)
        .stroke(RAND);
      g.ellipse(0, onder - 46, 6, 6)
        .fill(0x3e7d6a)
        .stroke(RAND);
      g.rect(-0.6, onder - 56, 1.2, 5).fill(0xc9a227);
      g.rect(-4, onder - 10, 8, 10).fill(0x6b4a2b);
      return;
    }
    case 'sluis': {
      // De Oostersluis: water tussen kades, twee sluisdeuren en een bootje.
      g.poly([-30, onder, 30, onder, 38, onder - 14, -22, onder - 14])
        .fill(0x7a5c3e)
        .stroke(RAND);
      g.poly([-22, onder - 2, 22, onder - 2, 30, onder - 12, -14, onder - 12]).fill(0x4a9fd8);
      for (const sx of [-10, 14]) {
        blok(g, sx, onder - 18, 3, 16, 0x6b4a2b, 0.4);
        g.rect(sx - 4, onder - 20, 11, 2).fill(0x15193a);
      }
      g.poly([-2, onder - 8, 8, onder - 8, 6, onder - 4, 0, onder - 4])
        .fill(0xd2465e)
        .stroke(RAND);
      g.rect(2, onder - 13, 3, 5).fill(0xffffff);
      return;
    }
    case 'concertzaal': {
      // De Oosterpoort: een bakstenen zaal met een grote glazen gevel en een muzieknoot.
      grondSchaduw(g, 50, onder);
      blok(g, -25, onder - 28, 50, 28, 0x9c5a3c);
      g.rect(-18, onder - 22, 36, 16)
        .fill(0xbfe3f5)
        .stroke(RAND);
      for (let i = 1; i < 4; i++) g.rect(-18 + i * 9, onder - 22, 1, 16).fill(0x5b6470);
      g.circle(-3, onder - 36, 3).fill(ZWART);
      g.rect(-0.8, onder - 46, 1.6, 10).fill(ZWART);
      g.poly([0.8, onder - 46, 7, onder - 43, 0.8, onder - 41]).fill(ZWART);
      g.rect(-4, onder - 6, 8, 6).fill(0x3b4252);
      return;
    }
  }
}

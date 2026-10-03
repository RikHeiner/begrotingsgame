/**
 * De 3D-modellen van de gebouwen op de kaart, zo echt mogelijk maar wel speels: de Martinitoren
 * met zijn geledingen en groene koepel, een winkelstraat met smalle Groninger panden en
 * winkelpuien, het Hoofdstation, het Forum, de Euroborg, het Groninger Museum en de andere.
 *
 * Elk model staat met de voet op y = 0 rond (0, 0) en is ongeveer 46 breed en 34 diep. De kaart
 * schaalt het daarna (GEBOUW_SCHAAL of MINIGAME_SCHAAL). Elk model geeft ook zijn hoogte terug,
 * zodat de knoppen en labels erboven kunnen staan.
 */
import { CatmullRomCurve3, ExtrudeGeometry, Group, Shape, Vector2, Vector3 } from 'three';
import type { Gebouw, Minigame } from '../../engine/schema';
import type { Toestand } from '../toestand';
import { Bouwer, Stijl, bord, materiaal, type Kant } from './bouwer';

export type Model = {
  groep: Group;
  /** de top van het gebouw (zonder vlag of kraan) */
  hoogte: number;
  /** delen die bewegen: de wieken van de molen */
  wieken?: Group;
};

// Kleuren van echte materialen
const BAKSTEEN = 0x9a4b33;
const BAKSTEEN_DONKER = 0x74382a;
const BAKSTEEN_ROOD = 0xa8452c;
const ZANDSTEEN = 0xd8c8a2;
const TORENSTEEN = 0xb9aa8a;
const PLEISTER = 0xeee6d3;
const WIT = 0xf4f2ec;
const BETON = 0xb7b5ae;
const LEI = 0x4b505b;
const DAKPAN = 0x9e4630;
const KOPER = 0x5f9e88;
const HOUT = 0x7b5434;
const DONKERHOUT = 0x4a3221;
const GRAS = 0x5f9e45;
const STRAAT = 0xb9b0a0;
const BLAUW = 0x1233c4;
const ORANJE = 0xff6400;

export type ModelOpties = { toestand: Toestand; zwembadLeeg?: boolean };

export function maakGebouwModel(g: Gebouw, o: ModelOpties): Model {
  const stijl = new Stijl(o.toestand);
  const b = new Bouwer(stijl);
  let model: Model;
  switch (g.id) {
    case 'stadhuis':
      model = stadhuis(b);
      break;
    case 'winkel':
      model = winkelstraat(b);
      break;
    case 'parkeer':
      model = parkeergarage(b);
      break;
    case 'werk':
      model = kantoor(b, 'WERKPLEIN', 0xe8590c, 4);
      break;
    case 'zwembad':
      model = zwembad(b, o.zwembadLeeg === true);
      break;
    case 'buurt':
      model = buurthuis(b);
      break;
    case 'zorg':
      model = zorgcentrum(b);
      break;
    case 'politie':
      model = politie(b);
      break;
    case 'theater':
      model = schouwburg(b);
      break;
    case 'school':
      model = school(b);
      break;
    case 'park':
      model = park(b);
      break;
    case 'bouw':
      model = nieuwbouw(b);
      break;
    case 'veiling':
      model = veilinghuis(b);
      break;
    case 'beleid':
      model = beleidshuis(b);
      break;
    case 'loket':
      model = belastingloket(b);
      break;
    default:
      model = kantoor(b, g.naam.toUpperCase(), BLAUW, 3);
  }
  toestandExtra(model, stijl, g.id);
  return model;
}

export function maakMinigameModel(m: Minigame): Model {
  const b = new Bouwer(new Stijl('normaal'));
  switch (m.vorm) {
    case 'markt':
      return grotemarkt(b);
    case 'station':
      return station(b);
    case 'forum':
      return forum(b);
    case 'stadion':
      return euroborg(b);
    case 'plantsoen':
      return plantsoen(b);
    case 'museum':
      return museum(b);
    case 'academie':
      return academiegebouw(b);
    case 'sluis':
      return sluis(b);
    case 'concertzaal':
      return oosterpoort(b);
    case 'goudkantoor':
      return goudkantoor(b);
    case 'toren':
    default:
      martinitoren(b, 0, 0);
      return { groep: b.groep(), hoogte: 72 };
  }
}

// -------------------------------------------------------------------------------------------------
// Kleine onderdelen
// -------------------------------------------------------------------------------------------------

function boom(b: Bouwer, x: number, z: number, h = 7, kaal = false): void {
  b.cilinder(b.stijl.m(DONKERHOUT), 0.35, 0.5, h * 0.55, { x, z });
  if (kaal) {
    b.cilinder(b.stijl.m(DONKERHOUT), 0.08, 0.2, h * 0.4, { x: x + 0.6, y: h * 0.45, z, rz: -0.6 });
    b.cilinder(b.stijl.m(DONKERHOUT), 0.08, 0.2, h * 0.4, { x: x - 0.6, y: h * 0.45, z, rz: 0.6 });
    return;
  }
  const blad = b.stijl.m(b.stijl.somber ? 0x7d8a4a : 0x3f8a3a);
  b.bol(blad, h * 0.32, { x, y: h * 0.7, z }, 9);
  b.bol(
    b.stijl.m(b.stijl.somber ? 0x8b9655 : 0x55a046),
    h * 0.22,
    {
      x: x + h * 0.12,
      y: h * 0.86,
      z: z + h * 0.08,
    },
    8,
  );
}

function den(b: Bouwer, x: number, z: number, h = 8): void {
  b.cilinder(b.stijl.m(DONKERHOUT), 0.3, 0.4, h * 0.3, { x, z });
  b.spits(b.stijl.m(0x2f6b3a), h * 0.3, h * 0.75, { x, y: h * 0.22, z }, 8);
}

function lantaarn(b: Bouwer, x: number, z: number, h = 5): void {
  b.cilinder(materiaal('metaal', 0x2c3038), 0.1, 0.14, h, { x, z }, 6);
  b.bol(materiaal('licht', 0xfff1c4), 0.35, { x, y: h + 0.2, z }, 8);
}

function bankje(b: Bouwer, x: number, z: number, ry = 0): void {
  b.blok(b.stijl.m(HOUT), 3, 0.25, 0.9, { x, y: 0.7, z, ry });
  b.blok(materiaal('metaal', 0x2c3038), 0.2, 0.7, 0.8, {
    x: x - 1.2 * Math.cos(ry),
    z: z + 1.2 * Math.sin(ry),
    ry,
  });
  b.blok(materiaal('metaal', 0x2c3038), 0.2, 0.7, 0.8, {
    x: x + 1.2 * Math.cos(ry),
    z: z - 1.2 * Math.sin(ry),
    ry,
  });
}

/** Een auto: carrosserie, cabine met ramen en vier wielen. */
function auto(b: Bouwer, x: number, z: number, kleur: number, ry = 0, y = 0): void {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  b.blok(materiaal('glans', kleur), 4.2, 1.1, 1.9, { x, y: y + 0.4, z, ry });
  b.blok(materiaal('glas', 0x6f8796), 2.4, 0.8, 1.7, {
    x: x - 0.2 * c,
    y: y + 1.5,
    z: z + 0.2 * s,
    ry,
  });
  for (const [dx, dz] of [
    [-1.3, -0.9],
    [1.3, -0.9],
    [-1.3, 0.9],
    [1.3, 0.9],
  ] as const) {
    b.cilinder(
      materiaal('mat', 0x1e1f24),
      0.42,
      0.42,
      0.35,
      {
        x: x + dx * c + dz * s,
        y: y + 0.42,
        z: z - dx * s + dz * c,
        rx: Math.PI / 2,
        ry,
      },
      10,
    );
  }
}

function fiets(b: Bouwer, x: number, z: number, kleur: number, ry = 0): void {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  for (const d of [-0.55, 0.55])
    b.cilinder(
      materiaal('metaal', 0x222222),
      0.45,
      0.45,
      0.08,
      {
        x: x + d * c,
        y: 0.45,
        z: z - d * s,
        rx: Math.PI / 2,
        ry,
      },
      12,
    );
  b.blok(materiaal('glans', kleur), 1.2, 0.12, 0.12, { x, y: 0.75, z, ry });
}

function persoon(b: Bouwer, x: number, z: number, kleur: number): void {
  b.cilinder(materiaal('mat', 0x2a2f45), 0.22, 0.22, 0.8, { x, z }, 6);
  b.cilinder(materiaal('mat', kleur), 0.28, 0.3, 0.8, { x, y: 0.8, z }, 6);
  b.bol(materiaal('mat', 0xe8b48a), 0.24, { x, y: 1.85, z }, 8);
}

/** Een stenen balustrade rondom (zonder de hoeken te verdubbelen). */
function balustrade(
  b: Bouwer,
  m: ReturnType<Stijl['m']>,
  br: number,
  d: number,
  y: number,
  h = 0.9,
  z0 = 0,
): void {
  b.blok(m, br, 0.25, 0.4, { y: y + h, z: z0 + d / 2 - 0.2 });
  b.blok(m, br, 0.25, 0.4, { y: y + h, z: z0 - d / 2 + 0.2 });
  b.blok(m, 0.4, 0.25, d, { x: br / 2 - 0.2, y: y + h, z: z0 });
  b.blok(m, 0.4, 0.25, d, { x: -br / 2 + 0.2, y: y + h, z: z0 });
  for (let i = 0; i <= Math.round(br / 1.2); i++) {
    const x = -br / 2 + (i * br) / Math.round(br / 1.2);
    b.blok(m, 0.25, h, 0.25, { x, y, z: z0 + d / 2 - 0.2 });
    b.blok(m, 0.25, h, 0.25, { x, y, z: z0 - d / 2 + 0.2 });
  }
}

/** Een klok op een gevel. */
function klok(b: Bouwer, x: number, y: number, z: number, r: number, ry = 0): void {
  b.cilinder(
    materiaal('glans', 0xfaf7ee),
    r,
    r,
    0.2,
    { x, y: y - 0.1, z, rx: Math.PI / 2, ry },
    20,
  );
  b.blok(materiaal('mat', 0x1a1a1a), 0.12, r * 0.75, 0.1, { x, y, z: z + 0.15, ry });
  b.blok(materiaal('mat', 0x1a1a1a), r * 0.55, 0.12, 0.1, {
    x: x + r * 0.27,
    y: y + r * 0.0,
    z: z + 0.15,
    ry,
  });
}

function vlag(b: Bouwer, x: number, y: number, z: number, kleur: number, h = 8): void {
  b.cilinder(materiaal('metaal', 0xd7d9dc), 0.1, 0.12, h, { x, y, z }, 6);
  b.blok(materiaal('glans', kleur), 3, 1.9, 0.08, { x: x + 1.55, y: y + h - 2.1, z });
}

/** Een trapgevel of halsgevel van een smal pand, in het xy-vlak (breedte w, vanaf hoogte h). */
function gevelTop(w: number, soort: 'trap' | 'hals' | 'tuit', top: number): [number, number][] {
  const h = w / 2;
  if (soort === 'trap')
    return [
      [-h, 0],
      [h, 0],
      [h, top * 0.3],
      [h * 0.62, top * 0.3],
      [h * 0.62, top * 0.62],
      [h * 0.3, top * 0.62],
      [h * 0.3, top],
      [-h * 0.3, top],
      [-h * 0.3, top * 0.62],
      [-h * 0.62, top * 0.62],
      [-h * 0.62, top * 0.3],
      [-h, top * 0.3],
    ];
  if (soort === 'hals')
    return [
      [-h, 0],
      [h, 0],
      [h * 0.85, top * 0.15],
      [h * 0.45, top * 0.35],
      [h * 0.4, top * 0.85],
      [0, top],
      [-h * 0.4, top * 0.85],
      [-h * 0.45, top * 0.35],
      [-h * 0.85, top * 0.15],
    ];
  return [
    [-h, 0],
    [h, 0],
    [0, top],
  ];
}

// -------------------------------------------------------------------------------------------------
// De gebouwen van de begroting
// -------------------------------------------------------------------------------------------------

/**
 * De Martinitoren (97 meter): zes geledingen van Bentheimer zandsteen, steeds smaller, met
 * balustrades en pinakels op de hoeken, galmgaten, een open lantaarn en een groene koperen
 * koepel met spits en windvaan. Staat op (x, z).
 */
function martinitoren(b: Bouwer, x: number, z: number): number {
  const steen = b.stijl.m(TORENSTEEN);
  const licht = b.stijl.m(0xcdbf9f);
  const gat = materiaal('donker', 0x262a30);
  const koper = b.stijl.m(KOPER);
  const lagen: { w: number; h: number; ramen: number }[] = [
    { w: 10, h: 21, ramen: 1 },
    { w: 8.8, h: 11, ramen: 2 },
    { w: 7.6, h: 9, ramen: 2 },
    { w: 6.4, h: 8, ramen: 1 },
  ];
  let y = 0;
  lagen.forEach((l, i) => {
    b.blok(steen, l.w, l.h, l.w, { x, y, z });
    // steunberen op de hoeken van de onderste laag
    if (i === 0)
      for (const [dx, dz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const)
        b.blok(licht, 1.4, l.h - 2, 1.4, { x: x + dx * (l.w / 2), y, z: z + dz * (l.w / 2) });
    // hoge spitsboogramen of galmgaten op elke kant
    for (const kant of ['voor', 'rechts', 'achter', 'links'] as Kant[]) {
      for (let r = 0; r < l.ramen; r++) {
        const u = l.ramen === 1 ? 0 : (r - 0.5) * (l.w * 0.4);
        const hoog = i === 0 ? 9 : l.h * 0.62;
        const onder = y + (i === 0 ? 8 : l.h * 0.2);
        const d = l.w / 2 + 0.05;
        const p =
          kant === 'voor'
            ? { x: x + u, z: z + d }
            : kant === 'achter'
              ? { x: x - u, z: z - d }
              : kant === 'rechts'
                ? { x: x + d, z: z - u }
                : { x: x - d, z: z + u };
        const ry = kant === 'rechts' || kant === 'links' ? Math.PI / 2 : 0;
        b.blok(gat, i === 0 ? 2.2 : 1.4, hoog, 0.3, { ...p, y: onder, ry });
        b.spits(gat, i === 0 ? 1.1 : 0.7, 1.2, { ...p, y: onder + hoog, ry: ry + Math.PI / 4 }, 3);
      }
    }
    y += l.h;
    // kroonlijst, balustrade en pinakels
    b.blok(licht, l.w + 1.2, 0.7, l.w + 1.2, { x, y, z });
    y += 0.7;
    const bw = l.w + 0.8;
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      b.blok(licht, 0.7, 1.4, 0.7, { x: x + (dx * bw) / 2, y, z: z + (dz * bw) / 2 });
      b.spits(licht, 0.45, 2.4, { x: x + (dx * bw) / 2, y: y + 1.4, z: z + (dz * bw) / 2 });
    }
    for (const kant of [-1, 1]) {
      b.blok(licht, bw, 0.9, 0.25, { x, y, z: z + (kant * bw) / 2 });
      b.blok(licht, 0.25, 0.9, bw, { x: x + (kant * bw) / 2, y, z });
    }
  });
  // klokken (de Martinitoren heeft vier wijzerplaten)
  klok(b, x, 26.5, z + 4.45, 1.5);
  // open lantaarn: acht zuiltjes onder een kroonlijst
  const r = 2.6;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.cilinder(licht, 0.25, 0.25, 5, { x: x + Math.cos(a) * r, y, z: z + Math.sin(a) * r }, 6);
  }
  b.cilinder(gat, r - 0.6, r - 0.6, 5, { x, y, z }, 8);
  b.cilinder(licht, r + 0.5, r + 0.5, 0.6, { x, y: y + 5, z }, 8);
  y += 5.6;
  // de koperen koepel: uitbuigend, dan ingesnoerd, met een tweede lantaarntje en de spits
  b.draai(
    koper,
    [
      [r + 0.4, 0],
      [r + 0.7, 1.2],
      [r + 0.3, 2.6],
      [1.4, 4.2],
      [0.9, 5.2],
      [0.9, 6.4],
      [1.3, 6.6],
      [0.5, 8.8],
      [0.35, 10],
      [0.08, 14],
    ],
    { x, y, z },
    8,
  );
  b.bol(materiaal('metaal', 0xd4a62a), 0.4, { x, y: y + 11.2, z }, 8);
  // de windvaan: het paard
  b.blok(materiaal('metaal', 0xd4a62a), 1.4, 0.7, 0.12, { x: x + 0.4, y: y + 12.2, z });
  return y + 14;
}

/**
 * Het Stadhuis (1810, classicistisch): een lange lichte gevel met een portiek van zuilen, een
 * fronton en een schilddak van lei. Ernaast de Martinitoren met het schip van de Martinikerk.
 */
function stadhuis(b: Bouwer): Model {
  const s = b.stijl;
  const muur = s.m(PLEISTER);
  const lijst = s.m(WIT);
  b.blok(s.m(ZANDSTEEN), 38, 1.2, 18, { z: 1 });
  b.blok(muur, 36, 13, 16, { y: 1.2 });
  b.blok(lijst, 37, 0.8, 17, { y: 14.2 });
  b.schilddak(s.m(LEI), 36.5, 16.5, 6, { y: 15 });
  b.ramen({
    kant: 'voor',
    z: 8,
    breedte: 36,
    rijen: 2,
    kolommen: 9,
    onder: 3.2,
    tussen: 5.5,
    rb: 1.8,
    rh: 3.2,
    zonder: [[0, 4]],
  });
  b.ramen({
    kant: 'achter',
    z: -8,
    breedte: 36,
    rijen: 2,
    kolommen: 9,
    onder: 3.2,
    tussen: 5.5,
    rb: 1.8,
    rh: 3.2,
  });
  b.ramen({
    kant: 'rechts',
    x: 18,
    z: 0,
    breedte: 16,
    rijen: 2,
    kolommen: 4,
    onder: 3.2,
    tussen: 5.5,
    rb: 1.8,
    rh: 3.2,
  });
  b.ramen({
    kant: 'links',
    x: -18,
    z: 0,
    breedte: 16,
    rijen: 2,
    kolommen: 4,
    onder: 3.2,
    tussen: 5.5,
    rb: 1.8,
    rh: 3.2,
  });
  // portiek met zes zuilen en een fronton
  b.blok(lijst, 14, 0.8, 5, { y: 1.2, z: 10.5 });
  for (let i = 0; i < 6; i++)
    b.cilinder(lijst, 0.55, 0.65, 10, { x: -6 + i * 2.4, y: 2, z: 11.8 }, 12);
  b.blok(lijst, 15, 1.4, 5.4, { y: 12, z: 10.4 });
  b.vorm(
    lijst,
    [
      [-7.5, 0],
      [7.5, 0],
      [0, 3.6],
    ],
    5.2,
    { y: 13.4, z: 13.1 },
  );
  b.blok(materiaal('donker', 0x3a2a1e), 2.4, 4.4, 0.3, { y: 2, z: 8.1 });
  // trap voor de ingang
  for (let i = 0; i < 3; i++)
    b.blok(s.m(0xc9c1b0), 14 - i, 0.4, 1.6, { y: i * 0.4, z: 14 - i * 0.5 });
  // de Martinitoren met het schip en het koor van de Martinikerk
  const toren = martinitoren(b, 33, -8);
  const kerk = s.m(0xb99e7a);
  b.blok(kerk, 20, 13, 13, { x: 48, z: -8 });
  b.zadeldak(s.m(LEI), 20, 13, 9, { x: 48, y: 13, z: -8 }, 0.4);
  b.cilinder(kerk, 6.6, 6.6, 13, { x: 58, z: -8 }, 6);
  b.spits(s.m(LEI), 7, 8, { x: 58, y: 13, z: -8 }, 6);
  for (let i = 0; i < 4; i++) {
    b.blok(materiaal('donker', 0x2d3a4a), 1.6, 7, 0.3, { x: 41 + i * 4.2, y: 3, z: -1.4 });
    b.spits(
      materiaal('donker', 0x2d3a4a),
      0.8,
      1,
      { x: 41 + i * 4.2, y: 10, z: -1.4, ry: Math.PI / 4 },
      3,
    );
  }
  vlag(b, 0, 21, 0, 0x21468b, 6);
  return { groep: b.groep(), hoogte: toren };
}

/**
 * Een winkelstraat: een rij smalle Groninger panden met trap-, hals- en tuitgevels, winkelpuien
 * met grote etalages, luifels en uithangborden. Op straat lantaarns, bankjes, fietsen en mensen.
 */
function winkelstraat(b: Bouwer): Model {
  const s = b.stijl;
  // de straat met klinkers en een stoep
  b.blok(s.m(STRAAT), 52, 0.3, 16, { z: 6 });
  b.blok(s.m(0xcfc6b5), 52, 0.35, 2.2, { z: -1.1 });
  const panden: {
    w: number;
    h: number;
    kleur: number;
    gevel: 'trap' | 'hals' | 'tuit' | 'plat';
    luifel: number;
    winkel: string;
  }[] = [
    { w: 7.5, h: 13, kleur: BAKSTEEN, gevel: 'trap', luifel: 0xc0392b, winkel: 'BAKKER' },
    { w: 6.5, h: 15, kleur: 0xe9dfc8, gevel: 'hals', luifel: 0x1e6f5c, winkel: 'MODE' },
    { w: 8, h: 11, kleur: BAKSTEEN_DONKER, gevel: 'tuit', luifel: 0x2457a6, winkel: 'BOEKEN' },
    { w: 7, h: 16, kleur: 0xf2efe8, gevel: 'plat', luifel: 0xf2b705, winkel: 'SCHOENEN' },
    { w: 6.5, h: 12, kleur: 0x6f7f74, gevel: 'trap', luifel: 0xd35400, winkel: 'KAAS' },
    { w: 8, h: 14, kleur: BAKSTEEN_ROOD, gevel: 'hals', luifel: 0x7d3c98, winkel: 'CAFÉ' },
  ];
  let x = -23.5;
  panden.forEach((p, i) => {
    const cx = x + p.w / 2;
    const diep = 14;
    const z = -2.2 - diep / 2;
    const muur = s.m(p.kleur);
    b.blok(muur, p.w - 0.15, p.h, diep, { x: cx, z });
    // de gevel boven de daklijst
    if (p.gevel === 'plat') {
      b.blok(s.m(WIT), p.w, 1, 0.8, { x: cx, y: p.h, z: -2.4 });
      b.blok(muur, p.w - 0.15, 0.8, diep, { x: cx, y: p.h, z });
    } else {
      const top = p.gevel === 'tuit' ? 5 : 6.5;
      b.vorm(muur, gevelTop(p.w - 0.15, p.gevel, top), 0.6, { x: cx, y: p.h, z: -2.2 });
      if (p.gevel !== 'tuit') b.bol(s.m(WIT), 0.35, { x: cx, y: p.h + top + 0.3, z: -2.4 }, 6);
      // zadeldak haaks op de straat
      b.zadeldak(
        s.m(i % 2 ? DAKPAN : LEI),
        diep - 0.8,
        p.w - 0.3,
        p.gevel === 'tuit' ? 5 : 6,
        {
          x: cx,
          y: p.h,
          z: z - 0.4,
          ry: Math.PI / 2,
        },
        0.1,
      );
    }
    // bovenverdiepingen: ramen met witte kozijnen
    const verdiepingen = Math.max(1, Math.floor((p.h - 5) / 3.4));
    b.ramen({
      kant: 'voor',
      x: cx,
      z: -2.2,
      breedte: p.w - 1,
      rijen: verdiepingen,
      kolommen: p.w > 7 ? 3 : 2,
      onder: 5.8,
      tussen: 3.4,
      rb: 1.3,
      rh: 2.2,
    });
    // de winkelpui: grote etalage, deur, luifel en een uithangbord
    b.blok(s.m(0x2a2d33), p.w - 0.4, 0.5, 0.4, { x: cx, y: 4.2, z: -2 });
    b.blok(
      s.toestand === 'gesloten' ? materiaal('donker', 0x39414e) : materiaal('licht', 0xfff2cf),
      p.w - 2.6,
      3.4,
      0.25,
      { x: cx - 0.8, y: 0.5, z: -2.1 },
    );
    b.blok(materiaal('donker', 0x2b2f38), 1.3, 3.6, 0.3, {
      x: cx + p.w / 2 - 1.1,
      y: 0.3,
      z: -2.1,
    });
    if (s.toestand !== 'gesloten') {
      // gestreepte luifel, schuin naar voren
      for (let k = 0; k < 4; k++)
        b.blok(s.m(k % 2 ? 0xf7f3ea : p.luifel, 'glans'), (p.w - 0.6) / 4, 0.12, 2.4, {
          x: cx - (p.w - 0.6) / 2 + ((p.w - 0.6) / 4) * (k + 0.5),
          y: 4.3,
          z: -0.9,
          rx: 0.35,
        });
    }
    b.blok(
      bord(p.winkel, p.luifel, 0xffffff, { breedte: 256, hoogte: 64 }),
      Math.min(p.w - 1, 5),
      1.1,
      0.15,
      { x: cx, y: 4.9, z: -2 },
    );
    x += p.w;
  });
  // straatleven
  for (const lx of [-18, -4, 10, 22]) lantaarn(b, lx, 3, 5);
  bankje(b, -11, 9.5);
  bankje(b, 15, 9.5);
  boom(b, -24, 11, 7, s.toestand === 'gesloten');
  boom(b, 3, 11.5, 7, s.toestand === 'gesloten');
  boom(b, 24, 11, 7, s.toestand === 'gesloten');
  if (s.toestand !== 'gesloten') {
    const kleuren = [ORANJE, BLAUW, 0x15875a, 0xd2465e, 0x7a3dc8, 0x333333];
    for (let i = 0; i < (s.somber ? 3 : 7); i++)
      persoon(b, -20 + i * 6.3, 4 + (i % 3) * 1.6, kleuren[i % kleuren.length] ?? ORANJE);
    for (let i = 0; i < 5; i++)
      fiets(b, -6 + i * 1.1, 1.2, kleuren[(i + 2) % kleuren.length] ?? BLAUW, 0.15);
  }
  return { groep: b.groep(), hoogte: 22 };
}

/** Een parkeergarage van beton: open verdiepingen, auto's, een hellingbaan en een P-bord. */
function parkeergarage(b: Bouwer): Model {
  const s = b.stijl;
  const beton = s.m(BETON);
  const lagen = 4;
  const kleuren = [0xc0392b, 0x2c3e50, 0xecf0f1, 0x2980b9, 0x7f8c8d, 0xf1c40f, 0x16a085, 0x111111];
  for (let l = 0; l < lagen; l++) {
    const y = l * 4.2;
    b.blok(beton, 40, 0.7, 26, { y });
    // borstwering met een open strook
    b.blok(beton, 40, 1.1, 0.4, { y: y + 0.7, z: 12.8 });
    b.blok(beton, 40, 1.1, 0.4, { y: y + 0.7, z: -12.8 });
    b.blok(beton, 0.4, 1.1, 26, { x: 19.8, y: y + 0.7 });
    b.blok(beton, 0.4, 1.1, 26, { x: -19.8, y: y + 0.7 });
    // zuilen
    for (const zx of [-19, -9.5, 0, 9.5, 19])
      for (const zz of [-12, 0, 12]) b.blok(beton, 0.8, 3.5, 0.8, { x: zx, y: y + 0.7, z: zz });
    // auto's
    const vol = s.toestand === 'gesloten' ? 0 : s.somber ? 3 : 7;
    for (let i = 0; i < vol; i++)
      auto(
        b,
        -16 + i * 4.7,
        (l + i) % 2 ? 7 : -7,
        kleuren[(i + l * 3) % kleuren.length] ?? 0x888888,
        Math.PI / 2,
        y + 0.7,
      );
  }
  b.blok(beton, 40, 0.7, 26, { y: lagen * 4.2 });
  // hellingbaan aan de zijkant
  b.blok(beton, 14, 0.5, 5, { x: 27, y: 2, z: 8, rz: 0.3 });
  // trappenhuis met het blauwe P-bord
  b.blok(s.glas(), 5, lagen * 4.2 + 3, 5, { x: -22, z: -10 });
  b.blok(bord('P', 0x1f4fbf, 0xffffff, { breedte: 128, hoogte: 128 }), 4, 4, 0.2, {
    x: -22,
    y: lagen * 4.2 - 0.5,
    z: -7.4,
  });
  return { groep: b.groep(), hoogte: lagen * 4.2 + 3 };
}

/** Een modern kantoor met een glazen vliesgevel, vloerbanden, een luifel en gevelletters. */
function kantoor(b: Bouwer, naam: string, accent: number, lagen: number): Model {
  const s = b.stijl;
  const h = lagen * 4;
  b.blok(s.glas(), 36, h, 18, { z: -3 });
  for (let l = 0; l <= lagen; l++)
    b.blok(s.m(WIT), 36.3, 0.6, 18.3, { y: l * 4 - (l === lagen ? 0.6 : 0), z: -3 });
  for (let i = 0; i <= 12; i++) b.blok(s.m(0x5b6470), 0.25, h, 0.3, { x: -18 + i * 3, z: 6.05 });
  b.blok(s.m(accent), 2.5, h + 2, 18.6, { x: -12, z: -3 });
  b.blok(s.m(WIT), 14, 0.5, 5, { x: 4, y: 3.4, z: 8 });
  b.blok(materiaal('donker', 0x2d3340), 4, 3.3, 0.3, { x: 4, z: 6.2 });
  b.blok(s.m(0x9aa0a8), 8, 2, 6, { x: 8, y: h, z: -6 });
  b.blok(bord(naam, 0xffffff, accent, { breedte: 512, hoogte: 96 }), 14, 2.4, 0.2, {
    x: 6,
    y: h - 3,
    z: 6.25,
  });
  b.blok(s.m(STRAAT), 46, 0.3, 10, { z: 10 });
  for (let i = 0; i < 5; i++)
    fiets(b, 14 + i * 1.2, 11, [BLAUW, ORANJE, 0x333333][i % 3] ?? BLAUW, 0.2);
  boom(b, -16, 11, 7, s.toestand === 'gesloten');
  return { groep: b.groep(), hoogte: h + 2 };
}

/** Een zwembad: een hal met een gebogen glazen dak, een buitenbad met banen en een glijbaan. */
function zwembad(b: Bouwer, leeg: boolean): Model {
  const s = b.stijl;
  b.blok(s.m(0xe6edf0), 26, 7, 20, { x: -9, z: -6 });
  b.voeg(s.glas(), boogdak(26, 20, 6), { x: -9, y: 7, z: -6 });
  for (let i = 0; i < 7; i++)
    b.blok(s.m(WIT), 0.4, 6.2, 20.4, { x: -21 + i * 4, y: 7, z: -6, rx: 0 });
  b.ramen({
    kant: 'voor',
    x: -9,
    z: 4,
    breedte: 26,
    rijen: 1,
    kolommen: 6,
    onder: 1.5,
    tussen: 3,
    rb: 3,
    rh: 4,
  });
  b.blok(bord('ZWEMBAD', 0x1d86c8, 0xffffff, { breedte: 512, hoogte: 96 }), 10, 1.8, 0.2, {
    x: -9,
    y: 5.5,
    z: 4.15,
  });
  // buitenbad
  b.blok(s.m(0xf4f1ea), 22, 0.6, 20, { x: 14, z: 2 });
  b.blok(materiaal('glans', leeg ? 0x9fb4bf : 0xbfe6f3), 18, 0.62, 14, { x: 14, z: 2 });
  if (!leeg) {
    b.blok(materiaal('water', 0x2aa7d9), 17.6, 0.7, 13.6, { x: 14, z: 2 });
    for (let i = 1; i < 5; i++)
      b.blok(materiaal('glans', i % 2 ? 0xff6a00 : 0xffffff), 17.4, 0.75, 0.2, {
        x: 14,
        z: -5 + i * 2.8,
      });
  }
  // glijbaan: een rode buis die van de toren naar het bad slingert
  b.blok(s.m(0x9aa0a8), 3, 9, 3, { x: 23, z: -10 });
  b.buis(
    s.m(0xd63a2f, 'glans'),
    new CatmullRomCurve3([
      new Vector3(23, 9, -10),
      new Vector3(19, 8, -14),
      new Vector3(13, 6, -12),
      new Vector3(14, 4.5, -7),
      new Vector3(19, 2.5, -6),
      new Vector3(21, 1, -3),
    ]),
    0.9,
  );
  for (let i = 0; i < 3; i++) b.blok(s.m(WIT), 1.5, 0.6, 3, { x: 6 + i * 2.2, y: 0.6, z: 11 });
  return { groep: b.groep(), hoogte: 13 };
}

/** Een half rond dak over de lengte (x). */
function boogdak(b: number, d: number, h: number) {
  const punten: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI - (i / 12) * Math.PI;
    punten.push([(Math.cos(a) * d) / 2, Math.sin(a) * h]);
  }
  const vorm = new Shape(punten.map(([x, y]) => new Vector2(x, y)));
  const geo = new ExtrudeGeometry(vorm, { depth: b, bevelEnabled: false });
  geo.translate(0, 0, -b / 2);
  geo.rotateY(Math.PI / 2);
  return geo;
}

/** Een buurthuis: laag, van baksteen met een pannendak, een speeltuin en een bankje. */
function buurthuis(b: Bouwer): Model {
  const s = b.stijl;
  b.blok(s.m(BAKSTEEN), 24, 5.5, 13, { x: -6, z: -6 });
  b.zadeldak(s.m(DAKPAN), 24, 13, 5, { x: -6, y: 5.5, z: -6 });
  b.ramen({
    kant: 'voor',
    x: -6,
    z: 0.5,
    breedte: 24,
    rijen: 1,
    kolommen: 5,
    onder: 1.2,
    tussen: 3,
    rb: 2.6,
    rh: 3,
    zonder: [[0, 2]],
  });
  b.blok(materiaal('donker', 0x5b3b25), 2.2, 3.5, 0.3, { x: -6, z: 0.6 });
  b.blok(s.m(0xe8590c), 6, 0.3, 3, { x: -6, y: 3.8, z: 1.6 });
  b.blok(bord('BUURTHUIS', 0x3e8e41, 0xffffff, { breedte: 512, hoogte: 96 }), 7, 1.2, 0.15, {
    x: -6,
    y: 4.3,
    z: 0.7,
  });
  // speeltuin
  b.blok(s.m(0xd9c38f), 18, 0.15, 12, { x: 12, z: 6 });
  b.blok(s.m(0xd63a2f), 0.3, 4, 0.3, { x: 8, z: 3 });
  b.blok(s.m(0xd63a2f), 0.3, 4, 0.3, { x: 12, z: 3 });
  b.blok(s.m(0xd63a2f), 4.3, 0.3, 0.3, { x: 10, y: 4, z: 3 });
  b.blok(s.m(0x2b2f38), 1, 0.2, 0.6, { x: 9, y: 1.2, z: 3 });
  b.blok(s.m(0x2b2f38), 1, 0.2, 0.6, { x: 11, y: 1.2, z: 3 });
  b.blok(s.m(0xf2b705), 1.6, 0.3, 6, { x: 16, y: 1.6, z: 6, rx: 0.45 });
  b.blok(s.m(0x1d86c8), 2, 3, 2, { x: 16, z: 2.5 });
  bankje(b, 5, 10);
  boom(b, 20, 0, 8, s.toestand === 'gesloten');
  boom(b, -18, 4, 7, s.toestand === 'gesloten');
  if (s.toestand !== 'gesloten') {
    persoon(b, 13, 8, 0xd2465e);
    persoon(b, 9, 7, 0x1d86c8);
  }
  return { groep: b.groep(), hoogte: 11 };
}

/** Een zorgcentrum: wit, drie lagen in een L, een rood kruis en een ambulance. */
function zorgcentrum(b: Bouwer): Model {
  const s = b.stijl;
  b.blok(s.m(WIT), 32, 11, 12, { x: -4, z: -6 });
  b.blok(s.m(WIT), 12, 11, 20, { x: 18, z: -2 });
  b.blok(s.m(0x9aa0a8), 32.4, 0.6, 12.4, { x: -4, y: 11, z: -6 });
  b.blok(s.m(0x9aa0a8), 12.4, 0.6, 20.4, { x: 18, y: 11, z: -2 });
  b.ramen({
    kant: 'voor',
    x: -4,
    z: 0,
    breedte: 32,
    rijen: 3,
    kolommen: 9,
    onder: 1,
    tussen: 3.5,
    rb: 2.2,
    rh: 2.2,
    zonder: [[0, 4]],
  });
  b.ramen({
    kant: 'voor',
    x: 18,
    z: 8,
    breedte: 12,
    rijen: 3,
    kolommen: 3,
    onder: 1,
    tussen: 3.5,
    rb: 2.2,
    rh: 2.2,
  });
  b.blok(s.glas(), 4, 3, 0.3, { x: -4, z: 0.1 });
  b.blok(s.m(WIT), 7, 0.4, 4, { x: -4, y: 3.2, z: 2 });
  for (const zx of [-7, -1]) b.blok(s.m(WIT), 0.3, 3.2, 0.3, { x: zx, z: 3.8 });
  // rood kruis op de gevel en op het dak
  b.blok(materiaal('glans', 0xd62828), 1, 3.6, 0.2, { x: 8, y: 6.5, z: 0.2 });
  b.blok(materiaal('glans', 0xd62828), 3.6, 1, 0.2, { x: 8, y: 7.8, z: 0.2 });
  b.blok(materiaal('glans', 0xd62828), 5, 0.2, 1.4, { x: 18, y: 11.6, z: -2 });
  b.blok(materiaal('glans', 0xd62828), 1.4, 0.2, 5, { x: 18, y: 11.6, z: -2 });
  // ambulance (geel met blauwe banden)
  b.blok(materiaal('glans', 0xf3d800), 6, 2.6, 2.4, { x: 4, y: 0.4, z: 6 });
  b.blok(materiaal('glans', 0x1f4fbf), 6.05, 0.5, 2.45, { x: 4, y: 1.3, z: 6 });
  b.blok(materiaal('licht', 0x3d7bff), 1.2, 0.3, 0.6, { x: 2.2, y: 3, z: 6 });
  b.blok(s.m(STRAAT), 48, 0.3, 8, { z: 8 });
  boom(b, -18, 9, 7);
  return { groep: b.groep(), hoogte: 12 };
}

/** Een politiebureau met de blauwe band en een politieauto in Nederlandse striping. */
function politie(b: Bouwer): Model {
  const s = b.stijl;
  b.blok(s.m(0x8a8f99), 30, 9, 14, { z: -5 });
  b.blok(s.glas(), 12, 9.2, 14.2, { x: 9, z: -5 });
  b.blok(s.m(0x1d3c8f), 30.3, 1.6, 14.3, { y: 7.4, z: -5 });
  b.blok(bord('POLITIE', 0x1d3c8f, 0xffffff, { breedte: 512, hoogte: 96 }), 11, 1.5, 0.2, {
    x: -6,
    y: 7.45,
    z: 2.25,
  });
  b.ramen({
    kant: 'voor',
    x: -6,
    z: 2,
    breedte: 18,
    rijen: 2,
    kolommen: 5,
    onder: 1.2,
    tussen: 3.4,
    rb: 2.4,
    rh: 2.4,
    zonder: [[0, 2]],
  });
  b.blok(materiaal('donker', 0x2d3340), 2.2, 3.2, 0.3, { x: -6, z: 2.1 });
  b.cilinder(materiaal('metaal', 0xcfd3d8), 0.12, 0.2, 7, { x: -12, y: 9, z: -8 }, 6);
  vlag(b, 16, 0, 5, 0x1d3c8f, 9);
  // politieauto: wit met blauwe en oranjerode banden, zwaailichten
  for (const [ax, ry] of [
    [-4, 0],
    [3, 0.2],
  ] as const) {
    b.blok(materiaal('glans', 0xf7f7f7), 4.6, 1.2, 2, { x: ax, y: 0.4, z: 7, ry });
    b.blok(materiaal('glans', 0x1d3c8f), 4.65, 0.35, 2.05, { x: ax, y: 0.9, z: 7, ry });
    b.blok(materiaal('glans', 0xff5a1f), 4.65, 0.2, 2.05, { x: ax, y: 1.3, z: 7, ry });
    b.blok(materiaal('glas', 0x6f8796), 2.4, 0.8, 1.8, { x: ax, y: 1.6, z: 7, ry });
    b.blok(materiaal('licht', 0x3d7bff), 1, 0.25, 0.5, { x: ax, y: 2.4, z: 7, ry });
  }
  b.blok(s.m(STRAAT), 46, 0.3, 9, { z: 7 });
  return { groep: b.groep(), hoogte: 10 };
}

/**
 * De Stadsschouwburg (1883): een neorenaissance gevel met een hoger middendeel, boogramen,
 * pilasters, een balustrade en een verlichte luifel.
 */
function schouwburg(b: Bouwer): Model {
  const s = b.stijl;
  const muur = s.m(0xe3cfa5);
  const wit = s.m(WIT);
  b.blok(muur, 36, 12, 18, { z: -4 });
  b.blok(muur, 14, 17, 19, { z: -3.5 });
  b.blok(wit, 36.6, 0.7, 18.6, { y: 12, z: -4 });
  b.blok(wit, 14.6, 0.8, 19.6, { y: 17, z: -3.5 });
  b.schilddak(s.m(LEI), 36, 18, 4, { y: 12.7, z: -4 });
  // het middendeel met een gebogen bekroning en een lier
  b.vorm(
    muur,
    [
      [-7, 0],
      [7, 0],
      [6, 2],
      [3, 4],
      [0, 4.8],
      [-3, 4],
      [-6, 2],
    ],
    1,
    { y: 17.8, z: 6 },
  );
  b.cilinder(materiaal('metaal', 0xd4a62a), 1.1, 1.1, 0.3, { y: 20, z: 6.2, rx: Math.PI / 2 }, 16);
  for (const zijde of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const x = zijde * (10 + i * 4);
      b.blok(materiaal('licht', 0xf3dc9a), 2, 4.2, 0.3, { x, y: 6.5, z: 5.1 });
      b.cilinder(
        materiaal('licht', 0xf3dc9a),
        1,
        1,
        0.3,
        { x, y: 10.7, z: 5.1, rx: Math.PI / 2 },
        12,
      );
      b.blok(materiaal('licht', 0xf3dc9a), 2, 3, 0.3, { x, y: 1.5, z: 5.1 });
    }
  for (let i = 0; i < 3; i++) {
    const x = -4 + i * 4;
    b.blok(materiaal('licht', 0xf3dc9a), 2.4, 5.6, 0.3, { x, y: 8, z: 5.6 });
    b.cilinder(
      materiaal('licht', 0xf3dc9a),
      1.2,
      1.2,
      0.3,
      { x, y: 13.6, z: 5.6, rx: Math.PI / 2 },
      12,
    );
  }
  for (const px of [-6.8, -2, 2, 6.8]) b.blok(wit, 0.8, 16, 0.6, { x: px, z: 5.8 });
  // luifel met lampjes en de naam
  b.blok(s.m(0x8e1c2b), 14, 0.7, 4, { y: 5, z: 7.5 });
  for (let i = 0; i < 8; i++)
    b.bol(materiaal('licht', 0xfff1c4), 0.22, { x: -6.3 + i * 1.8, y: 4.9, z: 9.5 }, 6);
  b.blok(bord('SCHOUWBURG', 0x8e1c2b, 0xf5d77a, { breedte: 512, hoogte: 96 }), 12, 1.3, 0.2, {
    y: 5.7,
    z: 9.6,
  });
  b.blok(materiaal('donker', 0x3a2a1e), 8, 4.6, 0.3, { y: 0.2, z: 5.7 });
  // affiches
  for (const zijde of [-1, 1])
    b.blok(materiaal('glans', zijde > 0 ? 0xff6400 : 0x7d3c98), 1.6, 2.4, 0.2, {
      x: zijde * 16.5,
      y: 1.2,
      z: 5.2,
    });
  b.blok(s.m(STRAAT), 46, 0.3, 8, { z: 9 });
  return { groep: b.groep(), hoogte: 23 };
}

/** Een school: baksteen in een L, grote ramen, een klok, een vlag, het schoolplein en fietsen. */
function school(b: Bouwer): Model {
  const s = b.stijl;
  b.blok(s.m(BAKSTEEN), 30, 8, 12, { x: -6, z: -8 });
  b.blok(s.m(BAKSTEEN), 11, 8, 22, { x: 15, z: -3 });
  b.zadeldak(s.m(DAKPAN), 30, 12, 4, { x: -6, y: 8, z: -8 });
  b.zadeldak(s.m(DAKPAN), 22, 11, 4, { x: 15, y: 8, z: -3, ry: Math.PI / 2 });
  b.ramen({
    kant: 'voor',
    x: -6,
    z: -2,
    breedte: 30,
    rijen: 2,
    kolommen: 7,
    onder: 1,
    tussen: 3.8,
    rb: 3,
    rh: 2.6,
    zonder: [[0, 3]],
  });
  b.ramen({
    kant: 'links',
    x: 9.5,
    z: 3,
    breedte: 10,
    rijen: 2,
    kolommen: 3,
    onder: 1,
    tussen: 3.8,
    rb: 2.6,
    rh: 2.6,
  });
  b.blok(materiaal('donker', 0x5b3b25), 2.4, 3.4, 0.3, { x: -6, z: -1.9 });
  klok(b, -6, 6.2, -1.85, 1.1);
  b.blok(bord('SCHOOL', 0xf2b705, 0x15193a, { breedte: 256, hoogte: 64 }), 4, 1, 0.15, {
    x: -6,
    y: 4,
    z: -1.85,
  });
  // schoolplein met fietsenrek, basket en een boom
  b.blok(s.m(0xb2aa9c), 28, 0.2, 14, { x: -6, z: 6 });
  for (let i = 0; i < 8; i++)
    fiets(b, -18 + i * 1.1, 2, [BLAUW, ORANJE, 0xd2465e, 0x333333][i % 4] ?? BLAUW, Math.PI / 2);
  b.blok(materiaal('metaal', 0x555b66), 0.2, 4, 0.2, { x: 4, z: 11 });
  b.blok(s.m(WIT), 1.6, 1.1, 0.1, { x: 4, y: 4, z: 10.9 });
  vlag(b, -20, 0, 9, 0x21468b, 8);
  boom(b, -1, 8, 7, s.toestand === 'gesloten');
  return { groep: b.groep(), hoogte: 12 };
}

/** Een park: gras, een vijver met fontein, slingerende paden, bomen, bloemen en bankjes. */
function park(b: Bouwer): Model {
  const s = b.stijl;
  const gesloten = s.toestand === 'gesloten';
  b.cilinder(s.m(gesloten ? 0x9b8f5e : s.somber ? 0x8fa652 : GRAS), 25, 25.5, 0.6, {}, 28);
  b.cilinder(materiaal('water', 0x3b8fc4), 7, 7, 0.65, { x: 7, z: 3 }, 24);
  if (!gesloten) {
    b.cilinder(s.m(WIT), 1.2, 1.4, 0.8, { x: 7, z: 3 }, 12);
    b.cilinder(materiaal('water', 0xbfe6f3), 0.15, 0.3, 3, { x: 7, y: 0.6, z: 3 }, 8);
  }
  // paden
  b.buis(
    s.m(0xd9c9a3),
    new CatmullRomCurve3([
      new Vector3(-24, 0.3, 8),
      new Vector3(-10, 0.3, 2),
      new Vector3(-4, 0.3, 12),
      new Vector3(10, 0.3, 14),
      new Vector3(23, 0.3, 6),
    ]),
    0.9,
  );
  b.buis(
    s.m(0xd9c9a3),
    new CatmullRomCurve3([
      new Vector3(-10, 0.3, 2),
      new Vector3(-6, 0.3, -10),
      new Vector3(8, 0.3, -18),
      new Vector3(16, 0.3, -18),
    ]),
    0.9,
  );
  const bomen: [number, number, number][] = [
    [-16, -10, 9],
    [-8, -18, 8],
    [2, -12, 10],
    [-18, 2, 7],
    [16, -8, 9],
    [-12, 14, 7],
    [18, 12, 8],
    [0, 20, 6],
  ];
  for (const [x, z, h] of bomen) boom(b, x, z, h, gesloten);
  den(b, 12, -16, 10);
  den(b, -20, -4, 9);
  if (s.fel || s.toestand === 'normaal') {
    const kleuren = [0xff6a8a, 0xffd23f, 0xd2465e, 0xffffff, 0x9b59b6];
    const aantal = s.toestand === 'bloeiend' ? 30 : s.fel ? 20 : 10;
    for (let i = 0; i < aantal; i++) {
      const a = i * 2.4;
      b.bol(
        materiaal('glans', kleuren[i % kleuren.length] ?? 0xffd23f),
        0.45,
        {
          x: -4 + Math.cos(a) * (4 + (i % 4)),
          y: 0.7,
          z: -2 + Math.sin(a) * (3 + (i % 3)),
        },
        6,
      );
    }
  }
  bankje(b, -6, 6, 0.3);
  bankje(b, 14, 10, -0.2);
  if (gesloten)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.blok(materiaal('metaal', 0x5b6470), 0.2, 2, 0.2, {
        x: Math.cos(a) * 24,
        z: Math.sin(a) * 24,
      });
    }
  return { groep: b.groep(), hoogte: 10 };
}

/** Nieuwbouw: een betonnen casco met steigers, een torenkraan, klaar zijnde rijwoningen. */
function nieuwbouw(b: Bouwer): Model {
  const s = b.stijl;
  const beton = s.m(0xc4c1b8);
  // casco van vier vloeren met kolommen
  for (let l = 0; l < 4; l++) {
    b.blok(beton, 20, 0.6, 12, { x: -4, y: l * 3.6, z: -6 });
    for (const zx of [-13.5, -8, -2.5, 3, 5.5])
      for (const zz of [-11.5, -0.5])
        b.blok(beton, 0.6, 3, 0.6, { x: zx, y: l * 3.6 + 0.6, z: zz });
  }
  // de onderste lagen al dicht met baksteen en ramen
  b.blok(s.m(BAKSTEEN_DONKER), 20, 7, 11.6, { x: -4, z: -6 });
  b.ramen({
    kant: 'voor',
    x: -4,
    z: 0,
    breedte: 20,
    rijen: 2,
    kolommen: 6,
    onder: 0.8,
    tussen: 3.6,
    rb: 2,
    rh: 2.2,
  });
  // steigers met oranje netten
  const steiger = materiaal('metaal', 0x9aa0a8);
  for (let i = 0; i <= 6; i++) b.blok(steiger, 0.15, 15, 0.15, { x: -14 + i * 3.4, z: 1.2 });
  for (let l = 1; l <= 4; l++) b.blok(steiger, 21, 0.15, 1.4, { x: -4, y: l * 3.6, z: 1.6 });
  b.blok(materiaal('glans', 0xff7a1a), 20.4, 3.4, 0.08, { x: -4, y: 10.8, z: 2.3 });
  // torenkraan: vakwerkmast, giek, contragewicht en cabine
  const geel = materiaal('glans', 0xf2b705);
  const mx = 12;
  const mz = -10;
  for (const [dx, dz] of [
    [-0.8, -0.8],
    [0.8, -0.8],
    [-0.8, 0.8],
    [0.8, 0.8],
  ] as const)
    b.blok(geel, 0.25, 32, 0.25, { x: mx + dx, z: mz + dz });
  for (let i = 0; i < 16; i++) {
    b.blok(geel, 1.8, 0.18, 0.18, { x: mx, y: i * 2, z: mz + 0.8, rz: i % 2 ? 0.8 : -0.8 });
    b.blok(geel, 0.18, 0.18, 1.8, { x: mx + 0.8, y: i * 2, z: mz, rx: i % 2 ? 0.8 : -0.8 });
  }
  b.blok(geel, 34, 1.2, 1.2, { x: mx - 10, y: 32, z: mz });
  b.blok(geel, 0.2, 5, 0.2, { x: mx, y: 32, z: mz });
  b.blok(materiaal('mat', 0x6b6f76), 3, 2.2, 2, { x: mx + 6, y: 30.5, z: mz });
  b.blok(materiaal('glas', 0x6f8796), 1.8, 1.8, 1.8, { x: mx - 1.6, y: 30.4, z: mz + 1.4 });
  b.blok(materiaal('metaal', 0x333333), 0.08, 12, 0.08, { x: mx - 20, y: 20, z: mz });
  b.blok(beton, 2, 1, 2, { x: mx - 20, y: 19.4, z: mz });
  // drie rijwoningen die al klaar zijn
  for (let i = 0; i < 3; i++) {
    const x = 14 + i * 4.4;
    b.blok(s.m(i === 1 ? 0xeee9df : BAKSTEEN_ROOD), 4.3, 6, 8, { x, z: 6 });
    b.zadeldak(s.m(0x3b3f47), 8, 4.3, 3, { x, y: 6, z: 6, ry: Math.PI / 2 }, 0.2);
    b.ramen({
      kant: 'voor',
      x,
      z: 10,
      breedte: 4.3,
      rijen: 2,
      kolommen: 1,
      onder: 1,
      tussen: 2.8,
      rb: 2.4,
      rh: 1.8,
    });
  }
  // bouwhek en een bouwkeet
  b.blok(materiaal('metaal', 0xb8bcc2), 26, 1.8, 0.1, { x: -4, z: 7 });
  b.blok(s.m(0x2b6cb0), 6, 2.6, 2.4, { x: -18, z: 4 });
  return { groep: b.groep(), hoogte: 20 };
}

/**
 * Het veilinghuis: een klassiek pand met een veilinghamer op de gevel, en de witte molen van
 * Ten Post (De Witte Molen): wit achtkant op een stelling, met een rieten kap en vier wieken.
 */
function veilinghuis(b: Bouwer): Model {
  const s = b.stijl;
  b.blok(s.m(BAKSTEEN), 24, 10, 14, { x: -9, z: -4 });
  b.zadeldak(s.m(LEI), 24, 14, 6, { x: -9, y: 10, z: -4 });
  b.vorm(s.m(BAKSTEEN), gevelTop(10, 'trap', 6), 0.6, { x: -9, y: 10, z: 3.4 });
  b.ramen({
    kant: 'voor',
    x: -9,
    z: 3,
    breedte: 24,
    rijen: 2,
    kolommen: 5,
    onder: 1.4,
    tussen: 4.2,
    rb: 2,
    rh: 2.8,
    zonder: [[0, 2]],
  });
  b.blok(materiaal('donker', 0x5b3b25), 3.6, 4.6, 0.3, { x: -9, z: 3.1 });
  b.blok(bord('VEILING', 0x15193a, 0xf2c94c, { breedte: 512, hoogte: 96 }), 8, 1.4, 0.2, {
    x: -9,
    y: 5.6,
    z: 3.15,
  });
  // de veilinghamer op de gevel
  b.blok(materiaal('glans', HOUT), 0.5, 4, 0.4, { x: -16, y: 5, z: 3.3, rz: 0.6 });
  b.cilinder(
    materiaal('glans', DONKERHOUT),
    0.9,
    0.9,
    2.6,
    { x: -17.6, y: 8.2, z: 3.3, rz: 0.6 + Math.PI / 2 },
    12,
  );
  // de witte molen
  const mx = 14;
  const mz = -2;
  b.cilinder(s.m(WIT), 4.6, 5.2, 7, { x: mx, z: mz }, 8);
  b.cilinder(s.m(0xece9e1), 3.2, 4.6, 12, { x: mx, y: 7, z: mz }, 8);
  // de stelling (balkon) rondom
  b.cilinder(s.m(HOUT), 7, 7, 0.4, { x: mx, y: 7, z: mz }, 16);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.blok(s.m(HOUT), 0.25, 7, 0.25, { x: mx + Math.cos(a) * 6.6, z: mz + Math.sin(a) * 6.6 });
  }
  b.ramen({
    kant: 'voor',
    x: mx,
    z: mz + 4.9,
    breedte: 2,
    rijen: 1,
    kolommen: 1,
    onder: 2,
    tussen: 3,
    rb: 1.6,
    rh: 2.4,
  });
  // kap van riet
  b.draai(
    s.m(0x4f4636),
    [
      [3.6, 0],
      [3.4, 1.4],
      [2.4, 3],
      [0.2, 3.8],
    ],
    { x: mx, y: 19, z: mz },
    12,
  );
  const groep = b.groep();
  // de wieken draaien: een eigen groep rond de as
  const w = new Bouwer(s);
  const roede = s.m(0x3a3a3a);
  w.cilinder(roede, 0.45, 0.45, 1.6, { y: -0.8, rx: Math.PI / 2 }, 8);
  w.blok(roede, 0.35, 22, 0.3, { y: -11, z: 0.4 });
  w.blok(roede, 0.35, 22, 0.3, { y: -11, z: 0.4, rz: Math.PI / 2 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    // het hekwerk met zeil: wit, met een rode rand, iets naast de roede
    const x = Math.cos(a) * 6.5 - Math.sin(a) * 1.1;
    const y = Math.sin(a) * 6.5 + Math.cos(a) * 1.1;
    w.blok(s.m(0xf4f2ec), 1.9, 8.5, 0.12, { x, y: y - 4.25, z: 0.55, rz: a - Math.PI / 2 });
    w.blok(s.m(0xc0392b), 0.2, 8.5, 0.14, {
      x: x - Math.sin(a) * 0.95,
      y: y + Math.cos(a) * 0.95 - 4.25,
      z: 0.56,
      rz: a - Math.PI / 2,
    });
  }
  const wieken = w.groep();
  const as = new Group();
  as.add(wieken);
  as.position.set(mx, 21.2, mz + 3.6);
  as.rotation.x = -0.12;
  groep.add(as);
  return { groep, hoogte: 26, wieken };
}

/** Het Beleidshuis: een statig gemeentekantoor met veel ramen, stapels dossiers op het dak. */
function beleidshuis(b: Bouwer): Model {
  const s = b.stijl;
  b.blok(s.m(0xd6d1c4), 34, 16, 16, { z: -4 });
  b.blok(s.m(0xbfb8a8), 34.6, 1, 16.6, { y: 16, z: -4 });
  balustrade(b, s.m(0xbfb8a8), 34, 16, 17, 0.9, -4);
  b.ramen({
    kant: 'voor',
    z: 4,
    breedte: 34,
    rijen: 4,
    kolommen: 10,
    onder: 1.2,
    tussen: 3.7,
    rb: 1.8,
    rh: 2.4,
    zonder: [
      [0, 4],
      [0, 5],
    ],
  });
  b.ramen({
    kant: 'rechts',
    x: 17,
    z: -4,
    breedte: 16,
    rijen: 4,
    kolommen: 4,
    onder: 1.2,
    tussen: 3.7,
    rb: 1.8,
    rh: 2.4,
  });
  b.blok(s.glas(), 5, 3.4, 0.3, { z: 4.1 });
  b.blok(s.m(0x6c5ce7), 8, 0.4, 3.6, { y: 3.5, z: 5.6 });
  b.blok(bord('BELEIDSHUIS', 0x6c5ce7, 0xffffff, { breedte: 512, hoogte: 96 }), 10, 1.4, 0.2, {
    y: 13.6,
    z: 4.15,
  });
  // stapels dossiers en een groot stempelkussen op het dak (speels)
  const papier = [0xffffff, 0xf1e9d2, 0xdfe7f2];
  for (let i = 0; i < 4; i++)
    for (let l = 0; l < 3 + (i % 3); l++)
      b.blok(materiaal('mat', papier[l % 3] ?? 0xffffff), 3.4, 0.6, 2.4, {
        x: -10 + i * 5,
        y: 17 + l * 0.6,
        z: -6,
        ry: l * 0.15,
      });
  b.cilinder(s.m(0xb03030, 'glans'), 1.2, 1.4, 1.6, { x: 10, y: 17, z: -3 }, 12);
  b.cilinder(s.m(HOUT), 0.4, 0.5, 2, { x: 10, y: 18.6, z: -3 }, 8);
  b.blok(s.m(STRAAT), 46, 0.3, 8, { z: 8 });
  boom(b, -18, 8, 7, s.toestand === 'gesloten');
  boom(b, 18, 8, 7, s.toestand === 'gesloten');
  return { groep: b.groep(), hoogte: 20 };
}

/**
 * Het Belastingloket, naar het hoge belastingkantoor van Groningen: een slanke toren met
 * verticale stroken, op een lage sokkel met een euroteken.
 */
function belastingloket(b: Bouwer): Model {
  const s = b.stijl;
  b.blok(s.m(0xdfe3e6), 32, 6, 18, { z: -2 });
  b.blok(s.glas(), 28, 4.4, 0.3, { y: 0.6, z: 7.05 });
  b.blok(s.m(0xdfe3e6), 12, 42, 12, { x: 6, z: -4 });
  for (let i = 0; i < 7; i++) b.blok(s.glas(), 1, 34, 0.3, { x: 6 - 4.5 + i * 1.5, y: 7, z: 2.05 });
  for (let i = 0; i < 7; i++)
    b.blok(s.glas(), 0.3, 34, 1, { x: 12.05, y: 7, z: -4 - 4.5 + i * 1.5 });
  b.blok(s.m(0x1d3c8f), 12.4, 2, 12.4, { x: 6, y: 42, z: -4 });
  b.blok(bord('€', 0x1d3c8f, 0xffffff, { breedte: 128, hoogte: 128 }), 3.6, 3.6, 0.2, {
    x: -9,
    y: 1.4,
    z: 7.2,
  });
  b.blok(bord('BELASTINGEN', 0xffffff, 0x1d3c8f, { breedte: 512, hoogte: 96 }), 9, 1.4, 0.2, {
    x: -4,
    y: 4.6,
    z: 7.2,
  });
  b.blok(s.m(STRAAT), 46, 0.3, 8, { z: 10 });
  boom(b, -18, 11, 7, s.toestand === 'gesloten');
  return { groep: b.groep(), hoogte: 44 };
}

// -------------------------------------------------------------------------------------------------
// De bekende gebouwen met een minigame
// -------------------------------------------------------------------------------------------------

/** De Grote Markt: een plein van natuursteen met marktkramen onder gestreepte luifels. */
function grotemarkt(b: Bouwer): Model {
  b.blok(materiaal('mat', 0xcfc6b5), 46, 0.3, 30);
  for (let i = 0; i < 6; i++)
    b.blok(materiaal('mat', 0xbdb3a1), 46, 0.32, 0.25, { z: -12 + i * 5 });
  const luifels = [0xd2465e, 0x1233c4, 0x15875a, 0xf2b705, 0xe8590c, 0x7a3dc8];
  for (let i = 0; i < 6; i++) {
    const x = -17 + (i % 3) * 17;
    const z = i < 3 ? -6 : 6;
    b.blok(materiaal('mat', HOUT), 8, 1, 3, { x, y: 1, z });
    for (const [dx, dz] of [
      [-3.8, -1.4],
      [3.8, -1.4],
      [-3.8, 1.4],
      [3.8, 1.4],
    ] as const)
      b.blok(materiaal('metaal', 0x8e959d), 0.15, 3.2, 0.15, { x: x + dx, z: z + dz });
    for (let k = 0; k < 6; k++)
      b.blok(materiaal('glans', k % 2 ? 0xfafafa : (luifels[i] ?? 0xd2465e)), 8.6 / 6, 0.15, 4, {
        x: x - 4.3 + (8.6 / 6) * (k + 0.5),
        y: 3.3,
        z,
        rx: 0.15,
      });
    const waren = [0xe67e22, 0xf1c40f, 0x27ae60, 0xc0392b];
    for (let k = 0; k < 4; k++)
      b.bol(
        materiaal('glans', waren[(k + i) % 4] ?? 0xe67e22),
        0.6,
        { x: x - 2.4 + k * 1.6, y: 2.3, z },
        8,
      );
    persoon(b, x + 2, z + (i < 3 ? 3 : -3), luifels[(i + 2) % 6] ?? BLAUW);
  }
  for (const lx of [-22, 22]) lantaarn(b, lx, 0, 5);
  return { groep: b.groep(), hoogte: 6 };
}

/**
 * Het Hoofdstation (1896): rode baksteen met lichte banden, een hoge middenhal met een steil
 * leien dak, twee vleugels met torentjes, boogramen, en erachter de perronkappen en een gele trein.
 */
function station(b: Bouwer): Model {
  const steen = materiaal('mat', 0xa5523a);
  const band = materiaal('mat', 0xe6d7b5);
  const lei = materiaal('mat', LEI);
  b.blok(steen, 48, 11, 12, { z: -2 });
  b.blok(steen, 16, 17, 14, { z: -2 });
  for (const y of [4, 8, 11]) b.blok(band, 48.3, 0.5, 12.3, { y, z: -2 });
  b.blok(band, 16.4, 0.7, 14.4, { y: 17, z: -2 });
  b.zadeldak(lei, 48, 12, 5, { y: 11, z: -2 });
  b.zadeldak(lei, 14, 16, 9, { y: 17.7, z: -2, ry: Math.PI / 2 });
  b.vorm(
    steen,
    [
      [-8, 0],
      [8, 0],
      [0, 7],
    ],
    0.8,
    { y: 17.7, z: 5 },
  );
  klok(b, 0, 14.5, 5.15, 1.6);
  for (const tx of [-24, 24]) {
    b.blok(steen, 5, 18, 5, { x: tx, z: 3 });
    b.spits(lei, 3.6, 7, { x: tx, y: 18, z: 3 });
    b.bol(materiaal('metaal', 0xd4a62a), 0.4, { x: tx, y: 25.3, z: 3 }, 6);
  }
  // boogramen
  for (let i = 0; i < 8; i++) {
    const x = -20 + i * 5.6 + (i >= 4 ? 7 : -1.4);
    if (Math.abs(x) < 8) continue;
    b.blok(materiaal('licht', 0xf3dc9a), 2.4, 4, 0.3, { x, y: 4.6, z: 4.05 });
    b.cilinder(
      materiaal('licht', 0xf3dc9a),
      1.2,
      1.2,
      0.3,
      { x, y: 8.6, z: 4.05, rx: Math.PI / 2 },
      12,
    );
  }
  b.blok(materiaal('licht', 0xf3dc9a), 8, 7, 0.3, { y: 1.5, z: 5.05 });
  b.cilinder(materiaal('licht', 0xf3dc9a), 4, 4, 0.3, { y: 8.5, z: 5.05, rx: Math.PI / 2 }, 16);
  // perrons met overkapping en een gele trein (NS: geel met blauw)
  b.blok(materiaal('mat', 0xbdb6a8), 50, 0.8, 4, { z: -12 });
  for (let i = 0; i < 7; i++)
    b.blok(materiaal('metaal', 0x5b6470), 0.3, 4, 0.3, { x: -21 + i * 7, y: 0.8, z: -12 });
  b.blok(materiaal('metaal', 0x8e959d), 50, 0.3, 6, { y: 4.8, z: -12, rx: -0.08 });
  b.blok(materiaal('glans', 0xffc917), 38, 3.4, 2.8, { x: -2, y: 0.4, z: -16 });
  b.blok(materiaal('glans', 0x003082), 38.1, 0.6, 2.9, { x: -2, y: 0.6, z: -16 });
  b.blok(materiaal('glas', 0x30475a), 34, 1, 2.9, { x: -2, y: 2.2, z: -16 });
  return { groep: b.groep(), hoogte: 27 };
}

/**
 * Het Forum (2019): een hoog, kantig gebouw van lichte natuursteen dat naar boven toe schuin
 * afloopt, met grote glazen insnijdingen en een dakterras.
 */
function forum(b: Bouwer): Model {
  const steen = materiaal('mat', 0xd9d6cf);
  const glas = materiaal('glas', 0x8fb6cc);
  // kantige voetafdruk, uitgerekt in de hoogte, met een schuin dak
  const voet: [number, number][] = [
    [-12, -9],
    [6, -11],
    [13, -4],
    [11, 9],
    [-4, 11],
    [-13, 3],
  ];
  const stukken = 5;
  for (let i = 0; i < stukken; i++) {
    const krimp = 1 - i * 0.07;
    const h = 9;
    b.vorm(
      steen,
      voet.map(([x, z]) => [x * krimp + i * 0.5, -z * krimp] as [number, number]),
      h,
      { y: i * h, rx: -Math.PI / 2 },
    );
    // glazen banden en grote ramen
    b.blok(glas, 14 * krimp, 3.6, 0.3, { x: i * 0.5 - 1, y: i * h + 3, z: 10.6 * krimp });
  }
  b.blok(glas, 10, 18, 0.4, { x: 4, y: 8, z: 9.8, ry: -0.18 });
  b.blok(glas, 0.4, 20, 9, { x: 12.6, y: 6, z: 0, ry: 0.1 });
  // het schuine dakterras
  b.vorm(
    steen,
    voet.map(([x, z]) => [x * 0.66 + 2.5, -z * 0.66] as [number, number]),
    1.2,
    { y: 45, rx: -Math.PI / 2 + 0.12 },
  );
  b.blok(materiaal('metaal', 0xcfd3d8), 12, 1, 0.1, { x: 2, y: 46.5, z: 5 });
  b.blok(
    bord('Forum', 0xffffff, 0x15193a, { breedte: 256, hoogte: 64, schuin: true }),
    6,
    1.6,
    0.2,
    { x: -3, y: 2.4, z: 10.8 },
  );
  b.blok(materiaal('mat', 0xcfc6b5), 36, 0.3, 28);
  return { groep: b.groep(), hoogte: 48 };
}

/**
 * De Euroborg (2006): een rechthoekig stadion met een zilvergrijze gevel van lamellen, glazen
 * hoeken, een licht dak rondom en het groene veld; aan de kant het hoge blok met bioscoop en
 * kantoren. Groen-wit van FC Groningen.
 */
function euroborg(b: Bouwer): Model {
  const gevel = materiaal('metaal', 0xb4bccb);
  const dak = materiaal('glans', 0xe8ecf1);
  const B = 40;
  const D = 30;
  // het veld met witte lijnen
  b.blok(materiaal('mat', 0x3f9b45), B - 10, 0.4, D - 10);
  b.blok(materiaal('glans', 0xffffff), 0.25, 0.42, D - 12);
  b.cilinder(materiaal('glans', 0xffffff), 2.4, 2.4, 0.41, {}, 24);
  b.cilinder(materiaal('mat', 0x3f9b45), 2.1, 2.1, 0.43, {}, 24);
  // tribunes (schuin, groen-wit) en de gevel
  for (const [x, z, br, d, ry] of [
    [0, D / 2 - 3, B - 4, 6, 0],
    [0, -D / 2 + 3, B - 4, 6, Math.PI],
    [B / 2 - 3, 0, D - 4, 6, Math.PI / 2],
    [-B / 2 + 3, 0, D - 4, 6, -Math.PI / 2],
  ] as const) {
    b.blok(materiaal('glans', 0x0b6b3a), br, 0.6, d, { x, y: 3, z, ry, rx: -0.5 });
  }
  for (const zijde of [-1, 1]) {
    b.blok(gevel, B, 10, 0.6, { z: (zijde * D) / 2 });
    b.blok(gevel, 0.6, 10, D, { x: (zijde * B) / 2 });
  }
  for (let l = 0; l < 4; l++) {
    b.blok(materiaal('metaal', 0x8a93a6), B + 0.3, 0.4, 0.2, { y: 1.5 + l * 2.2, z: D / 2 + 0.35 });
  }
  // glazen hoeken
  for (const [x, z] of [
    [-B / 2, D / 2],
    [B / 2, D / 2],
    [-B / 2, -D / 2],
    [B / 2, -D / 2],
  ] as const)
    b.cilinder(materiaal('glas', 0x9cc3dc), 3, 3, 10.4, { x, z }, 12);
  // groene band met de naam
  b.blok(bord('EUROBORG', 0x0b6b3a, 0xffffff, { breedte: 512, hoogte: 96 }), 16, 2.4, 0.2, {
    y: 6,
    z: D / 2 + 0.45,
  });
  // het dak: een lichte rand rondom, open boven het veld
  b.blok(dak, B + 2, 0.6, 7, { y: 10, z: D / 2 - 2.5 });
  b.blok(dak, B + 2, 0.6, 7, { y: 10, z: -D / 2 + 2.5 });
  b.blok(dak, 7, 0.6, D - 12, { x: B / 2 - 2.5, y: 10 });
  b.blok(dak, 7, 0.6, D - 12, { x: -B / 2 + 2.5, y: 10 });
  // het hoge blok (bioscoop, kantoren)
  b.blok(materiaal('metaal', 0x8f98a6), 9, 26, 10, { x: B / 2 + 5, z: -6 });
  for (let r = 0; r < 6; r++)
    b.blok(materiaal('glas', 0x9cc3dc), 9.2, 1.4, 10.2, { x: B / 2 + 5, y: 3 + r * 3.8, z: -6 });
  // lichtmasten
  for (const [x, z] of [
    [-B / 2 + 1, D / 2 - 1],
    [B / 2 - 1, -D / 2 + 1],
  ] as const) {
    b.blok(materiaal('metaal', 0x8e959d), 0.4, 14, 0.4, { x, z });
    b.blok(materiaal('licht', 0xffffff), 2.4, 1.4, 0.4, { x, y: 14, z });
  }
  return { groep: b.groep(), hoogte: 26 };
}

/** Het Noorderplantsoen: een glooiend park met een vijver, de rozentuin, paden en hoge bomen. */
function plantsoen(b: Bouwer): Model {
  b.cilinder(materiaal('mat', GRAS), 24, 24.5, 0.6, {}, 28);
  b.cilinder(materiaal('water', 0x3b8fc4), 6, 6, 0.65, { x: -6, z: 4 }, 24);
  b.buis(
    materiaal('mat', 0xd9c9a3),
    new CatmullRomCurve3([
      new Vector3(-23, 0.3, -4),
      new Vector3(-10, 0.3, -6),
      new Vector3(2, 0.3, 4),
      new Vector3(10, 0.3, 14),
      new Vector3(20, 0.3, 10),
    ]),
    0.8,
  );
  for (const [x, z, h] of [
    [-16, -14, 11],
    [-4, -16, 12],
    [8, -12, 10],
    [16, -2, 11],
    [-18, 6, 9],
    [6, 16, 9],
    [14, 12, 8],
  ] as const)
    boom(b, x, z, h);
  // rozentuin
  for (let i = 0; i < 14; i++)
    b.bol(
      materiaal('glans', i % 2 ? 0xe84a6b : 0xffffff),
      0.5,
      { x: 8 + (i % 7) * 1.2, y: 0.7, z: 2 + Math.floor(i / 7) * 1.4 },
      6,
    );
  bankje(b, 0, -2, 0.4);
  return { groep: b.groep(), hoogte: 11 };
}

/**
 * Het Groninger Museum (1994): kleurige blokken op het water, met de gouden toren, het roze
 * blok, het lichtblauwe paviljoen en een brug.
 */
function museum(b: Bouwer): Model {
  b.blok(materiaal('water', 0x3b8fc4), 50, 0.4, 30);
  b.blok(materiaal('mat', 0xd9748c), 16, 8, 12, { x: -16, z: -2 });
  b.blok(materiaal('metaal', 0xd4a62a), 9, 30, 9, { x: -2, z: -2 });
  for (let r = 0; r < 4; r++)
    b.blok(materiaal('glans', 0xffffff), 4, 1.6, 0.2, { x: -2, y: 8 + r * 6, z: 2.6 });
  b.blok(materiaal('glans', 0x5fb0e0), 14, 10, 12, { x: 13, z: -2, rz: 0.08, ry: 0.15 });
  b.blok(materiaal('metaal', 0xb4bccb), 10, 4, 10, { x: 14, y: 10, z: -2, ry: 0.5, rx: 0.2 });
  b.blok(materiaal('mat', 0x2f9e44), 6, 4, 8, { x: -26, z: -2 });
  // de brug over het water
  b.blok(materiaal('mat', 0xcfc6b5), 4, 0.6, 14, { x: -2, y: 0.4, z: 9 });
  return { groep: b.groep(), hoogte: 30 };
}

/**
 * Het Academiegebouw van de Rijksuniversiteit (1909): neorenaissance van rode baksteen met
 * natuurstenen banden, een rijk middenrisaliet met een hoge dakruiter, steile leien daken.
 */
function academiegebouw(b: Bouwer): Model {
  const steen = materiaal('mat', 0xa75a3f);
  const licht = materiaal('mat', 0xe7dcc2);
  const lei = materiaal('mat', LEI);
  b.blok(steen, 44, 14, 14, { z: -2 });
  for (const y of [4.5, 9.5, 14]) b.blok(licht, 44.3, 0.5, 14.3, { y, z: -2 });
  b.zadeldak(lei, 44, 14, 8, { y: 14.3, z: -2 });
  // middenrisaliet met trapgevel en dakruiter
  b.blok(steen, 14, 20, 16, { z: -1 });
  b.vorm(steen, gevelTop(14, 'trap', 8), 0.8, { y: 20, z: 7 });
  b.zadeldak(lei, 16, 14, 8, { y: 20, z: -1, ry: Math.PI / 2 });
  b.cilinder(licht, 1.6, 1.6, 5, { y: 26, z: -1 }, 8);
  b.spits(materiaal('mat', KOPER), 2, 9, { y: 31, z: -1 }, 8);
  b.bol(materiaal('metaal', 0xd4a62a), 0.4, { y: 40.2, z: -1 }, 6);
  // hoekpaviljoens
  for (const tx of [-20, 20]) {
    b.vorm(steen, gevelTop(8, 'trap', 6), 0.8, { x: tx, y: 14, z: 5.4 });
  }
  b.ramen({
    kant: 'voor',
    x: -14.5,
    z: 5,
    breedte: 14,
    rijen: 3,
    kolommen: 4,
    onder: 1.2,
    tussen: 4.6,
    rb: 1.8,
    rh: 3,
  });
  b.ramen({
    kant: 'voor',
    x: 14.5,
    z: 5,
    breedte: 14,
    rijen: 3,
    kolommen: 4,
    onder: 1.2,
    tussen: 4.6,
    rb: 1.8,
    rh: 3,
  });
  b.ramen({
    kant: 'voor',
    z: 7,
    breedte: 14,
    rijen: 3,
    kolommen: 3,
    onder: 6,
    tussen: 4.6,
    rb: 2.2,
    rh: 3.2,
    zonder: [],
  });
  // ingang met boog
  b.blok(materiaal('donker', 0x3a2a1e), 4, 4.6, 0.3, { z: 7.1 });
  b.cilinder(materiaal('donker', 0x3a2a1e), 2, 2, 0.3, { y: 4.6, z: 7.1, rx: Math.PI / 2 }, 12);
  b.blok(materiaal('mat', 0xcfc6b5), 46, 0.3, 8, { z: 10 });
  return { groep: b.groep(), hoogte: 41 };
}

/** De Oostersluis: een sluiskolk tussen kademuren, sluisdeuren, een brugwachtershuisje en een boot. */
function sluis(b: Bouwer): Model {
  const kade = materiaal('mat', 0x8d8579);
  b.blok(materiaal('water', 0x3b8fc4), 50, 0.3, 12);
  b.blok(kade, 50, 2, 9, { z: -10.5 });
  b.blok(kade, 50, 2, 9, { z: 10.5 });
  b.blok(materiaal('mat', GRAS), 50, 2.05, 5, { z: -13 });
  b.blok(materiaal('mat', GRAS), 50, 2.05, 5, { z: 13 });
  for (const sx of [-12, 12]) {
    // sluisdeuren (puntdeuren) en balansbalken
    b.blok(materiaal('mat', 0x3a3a3a), 0.8, 2.6, 6.4, { x: sx - 1.2, z: -3, ry: 0.35 });
    b.blok(materiaal('mat', 0x3a3a3a), 0.8, 2.6, 6.4, { x: sx - 1.2, z: 3, ry: -0.35 });
    b.blok(materiaal('glans', 0xffffff), 0.4, 0.4, 8, { x: sx + 2, y: 2.6, z: -8, ry: 0.3 });
    b.blok(materiaal('glans', 0xd62828), 0.42, 0.42, 1.4, { x: sx + 2.6, y: 2.6, z: -11, ry: 0.3 });
  }
  // brugwachtershuisje
  b.blok(materiaal('mat', 0xf4f2ec), 5, 4, 4, { x: 0, y: 2, z: -11 });
  b.schilddak(materiaal('mat', 0x1e6f5c), 5.6, 4.6, 2.4, { y: 6, z: -11 });
  b.ramen({
    kant: 'voor',
    x: 0,
    z: -9,
    breedte: 5,
    rijen: 1,
    kolommen: 2,
    onder: 3,
    tussen: 2,
    rb: 1.4,
    rh: 1.4,
  });
  // een boot in de kolk
  b.blok(materiaal('glans', 0xd2465e), 10, 1.6, 3.6, { y: 0.1 });
  b.blok(materiaal('glans', 0xffffff), 4, 1.8, 3, { x: 2, y: 1.7 });
  b.blok(materiaal('glas', 0x30475a), 4.05, 0.7, 3.05, { x: 2, y: 2.6 });
  return { groep: b.groep(), hoogte: 9 };
}

/** De Oosterpoort (1973): een donkere bakstenen concertzaal in lagen, met een grote glazen gevel. */
function oosterpoort(b: Bouwer): Model {
  const steen = materiaal('mat', 0x7f4c35);
  b.blok(steen, 40, 9, 22, { z: -3 });
  b.blok(steen, 26, 17, 16, { x: -4, z: -5 });
  b.blok(materiaal('mat', 0x6a3e2c), 26.4, 0.8, 16.4, { x: -4, y: 17, z: -5 });
  b.blok(materiaal('glas', 0x8fb6cc), 30, 7.4, 0.4, { y: 0.6, z: 8.1 });
  for (let i = 0; i <= 10; i++)
    b.blok(materiaal('metaal', 0x4a5162), 0.25, 7.4, 0.5, { x: -15 + i * 3, y: 0.6, z: 8.2 });
  b.blok(bord('DE OOSTERPOORT', 0x15193a, 0xffffff, { breedte: 512, hoogte: 80 }), 14, 1.6, 0.2, {
    x: -4,
    y: 13,
    z: 3.15,
  });
  // een muzieknoot op het dak
  b.bol(materiaal('glans', 0x15193a), 1.4, { x: 8, y: 18.6, z: -5 }, 10);
  b.blok(materiaal('glans', 0x15193a), 0.4, 6, 0.4, { x: 9.2, y: 18.6, z: -5 });
  b.blok(materiaal('glans', 0x15193a), 2.4, 0.8, 0.4, { x: 10.2, y: 24, z: -5, rz: -0.4 });
  b.blok(materiaal('mat', 0xcfc6b5), 46, 0.3, 8, { z: 12 });
  return { groep: b.groep(), hoogte: 25 };
}

/**
 * Het Goudkantoor (1635): een klein renaissancepand van rode baksteen met witte zandstenen
 * banden, schelpvormige frontons boven de ramen, een rijke trapgevel met een vergulde bekroning,
 * en een kistje goud voor de deur.
 */
function goudkantoor(b: Bouwer): Model {
  const steen = materiaal('mat', BAKSTEEN_ROOD);
  const wit = materiaal('mat', 0xf3ecd9);
  const goud = materiaal('metaal', 0xe1b12c);
  b.blok(materiaal('mat', 0xcfc6b5), 30, 0.3, 24);
  b.blok(steen, 18, 14, 14, { z: -3 });
  for (const y of [0.3, 6.6, 13.4]) b.blok(wit, 18.3, 0.7, 14.3, { y, z: -3 });
  b.vorm(steen, gevelTop(18, 'trap', 12), 0.8, { y: 14, z: 4 });
  b.vorm(wit, gevelTop(18.6, 'trap', 0.6), 1, { y: 14, z: 4.2 });
  b.zadeldak(materiaal('mat', LEI), 14, 18, 11, { y: 14, z: -3, ry: Math.PI / 2 }, 0.1);
  for (const x of [-5.5, 0, 5.5])
    for (const y of [2.2, 8.4]) {
      b.blok(materiaal('glans', 0x2f5d50), 2.6, 3.6, 0.3, { x, y, z: 4.1 });
      b.blok(wit, 3.4, 0.5, 0.5, { x, y: y + 3.6, z: 4.2 });
      b.vorm(
        wit,
        [
          [-1.7, 0],
          [1.7, 0],
          [0, 1.2],
        ],
        0.4,
        { x, y: y + 4.1, z: 4.4 },
      );
    }
  b.ramen({
    kant: 'voor',
    z: 4.2,
    breedte: 6,
    rijen: 1,
    kolommen: 2,
    onder: 17,
    tussen: 3,
    rb: 1.4,
    rh: 2,
    lijst: 0,
  });
  b.bol(goud, 1.3, { y: 27.2, z: 4 }, 12);
  b.cilinder(goud, 0.2, 0.2, 2, { y: 28.2, z: 4 }, 6);
  // een kistje goud voor de deur
  b.blok(materiaal('mat', HOUT), 3, 1.8, 2, { x: 6, z: 8 });
  for (let i = 0; i < 5; i++)
    b.bol(goud, 0.55, { x: 5 + (i % 3) * 0.9, y: 2 + Math.floor(i / 3) * 0.4, z: 8 }, 8);
  return { groep: b.groep(), hoogte: 29 };
}

// -------------------------------------------------------------------------------------------------
// Toestand: dichtgetimmerd, bloembakken, een vlag en een kraan
// -------------------------------------------------------------------------------------------------

/** Hoe ver de voorkant van elk gebouw naar voren steekt (voor het hek als het dicht is). */
const VOOR: Record<string, number> = {
  stadhuis: 16.5,
  winkel: 15,
  zwembad: 13.5,
  school: 14,
  werk: 15.5,
  zorg: 12.5,
  politie: 12,
  theater: 13.5,
  beleid: 12.5,
  loket: 14.5,
  bouw: 11,
  buurt: 13,
  parkeer: 14,
  veiling: 9,
};

function toestandExtra(model: Model, stijl: Stijl, id: string): void {
  const b = new Bouwer(stijl);
  const top = Math.min(model.hoogte, 24);
  if (stijl.toestand === 'gesloten' && id !== 'park') {
    // een bouwhek voor de ingang met een rood bord: dicht
    const z = VOOR[id] ?? 12;
    const hek = materiaal('metaal', 0xb8bcc2);
    for (let i = 0; i < 5; i++) {
      const x = -12 + i * 6;
      b.blok(hek, 0.15, 2.2, 0.15, { x, z });
      b.blok(materiaal('mat', 0x9aa0a8), 0.9, 0.3, 0.6, { x, z });
      if (i < 4) {
        b.blok(hek, 6, 0.12, 0.08, { x: x + 3, y: 2.1, z });
        b.blok(hek, 6, 0.12, 0.08, { x: x + 3, y: 0.4, z });
        for (let k = 1; k < 6; k++) b.blok(hek, 0.05, 1.7, 0.05, { x: x + k, y: 0.4, z });
      }
    }
    b.blok(bord('GESLOTEN', 0xc4321e, 0xffffff, { breedte: 256, hoogte: 64 }), 4.5, 1.2, 0.12, {
      x: 0,
      y: 0.8,
      z: z + 0.1,
    });
  }
  if (stijl.fel) {
    const kleuren = [0xff6a8a, 0xffd23f, 0xffffff, 0xd2465e];
    for (let i = 0; i < 6; i++) {
      const x = -15 + i * 6;
      b.blok(materiaal('mat', 0x8b5a2b), 2.4, 0.7, 1, { x, z: 10.5 });
      for (let k = 0; k < 3; k++)
        b.bol(
          materiaal('glans', kleuren[(i + k) % 4] ?? 0xffd23f),
          0.42,
          { x: x - 0.7 + k * 0.7, y: 0.95, z: 10.5 },
          6,
        );
    }
  }
  if (stijl.toestand === 'bloeiend') {
    vlag(b, -2, top, -2, ORANJE, 6);
    if (id !== 'bouw') {
      // een kleine kraan: hier wordt geïnvesteerd
      const geel = materiaal('glans', 0xf2b705);
      b.blok(geel, 0.6, 22, 0.6, { x: 24, z: -12 });
      b.blok(geel, 16, 0.7, 0.7, { x: 19, y: 22, z: -12 });
      b.blok(materiaal('mat', 0x6b6f76), 2, 1.4, 1.4, { x: 27, y: 21, z: -12 });
    }
  }
  const extra = b.groep();
  if (extra.children.length) model.groep.add(extra);
}

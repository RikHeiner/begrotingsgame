/**
 * De camera van de 3D-kaart: hij kijkt schuin op een punt op de grond (het doel), van een afstand,
 * gekanteld en gedraaid. Pure rekenfuncties: passen in een deel van het scherm (boven een paneel
 * of een kaartje), een punt op een plek van het scherm zetten, en de grenzen.
 */
import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';

export type Stand = {
  /** het punt op de grond waar de camera naar kijkt */
  x: number;
  z: number;
  afstand: number;
  /** hoek met de loodlijn: 0 is recht van boven */
  kanteling: number;
  /** draaiing om de loodlijn: 0 is het noorden boven */
  draai: number;
};

/** Een deel van het scherm in pixels (bijvoorbeeld boven een paneel). */
export type Vak = { links: number; boven: number; rechts: number; onder: number };
export type Kader = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Scherm = { breedte: number; hoogte: number };

export const BEELDHOEK = 30;
export const KANTELING = 0.82;
export const KANTELING_MIN = 0.12;
export const KANTELING_MAX = 1.15;

export function zetCamera(cam: PerspectiveCamera, s: Stand, scherm: Scherm): void {
  const sk = Math.sin(s.kanteling);
  const ck = Math.cos(s.kanteling);
  cam.fov = BEELDHOEK;
  cam.aspect = scherm.breedte / Math.max(1, scherm.hoogte);
  cam.position.set(
    s.x + Math.sin(s.draai) * sk * s.afstand,
    ck * s.afstand,
    s.z + Math.cos(s.draai) * sk * s.afstand,
  );
  cam.up.set(0, 1, 0);
  cam.lookAt(s.x, 0, s.z);
  cam.near = Math.max(1, s.afstand * 0.05);
  cam.far = s.afstand * 4 + 3000;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
}

const v = new Vector3();
/** Waar een punt in de wereld op het scherm staat (in pixels). */
export function opScherm(
  cam: PerspectiveCamera,
  scherm: Scherm,
  x: number,
  y: number,
  z: number,
): { x: number; y: number } {
  v.set(x, y, z).project(cam);
  return { x: ((v.x + 1) / 2) * scherm.breedte, y: ((1 - v.y) / 2) * scherm.hoogte };
}

const straal = new Raycaster();
const grond = new Plane(new Vector3(0, 1, 0), 0);
const ndc = new Vector2();
const raak = new Vector3();
/** Het punt op de grond onder een plek op het scherm (of niets, boven de horizon). */
export function opGrond(
  cam: PerspectiveCamera,
  scherm: Scherm,
  sx: number,
  sy: number,
): { x: number; z: number } | undefined {
  ndc.set((sx / scherm.breedte) * 2 - 1, -(sy / scherm.hoogte) * 2 + 1);
  straal.setFromCamera(ndc, cam);
  const p = straal.ray.intersectPlane(grond, raak);
  return p ? { x: p.x, z: p.z } : undefined;
}

/** Schuift de camera zo dat het punt (x, z) op de grond op schermplek (sx, sy) komt. */
export function richtOp(
  cam: PerspectiveCamera,
  scherm: Scherm,
  s: Stand,
  punt: { x: number; z: number },
  sx: number,
  sy: number,
): Stand {
  let r = { ...s };
  for (let i = 0; i < 4; i++) {
    zetCamera(cam, r, scherm);
    const onder = opGrond(cam, scherm, sx, sy);
    if (!onder) break;
    r = { ...r, x: r.x + punt.x - onder.x, z: r.z + punt.z - onder.z };
  }
  return r;
}

/**
 * De stand waarin het kader (op de grond, met gebouwen tot `hoogte`) precies in het vak past.
 * Kanteling en draai blijven zoals ze zijn.
 */
export function pasIn(
  cam: PerspectiveCamera,
  scherm: Scherm,
  basis: Pick<Stand, 'kanteling' | 'draai'>,
  kader: Kader,
  vak: Vak,
  ruimte = 0.94,
  hoogte = 0,
  /** de echte vorm (punten op de grond); anders de hoeken van het kader */
  vorm?: { x: number; z: number }[],
): Stand {
  const midden = { x: (kader.minX + kader.maxX) / 2, z: (kader.minZ + kader.maxZ) / 2 };
  const vb = Math.max(40, scherm.breedte - vak.links - vak.rechts);
  const vh = Math.max(40, scherm.hoogte - vak.boven - vak.onder);
  const vx = vak.links + vb / 2;
  const vy = vak.boven + vh / 2;
  let s: Stand = {
    ...basis,
    x: midden.x,
    z: midden.z,
    afstand: Math.max(kader.maxX - kader.minX, kader.maxZ - kader.minZ) * 2,
  };
  const hoeken: [number, number, number][] = [];
  const grondpunten = vorm?.length
    ? vorm
    : [kader.minX, kader.maxX].flatMap((x) => [kader.minZ, kader.maxZ].map((z) => ({ x, z })));
  for (const p of grondpunten) {
    hoeken.push([p.x, 0, p.z]);
    if (hoogte) hoeken.push([p.x, hoogte, p.z]);
  }
  for (let i = 0; i < 8; i++) {
    zetCamera(cam, s, scherm);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y, z] of hoeken) {
      const p = opScherm(cam, scherm, x, y, z);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const factor = Math.max((maxX - minX) / (vb * ruimte), (maxY - minY) / (vh * ruimte));
    s = { ...s, afstand: s.afstand * factor };
    zetCamera(cam, s, scherm);
    // het midden van wat je ziet naar het midden van het vak
    const a = opGrond(cam, scherm, (minX + maxX) / 2, (minY + maxY) / 2);
    const b = opGrond(cam, scherm, vx, vy);
    if (a && b) s = { ...s, x: s.x + a.x - b.x, z: s.z + a.z - b.z };
    if (Math.abs(factor - 1) < 0.002 && i > 2) break;
  }
  return s;
}

/** Houdt de afstand tussen min en max en het doel binnen de kaart. */
export function klem(s: Stand, kader: Kader, min: number, max: number): Stand {
  const marge = 0.05 * (kader.maxX - kader.minX);
  return {
    ...s,
    afstand: Math.min(max, Math.max(min, s.afstand)),
    kanteling: Math.min(KANTELING_MAX, Math.max(KANTELING_MIN, s.kanteling)),
    x: Math.min(kader.maxX + marge, Math.max(kader.minX - marge, s.x)),
    z: Math.min(kader.maxZ + marge, Math.max(kader.minZ - marge, s.z)),
  };
}

/** Tussen twee standen in, t van 0 tot 1; de afstand logaritmisch, de draai via de korte kant. */
export function tussen(a: Stand, b: Stand, t: number, boog = 0): Stand {
  let d = b.draai - a.draai;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const afstand = Math.exp(Math.log(a.afstand) + (Math.log(b.afstand) - Math.log(a.afstand)) * t);
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    afstand: afstand * (1 + boog * Math.sin(Math.PI * t)),
    kanteling: a.kanteling + (b.kanteling - a.kanteling) * t,
    draai: a.draai + d * t,
  };
}

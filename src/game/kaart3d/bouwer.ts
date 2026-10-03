/**
 * Bouwstenen voor de 3D-gebouwen: blokken, daken, gevels, ramen en ronde vormen. Alles met
 * hetzelfde materiaal wordt samengevoegd tot één mesh, zodat een gebouw maar een paar
 * tekenopdrachten kost.
 *
 * Assen: x naar rechts (oost), y omhoog, z naar voren (zuid, naar de camera). De voorgevel kijkt
 * naar +z. Een maat is een "meter" van de tekening; de kaart schaalt het gebouw daarna.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  type Curve,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Toestand } from '../toestand';

export type Soort = 'mat' | 'glas' | 'licht' | 'donker' | 'metaal' | 'water' | 'glans';

/** Mengt twee kleuren: deel 0 is a, deel 1 is b. */
export function meng(a: number, b: number, deel: number): number {
  return new Color(a).lerp(new Color(b), deel).getHex();
}

const GRIJS = 0x8f949b;
/** Alle materialen, gedeeld door de gebouwen (sleutel: soort en kleur). */
const materialen = new Map<string, MeshStandardMaterial>();
/** Verlichte ramen: 's avonds gloeien ze. */
let avond = false;

function maakMateriaal(soort: Soort, kleur: number): MeshStandardMaterial {
  switch (soort) {
    case 'glas':
      return new MeshStandardMaterial({ color: kleur, roughness: 0.15, metalness: 0.2 });
    case 'licht':
      return new MeshStandardMaterial({
        color: kleur,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0xffc35c,
        emissiveIntensity: avond ? 1.1 : 0.18,
      });
    case 'donker':
      return new MeshStandardMaterial({ color: kleur, roughness: 0.4, metalness: 0.1 });
    case 'metaal':
      return new MeshStandardMaterial({ color: kleur, roughness: 0.4, metalness: 0.3 });
    case 'glans':
      return new MeshStandardMaterial({ color: kleur, roughness: 0.3, metalness: 0.05 });
    case 'water':
      return new MeshStandardMaterial({
        color: kleur,
        roughness: 0.05,
        metalness: 0.3,
        transparent: true,
        opacity: 0.92,
      });
    default:
      return new MeshStandardMaterial({ color: kleur, roughness: 0.88, metalness: 0 });
  }
}

export function materiaal(soort: Soort, kleur: number): MeshStandardMaterial {
  const sleutel = `${soort}:${kleur}`;
  let m = materialen.get(sleutel);
  if (!m) {
    m = maakMateriaal(soort, kleur);
    materialen.set(sleutel, m);
  }
  return m;
}

/** Dag of avond: de verlichte ramen gloeien 's avonds. */
export function zetAvond(aan: boolean): void {
  avond = aan;
  for (const [sleutel, m] of materialen)
    if (sleutel.startsWith('licht:')) m.emissiveIntensity = aan ? 1.1 : 0.18;
}

/** Een bord of gevelreclame: tekst op een kleur, als textuur. */
const borden = new Map<string, MeshStandardMaterial>();
export function bord(
  tekst: string,
  achter: number,
  voor: number,
  o: { breedte?: number; hoogte?: number; letter?: number; schuin?: boolean } = {},
): MeshStandardMaterial {
  const b = o.breedte ?? 256;
  const h = o.hoogte ?? 64;
  const sleutel = `${tekst}|${achter}|${voor}|${b}|${h}|${o.letter ?? 0}|${o.schuin ? 1 : 0}`;
  const bestaand = borden.get(sleutel);
  if (bestaand) return bestaand;
  const doek = document.createElement('canvas');
  doek.width = b;
  doek.height = h;
  const ctx = doek.getContext('2d');
  if (ctx) {
    ctx.fillStyle = `#${achter.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, b, h);
    ctx.fillStyle = `#${voor.toString(16).padStart(6, '0')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${o.schuin ? 'italic ' : ''}800 ${o.letter ?? Math.round(h * 0.62)}px Asap, system-ui, sans-serif`;
    ctx.fillText(tekst, b / 2, h / 2 + h * 0.04);
  }
  const textuur = new CanvasTexture(doek);
  textuur.colorSpace = SRGBColorSpace;
  textuur.anisotropy = 4;
  const m = new MeshStandardMaterial({
    map: textuur,
    roughness: 0.5,
    emissive: 0xffffff,
    emissiveMap: textuur,
    emissiveIntensity: 0.25,
  });
  borden.set(sleutel, m);
  return m;
}

/**
 * Hoe een gebouw eruitziet in zijn toestand: somber (grijzer, ramen donker) of fel (frisser).
 */
export class Stijl {
  constructor(readonly toestand: Toestand) {}
  get somber(): boolean {
    return this.toestand === 'versoberd' || this.toestand === 'gesloten';
  }
  get fel(): boolean {
    return this.toestand === 'beter' || this.toestand === 'bloeiend';
  }
  kleur(k: number): number {
    if (this.toestand === 'gesloten') return meng(k, GRIJS, 0.55);
    if (this.toestand === 'versoberd') return meng(k, GRIJS, 0.3);
    if (this.toestand === 'bloeiend') return meng(k, 0xffffff, 0.08);
    return k;
  }
  /** Een mat materiaal (steen, pleister, dak) in de kleur van deze toestand. */
  m(k: number, soort: Soort = 'mat'): MeshStandardMaterial {
    return materiaal(soort, soort === 'mat' || soort === 'glans' ? this.kleur(k) : k);
  }
  /** Een raam: verlicht of donker, afhankelijk van de toestand (versoberd: de helft donker). */
  raam(i: number): MeshStandardMaterial {
    const donker = this.toestand === 'gesloten' || (this.toestand === 'versoberd' && i % 2 === 0);
    return donker ? materiaal('donker', 0x2b313d) : materiaal('licht', 0xf3dc9a);
  }
  /** Glas van een moderne gevel. */
  glas(): MeshStandardMaterial {
    return this.toestand === 'gesloten'
      ? materiaal('donker', 0x39414e)
      : materiaal('glas', this.somber ? 0x7c8a96 : 0x9cc3dc);
  }
}

type Plaats = { x?: number; y?: number; z?: number; ry?: number; rx?: number; rz?: number };

const tijdelijk = new Matrix4();

function plaats(geo: BufferGeometry, p: Plaats): BufferGeometry {
  if (p.rx || p.ry || p.rz) {
    const e = new Matrix4().makeRotationX(p.rx ?? 0);
    e.premultiply(new Matrix4().makeRotationZ(p.rz ?? 0));
    e.premultiply(new Matrix4().makeRotationY(p.ry ?? 0));
    geo.applyMatrix4(e);
  }
  geo.applyMatrix4(tijdelijk.makeTranslation(p.x ?? 0, p.y ?? 0, p.z ?? 0));
  return geo;
}

/** Richting van een gevel: voor (+z), rechts (+x), achter (−z), links (−x). */
export type Kant = 'voor' | 'rechts' | 'achter' | 'links';
const DRAAI: Record<Kant, number> = {
  voor: 0,
  rechts: Math.PI / 2,
  achter: Math.PI,
  links: -Math.PI / 2,
};

export class Bouwer {
  private delen = new Map<Material, BufferGeometry[]>();
  constructor(readonly stijl: Stijl) {}

  voeg(m: Material, geo: BufferGeometry, p: Plaats = {}): this {
    const g = plaats(geo.index ? geo.toNonIndexed() : geo, p);
    if (!g.getAttribute('uv')) return this;
    const lijst = this.delen.get(m);
    if (lijst) lijst.push(g);
    else this.delen.set(m, [g]);
    return this;
  }

  /** Een blok, met de onderkant op hoogte y. */
  blok(m: Material, b: number, h: number, d: number, p: Plaats = {}): this {
    return this.voeg(m, new BoxGeometry(b, h, d), { ...p, y: (p.y ?? 0) + h / 2 });
  }

  /** Een cilinder of kegelstomp, met de onderkant op hoogte y. */
  cilinder(m: Material, rBoven: number, rOnder: number, h: number, p: Plaats = {}, segmenten = 16) {
    return this.voeg(m, new CylinderGeometry(rBoven, rOnder, h, segmenten), {
      ...p,
      y: (p.y ?? 0) + h / 2,
    });
  }

  bol(m: Material, r: number, p: Plaats = {}, segmenten = 12): this {
    return this.voeg(m, new SphereGeometry(r, segmenten, Math.max(6, segmenten * 0.66)), p);
  }

  /** Een spits of piramide met `zijden` zijden (4: piramide), onderkant op y. */
  spits(m: Material, r: number, h: number, p: Plaats = {}, zijden = 4): this {
    return this.voeg(m, new ConeGeometry(r, h, zijden), {
      ...p,
      y: (p.y ?? 0) + h / 2,
      ry: (p.ry ?? 0) + (zijden === 4 ? Math.PI / 4 : 0),
    });
  }

  /**
   * Een zadeldak: de nok loopt langs x (lengte b), de goten aan voor- en achterkant (diepte d).
   * Met `ry` draai je de nok. Onderkant op y.
   */
  zadeldak(m: Material, b: number, d: number, h: number, p: Plaats = {}, overstek = 0.5): this {
    const s = new Shape();
    const hd = d / 2 + overstek;
    s.moveTo(-hd, 0);
    s.lineTo(hd, 0);
    s.lineTo(0, h);
    s.closePath();
    const geo = new ExtrudeGeometry(s, { depth: b + overstek * 2, bevelEnabled: false });
    geo.translate(0, 0, -(b + overstek * 2) / 2);
    geo.rotateY(Math.PI / 2);
    return this.voeg(m, geo, p);
  }

  /** Een schilddak (vier schuine kanten), nok langs x. */
  schilddak(m: Material, b: number, d: number, h: number, p: Plaats = {}): this {
    const nok = Math.max(0, b - d) / 2;
    const hb = b / 2;
    const hd = d / 2;
    const v = [
      [-hb, 0, hd],
      [hb, 0, hd],
      [hb, 0, -hd],
      [-hb, 0, -hd],
      [-nok, h, 0],
      [nok, h, 0],
    ];
    const vlakken = [
      [0, 1, 5, 4],
      [1, 2, 5],
      [2, 3, 4, 5],
      [3, 0, 4],
    ];
    return this.voeg(m, veelvlak(v, vlakken), p);
  }

  /**
   * Een platte vorm (gevel, trapgevel, bord), getekend in het xy-vlak met y omhoog, `dikte` dik
   * naar achteren. De voorkant ligt op z = 0 (vóór de rotatie).
   */
  vorm(m: Material, punten: [number, number][], dikte: number, p: Plaats = {}): this {
    const s = new Shape(punten.map(([x, y]) => new Vector2(x, y)));
    const geo = new ExtrudeGeometry(s, { depth: dikte, bevelEnabled: false });
    geo.translate(0, 0, -dikte);
    return this.voeg(m, geo, p);
  }

  /** Een draaivorm (koepel, spits, zuil) uit een profiel van [straal, hoogte]. */
  draai(m: Material, profiel: [number, number][], p: Plaats = {}, segmenten = 16): this {
    const geo = new LatheGeometry(
      profiel.map(([r, y]) => new Vector2(Math.max(0.0001, r), y)),
      segmenten,
    );
    return this.voeg(m, geo, p);
  }

  buis(m: Material, pad: Curve<Vector3>, r: number, segmenten = 40): this {
    return this.voeg(m, new TubeGeometry(pad, segmenten, r, 8, false));
  }

  /**
   * Ramen op een gevel: `kant` geeft de gevel, (x, z) het midden van die gevel aan de buitenkant,
   * `breedte` de breedte van de gevel. De ramen steken een fractie uit.
   */
  ramen(o: {
    kant: Kant;
    x?: number;
    z: number;
    breedte: number;
    rijen: number;
    kolommen: number;
    onder: number;
    tussen: number;
    rb?: number;
    rh?: number;
    lijst?: number;
    /** sla deze ramen over (bijvoorbeeld voor een deur), als [rij, kolom] */
    zonder?: [number, number][];
  }): this {
    const rb = o.rb ?? 1.6;
    const rh = o.rh ?? 2.2;
    const stap = o.breedte / o.kolommen;
    const r = DRAAI[o.kant];
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    let i = 0;
    for (let rij = 0; rij < o.rijen; rij++) {
      for (let k = 0; k < o.kolommen; k++) {
        i++;
        if (o.zonder?.some(([a, b]) => a === rij && b === k)) continue;
        const u = -o.breedte / 2 + stap * (k + 0.5);
        // langs de gevel: u; uit de gevel: 0.12
        const x = (o.x ?? 0) + u * cos + 0.12 * sin;
        const z = o.z + -u * sin + 0.12 * cos;
        const y = o.onder + rij * o.tussen;
        this.blok(this.stijl.raam(i + rij), rb, rh, 0.3, { x, y, z, ry: r });
        if (o.lijst !== 0) {
          // een lichte lijst onder het raam
          const lx = (o.x ?? 0) + u * cos + 0.25 * sin;
          const lz = o.z + -u * sin + 0.25 * cos;
          this.blok(this.stijl.m(0xf2efe6), rb + 0.5, 0.25, 0.5, {
            x: lx,
            y: y - 0.25,
            z: lz,
            ry: r,
          });
        }
      }
    }
    return this;
  }

  /** Alles samenvoegen tot een groep: één mesh per materiaal, met schaduw. */
  groep(): Group {
    const g = new Group();
    for (const [m, lijst] of this.delen) {
      const samen = mergeGeometries(lijst.map(gelijkmaken), false);
      if (!samen) continue;
      const mesh = new Mesh(samen, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      for (const l of lijst) l.dispose();
    }
    this.delen.clear();
    return g;
  }
}

/** Zorgt dat alle stukken dezelfde attributen hebben (positie, normaal, uv), zodat ze samengaan. */
function gelijkmaken(g: BufferGeometry): BufferGeometry {
  for (const naam of Object.keys(g.attributes))
    if (naam !== 'position' && naam !== 'normal' && naam !== 'uv') g.deleteAttribute(naam);
  g.clearGroups();
  return g;
}

/** Een veelvlak uit hoekpunten en vlakken (vlakken tegen de klok in, van buiten gezien). */
function veelvlak(hoeken: number[][], vlakken: number[][]): BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  for (const v of vlakken) {
    for (let i = 1; i < v.length - 1; i++) {
      for (const k of [v[0], v[i], v[i + 1]]) {
        const h = hoeken[k ?? 0] ?? [0, 0, 0];
        pos.push(h[0] ?? 0, h[1] ?? 0, h[2] ?? 0);
        uv.push(0, 0);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

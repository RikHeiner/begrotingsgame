/**
 * De grond van de 3D-kaart: de gemeente als een dikke plak aarde, met bovenop de kaart (buurten,
 * gebieden, water, wegen en namen) als één textuur. Daarop huizen, flats en bomen, zodat het een
 * echte gemeente lijkt: dicht in de stad, rijtjeshuizen eromheen, boerderijen en bomen buiten.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Shape,
  SRGBColorSpace,
  Vector2,
  type WebGLRenderer,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Data } from '../../engine';
import { tekenVasteLaag, RAND } from '../kaart/vasteLaag';
import { inRing, opWeg, type KaartGeometrie } from '../kaart/geometrie';
import type { Punt } from '../kaart/projectie';
import type { KaartKleuren } from './kleuren';

/** Hoe dik de plak aarde onder de gemeente is (wereldeenheden). */
export const DIKTE = 14;

export function maakGrond(
  renderer: WebGLRenderer,
  geo: KaartGeometrie,
  data: Data,
  kleuren: KaartKleuren,
): Group {
  const groep = new Group();

  // De kaart als textuur, zo scherp als het apparaat aankan.
  const max = Math.min(renderer.capabilities.maxTextureSize, 4096);
  const resolutie = max / (Math.max(geo.breedte, geo.hoogte) + 2 * RAND);
  const doek = document.createElement('canvas');
  tekenVasteLaag(doek, geo, data, kleuren, resolutie);
  const textuur = new CanvasTexture(doek);
  textuur.colorSpace = SRGBColorSpace;
  textuur.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const b = geo.breedte + 2 * RAND;
  const h = geo.hoogte + 2 * RAND;
  const vlak = new Mesh(
    new PlaneGeometry(b, h),
    new MeshStandardMaterial({ map: textuur, roughness: 0.95, alphaTest: 0.5 }),
  );
  vlak.rotation.x = -Math.PI / 2;
  vlak.position.set(geo.breedte / 2, 0, geo.hoogte / 2);
  vlak.receiveShadow = true;
  groep.add(vlak);

  // De plak aarde: elke buurt naar beneden uitgetrokken, samen één vorm.
  const stukken: BufferGeometry[] = [];
  for (const buurt of geo.buurten) {
    const ring = buurt.ringen[0];
    if (!ring || ring.length < 3) continue;
    const vorm = new Shape(ring.map((q) => new Vector2(q.x, q.y)));
    const g = new ExtrudeGeometry(vorm, { depth: DIKTE, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(Math.PI / 2);
    g.translate(0, -0.05, 0);
    stukken.push(g);
  }
  const plak = stukken.length ? mergeGeometries(stukken, false) : undefined;
  for (const s of stukken) s.dispose();
  if (plak) {
    const aarde = new Mesh(
      plak,
      new MeshStandardMaterial({ color: kleuren.zijkant, roughness: 1 }),
    );
    groep.add(aarde);
  }

  groep.add(maakBebouwing(geo, data));
  return groep;
}

/** Een vaste reeks "willekeurige" getallen, zodat de gemeente er elke keer hetzelfde uitziet. */
function toeval(zaad: number): () => number {
  let a = zaad >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Plek = {
  x: number;
  z: number;
  soort: 'flat' | 'huis' | 'boerderij' | 'boom' | 'den';
  draai: number;
  maat: number;
  kleur: number;
};

/** Zoekt plekken voor huizen en bomen: binnen de gemeente, niet op water, wegen of gebouwen. */
export function kiesBebouwing(geo: KaartGeometrie, data: Data, aantal = 7000): Plek[] {
  const r = toeval(20270101);
  const vrij: { p: Punt; r: number }[] = [
    ...Object.values(geo.gebouwen).map((p) => ({ p, r: 46 })),
    ...Object.values(geo.minigames).map((p) => ({ p, r: 40 })),
  ];
  const wegpunten: Punt[] = [];
  for (const w of geo.wegen) for (let t = 0; t <= 1; t += 0.02) wegpunten.push(opWeg(w, t));
  const waterlijnen = geo.water.flatMap((w) => (w.soort === 'lijn' ? [w] : []));
  const watervlakken = geo.water.flatMap((w) => (w.soort === 'vlak' ? w.ringen : []));
  const dorpen = geo.labels.filter((l) => l.soort === 'dorp').map((l) => l.punt);
  const c = geo.gebouwen.stadhuis ?? geo.projectie.centrum;
  const huisKleuren = [0x9a4b33, 0xa8452c, 0x8a3f2c, 0xb5654a, 0xe9e2d0, 0x7a3826, 0xc9b79c];
  const flatKleuren = [0xd8d2c4, 0xb9b3a6, 0xe6e0d2, 0x9a4b33, 0xc4bdb0];
  void data;

  const vakken = geo.buurten.map((buurt) => {
    const ring = buurt.ringen[0] ?? [];
    return {
      buurt,
      ring,
      minX: Math.min(...ring.map((q) => q.x)),
      maxX: Math.max(...ring.map((q) => q.x)),
      minY: Math.min(...ring.map((q) => q.y)),
      maxY: Math.max(...ring.map((q) => q.y)),
    };
  });
  const plekken: Plek[] = [];
  for (let i = 0; i < aantal; i++) {
    const p = { x: r() * geo.breedte, y: r() * geo.hoogte };
    if (vrij.some((v) => Math.hypot(v.p.x - p.x, v.p.y - p.y) < v.r)) continue;
    if (wegpunten.some((w) => Math.hypot(w.x - p.x, w.y - p.y) < 8)) continue;
    if (
      waterlijnen.some((w) =>
        w.punten.some((q, k) => {
          const a = w.punten[k + 1];
          return a ? afstandTotLijn(p, q, a) < w.breedte / 2 + 4 : false;
        }),
      )
    )
      continue;
    if (watervlakken.some((ring) => inRing(p, ring))) continue;
    const buurt = vakken.find(
      (v) =>
        p.x >= v.minX &&
        p.x <= v.maxX &&
        p.y >= v.minY &&
        p.y <= v.maxY &&
        v.ring &&
        inRing(p, v.ring),
    )?.buurt;
    if (!buurt || buurt.ringen.slice(1).some((gat) => inRing(p, gat))) continue;

    const vanStad = Math.hypot(p.x - c.x, p.y - c.y);
    const vanDorp = Math.min(...dorpen.map((d) => Math.hypot(d.x - p.x, d.y - p.y)), Infinity);
    const kans = r();
    const draai =
      r() < 0.7 ? Math.round(r() * 4) * (Math.PI / 2) + (r() - 0.5) * 0.2 : r() * Math.PI;
    if (vanStad < 150) {
      // de binnenstad en de wijken eromheen: flats en panden
      if (kans < 0.55)
        plekken.push({
          x: p.x,
          z: p.y,
          soort: vanStad < 90 || r() < 0.4 ? 'flat' : 'huis',
          draai,
          maat: 0.8 + r() * 0.6,
          kleur: (vanStad < 90 ? flatKleuren : huisKleuren)[Math.floor(r() * 5)] ?? 0x9a4b33,
        });
      else if (kans < 0.7)
        plekken.push({ x: p.x, z: p.y, soort: 'boom', draai, maat: 0.8 + r() * 0.5, kleur: 0 });
    } else if (vanStad < 320 || vanDorp < 40) {
      // rijtjeshuizen en tuinen
      if (kans < 0.3)
        plekken.push({
          x: p.x,
          z: p.y,
          soort: 'huis',
          draai,
          maat: 0.7 + r() * 0.5,
          kleur: huisKleuren[Math.floor(r() * huisKleuren.length)] ?? 0x9a4b33,
        });
      else if (kans < 0.5)
        plekken.push({ x: p.x, z: p.y, soort: 'boom', draai, maat: 0.7 + r() * 0.6, kleur: 0 });
    } else {
      // het platteland: een boerderij hier en daar, bomenrijen
      if (kans < 0.025)
        plekken.push({
          x: p.x,
          z: p.y,
          soort: 'boerderij',
          draai,
          maat: 1 + r() * 0.4,
          kleur: 0x8a3f2c,
        });
      else if (kans < 0.14)
        plekken.push({
          x: p.x,
          z: p.y,
          soort: r() < 0.25 ? 'den' : 'boom',
          draai,
          maat: 0.7 + r() * 0.6,
          kleur: 0,
        });
    }
  }
  return plekken;
}

function afstandTotLijn(p: Punt, a: Punt, b: Punt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Een gevel: lichte muur met rijen donkere ramen (wordt gekleurd per huis). */
function raamTextuur(): CanvasTexture {
  const doek = document.createElement('canvas');
  doek.width = 64;
  doek.height = 64;
  const ctx = doek.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#3a4250';
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 3; k++) ctx.fillRect(7 + k * 19, 8 + r * 19, 11, 10);
  }
  const t = new CanvasTexture(doek);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function maakBebouwing(geo: KaartGeometrie, data: Data): Group {
  const groep = new Group();
  const plekken = kiesBebouwing(geo, data);
  const o = new Object3D();
  const kleur = new Color();

  const muurGeo = new BoxGeometry(1, 1, 1);
  muurGeo.translate(0, 0.5, 0);
  const dakVorm = new Shape([new Vector2(-0.55, 0), new Vector2(0.55, 0), new Vector2(0, 0.5)]);
  const dakGeo = new ExtrudeGeometry(dakVorm, { depth: 1.05, bevelEnabled: false });
  dakGeo.translate(0, 0, -0.525);
  const stamGeo = new CylinderGeometry(0.12, 0.18, 1, 5);
  stamGeo.translate(0, 0.5, 0);
  const kruinGeo = new IcosahedronGeometry(1, 1);
  const denGeo = new ConeGeometry(1, 2.4, 7);
  denGeo.translate(0, 1.2, 0);

  const telling = (s: Plek['soort'][]) => plekken.filter((p) => s.includes(p.soort)).length;
  const gebouwen = telling(['flat', 'huis', 'boerderij']);
  const daken = telling(['huis', 'boerderij']);
  const loofbomen = telling(['boom']);
  const dennen = telling(['den']);

  // gevels met ramen (de kleur per huis komt erbij), daken van de flats plat en grijs
  const gevel = new MeshStandardMaterial({ roughness: 0.9, map: raamTextuur() });
  const plat = new MeshStandardMaterial({ roughness: 0.95, color: 0x8d8f94 });
  const muren = new InstancedMesh(muurGeo, [gevel, gevel, plat, plat, gevel, gevel], gebouwen);
  const dakMesh = new InstancedMesh(dakGeo, new MeshStandardMaterial({ roughness: 0.85 }), daken);
  const stammen = new InstancedMesh(
    stamGeo,
    new MeshStandardMaterial({ color: 0x5a3e28, roughness: 1 }),
    loofbomen + dennen,
  );
  const kruinen = new InstancedMesh(
    kruinGeo,
    new MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
    loofbomen,
  );
  const denMesh = new InstancedMesh(
    denGeo,
    new MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.95, flatShading: true }),
    dennen,
  );

  let m = 0;
  let d = 0;
  let s = 0;
  let k = 0;
  let n = 0;
  const zet = (mesh: InstancedMesh, i: number, kleurHex?: number) => {
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    if (kleurHex !== undefined) mesh.setColorAt(i, kleur.setHex(kleurHex));
  };
  const r = toeval(7);
  for (const p of plekken) {
    o.position.set(p.x, 0, p.z);
    o.rotation.set(0, p.draai, 0);
    if (p.soort === 'flat') {
      const hoog = 7 + r() * 9;
      o.scale.set(9 * p.maat, hoog, 7 * p.maat);
      zet(muren, m++, p.kleur);
    } else if (p.soort === 'huis' || p.soort === 'boerderij') {
      const boer = p.soort === 'boerderij';
      const bw = (boer ? 12 : 6) * p.maat;
      const bd = (boer ? 7 : 5) * p.maat;
      const bh = (boer ? 4 : 4.5) * p.maat;
      o.scale.set(bw, bh, bd);
      zet(muren, m++, p.kleur);
      // het dak: nok langs de lengte
      o.position.set(p.x, bh, p.z);
      o.rotation.set(0, p.draai + Math.PI / 2, 0);
      o.scale.set(bd, (boer ? 8 : 6) * p.maat, bw);
      zet(dakMesh, d++, boer ? 0x3b3f47 : r() < 0.6 ? 0x9e4630 : 0x4b505b);
    } else {
      const hoog = (p.soort === 'den' ? 7 : 6) * p.maat;
      o.scale.set(hoog * 0.6, hoog * 0.55, hoog * 0.6);
      zet(stammen, s++);
      if (p.soort === 'den') {
        o.position.set(p.x, hoog * 0.3, p.z);
        o.scale.set(hoog * 0.32, hoog * 0.4, hoog * 0.32);
        zet(denMesh, n++);
      } else {
        o.position.set(p.x, hoog * 0.72, p.z);
        o.scale.set(hoog * 0.34, hoog * 0.3, hoog * 0.34);
        zet(kruinen, k++, [0x3f8a3a, 0x4f9a44, 0x356f30, 0x5a9e3c][Math.floor(r() * 4)]);
      }
    }
  }
  for (const mesh of [muren, dakMesh, stammen, kruinen, denMesh]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    groep.add(mesh);
  }
  return groep;
}

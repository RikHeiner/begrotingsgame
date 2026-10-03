/**
 * De gemeentekaart in 3D (three.js): de gemeente als een plak aarde met buurten, water en wegen,
 * daarop echte gebouwen met licht en schaduw, huizen en bomen, en inwoners die rondlopen.
 * Slepen schuift, knijpen of scrollen zoomt, twee vingers draaien de kaart; met de muis draai en
 * kantel je met de rechterknop. De interface (knoppen, tekstballonnen) zit in React erboven; de
 * kaart vertelt via `onZicht` waar alles op het scherm staat.
 *
 * Er wordt alleen getekend als er iets verandert. Inwoners lopen en de molen draait een halve
 * minuut na de laatste actie van de speler (batterij).
 */
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  QuadraticBezierCurve3,
  Scene,
  SphereGeometry,
  Sprite,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  type SpriteMaterial,
} from 'three';
import type { Data } from '../../engine';
import { formatMln } from '../../engine/format';
import type { Gebouw, Minigame } from '../../engine/schema';
import { buurtOp, gebiedKader, opWeg, type KaartGeometrie, type Weg } from '../kaart/geometrie';
import { GEBOUW_SCHAAL, MINIGAME_SCHAAL, TEKST_SCHAAL } from '../kaart/maten';
import type { Punt } from '../kaart/projectie';
import type { GebouwStand, Toestand } from '../toestand';
import { materiaal, zetAvond } from './bouwer';
import { maakGrond } from './grond';
import {
  BEELDHOEK,
  KANTELING,
  klem,
  opGrond,
  opScherm,
  pasIn,
  richtOp,
  tussen,
  zetCamera,
  type Kader,
  type Scherm,
  type Stand,
  type Vak,
} from './kijker';
import type { KaartKleuren } from './kleuren';
import { maakGebouwModel, maakMinigameModel, type Model } from './modellen';
import { Naambord } from './tekst';

export { DONKER, LICHT, type KaartKleuren } from './kleuren';

/** Een punt op het scherm, in pixels vanaf linksboven van de kaart. */
export type SchermPunt = { x: number; y: number };

/** Waar alles op het scherm staat, voor de knoppen en labels in React. */
export type Zicht = {
  /** pixels per wereldeenheid in het midden van het beeld */
  schaal: number;
  /** het midden van elk gebouw */
  gebouwen: Record<string, SchermPunt>;
  /** net boven het dak van elk gebouw (voor het nummer van de route) */
  daken: Record<string, SchermPunt>;
  /** net boven de top van elk bekend gebouw met een minigame (voor het label) */
  minigames: Record<string, SchermPunt>;
};

export type KaartOpties = {
  data: Data;
  geo: KaartGeometrie;
  kleuren: KaartKleuren;
  minderBeweging: boolean;
  onTik: (gebouwId: string) => void;
  onTikMinigame: (minigameId: string) => void;
  onZicht: (z: Zicht) => void;
};

type Geplaatst = {
  gebouw: Gebouw;
  plek: Punt;
  houder: Group;
  model: Model;
  toestand?: Toestand;
  zwembadLeeg: boolean;
  naam: Naambord;
  verandering?: { beter: boolean; begin: number; deeltjes: Sprite[] };
  verschijnt?: number;
};

type Bezienswaardigheid = {
  minigame: Minigame;
  plek: Punt;
  houder: Group;
  hoogte: number;
  naam: Naambord;
};

type Loper = {
  persona: string;
  weg: Weg;
  t: number;
  v: number;
  houder: Group;
  soort: 'mens' | 'fiets' | 'bus';
};

type Lijn = { mesh: Mesh; munten: Mesh[]; weg: QuadraticBezierCurve3; begin: number };

const VERANDER_MS = 1400;
const VERSCHIJN_MS = 500;
const LIJN_MS = 2600;
const ACTIEF_MS = 30_000;
const LOPEN_FPS = 30;
/** Inwoners en voertuigen zijn groter dan op schaal, zodat je ze op een telefoon ziet. */
const MENS_SCHAAL = 3.2;
const KLEUR_INWONER = [
  0xff6a00, 0x1233c4, 0x3e8e41, 0xd2465e, 0x7a3dc8, 0xc98a00, 0x1d86c8, 0x15193a,
];
const HUID = [0xf2c29b, 0x8d5a3b, 0xe8b48a, 0xc68642, 0xf5d0b0, 0x6b4226, 0xe8b48a, 0x8d5a3b];
/** Het openingsshot speelt één keer per bezoek. */
let introGezien = false;

export class GemeenteKaart3D {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(30, 1, 1, 5000);
  private zon = new DirectionalLight(0xfff1dc, 2.3);
  private hemel = new HemisphereLight(0xdbeeff, 0x6d8452, 0.65);
  private stand: Stand = { x: 0, z: 0, afstand: 1000, kanteling: KANTELING, draai: 0 };
  private scherm: Scherm = { breedte: 1, hoogte: 1 };
  /** ruimte die panelen en kaartjes innemen; het overzicht past in de rest */
  private vak: Vak = { links: 0, boven: 0, rechts: 0, onder: 0 };
  /** de hele gemeente */
  private kader: Kader;
  /** de omtrek van de gemeente (een deel van de punten), om het overzicht precies te passen */
  private omtrek: { x: number; z: number }[] = [];
  private overzichtAfstand = 1000;
  private gemeenteAfstand = 1000;
  private inOverzicht = true;
  private gebouwen: Geplaatst[] = [];
  private bezienswaardigheden: Bezienswaardigheid[] = [];
  private lopers: Loper[] = [];
  private lijnen: Lijn[] = [];
  private wieken: Group[] = [];
  private animatie?: { van: Stand; naar: Stand; begin: number; duur: number; boog: number };
  private wijzers = new Map<number, { x: number; y: number }>();
  private gebaar?: {
    stand: Stand;
    punten: { x: number; y: number }[];
    grond?: { x: number; z: number };
    begin: number;
    bewogen: boolean;
    knop: number;
    draaien: boolean;
  };
  private laatsteTik = 0;
  private vies = true;
  private actiefTot = 0;
  private laatsteLoop = 0;
  private frame = 0;
  private vorigeTijd = 0;
  private opgeruimd: (() => void)[] = [];
  private emoji = { beter: Naambord.emoji('✨'), slechter: Naambord.emoji('💨') };

  private constructor(
    private o: KaartOpties,
    canvas: HTMLCanvasElement,
  ) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    const g = o.geo;
    this.kader = { minX: 0, maxX: g.breedte, minZ: 0, maxZ: g.hoogte };
    for (const b of g.buurten)
      (b.ringen[0] ?? []).forEach((p, i) => {
        if (i % 6 === 0) this.omtrek.push({ x: p.x, z: p.y });
      });
  }

  static async maak(element: HTMLElement, o: KaartOpties): Promise<GemeenteKaart3D> {
    await Promise.race([
      document.fonts?.load('700 24px Asap').catch(() => undefined),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
    const canvas = document.createElement('canvas');
    const proef = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!proef) throw new Error('3D wordt niet ondersteund');
    const k = new GemeenteKaart3D(o, canvas);
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.touchAction = 'none';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    element.appendChild(canvas);
    k.bouwScene();
    k.koppelInvoer(canvas);
    k.meet(element);
    k.naarOverzicht(false);

    const wakker = () => {
      k.actiefTot = performance.now() + ACTIEF_MS;
    };
    for (const soort of ['pointerdown', 'keydown', 'wheel'] as const) {
      window.addEventListener(soort, wakker, { passive: true });
      k.opgeruimd.push(() => window.removeEventListener(soort, wakker));
    }
    const waarnemer = new ResizeObserver(() => {
      k.meet(element);
      if (k.inOverzicht && !k.animatie) k.naarOverzicht(false);
      else k.zetStand(k.stand);
    });
    waarnemer.observe(element);
    k.opgeruimd.push(() => waarnemer.disconnect());
    const lus = (tijd: number) => {
      const ms = k.vorigeTijd ? tijd - k.vorigeTijd : 0;
      k.vorigeTijd = tijd;
      k.stap(Math.min(ms, 100));
      k.frame = requestAnimationFrame(lus);
    };
    k.frame = requestAnimationFrame(lus);
    k.opgeruimd.push(() => cancelAnimationFrame(k.frame));
    return k;
  }

  // ---------------------------------------------------------------------------------------------
  // De scène
  // ---------------------------------------------------------------------------------------------

  private bouwScene(): void {
    const { geo, data, kleuren } = this.o;
    const midden = { x: geo.breedte / 2, z: geo.hoogte / 2 };

    // licht: een middagzon uit het zuidwesten en een lichte hemel
    this.scene.add(this.hemel);
    this.zon.castShadow = true;
    const groot = window.innerWidth >= 900;
    this.zon.shadow.mapSize.set(groot ? 4096 : 2048, groot ? 4096 : 2048);
    this.zon.shadow.bias = -0.0004;
    this.zon.shadow.normalBias = 0.4;
    this.zetZon(midden.x, midden.z, Math.max(geo.breedte, geo.hoogte) * 0.6);
    this.scene.add(this.zon, this.zon.target);

    this.scene.add(maakGrond(this.renderer, geo, data, kleuren));

    // de gebouwen van de begroting
    for (const g of data.gebouwen) {
      const plek = geo.gebouwen[g.id];
      if (!plek) continue;
      const houder = new Group();
      houder.position.set(plek.x, 0, plek.y);
      houder.scale.setScalar(GEBOUW_SCHAAL);
      const model = maakGebouwModel(g, { toestand: 'normaal' });
      houder.add(model.groep);
      this.scene.add(houder);
      const naam = new Naambord(kleuren.labelRand, [
        { tekst: g.naam, kleur: kleuren.label, grootte: 10 },
      ]);
      this.scene.add(naam.sprite);
      if (model.wieken) this.wieken.push(model.wieken);
      this.gebouwen.push({ gebouw: g, plek, houder, model, naam, zwembadLeeg: false });
    }

    // de bekende gebouwen met een minigame; een spel "bij" een gebouw (de Martinitoren bij het
    // Stadhuis) staat al in dat model
    for (const m of data.minigames) {
      const plek = geo.minigames[m.id];
      if (!plek) continue;
      const naam = new Naambord(kleuren.labelRand, [
        { tekst: m.naam, kleur: kleuren.minigame, grootte: 8.5 },
      ]);
      naam.sprite.visible = false;
      this.scene.add(naam.sprite);
      if (m.bij) {
        const bij = this.gebouwen.find((x) => x.gebouw.id === m.bij?.gebouw);
        const hoogte = (bij?.model.hoogte ?? 60) * GEBOUW_SCHAAL;
        this.bezienswaardigheden.push({ minigame: m, plek, houder: new Group(), hoogte, naam });
        continue;
      }
      const houder = new Group();
      houder.position.set(plek.x, 0, plek.y);
      houder.scale.setScalar(MINIGAME_SCHAAL);
      const model = maakMinigameModel(m);
      houder.add(model.groep);
      this.scene.add(houder);
      this.bezienswaardigheden.push({
        minigame: m,
        plek,
        houder,
        hoogte: model.hoogte * MINIGAME_SCHAAL,
        naam,
      });
    }

    this.maakLopers();
  }

  /** Werkt de gebouwen bij na een keuze van de speler. */
  zetStanden(standen: Record<string, GebouwStand>, zwembadLeeg: boolean): void {
    const { kleuren } = this.o;
    const nu = performance.now();
    for (const t of this.gebouwen) {
      const stand = standen[t.gebouw.id];
      if (!stand) continue;
      const leeg = t.gebouw.id === 'zwembad' && zwembadLeeg;
      if (stand.toestand !== t.toestand || leeg !== t.zwembadLeeg) {
        if (t.toestand && t.toestand !== stand.toestand && !this.o.minderBeweging) {
          const volgorde: Toestand[] = ['gesloten', 'versoberd', 'normaal', 'beter', 'bloeiend'];
          this.startVerandering(
            t,
            volgorde.indexOf(stand.toestand) > volgorde.indexOf(t.toestand),
            nu,
          );
        }
        t.houder.remove(t.model.groep);
        verwijder(t.model.groep);
        if (t.model.wieken) this.wieken = this.wieken.filter((w) => w !== t.model.wieken);
        t.model = maakGebouwModel(t.gebouw, { toestand: stand.toestand, zwembadLeeg: leeg });
        if (t.model.wieken) this.wieken.push(t.model.wieken);
        t.houder.add(t.model.groep);
        t.toestand = stand.toestand;
        t.zwembadLeeg = leeg;
      }
      const bedrag =
        Math.abs(stand.bedrag) < 50_000 ? '' : formatMln(stand.bedrag, { teken: true });
      t.naam.zet([
        { tekst: t.gebouw.naam, kleur: kleuren.label, grootte: 10 },
        ...(bedrag
          ? [
              {
                tekst: bedrag,
                kleur: stand.bedrag >= 0 ? kleuren.positief : kleuren.negatief,
                grootte: 8,
              },
            ]
          : []),
      ]);
    }
    this.plaatsNamen();
    this.vies = true;
  }

  /** Sterretjes die opstijgen (beter) of grijze stofwolkjes (slechter) rond een gebouw. */
  private startVerandering(t: Geplaatst, beter: boolean, nu: number): void {
    for (const d of t.verandering?.deeltjes ?? []) this.scene.remove(d);
    const deeltjes: Sprite[] = [];
    for (let i = 0; i < 6; i++) {
      const s = new Sprite((beter ? this.emoji.beter : this.emoji.slechter) as SpriteMaterial);
      s.renderOrder = 11;
      this.scene.add(s);
      deeltjes.push(s);
    }
    t.verandering = { beter, begin: nu, deeltjes };
  }

  // ---------------------------------------------------------------------------------------------
  // Inwoners, fietsers en de bus
  // ---------------------------------------------------------------------------------------------

  private maakLopers(): void {
    const { geo, data } = this.o;
    data.personas.personas.forEach((p, i) => {
      const eigen =
        data.gebouwen.find((g) => g.buurt === p.buurt && g.id !== 'stadhuis') ??
        data.gebouwen.find((g) => g.gebied === p.gebied && g.id !== 'stadhuis');
      const weg = geo.wegen.find((w) => w.gebouw === eigen?.id) ?? geo.wegen[i % geo.wegen.length];
      if (!weg) return;
      const houder = new Group();
      const kleur = KLEUR_INWONER[i % KLEUR_INWONER.length] ?? 0xff6a00;
      const lijf = new Mesh(new CylinderGeometry(0.32, 0.36, 1, 8), materiaal('mat', kleur));
      lijf.position.y = 1.15;
      const benen = new Mesh(new CylinderGeometry(0.3, 0.28, 0.7, 8), materiaal('mat', 0x2a2f45));
      benen.position.y = 0.35;
      const hoofd = new Mesh(
        new SphereGeometry(0.3, 10, 8),
        materiaal('mat', HUID[i % HUID.length] ?? 0xf2c29b),
      );
      hoofd.position.y = 1.95;
      houder.add(lijf, benen, hoofd);
      houder.scale.setScalar(MENS_SCHAAL);
      for (const m of houder.children) m.castShadow = true;
      this.scene.add(houder);
      this.lopers.push({
        persona: p.id,
        weg,
        t: 0.15 + ((i * 0.37) % 0.7),
        v: (0.025 + (i % 3) * 0.01) * (i % 2 ? 1 : -1),
        houder,
        soort: 'mens',
      });
    });
    if (this.o.minderBeweging || !geo.wegen.length) {
      this.zetLopers(0);
      return;
    }
    const kleuren = [0xff6a00, 0x1233c4, 0xd2465e, 0x15875a, 0xf2b705, 0x7a3dc8];
    for (let i = 0; i < 6; i++) {
      const weg = geo.wegen[(i * 5 + 2) % geo.wegen.length] as Weg;
      const houder = new Group();
      for (const d of [-0.55, 0.55]) {
        const wiel = new Mesh(
          new CylinderGeometry(0.45, 0.45, 0.08, 12),
          materiaal('metaal', 0x222222),
        );
        wiel.rotation.x = Math.PI / 2;
        wiel.position.set(d, 0.45, 0);
        houder.add(wiel);
      }
      const lijf = new Mesh(
        new CylinderGeometry(0.28, 0.32, 0.9, 8),
        materiaal('mat', kleuren[i] ?? 0xff6a00),
      );
      lijf.position.set(0, 1.3, 0);
      const hoofd = new Mesh(new SphereGeometry(0.26, 10, 8), materiaal('mat', 0xf2c29b));
      hoofd.position.set(0, 2.0, 0);
      houder.add(lijf, hoofd);
      houder.scale.setScalar(MENS_SCHAAL);
      this.scene.add(houder);
      this.lopers.push({
        persona: `fiets-${i}`,
        weg,
        t: (i * 0.29) % 1,
        v: (0.06 + (i % 3) * 0.015) * (i % 2 ? 1 : -1),
        houder,
        soort: 'fiets',
      });
    }
    // een groene stadsbus over de langste weg
    const busWeg = geo.wegen.reduce((a, b) =>
      Math.hypot(b.naar.x - b.van.x, b.naar.y - b.van.y) >
      Math.hypot(a.naar.x - a.van.x, a.naar.y - a.van.y)
        ? b
        : a,
    );
    const bus = new Group();
    const blok = (
      b: number,
      h: number,
      d: number,
      kleur: number,
      y: number,
      soort: 'glans' | 'glas' = 'glans',
    ) => {
      const m = new Mesh(new BoxGeometry(b, h, d), materiaal(soort, kleur));
      m.position.y = y + h / 2;
      m.castShadow = true;
      bus.add(m);
    };
    blok(7, 2.4, 2.4, 0x9bc31c, 0.4);
    blok(6.6, 0.8, 2.45, 0x2d3a4a, 1.6, 'glas');
    bus.scale.setScalar(MENS_SCHAAL * 0.75);
    this.scene.add(bus);
    this.lopers.push({ persona: 'bus', weg: busWeg, t: 0.3, v: 0.035, houder: bus, soort: 'bus' });
    this.zetLopers(0);
  }

  private zetLopers(ms: number): void {
    for (const l of this.lopers) {
      if (ms > 0) {
        l.t += (l.v * ms) / 1000;
        if (l.t > 0.97 || l.t < 0.03) {
          l.v = -l.v;
          l.t = Math.min(0.97, Math.max(0.03, l.t));
        }
      }
      const p = opWeg(l.weg, l.t);
      const q = opWeg(l.weg, Math.min(0.99, Math.max(0.01, l.t + (l.v > 0 ? 0.01 : -0.01))));
      const stapje = l.soort === 'mens' && ms > 0 ? Math.abs(Math.sin(l.t * 160)) * 0.6 : 0;
      // een beetje naast het midden van de weg, fietsers rechts
      const zij = l.soort === 'mens' ? (l.v > 0 ? 2.4 : -2.4) : l.v > 0 ? 1.2 : -1.2;
      const dx = q.x - p.x;
      const dz = q.y - p.y;
      const len = Math.hypot(dx, dz) || 1;
      l.houder.position.set(p.x - (dz / len) * zij, 0.3 + stapje, p.y + (dx / len) * zij);
      l.houder.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
    }
  }

  /** Waar een inwoner nu op het scherm staat (voor de tekstballon). */
  inwonerOpScherm(persona: string): Punt | undefined {
    const l = this.lopers.find((x) => x.persona === persona);
    if (!l) return undefined;
    const p = l.houder.position;
    return opScherm(this.camera, this.scherm, p.x, p.y + 2.4 * MENS_SCHAAL, p.z);
  }

  // ---------------------------------------------------------------------------------------------
  // Het openingsshot en de foto
  // ---------------------------------------------------------------------------------------------

  /**
   * Het openingsshot: de camera begint laag bij het Stadhuis en draait en vliegt uit naar de hele
   * gemeente, terwijl de gebouwen een voor een uit de grond groeien. Eén keer per bezoek.
   */
  speelIntro(): void {
    if (introGezien || this.o.minderBeweging) return;
    introGezien = true;
    const nu = performance.now();
    const s = this.o.geo.gebouwen.stadhuis;
    const volgorde = [...this.gebouwen].sort(
      (a, b) =>
        Math.hypot(a.plek.x - (s?.x ?? 0), a.plek.y - (s?.y ?? 0)) -
        Math.hypot(b.plek.x - (s?.x ?? 0), b.plek.y - (s?.y ?? 0)),
    );
    volgorde.forEach((t, i) => {
      t.verschijnt = nu + 300 + i * 120;
      t.houder.scale.set(GEBOUW_SCHAAL, 0.001, GEBOUW_SCHAAL);
    });
    if (s) {
      const naar = this.overzichtStand();
      const van: Stand = {
        x: s.x,
        z: s.y,
        afstand: naar.afstand * 0.22,
        kanteling: 1.1,
        draai: -0.9,
      };
      this.zetStand(van);
      this.animatie = { van, naar, begin: nu, duur: 3200, boog: 0 };
      this.inOverzicht = true;
    }
  }

  /** Een foto van de hele gemeente zoals hij nu is (voor de deelafbeelding). */
  foto(breedte = 1000): string | undefined {
    const hoogte = Math.round(breedte * 0.75);
    const oud = { stand: this.stand, scherm: this.scherm, ratio: this.renderer.getPixelRatio() };
    try {
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(breedte, hoogte, false);
      this.scherm = { breedte, hoogte };
      const stand = pasIn(
        this.camera,
        this.scherm,
        { kanteling: KANTELING, draai: 0 },
        this.kader,
        { links: 0, boven: 0, rechts: 0, onder: 0 },
        0.96,
      );
      zetCamera(this.camera, stand, this.scherm);
      this.plaatsNamen();
      this.renderer.render(this.scene, this.camera);
      return this.renderer.domElement.toDataURL('image/png');
    } catch {
      return undefined;
    } finally {
      this.renderer.setPixelRatio(oud.ratio);
      this.scherm = oud.scherm;
      this.renderer.setSize(oud.scherm.breedte, oud.scherm.hoogte, false);
      this.zetStand(oud.stand);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------------------------

  private meet(element: HTMLElement): void {
    const b = Math.max(1, element.clientWidth);
    const h = Math.max(1, element.clientHeight);
    this.scherm = { breedte: b, hoogte: h };
    this.renderer.setSize(b, h, false);
    this.overzichtAfstand = this.overzichtStand().afstand;
    this.gemeenteAfstand = this.overzichtAfstand;
    this.vies = true;
  }

  /**
   * Het overzicht: de hele gemeente zo groot mogelijk in het vrije deel van het scherm. Op een
   * smal, hoog scherm (een telefoon) draait de kaart een stukje, zodat hij beter past.
   */
  private overzichtStand(): Stand {
    const hoog =
      this.scherm.hoogte - this.vak.boven - this.vak.onder >
      (this.scherm.breedte - this.vak.links - this.vak.rechts) * 1.1;
    const draaien = hoog ? [0, -0.35, -0.7, -1.05, 0.35, 0.7] : [0];
    let beste: { stand: Stand; score: number } | undefined;
    for (const draai of draaien) {
      // De gebouwen steken boven de kaart uit: houd daar wat ruimte voor.
      const s = pasIn(
        this.camera,
        this.scherm,
        { kanteling: KANTELING, draai },
        this.kader,
        this.vak,
        0.98,
        30,
        this.omtrek,
      );
      // met het noorden boven heeft een beetje voorrang
      const score = s.afstand * (draai === 0 ? 0.92 : 1);
      if (!beste || score < beste.score) beste = { stand: s, score };
    }
    return beste?.stand ?? this.stand;
  }

  private zetStand(s: Stand): void {
    this.stand = klem(
      s,
      this.kader,
      this.overzichtAfstand / this.o.data.kaart.zoom_max,
      Math.max(this.overzichtAfstand, this.gemeenteAfstand) * 1.2,
    );
    zetCamera(this.camera, this.stand, this.scherm);
    // het schaduwvak: ongeveer wat in beeld is
    const zicht =
      this.stand.afstand *
      Math.tan((BEELDHOEK * Math.PI) / 360) *
      Math.max(1, this.camera.aspect) *
      1.4;
    this.zetZon(this.stand.x, this.stand.z, zicht);
    this.plaatsNamen();
    this.vies = true;
    this.o.onZicht(this.zicht());
  }

  /**
   * De zon volgt de camera: het schaduwvak ligt rond wat je ziet, zodat de schaduwen scherp zijn.
   * De zon staat laag in het zuidwesten.
   */
  private zetZon(x: number, z: number, straal: number): void {
    const r = Math.max(120, straal);
    const richting = new Vector3(-0.48, 0.71, 0.43).normalize();
    const afstand = r * 2 + 200;
    this.zon.target.position.set(x, 0, z);
    this.zon.position.set(x + richting.x * afstand, richting.y * afstand, z + richting.z * afstand);
    const c = this.zon.shadow.camera;
    c.left = -r;
    c.right = r;
    c.top = r;
    c.bottom = -r;
    c.near = afstand - r * 1.6 - 150;
    c.far = afstand + r * 1.6 + 150;
    c.near = Math.max(1, c.near);
    c.updateProjectionMatrix();
    this.zon.target.updateMatrixWorld();
    this.zon.updateMatrixWorld();
  }

  private zicht(): Zicht {
    const c = this.camera;
    const sch = this.scherm;
    const gebouwen: Record<string, SchermPunt> = {};
    const daken: Record<string, SchermPunt> = {};
    const minigames: Record<string, SchermPunt> = {};
    for (const t of this.gebouwen) {
      const dak = (t.gebouw.id === 'stadhuis' ? 21 : Math.min(t.model.hoogte, 26)) * GEBOUW_SCHAAL;
      gebouwen[t.gebouw.id] = opScherm(c, sch, t.plek.x, Math.min(dak * 0.45, 14), t.plek.y);
      daken[t.gebouw.id] = opScherm(c, sch, t.plek.x, dak + 14, t.plek.y);
    }
    for (const b of this.bezienswaardigheden)
      minigames[b.minigame.id] = opScherm(c, sch, b.plek.x, b.hoogte + 4, b.plek.y);
    const a = opScherm(c, sch, this.stand.x, 0, this.stand.z);
    const z = opScherm(c, sch, this.stand.x + 10, 0, this.stand.z);
    const schaal = Math.hypot(z.x - a.x, z.y - a.y) / 10;
    return { schaal, gebouwen, daken, minigames };
  }

  /** De namen onder de gebouwen: aan de kant van de camera, en minder groot als je inzoomt. */
  private plaatsNamen(): void {
    const zoom = this.overzichtAfstand / this.stand.afstand;
    const n = 1 / Math.sqrt(Math.max(1, zoom));
    // grootte in de wereld zodat de letters op het scherm ongeveer gelijk blijven
    const eenheid = TEKST_SCHAAL * n * 1.05;
    const naarCamera = { x: Math.sin(this.stand.draai), z: Math.cos(this.stand.draai) };
    for (const t of this.gebouwen) {
      const r = 24 * GEBOUW_SCHAAL;
      t.naam.sprite.position.set(t.plek.x + naarCamera.x * r, 1, t.plek.y + naarCamera.z * r);
      t.naam.schaal(eenheid);
    }
    const ingezoomd = zoom > 1.3;
    for (const b of this.bezienswaardigheden) {
      const r = (b.minigame.bij ? 6 : 20) * MINIGAME_SCHAAL;
      b.naam.sprite.visible = ingezoomd;
      b.naam.sprite.position.set(b.plek.x + naarCamera.x * r, 1, b.plek.y + naarCamera.z * r);
      b.naam.schaal(eenheid);
    }
  }

  /** Ruimte die panelen en kaartjes innemen (pixels); het overzicht past in de rest. */
  zetRuimte(vak: Partial<Vak>): void {
    const nieuw = { ...this.vak, ...vak };
    if (Object.entries(nieuw).every(([k, v]) => Math.abs((this.vak[k as keyof Vak] ?? 0) - v) < 2))
      return;
    this.vak = nieuw;
    this.overzichtAfstand = this.overzichtStand().afstand;
    if (this.inOverzicht) this.vlieg(this.overzichtStand(), 700);
  }

  private vlieg(naar: Stand, duur = 350, boog = 0): void {
    if (this.o.minderBeweging) this.zetStand(naar);
    else this.animatie = { van: this.stand, naar, begin: performance.now(), duur, boog };
  }

  private naarOverzicht(animeer: boolean): void {
    this.inOverzicht = true;
    const naar = this.overzichtStand();
    if (animeer) this.vlieg(naar, 800);
    else this.zetStand(naar);
  }

  /**
   * Vliegt rustig naar een gebouw, zoals een drone: onderweg even omhoog, dan inzoomen tot `zoom`
   * keer de hele gemeente. Het gebouw komt op `focus` (een deel van het scherm, 0 tot 1), zodat het
   * naast of boven een paneel in beeld blijft.
   */
  vliegNaarGebouw(id: string, zoom: number, focus: Punt): void {
    const p = this.o.geo.gebouwen[id];
    if (!p) return;
    this.inOverzicht = false;
    const basis: Stand = { ...this.stand, afstand: this.overzichtAfstand / zoom };
    const naar = richtOp(
      this.camera,
      this.scherm,
      basis,
      { x: p.x, z: p.y },
      this.scherm.breedte * focus.x,
      this.scherm.hoogte * focus.y,
    );
    zetCamera(this.camera, this.stand, this.scherm);
    const ver =
      Math.hypot(naar.x - this.stand.x, naar.z - this.stand.z) > this.overzichtAfstand * 0.25;
    this.vlieg(naar, ver ? 1200 : 750, ver ? 0.25 : 0);
  }

  /** Terug naar de hele gemeente, rustig. */
  overzicht(): void {
    this.naarOverzicht(true);
  }

  zoom(factor: number): void {
    this.inOverzicht = false;
    this.vlieg({ ...this.stand, afstand: this.stand.afstand / factor });
  }

  herstel(): void {
    this.naarOverzicht(true);
  }

  /** Draait de kaart een achtste slag (of terug naar het noorden boven). */
  draai(hoek: number): void {
    this.inOverzicht = false;
    this.vlieg({ ...this.stand, draai: hoek === 0 ? 0 : this.stand.draai + hoek }, 600);
  }

  /** Wisselt tussen schuin kijken en (bijna) van boven. */
  kantel(): void {
    this.inOverzicht = false;
    this.vlieg({ ...this.stand, kanteling: this.stand.kanteling > 0.6 ? 0.25 : KANTELING }, 600);
  }

  /** Zoomt in op een gebouw (bijvoorbeeld bij focus via het toetsenbord). */
  toonGebouw(id: string): void {
    const p = this.o.geo.gebouwen[id] ?? this.o.geo.minigames[id];
    if (!p) return;
    this.inOverzicht = false;
    const afstand = Math.min(this.stand.afstand, this.overzichtAfstand / 2);
    this.vlieg({ ...this.stand, x: p.x, z: p.y, afstand });
  }

  zetLicht(avond: boolean): void {
    zetAvond(avond);
    this.zon.intensity = avond ? 0.6 : 2.3;
    this.zon.color.setHex(avond ? 0x9fb4ff : 0xfff1dc);
    this.hemel.intensity = avond ? 0.35 : 0.65;
    this.vies = true;
  }

  // ---------------------------------------------------------------------------------------------
  // Elk beeld
  // ---------------------------------------------------------------------------------------------

  private stap(ms: number): void {
    const nu = performance.now();
    if (this.animatie) {
      const { van, naar, duur, boog } = this.animatie;
      const t = Math.min(1, (nu - this.animatie.begin) / duur);
      const e =
        duur > 400
          ? t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2
          : 1 - Math.pow(1 - t, 3);
      this.zetStand(tussen(van, naar, e, boog * (t < 1 ? 1 : 0)));
      if (t >= 1) {
        this.zetStand(naar);
        this.animatie = undefined;
      }
    }
    let bezig = false;
    // gebouwen groeien uit de grond
    for (const t of this.gebouwen) {
      if (t.verschijnt !== undefined) {
        bezig = true;
        const f = (nu - t.verschijnt) / VERSCHIJN_MS;
        if (f <= 0) t.houder.scale.y = 0.001;
        else if (f < 1) {
          const c1 = 1.70158;
          t.houder.scale.y =
            GEBOUW_SCHAAL *
            Math.max(0.001, 1 + (c1 + 1) * Math.pow(f - 1, 3) + c1 * Math.pow(f - 1, 2));
        } else {
          t.houder.scale.y = GEBOUW_SCHAAL;
          t.verschijnt = undefined;
        }
      }
      const v = t.verandering;
      if (v) {
        bezig = true;
        const f = (nu - v.begin) / VERANDER_MS;
        if (f >= 1) {
          for (const d of v.deeltjes) this.scene.remove(d);
          t.houder.scale.setScalar(GEBOUW_SCHAAL);
          t.verandering = undefined;
        } else {
          const s = 1 + 0.12 * Math.sin(Math.PI * Math.min(1, f * 2.2));
          t.houder.scale.set(GEBOUW_SCHAAL * s, GEBOUW_SCHAAL * s, GEBOUW_SCHAAL * s);
          v.deeltjes.forEach((d, i) => {
            const hoek = (i / v.deeltjes.length) * Math.PI * 2 + f * 2;
            const r = (16 + 26 * f) * GEBOUW_SCHAAL;
            d.position.set(
              t.plek.x + Math.cos(hoek) * r,
              (12 + 40 * f) * GEBOUW_SCHAAL,
              t.plek.y + Math.sin(hoek) * r,
            );
            d.scale.setScalar(12 * GEBOUW_SCHAAL);
            (d.material as SpriteMaterial).opacity = Math.max(0, 1 - f);
          });
        }
      }
    }
    // kettinglijnen met rollende munten
    if (this.lijnen.length) {
      bezig = true;
      this.lijnen = this.lijnen.filter((l) => {
        const t = (nu - l.begin) / LIJN_MS;
        if (t >= 1) {
          this.scene.remove(l.mesh, ...l.munten);
          l.mesh.geometry.dispose();
          (l.mesh.material as MeshStandardMaterial).dispose();
          return false;
        }
        const vervaag = t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.25) : 1;
        (l.mesh.material as MeshStandardMaterial).opacity = 0.85 * vervaag;
        l.munten.forEach((m, i) => {
          m.visible = !this.o.minderBeweging && vervaag > 0.05;
          const p = l.weg.getPoint(Math.min(1, (t * 1.6 + i * 0.18) % 1));
          m.position.copy(p);
          m.rotation.y = nu / 200 + i;
        });
        return true;
      });
    }
    const actief = !this.o.minderBeweging && nu < this.actiefTot;
    if (actief && nu - this.laatsteLoop >= 1000 / LOPEN_FPS) {
      const dt = this.laatsteLoop ? Math.min(100, nu - this.laatsteLoop) : ms;
      this.laatsteLoop = nu;
      this.zetLopers(dt);
      for (const w of this.wieken) w.rotation.z -= dt * 0.0012;
      this.vies = true;
    } else if (!actief) this.laatsteLoop = 0;
    if (bezig) this.vies = true;
    if (this.vies) {
      this.renderer.render(this.scene, this.camera);
      this.vies = false;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Invoer
  // ---------------------------------------------------------------------------------------------

  private koppelInvoer(canvas: HTMLCanvasElement): void {
    const pos = (e: PointerEvent | WheelEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const neer = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      this.wijzers.set(e.pointerId, pos(e));
      this.animatie = undefined;
      const draaien = e.pointerType === 'mouse' && (e.button === 2 || e.shiftKey || e.ctrlKey);
      this.begin(this.wijzers.size === 1, e.button, draaien);
    };
    const beweeg = (e: PointerEvent) => {
      if (!this.wijzers.has(e.pointerId) || !this.gebaar) return;
      this.wijzers.set(e.pointerId, pos(e));
      const g = this.gebaar;
      const punten = [...this.wijzers.values()];
      if (punten.length >= 2 && g.punten.length >= 2) {
        const [a, b] = punten as [Punt, Punt];
        const [a0, b0] = g.punten as [Punt, Punt];
        const factor =
          Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, Math.hypot(a0.x - b0.x, a0.y - b0.y));
        const hoek = Math.atan2(b.y - a.y, b.x - a.x) - Math.atan2(b0.y - a0.y, b0.x - a0.x);
        const midden = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        let s: Stand = {
          ...g.stand,
          afstand: g.stand.afstand / factor,
          draai: g.stand.draai - hoek,
        };
        if (g.grond) s = richtOp(this.camera, this.scherm, s, g.grond, midden.x, midden.y);
        this.inOverzicht = false;
        this.zetStand(s);
        g.bewogen = true;
      } else if (punten.length === 1) {
        const p = punten[0] as Punt;
        const p0 = g.punten[0] as Punt;
        const dx = p.x - p0.x;
        const dy = p.y - p0.y;
        if (Math.hypot(dx, dy) > 6) g.bewogen = true;
        if (!g.bewogen) return;
        this.inOverzicht = false;
        if (g.draaien) {
          this.zetStand({
            ...g.stand,
            draai: g.stand.draai - dx * 0.006,
            kanteling: g.stand.kanteling - dy * 0.004,
          });
          return;
        }
        // slepen: het punt onder de vinger blijft onder de vinger
        zetCamera(this.camera, g.stand, this.scherm);
        const onder = opGrond(this.camera, this.scherm, p.x, p.y);
        if (g.grond && onder)
          this.zetStand({
            ...g.stand,
            x: g.stand.x + g.grond.x - onder.x,
            z: g.stand.z + g.grond.z - onder.z,
          });
      }
    };
    const op = (e: PointerEvent) => {
      const waren = this.wijzers.size;
      const p = pos(e);
      this.wijzers.delete(e.pointerId);
      const g = this.gebaar;
      if (waren === 1 && g && !g.bewogen && g.knop === 0 && performance.now() - g.begin < 400)
        this.tik(p);
      this.begin(false, 0, false);
    };
    const wiel = (e: WheelEvent) => {
      e.preventDefault();
      const p = pos(e);
      this.animatie = undefined;
      this.inOverzicht = false;
      const grond = opGrond(this.camera, this.scherm, p.x, p.y);
      let s: Stand = { ...this.stand, afstand: this.stand.afstand * Math.exp(e.deltaY * 0.0015) };
      if (grond) s = richtOp(this.camera, this.scherm, s, grond, p.x, p.y);
      this.zetStand(s);
    };
    const menu = (e: Event) => e.preventDefault();
    canvas.addEventListener('pointerdown', neer);
    canvas.addEventListener('pointermove', beweeg);
    canvas.addEventListener('pointerup', op);
    canvas.addEventListener('pointercancel', op);
    canvas.addEventListener('wheel', wiel, { passive: false });
    canvas.addEventListener('contextmenu', menu);
    this.opgeruimd.push(() => {
      canvas.removeEventListener('pointerdown', neer);
      canvas.removeEventListener('pointermove', beweeg);
      canvas.removeEventListener('pointerup', op);
      canvas.removeEventListener('pointercancel', op);
      canvas.removeEventListener('wheel', wiel);
      canvas.removeEventListener('contextmenu', menu);
    });
  }

  /** Begint (opnieuw) een gebaar vanaf de vingers die nu op het scherm staan. */
  private begin(nieuweTik: boolean, knop: number, draaien: boolean): void {
    const punten = [...this.wijzers.values()];
    const [a, b] = punten as [Punt | undefined, Punt | undefined];
    if (!a) {
      this.gebaar = undefined;
      return;
    }
    const midden = b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a;
    zetCamera(this.camera, this.stand, this.scherm);
    this.gebaar = {
      stand: this.stand,
      punten: punten.map((p) => ({ ...p })),
      grond: opGrond(this.camera, this.scherm, midden.x, midden.y),
      begin: performance.now(),
      bewogen: !nieuweTik || punten.length > 1,
      knop,
      draaien,
    };
  }

  private tik(p: Punt): void {
    const z = this.zicht();
    const straal = Math.max(30, z.schaal * 30);
    let beste: { id: string; d: number } | undefined;
    for (const [id, q] of Object.entries(z.gebouwen)) {
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < straal && (!beste || d < beste.d)) beste = { id, d };
    }
    let besteSpel: { id: string; d: number } | undefined;
    for (const b of this.bezienswaardigheden) {
      const label = z.minigames[b.minigame.id];
      const voet = opScherm(this.camera, this.scherm, b.plek.x, b.hoogte * 0.35, b.plek.y);
      const d = Math.min(
        Math.hypot(voet.x - p.x, voet.y - p.y),
        label ? Math.hypot(label.x - p.x, label.y - 14 - p.y) * 1.2 : Infinity,
      );
      if (d < straal * 0.85 && (!besteSpel || d < besteSpel.d))
        besteSpel = { id: b.minigame.id, d };
    }
    const nu = performance.now();
    if (besteSpel && (!beste || besteSpel.d < beste.d)) {
      this.laatsteTik = 0;
      this.o.onTikMinigame(besteSpel.id);
      return;
    }
    if (beste) {
      this.laatsteTik = 0;
      this.o.onTik(beste.id);
      return;
    }
    if (nu - this.laatsteTik < 350) {
      // dubbeltik: inzoomen op het gebied
      this.laatsteTik = 0;
      const g = opGrond(this.camera, this.scherm, p.x, p.y);
      const buurt = g ? buurtOp(this.o.geo, { x: g.x, y: g.z }) : undefined;
      const k = buurt ? gebiedKader(this.o.geo, buurt.gebied) : undefined;
      if (k) {
        this.inOverzicht = false;
        this.vlieg(
          pasIn(
            this.camera,
            this.scherm,
            this.stand,
            { minX: k.x, maxX: k.x + k.b, minZ: k.y, maxZ: k.y + k.h },
            this.vak,
            0.85,
          ),
        );
        zetCamera(this.camera, this.stand, this.scherm);
      }
      return;
    }
    this.laatsteTik = nu;
  }

  /**
   * Een kettingeffect: een boog tussen twee gebouwen waar munten overheen rollen, groen voor
   * voordeel en rood voor nadeel. Verdwijnt na een paar seconden.
   */
  toonLijn(van: string, naar: string, positief: boolean): void {
    const a = this.o.geo.gebouwen[van];
    const b = this.o.geo.gebouwen[naar];
    if (!a || !b) return;
    const lengte = Math.hypot(b.x - a.x, b.y - a.y);
    const weg = new QuadraticBezierCurve3(
      new Vector3(a.x, 20, a.y),
      new Vector3((a.x + b.x) / 2, 20 + lengte * 0.35, (a.y + b.y) / 2),
      new Vector3(b.x, 20, b.y),
    );
    const kleur = positief ? this.o.kleuren.positief : this.o.kleuren.negatief;
    const mesh = new Mesh(
      new TubeGeometry(weg, 48, 1.6, 8, false),
      new MeshStandardMaterial({
        color: kleur,
        emissive: kleur,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.85,
      }),
    );
    const munt = new CylinderGeometry(3.2, 3.2, 0.8, 18);
    munt.rotateX(Math.PI / 2);
    const munten = Array.from({ length: 4 }, () => {
      const m = new Mesh(munt, materiaal('metaal', 0xffd23f));
      this.scene.add(m);
      return m;
    });
    this.scene.add(mesh);
    this.lijnen.push({ mesh, munten, weg, begin: performance.now() });
    this.vies = true;
  }

  vernietig(): void {
    for (const f of this.opgeruimd) f();
    for (const t of this.gebouwen) t.naam.vernietig();
    for (const b of this.bezienswaardigheden) b.naam.vernietig();
    verwijder(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function verwijder(o: { traverse: (f: (x: unknown) => void) => void }): void {
  o.traverse((x) => {
    const m = x as Mesh;
    if (m.isMesh) m.geometry.dispose();
  });
}

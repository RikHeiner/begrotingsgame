/**
 * De gemeentekaart op een canvas (Canvas 2D): buurten, gebieden, water, wegen, gebouwen en lopende
 * inwoners. Knijpen en slepen om te zoomen en te verschuiven (met grenzen), dubbeltik zoomt in op
 * een gebied. De interface (panelen, knoppen, tekstballonnen) zit in React over de kaart heen.
 *
 * De vaste laag en de gebouwen zijn kant-en-klare afbeeldingen (vasteLaag.ts, gebouwTekening.ts).
 * Een beeld tekenen is dus vooral een paar keer drawImage. De kaart tekent alleen als er iets
 * verandert; inwoners lopen na een actie van de speler een halve minuut mee.
 */
import type { Data } from '../../engine';
import { formatMln } from '../../engine/format';
import type { Gebouw, Minigame } from '../../engine/schema';
import type { GebouwStand } from '../toestand';
import {
  klem,
  naarKader,
  naarScherm,
  naarWereld,
  pas,
  zoomOm,
  type Camera,
  type Maat,
} from './camera';
import { CanvasTekenaar } from './canvasTekenaar';
import {
  GEBOUW_H,
  GEBOUW_KADER,
  GEBOUW_SCHAAL,
  tekenBezienswaardigheid,
  tekenGebouw,
  type TekenOpties,
} from './gebouwTekening';
import { buurtOp, gebiedKader, opWeg, type KaartGeometrie, type Weg } from './geometrie';
import type { Punt } from './projectie';
import { RAND, tekenVasteLaag } from './vasteLaag';

export type KaartKleuren = {
  gebieden: number[];
  zijkant: number;
  /** de namen van de bekende gebouwen met een minigame */
  minigame: number;
  buurtlijn: number;
  gebiedslijn: number;
  rand: number;
  water: number;
  weg: number;
  wegstreep: number;
  label: number;
  labelRand: number;
  positief: number;
  negatief: number;
};

export const LICHT: KaartKleuren = {
  gebieden: [0xa9db8a, 0x98d077, 0xb4e09b, 0x8fcb6d, 0xa2d684, 0xbce5a6, 0x9cd27d],
  zijkant: 0x7a5c3e,
  minigame: 0xb34700,
  buurtlijn: 0xffffff,
  gebiedslijn: 0x2e6b2e,
  rand: 0x1233c4,
  water: 0x4a9fd8,
  weg: 0xf3e9d2,
  wegstreep: 0xc9b98f,
  label: 0x15193a,
  labelRand: 0xffffff,
  positief: 0x15875a,
  negatief: 0xc4321e,
};

export const DONKER: KaartKleuren = {
  gebieden: [0x3f6b3a, 0x375f33, 0x46753f, 0x33592f, 0x3d6838, 0x4a7a43, 0x396335],
  zijkant: 0x3b2d20,
  minigame: 0xffb07a,
  buurtlijn: 0x9ec79a,
  gebiedslijn: 0xd7f5c9,
  rand: 0x8fa2ff,
  water: 0x2f6f9e,
  weg: 0x5b5446,
  wegstreep: 0x8b7f63,
  label: 0xf2f4ff,
  labelRand: 0x11142b,
  positief: 0x4fd19a,
  negatief: 0xff8a75,
};

const KLEUR_INWONER = [
  0xff6a00, 0x1233c4, 0x3e8e41, 0xd2465e, 0x7a3dc8, 0xc98a00, 0x1d86c8, 0x15193a,
];
const HUID = [0xf2c29b, 0x8d5a3b, 0xe8b48a, 0xc68642, 0xf5d0b0, 0x6b4226, 0xe8b48a, 0x8d5a3b];
const TIK_STRAAL = 34;
/** Gebouwen en poppetjes zijn groter dan op schaal, zodat ze op een telefoon goed te zien zijn. */
const INWONER_SCHAAL = 1.6;
const MAX_TEXTUUR = 4096;
/** Pixels per wereldeenheid in de afbeelding van een gebouw: scherp tot ver ingezoomd. */
const GEBOUW_RESOLUTIE = 4;
/** Wandelende inwoners hoeven niet vloeiender dan dit. */
const WANDEL_FPS = 30;
/** Zo lang lopen de inwoners na de laatste actie van de speler. */
const ACTIEF_MS = 30_000;
const LETTER = 'Asap, system-ui, sans-serif';

export type KaartOpties = {
  data: Data;
  geo: KaartGeometrie;
  kleuren: KaartKleuren;
  minderBeweging: boolean;
  onTik: (gebouwId: string) => void;
  /** een tik op een bekend gebouw met een minigame */
  onTikMinigame: (minigameId: string) => void;
  onCamera: (c: Camera) => void;
};

/** De bekende gebouwen met een minigame zijn iets kleiner dan de gebouwen van de begroting. */
const MINIGAME_SCHAAL = GEBOUW_SCHAAL * 0.68;

type Wandelaar = {
  persona: string;
  weg: Weg;
  t: number;
  v: number;
  x: number;
  y: number;
  richting: 1 | -1;
  huid: number;
  kleur: number;
};

type GetekendGebouw = {
  gebouw: Gebouw;
  plek: Punt;
  beeld: HTMLCanvasElement;
  bedrag: string;
  bedragKleur: number;
};

type Bezienswaardigheid = { minigame: Minigame; plek: Punt; beeld: HTMLCanvasElement };

type Lijn = { weg: Weg; kleur: number; begin: number };

const css = (kleur: number) => `#${kleur.toString(16).padStart(6, '0')}`;

function gebouwBeeld(g: Gebouw, opties: TekenOpties): HTMLCanvasElement {
  const k = GEBOUW_KADER;
  const canvas = document.createElement('canvas');
  canvas.width = (k.links + k.rechts) * GEBOUW_RESOLUTIE;
  canvas.height = (k.boven + k.onder) * GEBOUW_RESOLUTIE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.setTransform(
      GEBOUW_RESOLUTIE,
      0,
      0,
      GEBOUW_RESOLUTIE,
      k.links * GEBOUW_RESOLUTIE,
      k.boven * GEBOUW_RESOLUTIE,
    );
    tekenGebouw(new CanvasTekenaar(ctx), g, opties);
  }
  return canvas;
}

function bezienswaardigheidBeeld(m: Minigame): HTMLCanvasElement {
  const k = GEBOUW_KADER;
  const canvas = document.createElement('canvas');
  canvas.width = (k.links + k.rechts) * GEBOUW_RESOLUTIE;
  canvas.height = (k.boven + k.onder) * GEBOUW_RESOLUTIE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.setTransform(
      GEBOUW_RESOLUTIE,
      0,
      0,
      GEBOUW_RESOLUTIE,
      k.links * GEBOUW_RESOLUTIE,
      k.boven * GEBOUW_RESOLUTIE,
    );
    tekenBezienswaardigheid(new CanvasTekenaar(ctx), m.vorm);
  }
  return canvas;
}

export class GemeenteKaart {
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);
  private camera: Camera = { x: 0, y: 0, schaal: 1 };
  private scherm: Maat = { breedte: 1, hoogte: 1 };
  /** gebouwen van boven naar beneden, zodat ze netjes overlappen */
  private gebouwen: GetekendGebouw[] = [];
  private bezienswaardigheden: Bezienswaardigheid[] = [];
  /** minigames op een gebouw (zonder eigen tekening): alleen hun naam */
  private namenBij: { minigame: Minigame; plek: Punt }[] = [];
  private wandelaars: Wandelaar[] = [];
  private lijnen: Lijn[] = [];
  private wijzers = new Map<number, { x: number; y: number }>();
  private sleep?: {
    x: number;
    y: number;
    camera: Camera;
    afstand?: number;
    midden?: Punt;
    begin: number;
    bewogen: boolean;
  };
  private laatsteTik = 0;
  private animatie?: {
    van: Camera;
    naar: Camera;
    begin: number;
    /** duur in ms */
    duur: number;
    /** een vlucht: onderweg even uitzoomen, zoals een drone (alleen bij een grote afstand) */
    boog: boolean;
  };
  private opgeruimd: (() => void)[] = [];
  /** vaste lagen (buurten, water, wegen, namen) als één afbeelding */
  private vast?: HTMLCanvasElement;
  private vastResolutie = 0;
  private laatsteCamera = 0;
  /** is er iets veranderd sinds het laatste beeld (de kaart tekent alleen als dat nodig is) */
  private vies = true;
  private laatsteBeeld = 0;
  /** tot wanneer de inwoners lopen: na een actie van de speler 30 seconden (batterij, opdracht 8.7) */
  private actiefTot = 0;
  private frame = 0;
  private vorigeTik = 0;

  private constructor(private o: KaartOpties) {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas wordt niet ondersteund.');
    this.ctx = ctx;
  }

  static async maak(element: HTMLElement, o: KaartOpties): Promise<GemeenteKaart> {
    const k = new GemeenteKaart(o);
    // De namen op de kaart gebruiken Asap; wacht kort op de letter, anders tekent canvas een andere.
    await Promise.race([
      document.fonts?.load(`700 24px ${LETTER}`).catch(() => undefined),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
    const c = k.canvas;
    c.setAttribute('aria-hidden', 'true');
    c.style.touchAction = 'none';
    c.style.width = '100%';
    c.style.height = '100%';
    element.appendChild(c);
    k.maakGebouwen();
    k.maakWandelaars();
    k.koppelInvoer(c);
    k.meet(element);
    k.pasAan(true);
    k.werkTextuurBij(true);

    const wakker = () => {
      k.actiefTot = performance.now() + ACTIEF_MS;
    };
    for (const soort of ['pointerdown', 'keydown', 'wheel'] as const) {
      window.addEventListener(soort, wakker, { passive: true });
      k.opgeruimd.push(() => window.removeEventListener(soort, wakker));
    }
    const waarnemer = new ResizeObserver(() => {
      k.meet(element);
      k.pasAan(false);
    });
    waarnemer.observe(element);
    k.opgeruimd.push(() => waarnemer.disconnect());

    const lus = (tijd: number) => {
      const ms = k.vorigeTik ? tijd - k.vorigeTik : 0;
      k.vorigeTik = tijd;
      k.stap(ms);
      k.frame = requestAnimationFrame(lus);
    };
    k.frame = requestAnimationFrame(lus);
    k.opgeruimd.push(() => cancelAnimationFrame(k.frame));
    return k;
  }

  private meet(element: HTMLElement): void {
    const b = Math.max(1, element.clientWidth);
    const h = Math.max(1, element.clientHeight);
    this.canvas.width = Math.round(b * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.scherm = { breedte: b, hoogte: h };
    this.vies = true;
  }

  // ---------------------------------------------------------------------------------------------
  // Tekenen
  // ---------------------------------------------------------------------------------------------

  private maakGebouwen(): void {
    const { geo, data, kleuren } = this.o;
    // Een spel "bij" een gebouw (de Martinitoren bij het Stadhuis) heeft geen eigen tekening.
    this.bezienswaardigheden = data.minigames.flatMap((m) => {
      const plek = geo.minigames[m.id];
      return plek && !m.bij ? [{ minigame: m, plek, beeld: bezienswaardigheidBeeld(m) }] : [];
    });
    this.namenBij = data.minigames.flatMap((m) => {
      const plek = geo.minigames[m.id];
      return plek && m.bij ? [{ minigame: m, plek }] : [];
    });
    this.gebouwen = [...data.gebouwen]
      .sort((a, b) => (geo.gebouwen[a.id]?.y ?? 0) - (geo.gebouwen[b.id]?.y ?? 0))
      .flatMap((g) => {
        const plek = geo.gebouwen[g.id];
        return plek
          ? [
              {
                gebouw: g,
                plek,
                beeld: gebouwBeeld(g, { toestand: 'normaal' }),
                bedrag: '',
                bedragKleur: kleuren.label,
              },
            ]
          : [];
      });
  }

  /** Werkt de gebouwen bij na een keuze van de speler. */
  zetStanden(standen: Record<string, GebouwStand>, zwembadLeeg: boolean): void {
    for (const t of this.gebouwen) {
      const stand = standen[t.gebouw.id];
      if (!stand) continue;
      t.beeld = gebouwBeeld(t.gebouw, {
        toestand: stand.toestand,
        zwembadLeeg: t.gebouw.id === 'zwembad' && zwembadLeeg,
      });
      t.bedrag = Math.abs(stand.bedrag) < 50_000 ? '' : formatMln(stand.bedrag, { teken: true });
      t.bedragKleur = stand.bedrag >= 0 ? this.o.kleuren.positief : this.o.kleuren.negatief;
    }
    this.vies = true;
  }

  private tekst(tekst: string, x: number, y: number, grootte: number, kleur: number): void {
    const ctx = this.ctx;
    ctx.font = `700 ${grootte}px ${LETTER}`;
    ctx.lineWidth = (3 * grootte) / 10;
    ctx.strokeStyle = css(this.o.kleuren.labelRand);
    ctx.strokeText(tekst, x, y);
    ctx.fillStyle = css(kleur);
    ctx.fillText(tekst, x, y);
  }

  /** Tekent één beeld: vaste laag, gebouwen, namen, inwoners en kettinglijnen. */
  private teken(): void {
    const { ctx, camera: c, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr * c.schaal, 0, 0, dpr * c.schaal, dpr * c.x, dpr * c.y);
    ctx.imageSmoothingEnabled = true;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (this.vast) {
      ctx.drawImage(
        this.vast,
        -RAND,
        -RAND,
        this.vast.width / this.vastResolutie,
        this.vast.height / this.vastResolutie,
      );
    }

    const k = GEBOUW_KADER;
    const G = GEBOUW_SCHAAL;
    // Van achter naar voor, zodat een gebouw vooraan over een gebouw erachter valt (2,5D). De
    // bekende gebouwen met een minigame staan ertussen, iets kleiner.
    const alles = [
      ...this.gebouwen.map((t) => ({ y: t.plek.y, t, m: undefined })),
      ...this.bezienswaardigheden.map((m) => ({ y: m.plek.y, t: undefined, m })),
    ].sort((a, b) => a.y - b.y);
    for (const { t, m } of alles) {
      if (m) {
        const M = MINIGAME_SCHAAL;
        ctx.drawImage(
          m.beeld,
          m.plek.x - k.links * M,
          m.plek.y - k.boven * M,
          (k.links + k.rechts) * M,
          (k.boven + k.onder) * M,
        );
        continue;
      }
      if (!t) continue;
      ctx.drawImage(
        t.beeld,
        t.plek.x - k.links * G,
        t.plek.y - k.boven * G,
        (k.links + k.rechts) * G,
        (k.boven + k.onder) * G,
      );
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${13 * G}px system-ui, sans-serif`;
      ctx.fillText(t.gebouw.icoon, t.plek.x, t.plek.y + (-GEBOUW_H / 2 - 3) * G);
    }
    ctx.textBaseline = 'top';
    // Namen groeien minder hard mee met de zoom, anders worden ze ingezoomd veel te groot.
    const n = 1 / Math.sqrt(Math.max(1, c.schaal / pas(this.wereldMaat(), this.scherm).schaal));
    for (const t of this.gebouwen) {
      this.tekst(
        t.gebouw.naam,
        t.plek.x,
        t.plek.y + (GEBOUW_H / 2 + 6) * G,
        10 * G * n,
        this.o.kleuren.label,
      );
      if (t.bedrag)
        this.tekst(
          t.bedrag,
          t.plek.x,
          t.plek.y + (GEBOUW_H / 2 + 6 + 11 * n) * G,
          8 * G * n,
          t.bedragKleur,
        );
    }

    // De namen van de bekende gebouwen pas als je inzoomt; van ver zie je alleen het icoon.
    const ingezoomd = c.schaal > pas(this.wereldMaat(), this.scherm).schaal * 1.3;
    for (const m of [...this.bezienswaardigheden, ...this.namenBij]) {
      this.tekst(
        ingezoomd ? `${m.minigame.icoon} ${m.minigame.naam}` : m.minigame.icoon,
        m.plek.x,
        m.plek.y + (GEBOUW_H / 2 + 5) * MINIGAME_SCHAAL,
        8.5 * G * n,
        this.o.kleuren.minigame,
      );
    }

    for (const w of this.wandelaars) {
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.scale(w.richting * INWONER_SCHAAL, INWONER_SCHAAL);
      new CanvasTekenaar(ctx)
        .circle(0, -9, 3.2)
        .fill(w.huid)
        .roundRect(-3.2, -6, 6.4, 7, 2)
        .fill(w.kleur)
        .rect(-2.6, 1, 1.8, 4)
        .rect(0.8, 1, 1.8, 4)
        .fill(0x15193a);
      ctx.restore();
    }

    const nu = performance.now();
    for (const l of this.lijnen) {
      const t = (nu - l.begin) / LIJN_MS;
      const vervaag = t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.25) : 1;
      const { van: a, ctrl, naar: b } = l.weg;
      ctx.globalAlpha = 0.85 * vervaag;
      ctx.strokeStyle = css(l.kleur);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = vervaag;
      if (!this.o.minderBeweging) {
        for (let i = 0; i < 4; i++) {
          const q = opWeg(l.weg, Math.min(1, (t * 1.6 + i * 0.18) % 1));
          new CanvasTekenaar(ctx)
            .circle(q.x, q.y, 6)
            .fill(0xffd23f)
            .stroke({ width: 2, color: l.kleur });
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Inwoners die over de wegen lopen
  // ---------------------------------------------------------------------------------------------

  private maakWandelaars(): void {
    const { geo, data } = this.o;
    data.personas.personas.forEach((p, i) => {
      // Elke inwoner loopt over de weg naar het gebouw in de eigen buurt, anders in het eigen gebied.
      const eigen =
        data.gebouwen.find((g) => g.buurt === p.buurt && g.id !== 'stadhuis') ??
        data.gebouwen.find((g) => g.gebied === p.gebied && g.id !== 'stadhuis');
      const weg = geo.wegen.find((w) => w.gebouw === eigen?.id) ?? geo.wegen[i % geo.wegen.length];
      if (!weg) return;
      this.wandelaars.push({
        persona: p.id,
        weg,
        t: 0.15 + ((i * 0.37) % 0.7),
        v: (0.025 + (i % 3) * 0.01) * (i % 2 ? 1 : -1),
        x: 0,
        y: 0,
        richting: 1,
        huid: HUID[i % HUID.length] ?? 0xf2c29b,
        kleur: KLEUR_INWONER[i % KLEUR_INWONER.length] ?? 0xff6a00,
      });
    });
    this.zetWandelaars(0);
  }

  private zetWandelaars(ms: number): void {
    for (const w of this.wandelaars) {
      if (ms > 0) {
        w.t += (w.v * ms) / 1000;
        if (w.t > 0.97 || w.t < 0.03) {
          w.v = -w.v;
          w.t = Math.min(0.97, Math.max(0.03, w.t));
        }
      }
      const q = opWeg(w.weg, w.t);
      const stapje = ms > 0 ? Math.abs(Math.sin(w.t * 120)) * 0.8 : 0;
      if (ms > 0) w.richting = q.x < w.x ? -1 : 1;
      w.x = q.x;
      w.y = q.y - stapje;
    }
  }

  /** Waar een inwoner nu op het scherm staat (voor de tekstballon). */
  inwonerOpScherm(persona: string): Punt | undefined {
    const w = this.wandelaars.find((x) => x.persona === persona);
    if (!w) return undefined;
    return naarScherm(this.camera, w.x, w.y - 14 * INWONER_SCHAAL);
  }

  // ---------------------------------------------------------------------------------------------
  // Camera en invoer
  // ---------------------------------------------------------------------------------------------

  private wereldMaat(): Maat {
    return { breedte: this.o.geo.breedte, hoogte: this.o.geo.hoogte };
  }

  private zetCamera(c: Camera): void {
    this.camera = klem(c, this.wereldMaat(), this.scherm, this.o.data.kaart.zoom_max);
    this.laatsteCamera = performance.now();
    this.vies = true;
    this.o.onCamera(this.camera);
  }

  /**
   * Tekent de vaste laag opnieuw als de zoom flink is veranderd, zodat het beeld scherp blijft.
   */
  private werkTextuurBij(nu = false): void {
    if (!nu && (performance.now() - this.laatsteCamera < 200 || this.animatie || this.wijzers.size))
      return;
    const max = MAX_TEXTUUR / Math.max(this.o.geo.breedte, this.o.geo.hoogte);
    const gewenst = Math.min(max, Math.max(0.5, this.camera.schaal * this.dpr));
    const resolutie = Math.min(max, Math.pow(1.5, Math.ceil(Math.log(gewenst) / Math.log(1.5))));
    if (Math.abs(resolutie - this.vastResolutie) < 1e-6) return;
    const canvas = document.createElement('canvas');
    tekenVasteLaag(canvas, this.o.geo, this.o.data, this.o.kleuren, resolutie);
    this.vast = canvas;
    this.vastResolutie = resolutie;
    this.vies = true;
  }

  private pasAan(opnieuw: boolean): void {
    const vorig = this.laatsteScherm;
    this.laatsteScherm = this.scherm;
    if (opnieuw || vorig.breedte <= 1) {
      this.zetCamera(pas(this.wereldMaat(), this.scherm));
    } else {
      // Houd het midden van het beeld op dezelfde plek.
      const midden = naarWereld(this.camera, vorig.breedte / 2, vorig.hoogte / 2);
      this.zetCamera({
        schaal: this.camera.schaal,
        x: this.scherm.breedte / 2 - midden.x * this.camera.schaal,
        y: this.scherm.hoogte / 2 - midden.y * this.camera.schaal,
      });
    }
  }
  private laatsteScherm: Maat = { breedte: 1, hoogte: 1 };

  private vlieg(naar: Camera, duur = 350, boog = false): void {
    if (this.o.minderBeweging) this.zetCamera(naar);
    else this.animatie = { van: this.camera, naar, begin: performance.now(), duur, boog };
  }

  /**
   * Vliegt rustig naar een gebouw, zoals een drone: onderweg even uitzoomen, dan inzoomen tot
   * `zoom` keer de hele gemeente. Het gebouw komt op `focus` (een deel van het scherm, 0 tot 1),
   * zodat het naast of boven een paneel in beeld blijft.
   */
  vliegNaarGebouw(id: string, zoom: number, focus: Punt): void {
    const p = this.o.geo.gebouwen[id];
    if (!p) return;
    const schaal = pas(this.wereldMaat(), this.scherm).schaal * zoom;
    const naar = {
      schaal,
      x: this.scherm.breedte * focus.x - p.x * schaal,
      y: this.scherm.hoogte * focus.y - p.y * schaal,
    };
    const ver =
      Math.hypot(naar.x - this.camera.x, naar.y - this.camera.y) > this.scherm.breedte / 3;
    this.vlieg(naar, ver ? 1100 : 700, ver);
  }

  /** Terug naar de hele gemeente, rustig. */
  overzicht(): void {
    this.vlieg(pas(this.wereldMaat(), this.scherm), 800);
  }

  zoom(factor: number): void {
    this.vlieg(zoomOm(this.camera, factor, this.scherm.breedte / 2, this.scherm.hoogte / 2));
  }

  herstel(): void {
    this.vlieg(pas(this.wereldMaat(), this.scherm));
  }

  /** Zoomt in op een gebouw (bijvoorbeeld bij focus via het toetsenbord). */
  toonGebouw(id: string): void {
    const p = this.o.geo.gebouwen[id] ?? this.o.geo.minigames[id];
    if (!p) return;
    const schaal = Math.max(this.camera.schaal, pas(this.wereldMaat(), this.scherm).schaal * 2);
    this.vlieg({
      schaal,
      x: this.scherm.breedte / 2 - p.x * schaal,
      y: this.scherm.hoogte / 2 - p.y * schaal,
    });
  }

  private stap(ms: number): void {
    if (this.animatie) {
      const { van, naar, duur, boog } = this.animatie;
      const t = Math.min(1, (performance.now() - this.animatie.begin) / duur);
      // Kort: snel en dan rustig (ease-out). Lang: rustig op gang en rustig landen (ease-in-out).
      const e =
        duur > 400
          ? t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2
          : 1 - Math.pow(1 - t, 3);
      // Het midden van het beeld schuift in een rechte lijn over de wereld; de zoom maakt een boog.
      const m = this.scherm;
      const midVan = naarWereld(van, m.breedte / 2, m.hoogte / 2);
      const midNaar = naarWereld(naar, m.breedte / 2, m.hoogte / 2);
      const mid = {
        x: midVan.x + (midNaar.x - midVan.x) * e,
        y: midVan.y + (midNaar.y - midVan.y) * e,
      };
      const schaal =
        (van.schaal + (naar.schaal - van.schaal) * e) *
        (boog ? 1 - 0.3 * Math.sin(Math.PI * t) : 1);
      this.zetCamera({
        schaal,
        x: m.breedte / 2 - mid.x * schaal,
        y: m.hoogte / 2 - mid.y * schaal,
      });
      if (t >= 1) {
        this.zetCamera(naar);
        this.animatie = undefined;
      }
    }
    const nu = performance.now();
    const wandelen = !this.o.minderBeweging && this.wandelaars.length > 0 && nu < this.actiefTot;
    if (wandelen) this.zetWandelaars(Math.min(ms, 100));
    if (this.lijnen.length) {
      this.lijnen = this.lijnen.filter((l) => nu - l.begin < LIJN_MS);
      this.vies = true;
    }
    this.werkTextuurBij();
    if (this.vies || (wandelen && nu - this.laatsteBeeld >= 1000 / WANDEL_FPS)) {
      this.teken();
      this.vies = false;
      this.laatsteBeeld = nu;
    }
  }

  private koppelInvoer(canvas: HTMLCanvasElement): void {
    const pos = (e: PointerEvent | WheelEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const neer = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      this.wijzers.set(e.pointerId, pos(e));
      this.animatie = undefined;
      this.begin(this.wijzers.size === 1);
    };
    const beweeg = (e: PointerEvent) => {
      if (!this.wijzers.has(e.pointerId) || !this.sleep) return;
      this.wijzers.set(e.pointerId, pos(e));
      const punten = [...this.wijzers.values()];
      const s = this.sleep;
      if (punten.length >= 2 && s.afstand && s.midden) {
        const [a, b] = punten as [Punt, Punt];
        const afstand = Math.hypot(a.x - b.x, a.y - b.y);
        const midden = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const factor = afstand / s.afstand;
        const gezoomd = zoomOm(s.camera, factor, s.midden.x, s.midden.y);
        this.zetCamera({
          ...gezoomd,
          x: gezoomd.x + midden.x - s.midden.x,
          y: gezoomd.y + midden.y - s.midden.y,
        });
        s.bewogen = true;
      } else if (punten.length === 1) {
        const p = punten[0] as Punt;
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        if (Math.hypot(dx, dy) > 6) s.bewogen = true;
        if (s.bewogen) this.zetCamera({ ...s.camera, x: s.camera.x + dx, y: s.camera.y + dy });
      }
    };
    const op = (e: PointerEvent) => {
      const waren = this.wijzers.size;
      const p = pos(e);
      this.wijzers.delete(e.pointerId);
      const s = this.sleep;
      if (waren === 1 && s && !s.bewogen && performance.now() - s.begin < 400) this.tik(p);
      this.begin(false);
    };
    const wiel = (e: WheelEvent) => {
      e.preventDefault();
      const p = pos(e);
      this.animatie = undefined;
      this.zetCamera(zoomOm(this.camera, Math.exp(-e.deltaY * 0.0015), p.x, p.y));
    };
    canvas.addEventListener('pointerdown', neer);
    canvas.addEventListener('pointermove', beweeg);
    canvas.addEventListener('pointerup', op);
    canvas.addEventListener('pointercancel', op);
    canvas.addEventListener('wheel', wiel, { passive: false });
    this.opgeruimd.push(() => {
      canvas.removeEventListener('pointerdown', neer);
      canvas.removeEventListener('pointermove', beweeg);
      canvas.removeEventListener('pointerup', op);
      canvas.removeEventListener('pointercancel', op);
      canvas.removeEventListener('wheel', wiel);
    });
  }

  /**
   * Begint (opnieuw) een beweging vanaf de wijzers die nu op het scherm staan: één vinger is slepen,
   * twee vingers is knijpen. Een beweging die niet met één nieuwe vinger begint, telt niet als tik.
   */
  private begin(nieuweTik: boolean): void {
    const punten = [...this.wijzers.values()];
    const [a, b] = punten as [Punt | undefined, Punt | undefined];
    if (!a) {
      this.sleep = undefined;
      return;
    }
    this.sleep = {
      x: a.x,
      y: a.y,
      camera: this.camera,
      begin: performance.now(),
      bewogen: !nieuweTik || punten.length > 1,
      ...(b
        ? {
            afstand: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
            midden: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          }
        : {}),
    };
  }

  private tik(scherm: Punt): void {
    const w = naarWereld(this.camera, scherm.x, scherm.y);
    const straal =
      (TIK_STRAAL * GEBOUW_SCHAAL) /
        Math.max(1, this.camera.schaal / pas(this.wereldMaat(), this.scherm).schaal) +
      10;
    let beste: { id: string; d: number } | undefined;
    for (const [id, p] of Object.entries(this.o.geo.gebouwen)) {
      const d = Math.hypot(p.x - w.x, p.y + 4 * GEBOUW_SCHAAL - w.y);
      if (d < straal && (!beste || d < beste.d)) beste = { id, d };
    }
    let besteMinigame: { id: string; d: number } | undefined;
    for (const [id, p] of Object.entries(this.o.geo.minigames)) {
      const d = Math.hypot(p.x - w.x, p.y + 4 * MINIGAME_SCHAAL - w.y);
      if (d < straal * 0.85 && (!besteMinigame || d < besteMinigame.d)) besteMinigame = { id, d };
    }
    const nu = performance.now();
    if (besteMinigame && (!beste || besteMinigame.d < beste.d)) {
      this.laatsteTik = 0;
      this.o.onTikMinigame(besteMinigame.id);
      return;
    }
    if (beste) {
      this.laatsteTik = 0;
      this.o.onTik(beste.id);
      return;
    }
    if (nu - this.laatsteTik < 350) {
      // Dubbeltik: zoom in op het gebied.
      this.laatsteTik = 0;
      const buurt = buurtOp(this.o.geo, w);
      const kader = buurt ? gebiedKader(this.o.geo, buurt.gebied) : undefined;
      if (kader) this.vlieg(naarKader(kader, this.scherm));
      return;
    }
    this.laatsteTik = nu;
  }

  /**
   * Laat een kettingeffect zien: een lijn tussen twee gebouwen waar muntjes overheen rollen,
   * groen voor voordeel en rood voor nadeel (opdracht 7.1). Verdwijnt na een paar seconden.
   */
  toonLijn(van: string, naar: string, positief: boolean): void {
    const a = this.o.geo.gebouwen[van];
    const b = this.o.geo.gebouwen[naar];
    if (!a || !b) return;
    const ctrl = { x: (a.x + b.x) / 2 + (b.y - a.y) * 0.2, y: (a.y + b.y) / 2 - (b.x - a.x) * 0.2 };
    this.lijnen.push({
      weg: { gebouw: naar, van: a, ctrl, naar: b },
      kleur: positief ? this.o.kleuren.positief : this.o.kleuren.negatief,
      begin: performance.now(),
    });
    this.vies = true;
  }

  get huidigeCamera(): Camera {
    return this.camera;
  }

  vernietig(): void {
    for (const f of this.opgeruimd) f();
    this.canvas.remove();
  }
}

/** Zo lang blijft een kettinglijn staan. */
const LIJN_MS = 2600;

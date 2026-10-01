/**
 * De gemeentekaart in PixiJS: buurten, gebieden, water, wegen, gebouwen en lopende inwoners.
 * Knijpen en slepen om te zoomen en te verschuiven (met grenzen), dubbeltik zoomt in op een gebied.
 * De interface (panelen, knoppen, tekstballonnen) zit in React over de kaart heen.
 */
import { Application, Container, Graphics, Text } from 'pixi.js';
import type { Data } from '../../engine';
import { formatMln } from '../../engine/format';
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
import { buurtOp, gebiedKader, opWeg, type KaartGeometrie, type Weg } from './geometrie';
import { GEBOUW_H, tekenGebouw } from './gebouwTekening';
import type { Punt } from './projectie';

export type KaartKleuren = {
  gebieden: number[];
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
const GEBOUW_SCHAAL = 1.8;
const INWONER_SCHAAL = 1.6;
const MAX_TEXTUUR = 4096;

export type KaartOpties = {
  data: Data;
  geo: KaartGeometrie;
  kleuren: KaartKleuren;
  minderBeweging: boolean;
  onTik: (gebouwId: string) => void;
  onCamera: (c: Camera) => void;
};

type Wandelaar = {
  persona: string;
  weg: Weg;
  t: number;
  v: number;
  figuur: Container;
  vorigeX: number;
};

export class GemeenteKaart {
  private app = new Application();
  private wereld = new Container();
  private camera: Camera = { x: 0, y: 0, schaal: 1 };
  private scherm: Maat = { breedte: 1, hoogte: 1 };
  private gebouwen = new Map<string, { teken: Graphics; bedrag: Text }>();
  private wandelaars: Wandelaar[] = [];
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
  private animatie?: { van: Camera; naar: Camera; begin: number };
  private opgeruimd: (() => void)[] = [];
  /** vaste lagen (buurten, water, wegen, labels): één keer naar een textuur gerenderd */
  private vast = new Container();
  private vastResolutie = 0;
  private laatsteCamera = 0;

  private constructor(private o: KaartOpties) {}

  static async maak(element: HTMLElement, o: KaartOpties): Promise<GemeenteKaart> {
    const k = new GemeenteKaart(o);
    await k.app.init({
      resizeTo: element,
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl',
    });
    k.app.stage.eventMode = 'none';
    k.app.canvas.setAttribute('aria-hidden', 'true');
    k.app.canvas.style.touchAction = 'none';
    element.appendChild(k.app.canvas);
    k.app.stage.addChild(k.wereld);
    k.tekenKaart();
    k.maakWandelaars();
    k.koppelInvoer(k.app.canvas);
    k.pasAan(true);
    const opnieuw = () => k.pasAan(false);
    k.app.renderer.on('resize', opnieuw);
    k.opgeruimd.push(() => k.app.renderer.off('resize', opnieuw));
    k.app.ticker.add((t) => k.stap(t.deltaMS));
    return k;
  }

  // ---------------------------------------------------------------------------------------------
  // Tekenen
  // ---------------------------------------------------------------------------------------------

  private tekenKaart(): void {
    const { geo, kleuren, data } = this.o;
    const gebiedIndex = new Map(data.gebieden.gebieden.map((g, i) => [g.id, i]));
    const plat = (r: Punt[]) => r.flatMap((q) => [q.x, q.y]);

    // Gemeentegrens: eerst een dikke blauwe lijn om alle buurten, daarna de vlakken eroverheen.
    const rand = new Graphics();
    for (const b of geo.buurten) {
      for (const r of b.ringen.slice(0, 1))
        rand.poly(plat(r)).stroke({ width: 7, color: kleuren.rand, join: 'round' });
    }
    const vlakken = new Graphics();
    for (const b of geo.buurten) {
      const kleur =
        kleuren.gebieden[(gebiedIndex.get(b.gebied) ?? 0) % kleuren.gebieden.length] ?? 0x98d077;
      b.ringen.forEach((r, i) => {
        vlakken.poly(plat(r));
        if (i === 0) vlakken.fill(kleur);
        else vlakken.cut();
      });
    }
    for (const b of geo.buurten) {
      for (const r of b.ringen)
        vlakken.poly(plat(r)).stroke({ width: 0.6, color: kleuren.buurtlijn, alpha: 0.45 });
    }
    const grenzen = new Graphics();
    for (const [a, b] of geo.gebiedsgrenzen) grenzen.moveTo(a.x, a.y).lineTo(b.x, b.y);
    grenzen.stroke({ width: 1.6, color: kleuren.gebiedslijn, alpha: 0.5, cap: 'round' });

    const water = new Graphics();
    for (const w of geo.water) {
      if (w.soort === 'vlak') {
        for (const r of w.ringen) water.poly(plat(r)).fill({ color: kleuren.water, alpha: 0.9 });
      } else {
        const [eerste, ...rest] = w.punten;
        if (!eerste) continue;
        water.moveTo(eerste.x, eerste.y);
        for (const q of rest) water.lineTo(q.x, q.y);
        water.stroke({ width: w.breedte, color: kleuren.water, cap: 'round', join: 'round' });
      }
    }

    const wegen = new Graphics();
    for (const w of geo.wegen) {
      wegen.moveTo(w.van.x, w.van.y).quadraticCurveTo(w.ctrl.x, w.ctrl.y, w.naar.x, w.naar.y);
    }
    wegen.stroke({ width: 7, color: kleuren.weg, cap: 'round' });
    const strepen = new Graphics();
    for (const w of geo.wegen) {
      for (let t = 0.04; t < 0.96; t += 0.06) {
        const a = opWeg(w, t);
        const b = opWeg(w, t + 0.025);
        strepen.moveTo(a.x, a.y).lineTo(b.x, b.y);
      }
    }
    strepen.stroke({ width: 1, color: kleuren.wegstreep });

    const labels = new Container();
    for (const l of geo.labels) {
      const t = new Text({
        text: l.tekst,
        style: {
          fontFamily: 'Asap, system-ui, sans-serif',
          fontSize: l.soort === 'gebied' ? 24 : 16,
          fontWeight: l.soort === 'gebied' ? '700' : '600',
          fill: kleuren.label,
          stroke: { color: kleuren.labelRand, width: 3 },
          letterSpacing: l.soort === 'gebied' ? 1 : 0,
        },
        resolution: 3,
      });
      t.alpha = l.soort === 'gebied' ? 0.55 : 0.75;
      t.anchor.set(0.5);
      t.position.set(l.punt.x, l.punt.y);
      labels.addChild(t);
    }

    this.vast.addChild(rand, vlakken, grenzen, water, wegen, strepen, labels);
    this.wereld.addChild(this.vast);

    // Gebouwen, van boven naar beneden zodat ze netjes overlappen.
    const gebouwLaag = new Container();
    const naamLaag = new Container();
    const volgorde = [...data.gebouwen].sort(
      (a, b) => (geo.gebouwen[a.id]?.y ?? 0) - (geo.gebouwen[b.id]?.y ?? 0),
    );
    for (const g of volgorde) {
      const plek = geo.gebouwen[g.id];
      if (!plek) continue;
      const c = new Container();
      c.position.set(plek.x, plek.y);
      c.scale.set(GEBOUW_SCHAAL);
      const teken = new Graphics();
      tekenGebouw(teken, g, { toestand: 'normaal' });
      const icoon = new Text({ text: g.icoon, style: { fontSize: 13 }, resolution: 3 });
      icoon.anchor.set(0.5);
      icoon.position.set(0, -GEBOUW_H / 2 - 3);
      const naam = new Text({
        text: g.naam,
        style: {
          fontFamily: 'Asap, system-ui, sans-serif',
          fontSize: 10,
          fontWeight: '700',
          fill: kleuren.label,
          stroke: { color: kleuren.labelRand, width: 3 },
        },
        resolution: 3,
      });
      naam.anchor.set(0.5, 0);
      naam.position.set(plek.x, plek.y + (GEBOUW_H / 2 + 6) * GEBOUW_SCHAAL);
      naam.scale.set(GEBOUW_SCHAAL);
      const bedrag = new Text({
        text: '',
        style: {
          fontFamily: 'Asap, system-ui, sans-serif',
          fontSize: 9,
          fontWeight: '700',
          fill: kleuren.label,
          stroke: { color: kleuren.labelRand, width: 3 },
        },
        resolution: 3,
      });
      bedrag.anchor.set(0.5, 0);
      bedrag.position.set(plek.x, plek.y + (GEBOUW_H / 2 + 18) * GEBOUW_SCHAAL);
      bedrag.scale.set(GEBOUW_SCHAAL);
      c.addChild(teken, icoon);
      naamLaag.addChild(naam, bedrag);
      gebouwLaag.addChild(c);
      this.gebouwen.set(g.id, { teken, bedrag });
    }
    this.vast.addChild(gebouwLaag, naamLaag);
  }

  /** Werkt de gebouwen bij na een keuze van de speler. */
  zetStanden(standen: Record<string, GebouwStand>, zwembadLeeg: boolean): void {
    for (const g of this.o.data.gebouwen) {
      const stand = standen[g.id];
      const getekend = this.gebouwen.get(g.id);
      if (!stand || !getekend) continue;
      tekenGebouw(getekend.teken, g, {
        toestand: stand.toestand,
        zwembadLeeg: g.id === 'zwembad' && zwembadLeeg,
      });
      const bedrag = stand.bedrag;
      getekend.bedrag.text = Math.abs(bedrag) < 50_000 ? '' : formatMln(bedrag, { teken: true });
      getekend.bedrag.style.fill = bedrag >= 0 ? this.o.kleuren.positief : this.o.kleuren.negatief;
    }
    // De gebouwen zitten in de vaste textuur: die opnieuw renderen.
    if (this.vastResolutie) this.vast.updateCacheTexture();
  }

  // ---------------------------------------------------------------------------------------------
  // Inwoners die over de wegen lopen
  // ---------------------------------------------------------------------------------------------

  private maakWandelaars(): void {
    const { geo, data } = this.o;
    const laag = new Container();
    data.personas.personas.forEach((p, i) => {
      // Elke inwoner loopt over de weg naar het gebouw in de eigen buurt, anders in het eigen gebied.
      const eigen =
        data.gebouwen.find((g) => g.buurt === p.buurt && g.id !== 'stadhuis') ??
        data.gebouwen.find((g) => g.gebied === p.gebied && g.id !== 'stadhuis');
      const weg = geo.wegen.find((w) => w.gebouw === eigen?.id) ?? geo.wegen[i % geo.wegen.length];
      if (!weg) return;
      const figuur = new Container();
      const lijf = new Graphics();
      lijf.circle(0, -9, 3.2).fill(HUID[i % HUID.length] ?? 0xf2c29b);
      lijf.roundRect(-3.2, -6, 6.4, 7, 2).fill(KLEUR_INWONER[i % KLEUR_INWONER.length] ?? 0xff6a00);
      lijf.rect(-2.6, 1, 1.8, 4).fill(0x15193a);
      lijf.rect(0.8, 1, 1.8, 4).fill(0x15193a);
      figuur.addChild(lijf);
      figuur.scale.set(INWONER_SCHAAL);
      laag.addChild(figuur);
      const t = 0.15 + ((i * 0.37) % 0.7);
      this.wandelaars.push({
        persona: p.id,
        weg,
        t,
        v: (0.025 + (i % 3) * 0.01) * (i % 2 ? 1 : -1),
        figuur,
        vorigeX: 0,
      });
    });
    this.wereld.addChild(laag);
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
      w.figuur.position.set(q.x, q.y - stapje);
      if (ms > 0) w.figuur.scale.x = (q.x < w.vorigeX ? -1 : 1) * INWONER_SCHAAL;
      w.vorigeX = q.x;
    }
  }

  /** Waar een inwoner nu op het scherm staat (voor de tekstballon). */
  inwonerOpScherm(persona: string): Punt | undefined {
    const w = this.wandelaars.find((x) => x.persona === persona);
    if (!w) return undefined;
    return naarScherm(this.camera, w.figuur.position.x, w.figuur.position.y - 14 * INWONER_SCHAAL);
  }

  // ---------------------------------------------------------------------------------------------
  // Camera en invoer
  // ---------------------------------------------------------------------------------------------

  private wereldMaat(): Maat {
    return { breedte: this.o.geo.breedte, hoogte: this.o.geo.hoogte };
  }

  private zetCamera(c: Camera): void {
    this.camera = klem(c, this.wereldMaat(), this.scherm, this.o.data.kaart.zoom_max);
    this.wereld.position.set(this.camera.x, this.camera.y);
    this.wereld.scale.set(this.camera.schaal);
    this.laatsteCamera = performance.now();
    this.o.onCamera(this.camera);
  }

  /**
   * Rendert de vaste lagen opnieuw naar een textuur als de zoom flink is veranderd, zodat het beeld
   * scherp blijft. Tussendoor tekent elk beeld alleen die ene textuur plus gebouwen en inwoners.
   */
  private werkTextuurBij(): void {
    if (performance.now() - this.laatsteCamera < 200 || this.animatie || this.wijzers.size) return;
    const dpr = this.app.renderer.resolution;
    const max = MAX_TEXTUUR / Math.max(this.o.geo.breedte, this.o.geo.hoogte);
    const gewenst = Math.min(max, Math.max(0.5, this.camera.schaal * dpr));
    const resolutie = Math.min(max, Math.pow(1.5, Math.ceil(Math.log(gewenst) / Math.log(1.5))));
    if (Math.abs(resolutie - this.vastResolutie) < 1e-6) return;
    this.vastResolutie = resolutie;
    this.vast.cacheAsTexture(false);
    this.vast.cacheAsTexture({ resolution: resolutie, antialias: true });
  }

  private pasAan(opnieuw: boolean): void {
    const vorig = this.scherm;
    this.scherm = { breedte: this.app.screen.width, hoogte: this.app.screen.height };
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

  private vlieg(naar: Camera): void {
    if (this.o.minderBeweging) this.zetCamera(naar);
    else this.animatie = { van: this.camera, naar, begin: performance.now() };
  }

  zoom(factor: number): void {
    this.vlieg(zoomOm(this.camera, factor, this.scherm.breedte / 2, this.scherm.hoogte / 2));
  }

  herstel(): void {
    this.vlieg(pas(this.wereldMaat(), this.scherm));
  }

  /** Zoomt in op een gebouw (bijvoorbeeld bij focus via het toetsenbord). */
  toonGebouw(id: string): void {
    const p = this.o.geo.gebouwen[id];
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
      const t = Math.min(1, (performance.now() - this.animatie.begin) / 350);
      const e = 1 - Math.pow(1 - t, 3);
      const { van, naar } = this.animatie;
      this.zetCamera({
        schaal: van.schaal + (naar.schaal - van.schaal) * e,
        x: van.x + (naar.x - van.x) * e,
        y: van.y + (naar.y - van.y) * e,
      });
      if (t >= 1) this.animatie = undefined;
    }
    if (!this.o.minderBeweging) this.zetWandelaars(Math.min(ms, 100));
    this.werkTextuurBij();
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
    const nu = performance.now();
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

  get huidigeCamera(): Camera {
    return this.camera;
  }

  vernietig(): void {
    for (const f of this.opgeruimd) f();
    this.app.destroy(true, { children: true });
  }
}

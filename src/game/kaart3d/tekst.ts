/** Namen en bedragen boven de grond, als plaatjes die altijd naar de camera kijken. */
import { CanvasTexture, LinearFilter, SRGBColorSpace, Sprite, SpriteMaterial } from 'three';

const LETTER = 'Asap, system-ui, sans-serif';
const css = (k: number) => `#${k.toString(16).padStart(6, '0')}`;

export type Regel = { tekst: string; kleur: number; grootte: number };

/**
 * Een naambord: een of twee regels tekst met een rand. De hoogte in de wereld is `hoogte` keer
 * het aantal regels (ongeveer); `schaal` past dat later aan.
 */
export class Naambord {
  readonly sprite: Sprite;
  private doek = document.createElement('canvas');
  private textuur: CanvasTexture;
  private sleutel = '';
  /** breedte gedeeld door hoogte van het plaatje */
  verhouding = 1;

  constructor(
    private rand: number,
    regels: Regel[],
  ) {
    this.textuur = new CanvasTexture(this.doek);
    this.textuur.colorSpace = SRGBColorSpace;
    this.textuur.minFilter = LinearFilter;
    this.textuur.generateMipmaps = false;
    this.sprite = new Sprite(
      new SpriteMaterial({
        map: this.textuur,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      }),
    );
    this.sprite.center.set(0.5, 1);
    this.sprite.renderOrder = 10;
    this.zet(regels);
  }

  zet(regels: Regel[]): void {
    const sleutel = JSON.stringify(regels);
    if (sleutel === this.sleutel) return;
    this.sleutel = sleutel;
    const px = 3;
    const ctx = this.doek.getContext('2d');
    if (!ctx) return;
    let breedte = 1;
    let hoogte = 4;
    for (const r of regels) {
      ctx.font = `700 ${r.grootte * px}px ${LETTER}`;
      breedte = Math.max(breedte, ctx.measureText(r.tekst).width + 10 * px);
      hoogte += r.grootte * 1.15 * px;
    }
    this.doek.width = Math.ceil(breedte);
    this.doek.height = Math.ceil(hoogte);
    ctx.clearRect(0, 0, this.doek.width, this.doek.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    let y = 2 * px;
    for (const r of regels) {
      ctx.font = `700 ${r.grootte * px}px ${LETTER}`;
      ctx.lineWidth = r.grootte * 0.32 * px;
      ctx.strokeStyle = css(this.rand);
      ctx.strokeText(r.tekst, this.doek.width / 2, y);
      ctx.fillStyle = css(r.kleur);
      ctx.fillText(r.tekst, this.doek.width / 2, y);
      y += r.grootte * 1.15 * px;
    }
    this.verhouding = this.doek.width / this.doek.height;
    this.textuur.dispose();
    this.textuur = new CanvasTexture(this.doek);
    this.textuur.colorSpace = SRGBColorSpace;
    this.textuur.minFilter = LinearFilter;
    this.textuur.generateMipmaps = false;
    this.sprite.material.map = this.textuur;
    this.sprite.material.needsUpdate = true;
    this.hoogtePx = this.doek.height / px;
  }

  /** De hoogte van het plaatje in "letterpunten" (de som van de regels). */
  hoogtePx = 10;

  /** Zet de grootte in de wereld: `eenheid` wereldeenheden per letterpunt. */
  schaal(eenheid: number): void {
    const h = this.hoogtePx * eenheid;
    this.sprite.scale.set(h * this.verhouding, h, 1);
  }

  /** Een emoji als plaatje (voor sterretjes en stofwolkjes). */
  static emoji(teken: string): SpriteMaterial {
    const doek = document.createElement('canvas');
    doek.width = 64;
    doek.height = 64;
    const ctx = doek.getContext('2d');
    if (ctx) {
      ctx.font = '48px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(teken, 32, 36);
    }
    const t = new CanvasTexture(doek);
    t.colorSpace = SRGBColorSpace;
    return new SpriteMaterial({ map: t, depthTest: false, transparent: true });
  }

  vernietig(): void {
    this.textuur.dispose();
    this.sprite.material.dispose();
  }
}

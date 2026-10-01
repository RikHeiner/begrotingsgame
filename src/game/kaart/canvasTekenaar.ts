/**
 * Tekenopdrachten in de stijl van PixiJS (rect, roundRect, circle, ellipse, poly,
 * moveTo, lineTo, fill, stroke), uitgevoerd op Canvas 2D. Zo tekent `tekenGebouw` naar een
 * afbeelding, zonder dat JavaScript de vormen in driehoeken hoeft op te delen.
 * Een fill of stroke geldt voor de vormen sinds de vorige fill of stroke.
 */
export type Vulling = number | { color: number; alpha?: number };
export type Lijn = {
  width: number;
  color: number;
  alpha?: number;
  join?: CanvasLineJoin;
  cap?: CanvasLineCap;
};

export interface Tekenaar {
  clear(): this;
  rect(x: number, y: number, b: number, h: number): this;
  roundRect(x: number, y: number, b: number, h: number, r: number): this;
  circle(x: number, y: number, r: number): this;
  ellipse(x: number, y: number, rx: number, ry: number): this;
  poly(punten: number[]): this;
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  fill(v: Vulling): this;
  stroke(l: Lijn): this;
}

const css = (kleur: number) => `#${kleur.toString(16).padStart(6, '0')}`;

export class CanvasTekenaar implements Tekenaar {
  private pad = new Path2D();
  private gebruikt = false;

  constructor(private ctx: CanvasRenderingContext2D) {}

  private nieuw(): Path2D {
    if (this.gebruikt) {
      this.pad = new Path2D();
      this.gebruikt = false;
    }
    return this.pad;
  }

  clear(): this {
    this.pad = new Path2D();
    this.gebruikt = false;
    return this;
  }

  rect(x: number, y: number, b: number, h: number): this {
    this.nieuw().rect(x, y, b, h);
    return this;
  }

  roundRect(x: number, y: number, b: number, h: number, r: number): this {
    const p = this.nieuw();
    if (typeof p.roundRect === 'function') p.roundRect(x, y, b, h, r);
    else {
      p.moveTo(x + r, y);
      p.arcTo(x + b, y, x + b, y + h, r);
      p.arcTo(x + b, y + h, x, y + h, r);
      p.arcTo(x, y + h, x, y, r);
      p.arcTo(x, y, x + b, y, r);
      p.closePath();
    }
    return this;
  }

  circle(x: number, y: number, r: number): this {
    const p = this.nieuw();
    p.moveTo(x + r, y);
    p.arc(x, y, r, 0, Math.PI * 2);
    return this;
  }

  ellipse(x: number, y: number, rx: number, ry: number): this {
    const p = this.nieuw();
    p.moveTo(x + rx, y);
    p.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    return this;
  }

  poly(punten: number[]): this {
    const p = this.nieuw();
    for (let i = 0; i + 1 < punten.length; i += 2) {
      const x = punten[i] ?? 0;
      const y = punten[i + 1] ?? 0;
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.closePath();
    return this;
  }

  moveTo(x: number, y: number): this {
    this.nieuw().moveTo(x, y);
    return this;
  }

  lineTo(x: number, y: number): this {
    this.pad.lineTo(x, y);
    return this;
  }

  fill(v: Vulling): this {
    const { color, alpha = 1 } = typeof v === 'number' ? { color: v } : v;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = css(color);
    this.ctx.fill(this.pad);
    this.ctx.globalAlpha = 1;
    this.gebruikt = true;
    return this;
  }

  stroke(l: Lijn): this {
    this.ctx.globalAlpha = l.alpha ?? 1;
    this.ctx.strokeStyle = css(l.color);
    this.ctx.lineWidth = l.width;
    this.ctx.lineJoin = l.join ?? 'miter';
    this.ctx.lineCap = l.cap ?? 'butt';
    this.ctx.stroke(this.pad);
    this.ctx.globalAlpha = 1;
    this.gebruikt = true;
    return this;
  }
}

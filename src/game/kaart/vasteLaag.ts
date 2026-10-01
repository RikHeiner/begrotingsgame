/**
 * De vaste laag van de gemeentekaart (buurten, grenzen, water, wegen en namen), getekend met
 * Canvas 2D. De browser tekent die vlakken zelf; dat is veel sneller dan ze in JavaScript in
 * driehoeken op te delen. De kaart tekent het resultaat als één afbeelding.
 */
import type { Data } from '../../engine';
import { opWeg, type KaartGeometrie } from './geometrie';
import type { Punt } from './projectie';

export type VasteKleuren = {
  gebieden: number[];
  buurtlijn: number;
  gebiedslijn: number;
  rand: number;
  water: number;
  weg: number;
  wegstreep: number;
  label: number;
  labelRand: number;
};

/** Ruimte rond de wereld, zodat de dikke rand niet wordt afgesneden (in wereldeenheden). */
export const RAND = 12;

const css = (kleur: number) => `#${kleur.toString(16).padStart(6, '0')}`;

function pad(ctx: CanvasRenderingContext2D, ring: Punt[]): void {
  const [eerste, ...rest] = ring;
  if (!eerste) return;
  ctx.moveTo(eerste.x, eerste.y);
  for (const q of rest) ctx.lineTo(q.x, q.y);
  ctx.closePath();
}

/**
 * Tekent de vaste laag op een canvas met `resolutie` pixels per wereldeenheid.
 * Het canvas begint bij (−RAND, −RAND) in wereldcoördinaten.
 */
export function tekenVasteLaag(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  geo: KaartGeometrie,
  data: Data,
  kleuren: VasteKleuren,
  resolutie: number,
): void {
  canvas.width = Math.max(1, Math.ceil((geo.breedte + 2 * RAND) * resolutie));
  canvas.height = Math.max(1, Math.ceil((geo.hoogte + 2 * RAND) * resolutie));
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!ctx) return;
  ctx.setTransform(resolutie, 0, 0, resolutie, RAND * resolutie, RAND * resolutie);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const gebiedIndex = new Map(data.gebieden.gebieden.map((g, i) => [g.id, i]));

  // Gemeentegrens: een dikke lijn om alle buurten, de vlakken komen eroverheen.
  ctx.beginPath();
  for (const b of geo.buurten) for (const r of b.ringen.slice(0, 1)) pad(ctx, r);
  ctx.strokeStyle = css(kleuren.rand);
  ctx.lineWidth = 7;
  ctx.stroke();

  // Buurten, per gebied een eigen groen; gaten in buurten blijven open (evenodd).
  for (const b of geo.buurten) {
    ctx.beginPath();
    for (const r of b.ringen) pad(ctx, r);
    const kleur = kleuren.gebieden[(gebiedIndex.get(b.gebied) ?? 0) % kleuren.gebieden.length];
    ctx.fillStyle = css(kleur ?? 0x98d077);
    ctx.fill('evenodd');
  }
  ctx.beginPath();
  for (const b of geo.buurten) for (const r of b.ringen) pad(ctx, r);
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = css(kleuren.buurtlijn);
  ctx.lineWidth = 0.6;
  ctx.stroke();

  ctx.beginPath();
  for (const [a, z] of geo.gebiedsgrenzen) {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(z.x, z.y);
  }
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = css(kleuren.gebiedslijn);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Water
  for (const w of geo.water) {
    ctx.beginPath();
    if (w.soort === 'vlak') {
      for (const r of w.ringen) pad(ctx, r);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = css(kleuren.water);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      const [eerste, ...rest] = w.punten;
      if (!eerste) continue;
      ctx.moveTo(eerste.x, eerste.y);
      for (const q of rest) ctx.lineTo(q.x, q.y);
      ctx.strokeStyle = css(kleuren.water);
      ctx.lineWidth = w.breedte;
      ctx.stroke();
    }
  }

  // Wegen naar de gebouwen, met een stippellijn in het midden
  ctx.beginPath();
  for (const w of geo.wegen) {
    ctx.moveTo(w.van.x, w.van.y);
    ctx.quadraticCurveTo(w.ctrl.x, w.ctrl.y, w.naar.x, w.naar.y);
  }
  ctx.strokeStyle = css(kleuren.weg);
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.beginPath();
  for (const w of geo.wegen) {
    for (let t = 0.04; t < 0.96; t += 0.06) {
      const a = opWeg(w, t);
      const z = opWeg(w, t + 0.025);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(z.x, z.y);
    }
  }
  ctx.lineCap = 'butt';
  ctx.strokeStyle = css(kleuren.wegstreep);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.lineCap = 'round';

  // Namen van gebieden, dorpen en water
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const l of geo.labels) {
    const gebied = l.soort === 'gebied';
    ctx.font = `${gebied ? 700 : 600} ${gebied ? 24 : 16}px Asap, system-ui, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = gebied ? '1px' : '0px';
    ctx.globalAlpha = gebied ? 0.55 : 0.75;
    ctx.lineWidth = 3;
    ctx.strokeStyle = css(kleuren.labelRand);
    ctx.strokeText(l.tekst, l.punt.x, l.punt.y);
    ctx.fillStyle = css(kleuren.label);
    ctx.fillText(l.tekst, l.punt.x, l.punt.y);
  }
  ctx.globalAlpha = 1;
}

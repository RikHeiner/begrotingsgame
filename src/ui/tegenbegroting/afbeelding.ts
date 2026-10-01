/**
 * Afbeelding van 1080×1350 met de hoofdpunten van de tegenbegroting, voor social media.
 * Getekend op een canvas met de eigen lettertypen; geen externe bibliotheek.
 */
import { formatMln } from '../../engine';
import type { Tegenbegroting } from '../../game/tegenbegroting/document';

const B = 1080;
const H = 1350;

function regels(ctx: CanvasRenderingContext2D, tekst: string, breedte: number): string[] {
  const woorden = tekst.split(/[ \t\n]+/);
  const uit: string[] = [];
  let regel = '';
  for (const w of woorden) {
    const test = regel ? `${regel} ${w}` : w;
    if (ctx.measureText(test).width > breedte && regel) {
      uit.push(regel);
      regel = w;
    } else regel = test;
  }
  if (regel) uit.push(regel);
  return uit;
}

export async function maakAfbeelding(
  tb: Tegenbegroting,
  sterren: { aantal: number; van: number },
  link: string,
): Promise<Blob> {
  await Promise.all([
    document.fonts.load('800 80px "Baloo 2"'),
    document.fonts.load('700 40px "Baloo 2"'),
    document.fonts.load('400 36px Asap'),
    document.fonts.load('700 36px Asap'),
  ]).catch(() => undefined);
  const c = document.createElement('canvas');
  c.width = B;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas niet beschikbaar.');

  ctx.fillStyle = '#F6F7FC';
  ctx.fillRect(0, 0, B, H);
  ctx.fillStyle = '#1233C4';
  ctx.fillRect(0, 0, B, 360);

  ctx.fillStyle = '#FF6A00';
  ctx.font = '800 64px "Baloo 2", sans-serif';
  ctx.fillText('Tegenbegroting', 72, 120);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 76px "Baloo 2", sans-serif';
  let y = 210;
  for (const r of regels(ctx, tb.titel, B - 144).slice(0, 2)) {
    ctx.fillText(r, 72, y);
    y += 80;
  }
  ctx.font = '400 32px Asap, sans-serif';
  ctx.fillText(tb.ondertitel, 72, 330);

  // Sterren en saldo
  ctx.font = '700 72px sans-serif';
  for (let i = 0; i < sterren.van; i++) {
    ctx.fillStyle = i < sterren.aantal ? '#F2B705' : '#D5D8EA';
    ctx.fillText('★', 72 + i * 84, 470);
  }
  const s = tb.financieel.totalen.saldoS;
  ctx.fillStyle = '#15193A';
  ctx.font = '400 36px Asap, sans-serif';
  ctx.fillText('Elk jaar over of tekort', 72, 560);
  ctx.fillStyle = s >= 0 ? '#15875A' : '#C4321E';
  ctx.font = '800 96px "Baloo 2", sans-serif';
  ctx.fillText(formatMln(s, { teken: true }), 72, 660);

  // Grootste keuzes
  ctx.fillStyle = '#FF6A00';
  ctx.font = '800 48px "Baloo 2", sans-serif';
  ctx.fillText('Mijn grootste keuzes', 72, 770);
  const keuzes = [...tb.besparingen, ...tb.investeringen]
    .flatMap((g) => g.regels)
    .sort((a, b) => Math.abs(b.bedrag) - Math.abs(a.bedrag))
    .slice(0, 3);
  y = 840;
  ctx.font = '700 36px Asap, sans-serif';
  if (!keuzes.length) {
    ctx.fillStyle = '#15193A';
    ctx.fillText('Nog niets veranderd.', 72, y);
  }
  for (const k of keuzes) {
    ctx.fillStyle = '#FF6A00';
    ctx.fillText('▶', 72, y);
    ctx.fillStyle = '#15193A';
    const tekst = `${k.naam}${k.wijziging ? ` (${k.wijziging})` : ''}: ${formatMln(k.bedrag, { teken: true }).replace(/ /g, '\u00a0')}`;
    for (const r of regels(ctx, tekst, B - 200).slice(0, 2)) {
      ctx.fillText(r, 124, y);
      y += 48;
    }
    y += 22;
  }

  // Voet
  ctx.fillStyle = '#1233C4';
  ctx.fillRect(0, H - 190, B, 190);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 38px Asap, sans-serif';
  ctx.fillText('Maak je eigen begroting:', 72, H - 118);
  ctx.font = '400 30px Asap, sans-serif';
  const kortLink = link.replace(/^https?:\/\//, '').split('?')[0] ?? link;
  ctx.fillText(kortLink, 72, H - 72);
  ctx.font = '400 24px Asap, sans-serif';
  ctx.fillText('Een initiatief van de VVD-fractie Groningen-Haren', 72, H - 32);

  return new Promise((klaar, fout) =>
    c.toBlob((b) => (b ? klaar(b) : fout(new Error('Geen afbeelding.'))), 'image/png'),
  );
}

export function download(blob: Blob, naam: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = naam;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

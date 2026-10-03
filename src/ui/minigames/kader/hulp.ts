/**
 * Hulp voor het kader van de minigames: rustige modus, bedragen, klok, lus, toetsen en tekenen op
 * een canvas. De onderdelen op het scherm staan in kader.tsx.
 */
import { useEffect, useRef, useState } from 'react';
import { formatMln } from '../../../engine';

export const minderBeweging = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Of het spel rustig moet (vast voor de duur van het spel). */
export function useStil(): boolean {
  const [stil] = useState(minderBeweging);
  return stil;
}

/** Bedrag in miljoenen als tekst, zoals "€ 2,2 mln". */
export const mln = (x: number): string => formatMln(x * 1e6);
/** Met een plus of min ervoor. */
export const metTeken = (x: number): string => formatMln(x * 1e6, { teken: true });

/**
 * Een klok die per seconde aftelt zolang `loopt` waar is. Geeft de tijd en een functie om tijd
 * te zetten of erbij te doen.
 */
export function useKlok(
  begin: number,
  loopt: boolean,
): [number, (t: number | ((t: number) => number)) => void] {
  const [tijd, setTijd] = useState(begin);
  useEffect(() => {
    if (!loopt) return;
    const klok = window.setInterval(() => setTijd((t) => Math.max(0, t - 1)), 1000);
    return () => window.clearInterval(klok);
  }, [loopt]);
  return [tijd, setTijd];
}

/**
 * Roept `stap(dt, nu)` aan voor elk beeld zolang `actief` waar is. `dt` in seconden (hooguit
 * 0,05, zodat een haperend scherm het spel niet laat springen).
 */
export function useLus(actief: boolean, stap: (dt: number, nu: number) => void): void {
  const ref = useRef(stap);
  useEffect(() => {
    ref.current = stap;
  });
  useEffect(() => {
    if (!actief) return;
    let frame = 0;
    let vorige = performance.now();
    const lus = (nu: number) => {
      const dt = Math.min(50, nu - vorige) / 1000;
      vorige = nu;
      ref.current(dt, nu);
      frame = requestAnimationFrame(lus);
    };
    frame = requestAnimationFrame(lus);
    return () => cancelAnimationFrame(frame);
  }, [actief]);
}

/** Toetsen tijdens het spel, behalve als een knop de focus heeft en het spatie of Enter is. */
export function useToetsen(actief: boolean, op: (e: KeyboardEvent) => void): void {
  const ref = useRef(op);
  useEffect(() => {
    ref.current = op;
  });
  useEffect(() => {
    if (!actief) return;
    const toets = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') return;
      ref.current(e);
    };
    window.addEventListener('keydown', toets);
    return () => window.removeEventListener('keydown', toets);
  }, [actief]);
}

/**
 * Zet een canvas scherp op het scherm (devicePixelRatio) en geeft de context, met coördinaten in
 * beeldpunten van het veld (`breedte` bij `hoogte`).
 */
export function maakScherp(
  doek: HTMLCanvasElement | null,
  breedte: number,
  hoogte: number,
): CanvasRenderingContext2D | null {
  if (!doek) return null;
  const ctx = doek.getContext('2d');
  if (!ctx) return null;
  const r = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
  if (doek.width !== Math.round(breedte * r)) {
    doek.width = Math.round(breedte * r);
    doek.height = Math.round(hoogte * r);
  }
  ctx.setTransform(r, 0, 0, r, 0, 0);
  return ctx;
}

/** Tekst die afbreekt op woorden binnen `max` beeldpunten; geeft de regels. */
export function breekTekst(ctx: CanvasRenderingContext2D, tekst: string, max: number): string[] {
  const regels: string[] = [];
  let regel = '';
  for (const woord of tekst.split(' ')) {
    const proef = regel ? `${regel} ${woord}` : woord;
    if (ctx.measureText(proef).width > max && regel) {
      regels.push(regel);
      regel = woord;
    } else regel = proef;
  }
  if (regel) regels.push(regel);
  return regels;
}

/** Afgeronde rechthoek als pad. */
export function rondRechthoek(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  b: number,
  h: number,
  r: number,
): void {
  const s = Math.min(r, b / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + s, y);
  ctx.arcTo(x + b, y, x + b, y + h, s);
  ctx.arcTo(x + b, y + h, x, y + h, s);
  ctx.arcTo(x, y + h, x, y, s);
  ctx.arcTo(x, y, x + b, y, s);
  ctx.closePath();
}

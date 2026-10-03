/**
 * Goudkantoor: "Goudzoeker". Een grijper zwaait heen en weer; druk op Graaf en hij schiet de
 * grond in. Goud is een eenmalige uitgave die VVD Groningen wil schrappen, een steen is een
 * kerntaak die de VVD juist houdt. Bij minder beweging staat de grijper stil en richt je zelf.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMln } from '../../engine';
import {
  BEURTEN,
  MAX_HOEK,
  maakVeld,
  ophaalTijd,
  raak,
  zwaaiHoek,
  type Plek,
} from '../../game/mgGoudkantoor';
import type { MinigameProps } from './types';
import './Goudkantoor.css';

const minderBeweging = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// De grond in SVG-eenheden: de grijper hangt bovenaan in het midden.
const B = 200;
const H = 130;
const OOG = { x: B / 2, y: 10 };
const BEREIK = 112;
const OMLAAG_MS = 450;
const RICHT_STAP = 6;

const punt = (hoek: number, lengte: number) => {
  const r = (hoek * Math.PI) / 180;
  return { x: OOG.x + Math.sin(r) * lengte * BEREIK, y: OOG.y + Math.cos(r) * lengte * BEREIK };
};

type Fase = 'zoeken' | 'graven' | 'uitleg' | 'klaar';

export default function Goudkantoor({ data, onKlaar }: MinigameProps) {
  const veld = useMemo(() => maakVeld(data), [data]);
  const [stil] = useState(minderBeweging);
  const [hoek, setHoek] = useState(0);
  const [lengte, setLengte] = useState(0);
  const [fase, setFase] = useState<Fase>('zoeken');
  const [weg, setWeg] = useState<Set<string>>(() => new Set());
  const [vast, setVast] = useState<Plek | null>(null);
  const [laatste, setLaatste] = useState<Plek | null | undefined>(undefined);
  const [beurt, setBeurt] = useState(0);
  const frame = useRef(0);
  const zwaaiFrame = useRef(0);
  const start = useRef(0);
  const verderKnop = useRef<HTMLButtonElement>(null);

  const goud = veld.filter((p) => p.soort === 'goud');
  const gevonden = goud.filter((p) => weg.has(p.id));
  const gevondenMln = gevonden.reduce((s, p) => s + p.bedragMln, 0);
  const jaar = data.begroting.begrotingsjaar;
  const bron = data.minigames.find((m) => m.goud)?.goud;

  // De grijper zwaait zolang je zoekt.
  useEffect(() => {
    if (stil || fase !== 'zoeken') return;
    const begin = performance.now() - start.current;
    const lus = (t: number) => {
      start.current = t - begin;
      setHoek(zwaaiHoek(t - begin));
      zwaaiFrame.current = requestAnimationFrame(lus);
    };
    zwaaiFrame.current = requestAnimationFrame(lus);
    return () => cancelAnimationFrame(zwaaiFrame.current);
  }, [stil, fase]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  useEffect(() => {
    if (fase === 'uitleg' || fase === 'klaar') verderKnop.current?.focus();
  }, [fase]);

  /** Laat de grijper van `van` naar `naar` lopen in `ms`, en roep daarna `klaar` aan. */
  const beweeg = (van: number, naar: number, ms: number, klaar: () => void) => {
    const t0 = performance.now();
    const lus = (t: number) => {
      const f = Math.min(1, (t - t0) / ms);
      setLengte(van + (naar - van) * f);
      if (f < 1) frame.current = requestAnimationFrame(lus);
      else klaar();
    };
    frame.current = requestAnimationFrame(lus);
  };

  const binnen = (p: Plek | undefined) => {
    setVast(null);
    setLengte(0);
    setLaatste(p ?? null);
    if (p) setWeg((w) => new Set(w).add(p.id));
    setBeurt((b) => b + 1);
    setFase('uitleg');
  };

  const graaf = () => {
    if (fase !== 'zoeken') return;
    const p = raak(veld, hoek, weg);
    if (stil) {
      binnen(p);
      return;
    }
    setFase('graven');
    const diep = p ? p.diepte : 1;
    beweeg(0, diep, OMLAAG_MS * diep, () => {
      if (p) setVast(p);
      beweeg(diep, 0, ophaalTijd(p), () => binnen(p));
    });
  };

  const verder = () => {
    const op = beurt >= BEURTEN || gevonden.length >= goud.length;
    if (fase === 'uitleg' && op) {
      setFase('klaar');
      return;
    }
    if (fase === 'klaar') {
      onKlaar(gevonden.length, goud.length);
      return;
    }
    setLaatste(undefined);
    setFase('zoeken');
  };

  const richt = (stap: number) => setHoek((h) => Math.max(-MAX_HOEK, Math.min(MAX_HOEK, h + stap)));

  const kop = punt(hoek, lengte);
  const laatsteOp = beurt >= BEURTEN || gevonden.length >= goud.length;

  return (
    <div className="mg-goudkantoor">
      <p className="klein" data-testid="mg-goud-stand">
        Beurt {Math.min(beurt + (fase === 'zoeken' || fase === 'graven' ? 1 : 0), BEURTEN)} van{' '}
        {BEURTEN} · goud: {gevonden.length} van {goud.length} · {formatMln(gevondenMln * 1e6)}
      </p>
      <svg
        className="mg-goud-grond"
        viewBox={`0 0 ${B} ${H}`}
        role="img"
        aria-label={`De grond met ${goud.length - gevonden.length} klompen goud en een paar stenen. De grijper wijst ${
          Math.abs(hoek) < 3 ? 'recht omlaag' : hoek < 0 ? 'naar links' : 'naar rechts'
        }.`}
      >
        <rect x="0" y="0" width={B} height="14" className="mg-goud-lucht" />
        <rect x="0" y="14" width={B} height={H - 14} className="mg-goud-aarde" />
        {/* Het Goudkantoor bovenop, met de katrol. */}
        <rect x={OOG.x - 9} y="1" width="18" height="9" rx="1.5" className="mg-goud-hok" />
        {veld
          .filter((p) => !weg.has(p.id) && p.id !== vast?.id)
          .map((p) => {
            const q = punt(p.hoek, p.diepte);
            return p.soort === 'goud' ? (
              <g key={p.id} className="mg-goud-klomp">
                <ellipse cx={q.x} cy={q.y} rx={5.5 * p.grootte} ry={4.2 * p.grootte} />
                <circle
                  cx={q.x - 1.8 * p.grootte}
                  cy={q.y - 1.4 * p.grootte}
                  r={1.2 * p.grootte}
                  className="mg-goud-glans"
                />
              </g>
            ) : (
              <ellipse
                key={p.id}
                cx={q.x}
                cy={q.y}
                rx={6 * p.grootte}
                ry={4.5 * p.grootte}
                className="mg-goud-steen"
              />
            );
          })}
        <line x1={OOG.x} y1={OOG.y} x2={kop.x} y2={kop.y} className="mg-goud-touw" />
        {/* De grijper: een haak, gedraaid in de richting van het touw. */}
        <g transform={`translate(${kop.x} ${kop.y}) rotate(${-hoek})`} className="mg-goud-haak">
          <path d="M -5 0 Q -6 6 -1 7 M 5 0 Q 6 6 1 7 M -5 0 L 5 0" />
        </g>
        {vast && (
          <ellipse
            cx={kop.x}
            cy={kop.y + 5}
            rx={(vast.soort === 'goud' ? 5.5 : 6) * vast.grootte}
            ry={(vast.soort === 'goud' ? 4.2 : 4.5) * vast.grootte}
            className={vast.soort === 'goud' ? 'mg-goud-vast' : 'mg-goud-steen'}
          />
        )}
      </svg>

      {fase === 'zoeken' || fase === 'graven' ? (
        <div className="mg-goud-knoppen">
          {stil && (
            <button
              type="button"
              className="knop"
              onClick={() => richt(-RICHT_STAP)}
              disabled={hoek <= -MAX_HOEK}
            >
              ◀ Richt links
            </button>
          )}
          <button
            type="button"
            className="knop-indienen mg-goud-graaf"
            onClick={graaf}
            disabled={fase !== 'zoeken'}
          >
            ⛏️ Graaf!
          </button>
          {stil && (
            <button
              type="button"
              className="knop"
              onClick={() => richt(RICHT_STAP)}
              disabled={hoek >= MAX_HOEK}
            >
              Richt rechts ▶
            </button>
          )}
        </div>
      ) : null}
      {fase === 'zoeken' && beurt === 0 && (
        <p className="klein">
          {stil
            ? 'Richt de grijper en druk op Graaf.'
            : 'De grijper zwaait heen en weer. Druk op Graaf als hij naar het goud wijst.'}{' '}
          Goud is een tijdelijke uitgave die VVD Groningen wil schrappen. Laat de stenen liggen: dat
          zijn kerntaken.
        </p>
      )}

      <div role="status" className="mg-goud-status">
        {fase === 'graven' && <p>De grijper graaft…</p>}
        {fase === 'uitleg' && laatste === null && (
          <p>
            <strong>Niets geraakt.</strong> Probeer een andere richting.
          </p>
        )}
        {fase === 'uitleg' && laatste && laatste.soort === 'goud' && (
          <div data-testid="mg-goud-vondst">
            <p>
              <strong>💰 Goud: {laatste.naam}.</strong> {formatMln(laatste.bedragMln * 1e6)},
              eenmalig in de begroting {jaar}.
            </p>
            <p className="klein">{laatste.uitleg}</p>
            <blockquote className="mg-goud-vvd">
              “{laatste.vvd}”
              <footer>Verkiezingsprogramma VVD Groningen 2026-2030, p. {laatste.pagina}</footer>
            </blockquote>
          </div>
        )}
        {fase === 'uitleg' && laatste && laatste.soort === 'steen' && (
          <div data-testid="mg-goud-vondst">
            <p>
              <strong>🪨 Een steen: {laatste.naam}.</strong> {formatMln(laatste.bedragMln * 1e6)}{' '}
              per jaar. Dit is een kerntaak: hier wil de VVD niet op bezuinigen. Dat kostte je een
              beurt.
            </p>
            <blockquote className="mg-goud-vvd">
              “{laatste.vvd}”
              <footer>Verkiezingsprogramma VVD Groningen 2026-2030, p. {laatste.pagina}</footer>
            </blockquote>
          </div>
        )}
        {fase === 'klaar' && (
          <div data-testid="mg-goud-uitslag">
            <p>
              <strong>
                Je vond {formatMln(gevondenMln * 1e6)} aan tijdelijke uitgaven die VVD Groningen wil
                schrappen.
              </strong>{' '}
              Dat geld kan naar veiligheid, onderhoud of lagere lasten.
            </p>
            {gevonden.length < goud.length && (
              <p className="klein">
                Nog in de grond:{' '}
                {goud
                  .filter((p) => !weg.has(p.id))
                  .map((p) => `${p.naam} (${formatMln(p.bedragMln * 1e6)})`)
                  .join(', ')}
                .
              </p>
            )}
            {bron && (
              <p className="klein">
                Bron:{' '}
                <a href={bron.url} target="_blank" rel="noopener noreferrer">
                  {bron.bron}
                </a>
                . Bedragen: begroting {jaar}.
              </p>
            )}
          </div>
        )}
        {(fase === 'uitleg' || fase === 'klaar') && (
          <button ref={verderKnop} type="button" className="knop-indienen" onClick={verder}>
            {fase === 'klaar'
              ? 'Naar de uitslag'
              : laatsteOp
                ? 'Wat heb ik gevonden?'
                : 'Verder graven'}
          </button>
        )}
      </div>
    </div>
  );
}

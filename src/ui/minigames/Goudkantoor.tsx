/**
 * Goudkantoor: "Geldzoeker", zoals Gold Miner. Een mijnwerker draait een lier; de grijper zwaait
 * heen en weer. Tik op het veld (of druk op spatie) en de grijper schiet de grond in. Elk level
 * begint met een tekort: graaf genoeg goud op om in de plus te komen voordat de tijd op is.
 *
 * Bij minder beweging zwaait de grijper niet en telt de tijd niet: je richt zelf en hebt een
 * aantal beurten. De tijd kun je ook altijd stilzetten (pauze).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatMln } from '../../engine';
import {
  BREEDTE,
  DRAAIPUNT,
  HOOGTE,
  LEVELS,
  MAX_HOEK,
  maakLevel,
  ophaalSnelheid,
  raak,
  UITROL_SNELHEID,
  verrassing,
  zwaaiHoek,
  type Level,
  type Plek,
  type Schat,
} from '../../game/mgGoudkantoor';
import type { MinigameProps } from './types';
import './Goudkantoor.css';

const minderBeweging = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const RICHT_STAP = 6;
const mln = (x: number) => formatMln(x * 1e6);
const metTeken = (x: number) => formatMln(x * 1e6, { teken: true });

type Fase = 'start' | 'spelen' | 'klaar';
type Melding = { tekst: string; soort: 'goud' | 'steen' | 'zak' | 'mis'; tijd: number };
type Zwever = { tekst: string; x: number; y: number; begin: number; goed: boolean };

/** De toestand van de grijper, buiten React (elk beeld verandert die). */
type Grijper = {
  hoek: number;
  lengte: number;
  stand: 'zwaaien' | 'uit' | 'terug';
  doel?: Plek;
  doelLengte: number;
  vast?: Plek;
  zwaaiTijd: number;
};

export default function Goudkantoor({ data, onKlaar }: MinigameProps) {
  const [stil] = useState(minderBeweging);
  const [levelNr, setLevelNr] = useState(1);
  const [level, setLevel] = useState<Level>(() => maakLevel(data, 1));
  const [fase, setFase] = useState<Fase>('start');
  const [kas, setKas] = useState(-level.tekortMln);
  const [tijd, setTijd] = useState(level.tijd);
  const [beurten, setBeurten] = useState(level.beurten);
  const [pauze, setPauze] = useState(false);
  const [weg, setWeg] = useState<Set<string>>(() => new Set());
  const [gevonden, setGevonden] = useState<Schat[]>([]);
  const [alleGevonden, setAlleGevonden] = useState<Schat[]>([]);
  const [gehaald, setGehaald] = useState(0);
  const [melding, setMelding] = useState<Melding>();
  const [hoek, setHoek] = useState(0);
  const [sterk, setSterk] = useState(false);

  const doek = useRef<HTMLCanvasElement>(null);
  const grijper = useRef<Grijper>({
    hoek: 0,
    lengte: 0,
    stand: 'zwaaien',
    doelLengte: 0,
    zwaaiTijd: 0,
  });
  const zwevers = useRef<Zwever[]>([]);
  const knop = useRef<HTMLButtonElement>(null);
  const staat = useRef({ level, weg, fase, pauze, sterk });
  useEffect(() => {
    staat.current = { level, weg, fase, pauze, sterk };
  });

  const jaar = data.begroting.begrotingsjaar;
  const inDePlus = kas >= -0.0001;
  const goudOver = level.plekken.filter((p) => p.soort === 'goud' && !weg.has(p.id)).length;
  // Het level is voorbij: tijd op, beurten op of al het goud gevonden.
  const levelKlaar =
    fase === 'spelen' && ((!stil && tijd <= 0) || (stil && beurten <= 0) || goudOver === 0);
  const spelen = fase === 'spelen' && !levelKlaar;

  useEffect(() => {
    if (!spelen) knop.current?.focus();
  }, [spelen, fase]);

  // ---------------------------------------------------------------------------------------------
  // Een level beginnen en eindigen
  // ---------------------------------------------------------------------------------------------

  const begin = useCallback(
    (nr: number) => {
      const l = maakLevel(data, nr);
      setLevelNr(nr);
      setLevel(l);
      setKas(-l.tekortMln);
      setTijd(l.tijd);
      setBeurten(l.beurten);
      setWeg(new Set());
      setGevonden([]);
      setSterk(false);
      setPauze(false);
      setMelding(undefined);
      grijper.current = { hoek: 0, lengte: 0, stand: 'zwaaien', doelLengte: 0, zwaaiTijd: 0 };
      zwevers.current = [];
      setHoek(0);
      setFase('spelen');
    },
    [data],
  );

  /** Onthoudt wat je in dit level vond, voor het overzicht aan het eind. */
  const boek = () => {
    setAlleGevonden((a) => [...a, ...gevonden.filter((g) => !a.some((x) => x.id === g.id))]);
    if (inDePlus) setGehaald((g) => Math.max(g, levelNr));
  };

  // ---------------------------------------------------------------------------------------------
  // Graven
  // ---------------------------------------------------------------------------------------------

  /** De grijper is terug: wat zat eraan? */
  const binnen = useCallback(
    (p: Plek | undefined) => {
      const nu = performance.now();
      if (p) setWeg((w) => new Set(w).add(p.id));
      if (!p) setMelding({ tekst: 'Niets geraakt.', soort: 'mis', tijd: nu });
      else if (p.soort === 'goud') {
        const s = p.schat;
        setKas((k) => k + s.bedragMln);
        setGevonden((g) => [...g, s]);
        setMelding({
          tekst: `${s.naam}: ${metTeken(s.bedragMln)} (${s.soort === 'S' ? 'elk jaar' : 'eenmalig'})`,
          soort: 'goud',
          tijd: nu,
        });
        zwevers.current.push({
          tekst: metTeken(s.bedragMln),
          x: DRAAIPUNT.x,
          y: DRAAIPUNT.y - 6,
          begin: nu,
          goed: true,
        });
      } else if (p.soort === 'steen') {
        setMelding({
          tekst: `Een steen: ${p.steen.naam}. Een kerntaak, daar bezuinigt de VVD niet op. Dat kostte tijd.`,
          soort: 'steen',
          tijd: nu,
        });
      } else {
        const v = verrassing();
        if (v === 'tijd') setTijd((t) => t + 10);
        else setSterk(true);
        setMelding({
          tekst:
            v === 'tijd' ? 'Verrassing: 10 seconden extra!' : 'Verrassing: een sterkere grijper!',
          soort: 'zak',
          tijd: nu,
        });
      }
      if (stil) setBeurten((b) => b - 1);
    },
    [stil],
  );

  const graaf = useCallback(() => {
    const { fase: f, pauze: pz, level: l, weg: w } = staat.current;
    const g = grijper.current;
    if (f !== 'spelen' || pz || g.stand !== 'zwaaien') return;
    const r = raak(l.plekken, g.hoek, w);
    if (stil) {
      binnen(r.plek);
      return;
    }
    g.stand = 'uit';
    g.doel = r.plek;
    g.doelLengte = r.lengte;
  }, [binnen, stil]);

  // De klok
  useEffect(() => {
    if (stil || !spelen || pauze) return;
    const klok = window.setInterval(() => setTijd((t) => Math.max(0, t - 1)), 1000);
    return () => window.clearInterval(klok);
  }, [stil, spelen, pauze]);

  const richt = (stap: number) => {
    const g = grijper.current;
    g.hoek = Math.max(-MAX_HOEK, Math.min(MAX_HOEK, g.hoek + stap));
    setHoek(g.hoek);
  };

  // Toetsen: spatie of pijl omlaag graaft, links en rechts richten (bij minder beweging)
  useEffect(() => {
    if (!spelen) return;
    const toets = (e: KeyboardEvent) => {
      const doelEl = e.target as HTMLElement | null;
      if (doelEl?.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
      if (e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        graaf();
      } else if (stil && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        richt(e.key === 'ArrowLeft' ? -RICHT_STAP : RICHT_STAP);
      }
    };
    window.addEventListener('keydown', toets);
    return () => window.removeEventListener('keydown', toets);
  });

  // ---------------------------------------------------------------------------------------------
  // Elk beeld: de grijper bewegen en alles tekenen
  // ---------------------------------------------------------------------------------------------

  useEffect(() => {
    if (!spelen) return;
    let frame = 0;
    let vorige = performance.now();
    const lus = (nu: number) => {
      const dt = Math.min(50, nu - vorige) / 1000;
      vorige = nu;
      const g = grijper.current;
      const s = staat.current;
      if (!s.pauze && !stil) {
        if (g.stand === 'zwaaien') {
          g.zwaaiTijd += dt * 1000;
          g.hoek = zwaaiHoek(g.zwaaiTijd);
        } else if (g.stand === 'uit') {
          g.lengte += UITROL_SNELHEID * dt;
          if (g.lengte >= g.doelLengte) {
            g.lengte = g.doelLengte;
            g.vast = g.doel;
            g.stand = 'terug';
          }
        } else {
          g.lengte -= ophaalSnelheid(g.vast, s.sterk) * dt;
          if (g.lengte <= 0) {
            g.lengte = 0;
            g.stand = 'zwaaien';
            const p = g.vast;
            g.vast = undefined;
            g.doel = undefined;
            binnen(p);
          }
        }
      }
      teken(doek.current, s.level, s.weg, g, zwevers.current, nu);
      frame = requestAnimationFrame(lus);
    };
    frame = requestAnimationFrame(lus);
    return () => cancelAnimationFrame(frame);
  }, [spelen, stil, binnen]);

  // Met minder beweging: alleen opnieuw tekenen als er iets verandert
  useEffect(() => {
    if (stil && spelen)
      teken(doek.current, level, weg, grijper.current, zwevers.current, performance.now());
  }, [stil, spelen, level, weg, hoek]);

  const alleSchatten = useMemo(
    () => level.plekken.flatMap((p) => (p.soort === 'goud' ? [p.schat] : [])),
    [level],
  );

  // ---------------------------------------------------------------------------------------------
  // Scherm
  // ---------------------------------------------------------------------------------------------

  const hud = (
    <div className="mg-gz-hud" data-testid="mg-goud-stand">
      <div>
        <span className="mg-gz-label">Kas</span>{' '}
        <strong className={inDePlus ? 'mg-gz-plus' : 'mg-gz-min'}>{metTeken(kas)}</strong>
        <br />
        <span className="mg-gz-label">Doel</span> <strong>in de plus</strong>
      </div>
      <div className="mg-gz-mijnwerker" aria-hidden="true">
        ⛏️
      </div>
      <div className="mg-gz-rechts">
        {stil ? (
          <>
            <span className="mg-gz-label">Beurten</span> <strong>{beurten}</strong>
          </>
        ) : (
          <>
            <span className="mg-gz-label">Tijd</span>{' '}
            <strong className={tijd <= 10 ? 'mg-gz-min' : ''}>{tijd}</strong>
          </>
        )}
        <br />
        <span className="mg-gz-label">Level</span> <strong>{levelNr}</strong>
      </div>
    </div>
  );

  if (fase === 'start')
    return (
      <div className="mg-goudkantoor">
        <div className="mg-gz-kaart">
          <h3>Geldzoeker</h3>
          <p>
            De gemeente heeft een <strong>tekort</strong>. Graaf goud op om weer{' '}
            <strong>in de plus</strong> te komen{stil ? '' : ' voordat de tijd op is'}.
          </p>
          <ul className="klein">
            <li>
              💰 <strong>Goud</strong> is geld dat de gemeente kan vrijmaken: plannen die je kunt
              schrappen en bezit dat je kunt verkopen. Hoe groter, hoe meer geld, maar groot goud is
              zwaar om op te halen.
            </li>
            <li>
              🪨 <strong>Stenen</strong> zijn kerntaken, zoals veiligheid en onderhoud. Daar
              bezuinigt de VVD niet op. Ze zijn zwaar en leveren niets op.
            </li>
            <li>
              ❓ Een <strong>zak</strong> geeft extra tijd of een sterkere grijper.
            </li>
          </ul>
          <p className="klein">
            {stil
              ? 'Richt de grijper met de knoppen of de pijltjes en druk op Graaf.'
              : 'Tik op het veld of druk op de spatiebalk als de grijper de goede kant op wijst.'}{' '}
            Drie levels: eenmalig geld, elk jaar geld, en de grote klappers.
          </p>
          <button ref={knop} type="button" className="knop-indienen" onClick={() => begin(1)}>
            Start level 1
          </button>
        </div>
      </div>
    );

  if (fase === 'klaar')
    return (
      <div className="mg-goudkantoor" data-testid="mg-goud-uitslag">
        <div className="mg-gz-kaart">
          <h3>
            {gehaald >= LEVELS.length
              ? 'Alle levels gehaald!'
              : `Je haalde ${gehaald} van de ${LEVELS.length} levels`}
          </h3>
          <p>
            Je groef <strong>{alleGevonden.length}</strong> manieren op om geld vrij te maken.
          </p>
          <SchattenLijst lijst={alleGevonden} jaar={jaar} />
          <BronRegel data={data} />
          <button
            ref={knop}
            type="button"
            className="knop-indienen"
            onClick={() => onKlaar(gehaald, LEVELS.length)}
          >
            Naar de uitslag
          </button>
        </div>
      </div>
    );

  if (levelKlaar)
    return (
      <div className="mg-goudkantoor">
        {hud}
        <div className="mg-gz-kaart" role="status" data-testid="mg-goud-einde">
          <h3>
            {inDePlus
              ? `Level ${levelNr} gehaald: je staat in de plus! 🎉`
              : `Level ${levelNr}: nog een tekort van ${mln(-kas)}`}
          </h3>
          <p className="klein">
            {gevonden.length} van de {alleSchatten.length} klompen goud opgegraven.
          </p>
          <SchattenLijst lijst={gevonden} jaar={jaar} />
          <div className="mg-gz-knoppen">
            {inDePlus && levelNr < LEVELS.length && (
              <button
                ref={knop}
                type="button"
                className="knop-indienen"
                onClick={() => {
                  boek();
                  begin(levelNr + 1);
                }}
              >
                Level {levelNr + 1}: {LEVELS[levelNr]?.naam}
              </button>
            )}
            {!inDePlus && (
              <button
                ref={knop}
                type="button"
                className="knop-indienen"
                onClick={() => {
                  boek();
                  begin(levelNr);
                }}
              >
                Probeer opnieuw
              </button>
            )}
            <button
              ref={inDePlus && levelNr >= LEVELS.length ? knop : undefined}
              type="button"
              className={inDePlus && levelNr >= LEVELS.length ? 'knop-indienen' : 'knop'}
              onClick={() => {
                boek();
                setFase('klaar');
              }}
            >
              {inDePlus && levelNr >= LEVELS.length ? 'Bekijk wat je vond' : 'Stoppen'}
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="mg-goudkantoor">
      {hud}
      <p className="mg-gz-level klein">
        <strong>
          Level {levelNr}: {level.naam}.
        </strong>{' '}
        {level.uitleg} Tekort: {mln(level.tekortMln)}.
      </p>
      <canvas
        ref={doek}
        className="mg-gz-veld"
        width={BREEDTE}
        height={HOOGTE}
        role="img"
        aria-label={`De grond met ${goudOver} klompen goud, stenen en verrassingen. De grijper wijst ${
          Math.abs(hoek) < 4 ? 'recht omlaag' : hoek < 0 ? 'naar links' : 'naar rechts'
        }.`}
        onPointerDown={(e) => {
          e.preventDefault();
          graaf();
        }}
      />
      <div className="mg-gz-knoppen">
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
          disabled={pauze}
        >
          ⛏️ Graaf!
        </button>
        {stil ? (
          <button
            type="button"
            className="knop"
            onClick={() => richt(RICHT_STAP)}
            disabled={hoek >= MAX_HOEK}
          >
            Richt rechts ▶
          </button>
        ) : (
          <button
            type="button"
            className="knop"
            onClick={() => setPauze((p) => !p)}
            aria-pressed={pauze}
          >
            {pauze ? '▶ Verder' : 'Pauze'}
          </button>
        )}
      </div>
      <div role="status" className="mg-goud-status">
        {melding && (
          <p key={melding.tijd} className={`mg-gz-melding mg-gz-${melding.soort}`}>
            {melding.soort === 'goud'
              ? '💰 '
              : melding.soort === 'steen'
                ? '🪨 '
                : melding.soort === 'zak'
                  ? '❓ '
                  : ''}
            {melding.tekst}
          </p>
        )}
        {sterk && <p className="klein">💪 Sterke grijper: je haalt alles sneller op.</p>}
      </div>
    </div>
  );
}

function SchattenLijst({ lijst, jaar }: { lijst: Schat[]; jaar: number }) {
  if (!lijst.length) return null;
  return (
    <ul className="mg-gz-lijst">
      {lijst.map((s) => (
        <li key={s.id}>
          <strong>
            {s.naam}: {mln(s.bedragMln)}
          </strong>{' '}
          <span className="klein">
            ({s.soort === 'S' ? 'elk jaar' : 'eenmalig'}; bedrag uit de begroting {jaar})
          </span>
          {s.vvd && (
            <blockquote className="mg-goud-vvd">
              “{s.vvd}”<footer>Verkiezingsprogramma VVD Groningen 2026-2030, p. {s.pagina}</footer>
            </blockquote>
          )}
        </li>
      ))}
    </ul>
  );
}

function BronRegel({ data }: Pick<MinigameProps, 'data'>) {
  const bron = data.minigames.find((m) => m.goud)?.goud;
  return (
    <p className="klein">
      Bronnen: de begroting {data.begroting.begrotingsjaar} van de gemeente Groningen
      {bron && (
        <>
          {' en het '}
          <a href={bron.url} target="_blank" rel="noopener noreferrer">
            {bron.bron}
          </a>
        </>
      )}
      .
    </p>
  );
}

// -------------------------------------------------------------------------------------------------
// Tekenen
// -------------------------------------------------------------------------------------------------

/** Een vaste vorm per id: zo ziet elke klomp er steeds hetzelfde uit. */
function vorm(id: string, hoeken: number, ruw: number): number[] {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const uit: number[] = [];
  for (let i = 0; i < hoeken; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    uit.push(1 - ruw + ((h % 1000) / 1000) * ruw * 2);
  }
  return uit;
}

function klomp(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, id: string): void {
  const v = vorm(id, 9, 0.18);
  ctx.beginPath();
  v.forEach((f, i) => {
    const a = (i / v.length) * Math.PI * 2;
    const px = x + Math.cos(a) * r * f;
    const py = y + Math.sin(a) * r * f * 0.85;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  const kleur = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  kleur.addColorStop(0, '#fff6b0');
  kleur.addColorStop(0.35, '#f7d23a');
  kleur.addColorStop(0.8, '#d49a0c');
  kleur.addColorStop(1, '#9c6a04');
  ctx.fillStyle = kleur;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#8a5d05';
  ctx.stroke();
  // glimmers
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.18, r * 0.1, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(x + r * 0.25, y + r * 0.1, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
}

function steen(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, id: string): void {
  const v = vorm(id, 8, 0.22);
  ctx.beginPath();
  v.forEach((f, i) => {
    const a = (i / v.length) * Math.PI * 2 + 0.3;
    const px = x + Math.cos(a) * r * f;
    const py = y + Math.sin(a) * r * f * 0.8;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  const kleur = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  kleur.addColorStop(0, '#c9ccd2');
  kleur.addColorStop(0.6, '#8b9099');
  kleur.addColorStop(1, '#5b6068');
  ctx.fillStyle = kleur;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#4b4f57';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.4, y - r * 0.1);
  ctx.lineTo(x - r * 0.05, y - r * 0.35);
  ctx.stroke();
}

function zak(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = '#b5772e';
  ctx.strokeStyle = '#6b4219';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.2, r, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.35, y - r * 0.55);
  ctx.lineTo(x, y - r * 0.9);
  ctx.lineTo(x + r * 0.35, y - r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8590c';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.2, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${r * 0.85}px Asap, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x, y + r * 0.24);
}

function tekenDing(ctx: CanvasRenderingContext2D, p: Plek, x = p.x, y = p.y): void {
  if (p.soort === 'goud') klomp(ctx, x, y, p.r, p.id);
  else if (p.soort === 'steen') steen(ctx, x, y, p.r, p.id);
  else zak(ctx, x, y, p.r);
}

/** De grond met lagen, zoals een doorsnede. Wordt één keer per maat gemaakt. */
let grondBeeld: HTMLCanvasElement | undefined;
function grond(): HTMLCanvasElement {
  if (grondBeeld) return grondBeeld;
  const c = document.createElement('canvas');
  c.width = BREEDTE;
  c.height = HOOGTE;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  // lucht
  const lucht = ctx.createLinearGradient(0, 0, 0, 70);
  lucht.addColorStop(0, '#8fd0ff');
  lucht.addColorStop(1, '#d9f0ff');
  ctx.fillStyle = lucht;
  ctx.fillRect(0, 0, BREEDTE, 70);
  // stad in de verte
  ctx.fillStyle = '#b9cbe0';
  for (let i = 0; i < 16; i++) {
    const h = 10 + ((i * 37) % 22);
    ctx.fillRect(i * 31 - 4, 70 - h, 24, h);
  }
  // lagen aarde
  const lagen = [
    { y: 70, kleur: ['#d9a35e', '#c98a45'] },
    { y: 150, kleur: ['#c47f3e', '#a9662c'] },
    { y: 235, kleur: ['#a4612b', '#8a4c1f'] },
    { y: 310, kleur: ['#86491d', '#6c3915'] },
  ];
  lagen.forEach((l, i) => {
    const g = ctx.createLinearGradient(0, l.y, 0, l.y + 90);
    g.addColorStop(0, l.kleur[0] ?? '#c98a45');
    g.addColorStop(1, l.kleur[1] ?? '#a9662c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, HOOGTE);
    for (let x = 0; x <= BREEDTE; x += 10) {
      const y = l.y + (i ? Math.sin(x / (55 + i * 13) + i * 1.7) * 9 : 0);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(BREEDTE, HOOGTE);
    ctx.closePath();
    ctx.fill();
    if (i) {
      ctx.strokeStyle = 'rgba(255,230,180,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
  // steentjes en korrels
  for (let i = 0; i < 160; i++) {
    const x = (i * 97) % BREEDTE;
    const y = 80 + ((i * 53) % (HOOGTE - 85));
    ctx.fillStyle = i % 3 ? 'rgba(60,30,10,0.18)' : 'rgba(255,240,200,0.18)';
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // grasrand
  ctx.fillStyle = '#5fa041';
  ctx.fillRect(0, 66, BREEDTE, 6);
  ctx.fillStyle = '#4a8a32';
  for (let x = 0; x < BREEDTE; x += 6) ctx.fillRect(x, 64 + (x % 12 ? 1 : 0), 2, 4);
  // de lier op een houten vlonder
  ctx.fillStyle = '#7a4f2a';
  ctx.fillRect(DRAAIPUNT.x - 48, 50, 96, 8);
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(DRAAIPUNT.x - 44, 58, 6, 10);
  ctx.fillRect(DRAAIPUNT.x + 38, 58, 6, 10);
  grondBeeld = c;
  return c;
}

/** De mijnwerker: blauwe overall, oranje helm, aan de lier. */
function mijnwerker(ctx: CanvasRenderingContext2D, zwengel: number): void {
  const x = DRAAIPUNT.x + 22;
  const y = 50;
  // lier
  ctx.fillStyle = '#3d4450';
  ctx.beginPath();
  ctx.arc(DRAAIPUNT.x, DRAAIPUNT.y - 12, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9aa3ad';
  ctx.beginPath();
  ctx.arc(DRAAIPUNT.x, DRAAIPUNT.y - 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2f36';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(DRAAIPUNT.x, DRAAIPUNT.y - 12);
  ctx.lineTo(DRAAIPUNT.x + Math.cos(zwengel) * 10, DRAAIPUNT.y - 12 + Math.sin(zwengel) * 10);
  ctx.stroke();
  // lijf
  ctx.fillStyle = '#1233c4';
  ctx.beginPath();
  ctx.roundRect(x - 7, y - 26, 14, 20, 4);
  ctx.fill();
  // benen
  ctx.fillStyle = '#0d248f';
  ctx.fillRect(x - 6, y - 7, 5, 8);
  ctx.fillRect(x + 1, y - 7, 5, 8);
  // arm naar de zwengel
  ctx.strokeStyle = '#1233c4';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 20);
  ctx.lineTo(DRAAIPUNT.x + Math.cos(zwengel) * 10, DRAAIPUNT.y - 12 + Math.sin(zwengel) * 10);
  ctx.stroke();
  // hoofd, baard en helm
  ctx.fillStyle = '#f2c29b';
  ctx.beginPath();
  ctx.arc(x, y - 32, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e9e4da';
  ctx.beginPath();
  ctx.arc(x, y - 28, 5, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#ff6400';
  ctx.beginPath();
  ctx.arc(x, y - 35, 7.5, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 9, y - 36, 18, 2.5);
  ctx.fillStyle = '#fff3a0';
  ctx.beginPath();
  ctx.arc(x - 6, y - 38, 2, 0, Math.PI * 2);
  ctx.fill();
}

function teken(
  canvas: HTMLCanvasElement | null,
  level: Level,
  weg: ReadonlySet<string>,
  g: Grijper,
  zwevers: Zwever[],
  nu: number,
): void {
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(BREEDTE * dpr);
  if (canvas.width !== w) {
    canvas.width = w;
    canvas.height = Math.round(HOOGTE * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(grond(), 0, 0);
  for (const p of level.plekken) if (!weg.has(p.id) && p.id !== g.vast?.id) tekenDing(ctx, p);

  // touw en grijper
  const r = (g.hoek * Math.PI) / 180;
  const lengte = 16 + g.lengte;
  const kx = DRAAIPUNT.x + Math.sin(r) * lengte;
  const ky = DRAAIPUNT.y + Math.cos(r) * lengte;
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(DRAAIPUNT.x, DRAAIPUNT.y - 12);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  if (g.vast) {
    const vx = kx + Math.sin(r) * g.vast.r * 0.8;
    const vy = ky + Math.cos(r) * g.vast.r * 0.8;
    tekenDing(ctx, g.vast, vx, vy);
  }
  ctx.save();
  ctx.translate(kx, ky);
  ctx.rotate(-r);
  const open = g.stand === 'zwaaien' || (g.stand === 'uit' && !g.vast) ? 1 : 0.45;
  ctx.strokeStyle = '#5b6470';
  ctx.fillStyle = '#8e959d';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  for (const kant of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(kant * 9 * open, 6, kant * 4 * open, 13);
    ctx.stroke();
  }
  ctx.restore();

  mijnwerker(ctx, g.stand === 'terug' ? -nu / 90 : g.stand === 'uit' ? nu / 120 : -0.6);

  // zwevende bedragen
  ctx.textAlign = 'center';
  ctx.font = '800 18px Asap, system-ui, sans-serif';
  for (let i = zwevers.length - 1; i >= 0; i--) {
    const z = zwevers[i];
    if (!z) continue;
    const f = (nu - z.begin) / 1400;
    if (f >= 1) {
      zwevers.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = 1 - f;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(z.tekst, z.x, z.y - f * 30);
    ctx.fillStyle = z.goed ? '#15875a' : '#c4321e';
    ctx.fillText(z.tekst, z.x, z.y - f * 30);
    ctx.globalAlpha = 1;
  }
}

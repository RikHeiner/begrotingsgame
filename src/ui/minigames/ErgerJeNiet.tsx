/**
 * "Groninger erger je niet": Mens erger je niet tegen het college. Jij hebt de blauwe pionnen van
 * VVD Groningen, de computer de rode van het college. Gooi een zes om buiten te komen, sla de ander
 * terug naar huis en breng je pionnen in je eindvak. Op een oranje ergernisvakje komt een ergernis
 * van VVD Groningen over het college voorbij, met de bron.
 *
 * Bij minder beweging lopen de pionnen niet over het bord en gooit het college pas als je op de
 * knop drukt.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BAAN,
  ERGER_STAPPEN,
  ERGER_VAKKEN,
  PIONNEN,
  START,
  THUIS,
  beginStand,
  doeZet,
  gooi,
  kiesZet,
  mogelijkeZetten,
  pionPlek,
  score,
  stapel,
  vakPlek,
  winnaar,
  type Ergernis,
  type Gevolg,
  type Pion,
  type Speler,
  type Stand,
  type Zet,
} from '../../game/mgErgerJeNiet';
import { Hud, Meldingen, SpelKaart, type Melding } from './kader/kader';
import { maakScherp, rondRechthoek, useLus, useStil, useToetsen } from './kader/hulp';
import type { MinigameProps } from './types';
import './ErgerJeNiet.css';

const ZIJDE = 440;
const VAK = ZIJDE / 11;
const KLEUR: Record<Speler, { vol: string; donker: string; licht: string }> = {
  vvd: { vol: '#1233c4', donker: '#0a1f7a', licht: '#cfd8ff' },
  college: { vol: '#d62f2f', donker: '#8a1414', licht: '#ffd6d1' },
};
/** Zo lang duurt één stapje van een pion (ms). */
const STAP_MS = 140;

type Kaart = { ergernis: Ergernis; speler: Speler; gevolg: Gevolg };
type Loop = { speler: Speler; nr: number; van: number; naar: number; begin: number };

export default function ErgerJeNiet({ data, onKlaar }: MinigameProps) {
  const stil = useStil();
  const alle = useMemo(() => data.ergernissen, [data]);
  const [fase, setFase] = useState<'start' | 'spelen' | 'klaar'>('start');
  const [stand, setStand] = useState<Stand>(beginStand);
  const [beurt, setBeurt] = useState<Speler>('vvd');
  const [worp, setWorp] = useState<number>();
  const [keuzes, setKeuzes] = useState<Zet[]>([]);
  const [kaart, setKaart] = useState<Kaart>();
  const [gezien, setGezien] = useState<Ergernis[]>([]);
  const [melding, setMelding] = useState<Melding>();
  const [geslagen, setGeslagen] = useState({ vvd: 0, college: 0 });
  const doek = useRef<HTMLCanvasElement>(null);
  const loop = useRef<Loop | undefined>(undefined);
  const stapelRef = useRef<Ergernis[]>([]);
  const [lopen, setLopen] = useState(false);

  const winst = winnaar(stand);
  const binnen = (s: Speler) =>
    stand.pionnen.filter((p) => p.speler === s && p.stap >= BAAN).length;

  /** De volgende ergernis van de stapel (opnieuw geschud als hij op is). */
  const pakErgernis = useCallback((): Ergernis | undefined => {
    if (!alle.length) return undefined;
    if (!stapelRef.current.length) stapelRef.current = stapel(alle);
    return stapelRef.current.pop();
  }, [alle]);

  const begin = () => {
    stapelRef.current = stapel(alle);
    setStand(beginStand());
    setBeurt('vvd');
    setWorp(undefined);
    setKeuzes([]);
    setKaart(undefined);
    setGezien([]);
    setGeslagen({ vvd: 0, college: 0 });
    setMelding({ tekst: 'Jij begint. Gooi een zes om een pion buiten te zetten.', tijd: 0 });
    setFase('spelen');
  };

  /** Na een zet (en de kaart): wie is er nu aan de beurt? */
  const volgende = useCallback((s: Stand, speler: Speler, w: number) => {
    setWorp(undefined);
    setKeuzes([]);
    if (winnaar(s)) {
      setFase('klaar');
      return;
    }
    // met een zes mag je nog een keer
    setBeurt(w === 6 ? speler : speler === 'vvd' ? 'college' : 'vvd');
  }, []);

  /** Doet een zet, toont wat er gebeurt en eventueel een ergerniskaart. */
  const zet = useCallback(
    (z: Zet, w: number) => {
      const g = doeZet(stand, z);
      const nu = performance.now();
      const wie = z.speler === 'vvd' ? 'Je' : 'Het college';
      const delen: string[] = [];
      if (z.van < 0) delen.push(`${wie} zet een pion buiten.`);
      else if (z.naar >= BAAN && z.van < BAAN) delen.push(`${wie} brengt een pion binnen!`);
      if (g.geslagen) {
        delen.push(
          z.speler === 'vvd'
            ? 'Je slaat een pion van het college terug naar huis! 💥'
            : 'Het college slaat jouw pion terug naar huis. Erger je niet! 😤',
        );
        setGeslagen((x) => ({ ...x, [z.speler]: x[z.speler] + 1 }));
      }
      setMelding(
        delen.length
          ? {
              tekst: delen.join(' '),
              tijd: nu,
              toon: g.geslagen && z.speler === 'college' ? 'fout' : 'goed',
            }
          : undefined,
      );
      if (!stil) {
        loop.current = { speler: z.speler, nr: z.nr, van: z.van, naar: z.naar, begin: nu };
        setLopen(true);
      }
      setStand(g.stand);
      const e = g.ergernisVak !== undefined ? pakErgernis() : undefined;
      if (e) {
        setGezien((x) => (x.includes(e) ? x : [...x, e]));
        setKaart({ ergernis: e, speler: z.speler, gevolg: g });
        setWorp(w);
        setKeuzes([]);
        return;
      }
      volgende(g.stand, z.speler, w);
    },
    [stand, stil, pakErgernis, volgende],
  );

  /** Gooien: voor jou met de knop, voor het college vanzelf (of met de knop bij minder beweging). */
  const werp = useCallback(() => {
    if (fase !== 'spelen' || kaart || worp !== undefined || lopen) return;
    const w = gooi();
    setWorp(w);
    const zetten = mogelijkeZetten(stand, beurt, w);
    if (!zetten.length) {
      setMelding({
        tekst:
          beurt === 'vvd'
            ? `Je gooit ${w}. Je kunt niets doen.`
            : `Het college gooit ${w} en kan niets doen.`,
        tijd: performance.now(),
      });
      window.setTimeout(() => volgende(stand, beurt, w), stil ? 0 : 700);
      return;
    }
    if (beurt === 'college') {
      const z = kiesZet(stand, zetten);
      window.setTimeout(() => z && zet(z, w), stil ? 0 : 650);
      return;
    }
    // maakt het niet uit welke pion, dan meteen
    const doelen = new Set(zetten.map((z) => `${z.van}>${z.naar}`));
    if (zetten.length === 1 || doelen.size === 1) {
      const eerste = zetten[0];
      if (eerste) window.setTimeout(() => zet(eerste, w), stil ? 0 : 350);
      return;
    }
    setKeuzes(zetten);
    setMelding({
      tekst: `Je gooit ${w}. Kies een pion: tik erop of gebruik de knoppen.`,
      tijd: performance.now(),
    });
  }, [fase, kaart, worp, lopen, stand, beurt, stil, volgende, zet]);

  // Het college gooit vanzelf (niet bij minder beweging: dan met de knop)
  useEffect(() => {
    if (stil || fase !== 'spelen' || beurt !== 'college' || kaart || worp !== undefined || lopen)
      return;
    const t = window.setTimeout(werp, 700);
    return () => window.clearTimeout(t);
  }, [stil, fase, beurt, kaart, worp, lopen, werp]);

  const sluitKaart = () => {
    if (!kaart) return;
    const w = worp ?? 0;
    setKaart(undefined);
    volgende(stand, kaart.speler, w);
  };

  useToetsen(fase === 'spelen', (e) => {
    if (kaart && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      sluitKaart();
    } else if (!kaart && beurt === 'vvd' && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      werp();
    } else if (keuzes.length && (e.key === '1' || e.key === '2')) {
      const z = keuzes[Number(e.key) - 1];
      if (z && worp) zet(z, worp);
    }
  });

  // Tekenen: elk beeld zolang een pion loopt, anders als er iets verandert
  useLus(lopen, (_dt, nu) => {
    const l = loop.current;
    if (!l || nu - l.begin > Math.max(1, l.naar - Math.max(0, l.van)) * STAP_MS + 60) {
      loop.current = undefined;
      setLopen(false);
    }
    teken(doek.current, stand, keuzes, worp, loop.current, nu);
  });
  useEffect(() => {
    if (fase === 'spelen' && !lopen) teken(doek.current, stand, keuzes, worp, undefined, 0);
  }, [fase, stand, keuzes, worp, lopen]);

  const tikOpBord = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!keuzes.length || !worp) {
      if (beurt === 'vvd' && !kaart) werp();
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * ZIJDE;
    const y = ((e.clientY - r.top) / r.height) * ZIJDE;
    let beste: { z: Zet; d: number } | undefined;
    for (const z of keuzes) {
      const p = pionPlek({ speler: 'vvd', nr: z.nr, stap: z.van });
      const d = Math.hypot((p.k + 0.5) * VAK - x, (p.r + 0.5) * VAK - y);
      if (!beste || d < beste.d) beste = { z, d };
    }
    if (beste && beste.d < VAK * 1.2) zet(beste.z, worp);
  };

  const hud = (
    <Hud
      icoon="🎲"
      testid="mg-erger-stand"
      links={[
        { label: 'Jij (VVD)', waarde: `${binnen('vvd')}/${PIONNEN} binnen` },
        { label: 'Geslagen', waarde: geslagen.vvd },
      ]}
      rechts={[
        { label: 'College', waarde: `${binnen('college')}/${PIONNEN} binnen` },
        { label: 'Ergernissen', waarde: gezien.length },
      ]}
    />
  );

  if (fase === 'start')
    return (
      <div className="mg-kader mg-erger">
        <SpelKaart
          titel="Groninger erger je niet"
          knop={{ tekst: 'Start het spel', onClick: begin }}
          testid="mg-erger-start"
        >
          <p>
            Speel Mens erger je niet tegen <strong>het college</strong>. Jij hebt de{' '}
            <strong className="mg-erger-vvd">blauwe pionnen</strong> van VVD Groningen, het college
            de <strong className="mg-erger-college">rode</strong>.
          </p>
          <ul className="klein">
            <li>Gooi een zes om een pion buiten te zetten. Met een zes mag je nog een keer.</li>
            <li>Kom je op een pion van het college, dan gaat die terug naar huis.</li>
            <li>
              Breng je {PIONNEN} pionnen rond het bord naar je eindvak in het midden. Wie dat eerst
              doet, wint.
            </li>
            <li>
              <span className="mg-erger-vakje" aria-hidden="true">
                !
              </span>{' '}
              Op een <strong>oranje ergernisvakje</strong> zie je iets van het college waar VVD
              Groningen zich aan ergerde, met de bron. Jij gaat dan {ERGER_STAPPEN} vakjes terug,
              het college zet door en gaat {ERGER_STAPPEN} vooruit (spelregel).
            </li>
          </ul>
          <p className="klein">
            {stil
              ? 'Druk op Gooi voor jouw beurt, en op "Laat het college gooien" voor de beurt van het college.'
              : 'Tik op het bord of op Gooi, of druk op de spatiebalk. Het college gooit vanzelf.'}
          </p>
        </SpelKaart>
      </div>
    );

  if (fase === 'klaar')
    return (
      <div className="mg-kader mg-erger" data-testid="mg-erger-uitslag">
        {hud}
        <SpelKaart
          titel={
            winst === 'vvd'
              ? 'Je hebt gewonnen van het college! 🎉'
              : 'Het college won. Erger je niet!'
          }
          knop={{ tekst: 'Naar de uitslag', onClick: () => onKlaar(score(stand), 100) }}
          extra={
            <button type="button" className="knop" onClick={begin}>
              Nog een potje
            </button>
          }
        >
          <p>
            Je kwam {gezien.length} {gezien.length === 1 ? 'ergernis' : 'ergernissen'} tegen.
          </p>
          <ErgernisLijst lijst={gezien} />
        </SpelKaart>
      </div>
    );

  return (
    <div className="mg-kader mg-erger">
      {hud}
      <p className="mg-strook klein" data-testid="mg-erger-beurt">
        <strong style={{ color: KLEUR[beurt].vol }}>
          {beurt === 'vvd' ? 'Jouw beurt' : 'Het college is aan de beurt'}
        </strong>
        {worp !== undefined && (
          <>
            {' '}
            · gegooid: <strong data-testid="mg-erger-worp">{worp}</strong>
          </>
        )}
      </p>
      <canvas
        ref={doek}
        className="mg-veld mg-erger-bord"
        width={ZIJDE}
        height={ZIJDE}
        role="img"
        aria-label={beschrijf(stand, beurt, worp)}
        onPointerDown={(e) => {
          e.preventDefault();
          tikOpBord(e);
        }}
      />
      <div className="mg-knoppen">
        {keuzes.length > 0 && worp
          ? keuzes.map((z, i) => (
              <button key={z.nr} type="button" className="knop" onClick={() => zet(z, worp)}>
                Pion {i + 1}: {z.van < 0 ? 'buiten zetten' : `${worp} vooruit`}
              </button>
            ))
          : beurt === 'vvd' && (
              <button
                type="button"
                className="knop-indienen mg-grote-knop"
                data-testid="mg-erger-gooi"
                onClick={werp}
                disabled={!!kaart || worp !== undefined || lopen}
              >
                🎲 Gooi
              </button>
            )}
        {beurt === 'college' && stil && !kaart && worp === undefined && (
          <button type="button" className="knop" data-testid="mg-erger-college" onClick={werp}>
            Laat het college gooien
          </button>
        )}
        <button type="button" className="knop" onClick={() => setFase('klaar')}>
          Stoppen
        </button>
      </div>
      <Meldingen melding={melding} />
      {kaart && <ErgernisKaart kaart={kaart} onVerder={sluitKaart} />}
    </div>
  );
}

function ErgernisKaart({ kaart, onVerder }: { kaart: Kaart; onVerder: () => void }) {
  const e = kaart.ergernis;
  const g = kaart.gevolg;
  const effect =
    g.naErgernis === undefined
      ? kaart.speler === 'vvd'
        ? 'Je hoeft niet terug: het vakje achter je is bezet.'
        : 'Het college kan niet verder: het vakje is bezet.'
      : kaart.speler === 'vvd'
        ? `Je ergert je en gaat ${ERGER_STAPPEN} vakjes terug.`
        : `Het college zet door en gaat ${ERGER_STAPPEN} vakjes vooruit.`;
  return (
    <div className="mg-erger-kaart-achter">
      <div
        className="mg-erger-kaart"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mg-erger-kaart-titel"
        data-testid="mg-erger-kaart"
      >
        <p className="mg-erger-kaart-kop">😤 Erger je niet!</p>
        <h4 id="mg-erger-kaart-titel">{e.onderwerp}</h4>
        <p>{e.ergernis}</p>
        {e.vvd && (
          <blockquote className="mg-erger-citaat">
            “{e.vvd}”{e.wie && <footer>{e.wie}, VVD Groningen</footer>}
          </blockquote>
        )}
        <p className="klein">
          Bron:{' '}
          <a href={e.url} target="_blank" rel="noopener noreferrer">
            {e.bron}, {e.titel}
          </a>{' '}
          ({datum(e.datum)})
        </p>
        <p className={`mg-erger-effect mg-erger-${kaart.speler}`}>{effect}</p>
        <KaartKnop onVerder={onVerder} />
      </div>
    </div>
  );
}

function KaartKnop({ onVerder }: { onVerder: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <button ref={ref} type="button" className="knop-indienen" onClick={onVerder}>
      Verder
    </button>
  );
}

function ErgernisLijst({ lijst }: { lijst: Ergernis[] }) {
  if (!lijst.length) return null;
  return (
    <ul className="mg-lijst" data-testid="mg-erger-lijst">
      {lijst.map((e) => (
        <li key={e.url + e.onderwerp}>
          <strong>{e.onderwerp}:</strong> {e.ergernis}{' '}
          <a className="klein" href={e.url} target="_blank" rel="noopener noreferrer">
            ({e.bron}, {datum(e.datum)})
          </a>
        </li>
      ))}
    </ul>
  );
}

const MAANDEN = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
];
function datum(d: string): string {
  const [j, m, dag] = d.split('-').map(Number);
  const maand = m ? MAANDEN[m - 1] : undefined;
  if (!j) return d;
  if (!maand) return String(j);
  return dag ? `${dag} ${maand} ${j}` : `${maand} ${j}`;
}

function beschrijf(stand: Stand, beurt: Speler, worp: number | undefined): string {
  const pionTekst = (p: Pion) =>
    p.stap < 0 ? 'thuis' : p.stap >= BAAN ? 'binnen' : `${p.stap + 1} vakjes onderweg`;
  const van = (s: Speler) =>
    stand.pionnen
      .filter((p) => p.speler === s)
      .map(pionTekst)
      .join(' en ');
  return `Het bord. Jouw pionnen: ${van('vvd')}. Pionnen van het college: ${van('college')}. ${
    beurt === 'vvd' ? 'Jij bent' : 'Het college is'
  } aan de beurt${worp ? `, gegooid: ${worp}` : ''}.`;
}

// -------------------------------------------------------------------------------------------------
// Tekenen
// -------------------------------------------------------------------------------------------------

const midden = (p: { k: number; r: number }) => ({ x: (p.k + 0.5) * VAK, y: (p.r + 0.5) * VAK });

/** Waar een pion nu staat, ook als hij onderweg is (stapje voor stapje). */
function pionPositie(
  p: Pion,
  l: Loop | undefined,
  nu: number,
): { x: number; y: number; h: number } {
  if (!l || l.speler !== p.speler || l.nr !== p.nr) return { ...midden(pionPlek(p)), h: 0 };
  const van = Math.max(-1, l.van);
  const stappen = l.naar - Math.max(0, van);
  const t = Math.max(0, (nu - l.begin) / STAP_MS);
  if (van < 0 && t < 1) {
    // van huis naar het startvakje: één sprong
    const a = midden(pionPlek({ ...p, stap: -1 }));
    const b = midden(pionPlek({ ...p, stap: 0 }));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, h: Math.sin(t * Math.PI) * 10 };
  }
  const begin = Math.max(0, van);
  const i = Math.min(stappen, Math.floor(van < 0 ? t - 1 : t));
  const f = Math.min(1, (van < 0 ? t - 1 : t) - i);
  if (i >= stappen) return { ...midden(pionPlek(p)), h: 0 };
  const a = midden(pionPlek({ ...p, stap: begin + i }));
  const b = midden(pionPlek({ ...p, stap: begin + i + 1 }));
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, h: Math.sin(f * Math.PI) * 8 };
}

function teken(
  doek: HTMLCanvasElement | null,
  stand: Stand,
  keuzes: Zet[],
  worp: number | undefined,
  loop: Loop | undefined,
  nu: number,
): void {
  const ctx = maakScherp(doek, ZIJDE, ZIJDE);
  if (!ctx) return;
  // het bord: hout met een rand
  const hout = ctx.createLinearGradient(0, 0, ZIJDE, ZIJDE);
  hout.addColorStop(0, '#f6e3b4');
  hout.addColorStop(1, '#e9c987');
  ctx.fillStyle = hout;
  ctx.fillRect(0, 0, ZIJDE, ZIJDE);
  // thuishoeken
  for (const s of ['vvd', 'college'] as Speler[]) {
    // de thuishoek: binnen de baan, linksonder (VVD) en rechtsboven (college)
    const hoek = s === 'vvd' ? { x: 1.1, y: 6.9 } : { x: 6.9, y: 1.1 };
    ctx.fillStyle = KLEUR[s].licht;
    rondRechthoek(ctx, hoek.x * VAK, hoek.y * VAK, 3 * VAK, 3 * VAK, 16);
    ctx.fill();
    ctx.fillStyle = KLEUR[s].donker;
    ctx.font = '800 11px Asap, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      s === 'vvd' ? 'VVD' : 'COLLEGE',
      (hoek.x + (s === 'vvd' ? 2.3 : 0.75)) * VAK,
      (hoek.y + (s === 'vvd' ? 0.6 : 2.4)) * VAK,
    );
  }
  // het midden: de Martinitoren
  martini(ctx, 5.5 * VAK, 5.5 * VAK);
  // de baan
  for (let i = 0; i < BAAN; i++) {
    const m = midden(vakPlek(i));
    const erger = (ERGER_VAKKEN as readonly number[]).includes(i);
    const start = i === START.vvd ? 'vvd' : i === START.college ? 'college' : undefined;
    vakje(
      ctx,
      m.x,
      m.y,
      start ? KLEUR[start].vol : erger ? '#f28c00' : '#ffffff',
      erger ? '!' : '',
    );
  }
  // eindvakken en thuisvakjes
  for (const s of ['vvd', 'college'] as Speler[]) {
    for (let st = BAAN; st < BAAN + 4; st++) {
      const m = midden(pionPlek({ speler: s, nr: 0, stap: st }));
      vakje(ctx, m.x, m.y, KLEUR[s].licht, '', KLEUR[s].vol);
    }
    for (const plek of THUIS[s]) {
      const m = midden(plek);
      vakje(ctx, m.x, m.y, '#ffffff', '', KLEUR[s].vol);
    }
  }
  // pijltjes bij de start
  for (const s of ['vvd', 'college'] as Speler[]) {
    const m = midden(vakPlek(START[s]));
    ctx.fillStyle = KLEUR[s].donker;
    ctx.font = '800 9px Asap, system-ui, sans-serif';
    ctx.fillText('START', m.x + (s === 'vvd' ? 30 : -30), m.y);
  }
  // pionnen die je kunt kiezen, oplichten
  const kiesbaar = new Set(keuzes.map((z) => z.nr));
  const lijst = [...stand.pionnen].sort((a, b) => pionPlek(a).r - pionPlek(b).r);
  for (const p of lijst) {
    const pos = pionPositie(p, loop, nu);
    if (p.speler === 'vvd' && kiesbaar.has(p.nr)) {
      ctx.strokeStyle = '#f28c00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, VAK * 0.46, 0, Math.PI * 2);
      ctx.stroke();
    }
    pion(ctx, pos.x, pos.y - pos.h, p.speler);
  }
  // de dobbelsteen
  if (worp) dobbelsteen(ctx, 7.6 * VAK, 7.6 * VAK, worp);
}

function vakje(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vul: string,
  tekst: string,
  rand = '#7a5a2a',
): void {
  const r = VAK * 0.4;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.arc(x + 1.5, y + 2, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = vul;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rand;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (tekst) {
    ctx.fillStyle = '#fff';
    ctx.font = '900 15px Asap, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tekst, x, y + 1);
  }
}

function pion(ctx: CanvasRenderingContext2D, x: number, y: number, s: Speler): void {
  const k = KLEUR[s];
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 9, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
  g.addColorStop(0, k.vol);
  g.addColorStop(0.45, '#ffffff99');
  g.addColorStop(0.55, k.vol);
  g.addColorStop(1, k.donker);
  ctx.fillStyle = g;
  // voet en lijf
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 9);
  ctx.quadraticCurveTo(x - 9, y + 2, x - 4, y - 2);
  ctx.lineTo(x + 4, y - 2);
  ctx.quadraticCurveTo(x + 9, y + 2, x + 10, y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = k.vol;
  ctx.beginPath();
  ctx.arc(x, y - 7, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffffaa';
  ctx.beginPath();
  ctx.arc(x - 2, y - 9, 2, 0, Math.PI * 2);
  ctx.fill();
}

function dobbelsteen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  const z = 30;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.12);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#ffffff';
  rondRechthoek(ctx, -z / 2, -z / 2, z, z, 6);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();
  const ogen: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [
      [-1, -1],
      [1, 1],
    ],
    3: [
      [-1, -1],
      [0, 0],
      [1, 1],
    ],
    4: [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ],
    5: [
      [-1, -1],
      [1, -1],
      [0, 0],
      [-1, 1],
      [1, 1],
    ],
    6: [
      [-1, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [1, 1],
    ],
  };
  ctx.fillStyle = w === 6 ? '#d62f2f' : '#1a1a1a';
  for (const [a, b] of ogen[w] ?? []) {
    ctx.beginPath();
    ctx.arc(a * 8, b * 8, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Een kleine Martinitoren in het midden van het bord. */
function martini(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.fillStyle = '#ffffffaa';
  ctx.beginPath();
  ctx.arc(x, y, VAK * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a6a3a';
  const lagen: [number, number][] = [
    [9, 8],
    [7, 6],
    [5, 5],
    [4, 4],
  ];
  let top = y + 12;
  for (const [b, h] of lagen) {
    ctx.fillRect(x - b / 2, top - h, b, h);
    top -= h;
  }
  ctx.fillStyle = '#3f8a6a';
  ctx.beginPath();
  ctx.moveTo(x - 2.5, top);
  ctx.quadraticCurveTo(x, top - 7, x + 2.5, top);
  ctx.fill();
  ctx.restore();
}

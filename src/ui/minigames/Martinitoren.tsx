/**
 * Martinitoren: "Beklim d'Olle Grieze". Steeds twee posten met een naam die iedereen begrijpt:
 * waar gaat meer geld naartoe? Bij een goed antwoord klimt de klimmer een geleding hoger, bij een
 * fout antwoord glijdt hij een stukje terug. Per vraag loopt de tijd (snel goed: een halve trede
 * extra). Hoe hoger je komt, hoe later het wordt: van middag naar avond.
 *
 * Bij minder beweging loopt er geen tijd en beweegt er niets vanzelf: je kiest in beurten.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatEuro } from '../../engine';
import { inwoners, type BekendePost } from '../../game/minigames';
import {
  SNEL,
  STAP_BONUS,
  STAP_FOUT,
  TIJD,
  TOP,
  TOREN_METER,
  TREDEN_METER,
  beoordeel,
  euroPerInwoner,
  geledingBij,
  juisteKant,
  lessen,
  meterBij,
  nieuweTreden,
  parenUitData,
  type Antwoord,
  type Kant,
  type Paar,
} from '../../game/mgMartinitoren';
import { Hud, Meldingen, PauzeKnop, SpelKaart, type Melding } from './kader/kader';
import { maakScherp, mln, rondRechthoek, useLus, useStil, useToetsen } from './kader/hulp';
import type { MinigameProps } from './types';
import './Martinitoren.css';

type Fase = 'start' | 'spelen' | 'klaar';

/** De klimmer beweegt van `van` naar `naar` meter (buiten React: elk beeld verandert dat). */
type Beweging = { van: number; naar: number; begin: number; duur: number; soort: 'klim' | 'glij' };
type Zwever = { tekst: string; kleur: string; begin: number };
type Snipper = { x: number; y: number; vx: number; vy: number; kleur: string; draai: number };

export default function Martinitoren({ data, onKlaar }: MinigameProps) {
  const stil = useStil();
  const [fase, setFase] = useState<Fase>('start');
  const [paren, setParen] = useState<Paar[]>(() => parenUitData(data));
  const [i, setI] = useState(0);
  const [treden, setTreden] = useState(0);
  const [antwoorden, setAntwoorden] = useState<Antwoord[]>([]);
  const [tijd, setTijd] = useState(TIJD);
  const [pauze, setPauze] = useState(false);
  const [melding, setMelding] = useState<Melding>();

  const doek = useRef<HTMLCanvasElement>(null);
  const volgendeKnop = useRef<HTMLButtonElement>(null);
  const linksKnop = useRef<HTMLButtonElement>(null);
  const beweging = useRef<Beweging>({ van: 0, naar: 0, begin: 0, duur: 1, soort: 'klim' });
  const tijdOver = useRef(TIJD);
  const beantwoordBij = useRef(-1);
  const zwevers = useRef<Zwever[]>([]);
  const snippers = useRef<Snipper[]>([]);

  const aantalInwoners = inwoners(data);
  const jaar = data.begroting.begrotingsjaar;
  const paar = paren[i];
  const antwoord = antwoorden[i];
  const beantwoord = !!antwoord;
  const meter = meterBij(treden);
  const opDeTop = treden >= TOP;
  const laatste = opDeTop || i + 1 >= paren.length;
  const goed = antwoorden.filter((a) => a.uitkomst === 'goed' || a.uitkomst === 'snel').length;

  // ---------------------------------------------------------------------------------------------
  // Spelen
  // ---------------------------------------------------------------------------------------------

  const begin = useCallback(
    (nieuw: boolean) => {
      if (nieuw) setParen(parenUitData(data));
      setI(0);
      setTreden(0);
      setAntwoorden([]);
      setTijd(TIJD);
      setPauze(false);
      setMelding(undefined);
      tijdOver.current = TIJD;
      beantwoordBij.current = -1;
      beweging.current = { van: 0, naar: 0, begin: 0, duur: 1, soort: 'klim' };
      zwevers.current = [];
      snippers.current = [];
      setFase('spelen');
    },
    [data],
  );

  const kies = (kant: Kant | undefined) => {
    if (!paar || fase !== 'spelen' || pauze || beantwoord || beantwoordBij.current === i) return;
    beantwoordBij.current = i;
    const nu = performance.now();
    const uitkomst = beoordeel(paar, kant, stil ? undefined : tijdOver.current);
    const nt = nieuweTreden(treden, uitkomst);
    setTreden(nt);
    setAntwoorden((a) => [
      ...a,
      { paar, ...(kant ? { gekozen: kant } : {}), uitkomst, treden: nt },
    ]);

    // de klimmer: vanaf waar hij nu is naar de nieuwe hoogte
    const naar = meterBij(nt);
    const van = stil ? naar : huidigeMeter(beweging.current, nu);
    const omhoog = naar >= van;
    beweging.current = {
      van,
      naar,
      begin: nu,
      duur: omhoog ? 1100 + (naar - van) * 18 : 750,
      soort: omhoog ? 'klim' : 'glij',
    };
    const plus = uitkomst === 'snel' ? '+1½ trede' : uitkomst === 'goed' ? '+1 trede' : '−½ trede';
    if (!stil && naar !== van)
      zwevers.current.push({
        tekst: uitkomst === 'snel' ? `Snel! ${plus}` : plus,
        kleur: omhoog ? '#0e6b45' : '#b02a17',
        begin: nu,
      });
    if (!stil && nt >= TOP && treden < TOP) snippers.current = maakSnippers();

    const juist = juisteKant(paar);
    const groot = juist === 'links' ? paar.links : paar.rechts;
    const klein = juist === 'links' ? paar.rechts : paar.links;
    const keer = (groot.bedragMln / klein.bedragMln).toLocaleString('nl-NL', {
      maximumFractionDigits: 1,
    });
    const verder = `${groot.naam} krijgt ${keer} keer zoveel als ‘${klein.naam}’.`;
    const hoogte = `${Math.round(naar)} meter`;
    setMelding({
      tijd: nu,
      toon: uitkomst === 'goed' || uitkomst === 'snel' ? 'goed' : 'fout',
      tekst:
        uitkomst === 'snel'
          ? `✅ Goed én snel! Je klimt naar ${hoogte}. ${verder}`
          : uitkomst === 'goed'
            ? `✅ Goed! Je klimt naar ${hoogte}. ${verder}`
            : uitkomst === 'telaat'
              ? `⏰ De tijd is op. Je glijdt terug naar ${hoogte}. ${verder}`
              : `❌ Helaas. Je glijdt terug naar ${hoogte}. ${verder}`,
    });
  };

  const volgende = () => {
    if (!beantwoord) return;
    if (laatste) {
      setFase('klaar');
      return;
    }
    setI(i + 1);
    setTijd(TIJD);
    tijdOver.current = TIJD;
  };

  // Na een antwoord de knop "Volgende" in beeld; bij een nieuwe vraag de eerste keuze.
  useEffect(() => {
    if (fase !== 'spelen') return;
    if (beantwoord) volgendeKnop.current?.focus({ preventScroll: false });
    else if (i > 0) linksKnop.current?.focus({ preventScroll: true });
  }, [beantwoord, i, fase]);

  useToetsen(fase === 'spelen', (e) => {
    if (e.key === 'ArrowLeft' || e.key === '1') {
      e.preventDefault();
      kies('links');
    } else if (e.key === 'ArrowRight' || e.key === '2') {
      e.preventDefault();
      kies('rechts');
    } else if ((e.key === 'Enter' || e.key === ' ') && beantwoord) {
      e.preventDefault();
      volgende();
    } else if ((e.key === 'p' || e.key === 'P') && !stil) setPauze((p) => !p);
  });

  // Elk beeld: de tijd aftellen en tekenen (niet bij minder beweging).
  useLus(!stil && fase === 'spelen', (dt, nu) => {
    if (!pauze && !beantwoord && paar) {
      tijdOver.current = Math.max(0, tijdOver.current - dt);
      const sec = Math.ceil(tijdOver.current);
      if (sec !== tijd) setTijd(sec);
      if (tijdOver.current <= 0) kies(undefined);
    }
    teken(doek.current, {
      nu,
      stil: false,
      pauze,
      beweging: beweging.current,
      zwevers: zwevers.current,
      snippers: snippers.current,
      dt: pauze ? 0 : dt,
    });
  });

  // Bij minder beweging: alleen tekenen als er iets verandert.
  useEffect(() => {
    if (!stil || fase !== 'spelen') return;
    teken(doek.current, {
      nu: 0,
      stil: true,
      pauze: false,
      beweging: beweging.current,
      zwevers: [],
      snippers: [],
      dt: 0,
    });
  }, [stil, fase, treden, i]);

  // ---------------------------------------------------------------------------------------------
  // Scherm
  // ---------------------------------------------------------------------------------------------

  if (fase === 'start')
    return (
      <div className="mg-kader mt-spel" data-testid="mt-start">
        <SpelKaart
          titel="Beklim d'Olle Grieze"
          knop={{ tekst: 'Start de klim', onClick: () => begin(false) }}
        >
          <p>
            De Martinitoren is <strong>97 meter</strong> hoog. Klim naar de top door te raden{' '}
            <strong>waar de gemeente meer geld aan uitgeeft</strong>.
          </p>
          <ul className="klein">
            <li>
              Je ziet steeds twee dingen waar de gemeente geld aan uitgeeft. Kies wat meer kost.
            </li>
            <li>
              ✅ Goed: je klimt een stuk hoger.
              {!stil && ` Binnen ${SNEL} seconden goed: nog een halve trede extra.`}
            </li>
            <li>❌ Fout{stil ? '' : ' of te laat'}: je glijdt een halve trede terug.</li>
            <li>
              {paren.length} vragen. Ze worden steeds moeilijker: de bedragen liggen dan dichter bij
              elkaar.
            </li>
          </ul>
          <p className="klein">
            {stil
              ? 'Er loopt geen tijd: neem rustig de tijd voor elke vraag.'
              : `Je hebt ${TIJD} seconden per vraag.`}{' '}
            Kies met een tik, of met de pijltjes ← en →. De treden, de tijd en de bonus zijn
            spelregels; de bedragen komen uit de begroting {jaar}.
          </p>
        </SpelKaart>
      </div>
    );

  if (fase === 'klaar') {
    const leer = lessen(antwoorden, aantalInwoners);
    const snel = antwoorden.filter((a) => a.uitkomst === 'snel').length;
    return (
      <div className="mg-kader mt-spel" data-testid="mt-einde">
        <SpelKaart
          titel={
            opDeTop
              ? 'Je staat op de top: 97 meter! 🎉'
              : `Je kwam tot ${Math.round(meter)} meter: ${geledingBij(meter)}`
          }
          knop={{
            tekst: 'Naar de uitslag',
            onClick: () => onKlaar(Math.round(meter), TOREN_METER),
          }}
          extra={
            <button type="button" className="knop" onClick={() => begin(true)}>
              Nog een keer klimmen
            </button>
          }
        >
          <p>
            Je had <strong>{goed}</strong> van de {antwoorden.length} vragen goed
            {snel > 0 && <>, waarvan {snel} heel snel</>}.
          </p>
          {leer.length > 0 && (
            <>
              <h4 className="mt-kop">Wat je leerde</h4>
              <ul className="klein">
                {leer.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </>
          )}
          <h4 className="mt-kop">Jouw vragen</h4>
          <ol className="mg-lijst mt-paren" data-testid="mt-paren">
            {antwoorden.map((a) => (
              <PaarRegel key={a.paar.links.id} a={a} aantalInwoners={aantalInwoners} />
            ))}
          </ol>
          <p className="klein">
            Bedragen: uitgaven per jaar in de begroting {jaar} van de gemeente Groningen. Per
            inwoner: het bedrag gedeeld door {aantalInwoners.toLocaleString('nl-NL')} inwoners. ⚠︎
            Dat is een gemiddelde: de gemeente betaalt veel ook met geld van het Rijk.
          </p>
        </SpelKaart>
      </div>
    );
  }

  if (!paar) return null;
  const juist = juisteKant(paar);
  const knopVoor = (kant: Kant) => {
    const post = kant === 'links' ? paar.links : paar.rechts;
    const toon = !antwoord
      ? ''
      : kant === juist
        ? ' mt-juist'
        : antwoord.gekozen === kant
          ? ' mt-mis'
          : ' mt-anders';
    return (
      <button
        ref={kant === 'links' ? linksKnop : undefined}
        type="button"
        className={`mt-keuze${toon}`}
        onClick={() => kies(kant)}
        aria-disabled={beantwoord || pauze}
        aria-pressed={antwoord?.gekozen === kant}
        data-testid={`mt-keuze-${kant}`}
      >
        <span className="mt-toets" aria-hidden="true">
          {kant === 'links' ? '←' : '→'}
        </span>
        <strong className="mt-naam">{post.naam}</strong>
        <span className="mt-uitleg">{post.uitleg}</span>
        {antwoord && (
          <PostBedrag post={post} aantalInwoners={aantalInwoners} meer={kant === juist} />
        )}
      </button>
    );
  };

  return (
    <div className="mg-kader mt-spel">
      <Hud
        testid="mt-stand"
        icoon="🧗"
        links={[
          { label: 'Hoogte', waarde: `${Math.round(meter)} m`, testid: 'mt-hoogte' },
          { label: 'Vraag', waarde: `${i + 1} van ${paren.length}` },
        ]}
        rechts={[
          stil
            ? { label: 'Tijd', waarde: 'rustig' }
            : {
                label: 'Tijd',
                waarde: beantwoord ? '–' : `${tijd} s`,
                ...(tijd <= 3 && !beantwoord ? { toon: 'fout' as const } : {}),
              },
          { label: 'Goed', waarde: goed, toon: 'goed' },
        ]}
      />
      <p className="mg-strook mt-vraag">
        <strong>Waar gaat in {jaar} meer geld naartoe?</strong>
        {!stil && (
          <span
            className={`mt-tijdbalk${beantwoord || pauze ? ' mt-tijdbalk-stil' : ''}`}
            style={{ width: `${(Math.max(0, beantwoord ? 0 : tijd - 1) / TIJD) * 100}%` }}
            aria-hidden="true"
          />
        )}
      </p>
      <canvas
        ref={doek}
        className="mg-veld mt-veld"
        width={480}
        height={360}
        role="img"
        aria-label={`De Martinitoren, 97 meter hoog. Je klimmer is op ${Math.round(meter)} meter, bij ${geledingBij(
          meter,
        )}.${opDeTop ? ' Je bent op de top!' : ''}${pauze ? ' Het spel staat op pauze.' : ''}`}
      />
      <div className="mt-keuzes" role="group" aria-label="Kies waar meer geld naartoe gaat">
        {knopVoor('links')}
        <span className="mt-of" aria-hidden="true">
          of
        </span>
        {knopVoor('rechts')}
      </div>
      <div className="mg-knoppen">
        {beantwoord && (
          <button
            ref={volgendeKnop}
            type="button"
            className="knop-indienen mg-grote-knop"
            onClick={volgende}
          >
            {opDeTop ? 'Naar de top! 🎉' : laatste ? 'Bekijk je klim' : 'Volgende vraag ▲'}
          </button>
        )}
        {!stil && !beantwoord && <PauzeKnop pauze={pauze} onWissel={() => setPauze((p) => !p)} />}
      </div>
      <Meldingen melding={melding}>
        {!stil && !beantwoord && !melding && (
          <p className="klein mt-hint">
            Tip: binnen {SNEL} seconden goed is +{STAP_BONUS === 0.5 ? '½' : STAP_BONUS} trede
            extra. Fout of te laat is −{STAP_FOUT === 0.5 ? '½' : STAP_FOUT} trede.
          </p>
        )}
      </Meldingen>
    </div>
  );
}

function PostBedrag({
  post,
  aantalInwoners,
  meer,
}: {
  post: BekendePost;
  aantalInwoners: number;
  meer: boolean;
}) {
  return (
    <span className="mt-bedrag">
      <span className="mt-mln">
        {meer ? '▲ ' : ''}
        {mln(post.bedragMln)}
      </span>
      <span className="mt-pi">
        {formatEuro(euroPerInwoner(post.bedragMln, aantalInwoners))} per inwoner
      </span>
      {post.soort && (
        <span className={`mt-soort mt-soort-${post.soort}`}>
          {post.soort === 'wet'
            ? `Moet van de wet${post.wet ? ` (${post.wet})` : ''}`
            : 'Eigen keuze'}
        </span>
      )}
    </span>
  );
}

function PaarRegel({ a, aantalInwoners }: { a: Antwoord; aantalInwoners: number }) {
  const juist = juisteKant(a.paar);
  const groot = juist === 'links' ? a.paar.links : a.paar.rechts;
  const klein = juist === 'links' ? a.paar.rechts : a.paar.links;
  const ok = a.uitkomst === 'goed' || a.uitkomst === 'snel';
  const pi = (p: BekendePost) => formatEuro(euroPerInwoner(p.bedragMln, aantalInwoners));
  return (
    <li>
      <span aria-label={ok ? 'goed' : 'fout'}>
        {ok ? '✅' : a.uitkomst === 'telaat' ? '⏰' : '❌'}
      </span>{' '}
      <strong>{groot.naam}</strong> {mln(groot.bedragMln)}{' '}
      <span className="klein">({pi(groot)} per inwoner)</span> is meer dan{' '}
      <strong>{klein.naam}</strong> {mln(klein.bedragMln)}{' '}
      <span className="klein">({pi(klein)} per inwoner)</span>
    </li>
  );
}

// -------------------------------------------------------------------------------------------------
// Beweging
// -------------------------------------------------------------------------------------------------

const zacht = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function voortgang(b: Beweging, nu: number): number {
  return Math.max(0, Math.min(1, (nu - b.begin) / b.duur));
}

function huidigeMeter(b: Beweging, nu: number): number {
  const t = voortgang(b, nu);
  const f = b.soort === 'glij' ? t * t * (3 - 2 * t) : zacht(t);
  return b.van + (b.naar - b.van) * f;
}

const KLEUREN = ['#ffd84d', '#1233c4', '#ff6400', '#2fa36b', '#e23a5b', '#ffffff'];
function maakSnippers(): Snipper[] {
  return Array.from({ length: 70 }, (_, n) => ({
    x: TX + (Math.random() - 0.5) * 30,
    y: 70,
    vx: (Math.random() - 0.5) * 220,
    vy: -80 - Math.random() * 160,
    kleur: KLEUREN[n % KLEUREN.length] ?? '#ffd84d',
    draai: Math.random() * 6,
  }));
}

// -------------------------------------------------------------------------------------------------
// Tekenen: de wereld in meters, de camera volgt de klimmer
// -------------------------------------------------------------------------------------------------

/** Het veld in beeldpunten. */
const B = 480;
const H = 360;
/** Beeldpunten per meter. */
const S = 6;
/** Zoveel beeldpunten straat onder de toren, als de camera onderaan staat. */
const GROND = 46;
/** Het midden van de toren. */
const TX = 196;
/** Zo hoog (meter) gaat de vooraf getekende wereld. */
const WERELD = 112;
const SCENE_H = WERELD * S + GROND;
/** y in de vooraf getekende wereld voor een hoogte in meter. */
const sy = (m: number) => WERELD * S - m * S;
/** De camera kijkt zo hoog (meter onderaan het beeld). */
const camera = (m: number) => Math.max(0, Math.min(50, m - 18));
/** y op het scherm voor een hoogte in meter, bij camera `c`. */
const schermY = (m: number, c: number) => H - GROND - (m - c) * S;

/** De halve breedte van de toren (meter) op hoogte m, met zachte overgangen. */
function halveBreedte(m: number): number {
  const stukken: [number, number][] = [
    [0, 7],
    [28.5, 6],
    [48.5, 5],
    [62.5, 4.2],
    [75, 3.2],
    [84, 3.6],
    [87, 3.4],
    [91.5, 0.9],
    [97, 0.4],
  ];
  for (let k = stukken.length - 1; k >= 0; k--) {
    const [vanaf, w] = stukken[k] ?? [0, 7];
    if (m >= vanaf) {
      const vorige = stukken[k - 1]?.[1] ?? w;
      const t = Math.min(1, (m - vanaf) / 1.5);
      return k >= 6 ? w : vorige + (w - vorige) * t;
    }
  }
  return 7;
}

type Beeld = {
  nu: number;
  stil: boolean;
  pauze: boolean;
  beweging: Beweging;
  zwevers: Zwever[];
  snippers: Snipper[];
  dt: number;
};

function teken(doekEl: HTMLCanvasElement | null, b: Beeld): void {
  const ctx = maakScherp(doekEl, B, H);
  if (!ctx) return;
  const r = Math.min(2, window.devicePixelRatio || 1);
  const m = b.stil ? b.beweging.naar : huidigeMeter(b.beweging, b.nu);
  const c = camera(m);
  const f = Math.min(1, m / TOREN_METER);
  const t = b.stil ? 0 : b.nu / 1000;

  lucht(ctx, f, t, b.stil);
  wolken(ctx, c, f, t);
  vogels(ctx, c, t, b.stil);
  // de wereld (toren, kerk, huizen, markt)
  const wereld = scene(r);
  const bronY = sy(c) - (H - GROND);
  ctx.drawImage(wereld, 0, bronY * r, B * r, H * r, 0, 0, B, H);
  // avondlicht
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = mengKleur(['#ffffff', '#ffe6cc', '#e9c9de'], f);
  ctx.fillRect(0, 0, B, H);
  ctx.restore();

  bordjes(ctx, c, m);
  const bewegend = !b.stil && voortgang(b.beweging, b.nu) < 1;
  klimmer(ctx, m, c, {
    soort: bewegend ? b.beweging.soort : 'rust',
    t,
    top: m >= TOREN_METER - 0.01,
  });
  hoogtemeter(ctx, m);

  // zwevende teksten
  ctx.textAlign = 'center';
  ctx.font = '800 16px Asap, system-ui, sans-serif';
  const kx = TX + (halveBreedte(m) - 1.6) * S;
  const ky = schermY(m, c);
  for (let n = b.zwevers.length - 1; n >= 0; n--) {
    const z = b.zwevers[n];
    if (!z) continue;
    const v = (b.nu - z.begin) / 1600;
    if (v >= 1) {
      b.zwevers.splice(n, 1);
      continue;
    }
    ctx.globalAlpha = 1 - v * v;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(z.tekst, Math.min(B - 110, kx + 46), ky - 30 - v * 30);
    ctx.fillStyle = z.kleur;
    ctx.fillText(z.tekst, Math.min(B - 110, kx + 46), ky - 30 - v * 30);
    ctx.globalAlpha = 1;
  }

  // snippers op de top
  for (const s of b.snippers) {
    s.vy += 160 * b.dt;
    s.x += s.vx * b.dt;
    s.y += s.vy * b.dt;
    s.draai += 6 * b.dt;
    if (s.y > H + 10) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.draai);
    ctx.fillStyle = s.kleur;
    ctx.fillRect(-3, -1.5, 6, 3);
    ctx.restore();
  }

  if (b.pauze) {
    ctx.fillStyle = 'rgba(20,24,48,0.55)';
    ctx.fillRect(0, 0, B, H);
    ctx.fillStyle = '#fff';
    ctx.font = '800 30px Asap, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pauze', B / 2, H / 2 + 10);
  }
}

// --- kleuren -------------------------------------------------------------------------------------

function hexNaarRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Een kleur tussen de gegeven kleuren, bij f van 0 tot 1. */
function mengKleur(kleuren: string[], f: number): string {
  const p = Math.max(0, Math.min(1, f)) * (kleuren.length - 1);
  const k = Math.min(kleuren.length - 2, Math.floor(p));
  const a = hexNaarRgb(kleuren[k] ?? '#000000');
  const z = hexNaarRgb(kleuren[k + 1] ?? '#000000');
  const u = p - k;
  const m = a.map((x, n) => Math.round(x + ((z[n] ?? 0) - x) * u));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

// --- lucht, wolken en vogels ---------------------------------------------------------------------

function lucht(ctx: CanvasRenderingContext2D, f: number, t: number, stil: boolean): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mengKleur(['#3f95e0', '#4f72cc', '#33388a', '#1b1f55'], f));
  g.addColorStop(0.6, mengKleur(['#86c4f2', '#a7b6e6', '#a77fb8', '#6b4d8c'], f));
  g.addColorStop(1, mengKleur(['#d6eeff', '#ffd6a0', '#ff9f6b', '#f0795a'], f));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, B, H);

  // sterren als het avond wordt
  if (f > 0.5) {
    const a = (f - 0.5) / 0.5;
    for (let n = 0; n < 46; n++) {
      const x = (n * 113 + 37) % B;
      const y = (n * 71 + 13) % (H * 0.55);
      const flonker = stil ? 1 : 0.6 + 0.4 * Math.sin(t * 2 + n);
      ctx.globalAlpha = a * flonker * (n % 3 ? 0.6 : 1);
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath();
      ctx.arc(x, y, n % 5 ? 0.8 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // de zon zakt naarmate je hoger komt
  const zx = 70 + f * 20;
  const zy = 70 + f * 240;
  const gloed = ctx.createRadialGradient(zx, zy, 4, zx, zy, 90);
  gloed.addColorStop(0, mengKleur(['#fffbe0', '#fff0b0', '#ffc070', '#ff9a50'], f));
  gloed.addColorStop(0.25, 'rgba(255,230,160,0.35)');
  gloed.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = gloed;
  ctx.fillRect(zx - 90, zy - 90, 180, 180);
  ctx.fillStyle = mengKleur(['#fffbe6', '#fff2b8', '#ffc77a', '#ff8f4f'], f);
  ctx.beginPath();
  ctx.arc(zx, zy, 15, 0, Math.PI * 2);
  ctx.fill();
}

const WOLKEN = [
  { x: 40, m: 30, s: 1 },
  { x: 330, m: 44, s: 1.3 },
  { x: 170, m: 66, s: 0.9 },
  { x: 420, m: 82, s: 1.1 },
  { x: 90, m: 96, s: 1.4 },
  { x: 300, m: 112, s: 1 },
  { x: 210, m: 128, s: 1.2 },
];

function wolken(ctx: CanvasRenderingContext2D, c: number, f: number, t: number): void {
  for (const [n, w] of WOLKEN.entries()) {
    const x = ((w.x + t * (6 + n * 1.5)) % (B + 160)) - 80;
    // wolken bewegen langzamer mee dan de toren: ze zijn verder weg
    const y = H - GROND - (w.m - c * 0.65) * S * 0.8;
    if (y < -60 || y > H + 20) continue;
    wolk(ctx, x, y, w.s, f);
  }
}

function wolk(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, f: number): void {
  const bollen: [number, number, number][] = [
    [-26, 4, 13],
    [-10, -6, 17],
    [10, -9, 20],
    [28, 0, 14],
    [0, 6, 14],
  ];
  const g = ctx.createLinearGradient(0, y - 30 * s, 0, y + 18 * s);
  g.addColorStop(0, mengKleur(['#ffffff', '#fff3e6', '#ffd6c4', '#c9a6c9'], f));
  g.addColorStop(1, mengKleur(['#dbe7f3', '#f0c9b0', '#c98fa2', '#7c5c8e'], f));
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  for (const [dx, dy, rr] of bollen) {
    ctx.moveTo(x + dx * s + rr * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, rr * s, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

function vogels(ctx: CanvasRenderingContext2D, c: number, t: number, stil: boolean): void {
  ctx.strokeStyle = 'rgba(40,40,60,0.7)';
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  for (let n = 0; n < 3; n++) {
    const x = ((60 + n * 140 + t * (14 + n * 3)) % (B + 40)) - 20;
    const y = schermY(38 + n * 9, c) + Math.sin(t + n) * 4;
    if (y < -10 || y > H) continue;
    const vleugel = stil ? 3 : 3 * Math.sin(t * 9 + n * 2);
    ctx.beginPath();
    ctx.moveTo(x - 6, y - vleugel);
    ctx.quadraticCurveTo(x - 3, y - 3, x, y);
    ctx.quadraticCurveTo(x + 3, y - 3, x + 6, y - vleugel);
    ctx.stroke();
  }
}

// --- bordjes bij de treden en de hoogtemeter ----------------------------------------------------

function bordjes(ctx: CanvasRenderingContext2D, c: number, m: number): void {
  ctx.font = '700 10px Asap, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const hoogte of TREDEN_METER.slice(1)) {
    const y = schermY(hoogte, c);
    if (y < -10 || y > H + 10) continue;
    const x = TX - halveBreedte(hoogte) * S - 18;
    const gehaald = m >= hoogte - 0.01;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rondRechthoek(ctx, x - 15, y - 7 + 1.5, 30, 14, 4);
    ctx.fill();
    ctx.fillStyle = gehaald ? '#ffd84d' : 'rgba(255,255,255,0.85)';
    rondRechthoek(ctx, x - 15, y - 7, 30, 14, 4);
    ctx.fill();
    ctx.strokeStyle = gehaald ? '#a87b00' : 'rgba(80,80,100,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // een pinnetje naar de muur
    ctx.beginPath();
    ctx.moveTo(x + 15, y);
    ctx.lineTo(x + 18, y);
    ctx.stroke();
    ctx.fillStyle = gehaald ? '#4a2c0a' : '#3b3f5c';
    ctx.fillText(`${hoogte} m`, x, y + 0.5);
  }
  ctx.textBaseline = 'alphabetic';
}

function hoogtemeter(ctx: CanvasRenderingContext2D, m: number): void {
  const x = B - 26;
  const boven = 26;
  const onder = H - 30;
  const y = (h: number) => onder - (h / TOREN_METER) * (onder - boven);
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  rondRechthoek(ctx, x - 14, boven - 16, 30, onder - boven + 34, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,40,80,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // de buis
  ctx.fillStyle = '#d9dbe6';
  rondRechthoek(ctx, x - 3, boven, 6, onder - boven, 3);
  ctx.fill();
  const g = ctx.createLinearGradient(0, onder, 0, boven);
  g.addColorStop(0, '#2fa36b');
  g.addColorStop(1, '#ffd84d');
  ctx.fillStyle = g;
  rondRechthoek(ctx, x - 3, y(m), 6, onder - y(m), 3);
  ctx.fill();
  for (const h of TREDEN_METER) {
    ctx.fillStyle = m >= h - 0.01 ? '#0e6b45' : '#7a7f99';
    ctx.fillRect(x - 7, y(h) - 0.5, 4, 1);
  }
  // de klimmer op de meter
  ctx.fillStyle = '#1233c4';
  ctx.beginPath();
  ctx.moveTo(x - 9, y(m));
  ctx.lineTo(x - 15, y(m) - 4);
  ctx.lineTo(x - 15, y(m) + 4);
  ctx.closePath();
  ctx.fill();
  ctx.font = '800 9px Asap, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1d2140';
  ctx.fillText(`${Math.round(m)} m`, x + 1, onder + 14);
  // kleine toren bovenaan
  ctx.fillStyle = '#2d6b5c';
  ctx.beginPath();
  ctx.arc(x + 1, boven - 6, 3, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x + 0.5, boven - 13, 1, 5);
}

// --- de klimmer ----------------------------------------------------------------------------------

function klimmer(
  ctx: CanvasRenderingContext2D,
  m: number,
  c: number,
  o: { soort: 'klim' | 'glij' | 'rust'; t: number; top: boolean },
): void {
  const x = TX + (halveBreedte(m) - 1.6) * S;
  const y = schermY(m, c) - 10;
  // het touw, van de gordel naar beneden
  ctx.strokeStyle = '#e8590c';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y + 4);
  ctx.bezierCurveTo(x + 6, y + 40, x - 4, y + 90, x + 2, H + 10);
  ctx.stroke();

  const fase = o.soort === 'klim' ? Math.sin(o.t * 14) : 0;
  ctx.save();
  ctx.translate(x, y);
  if (o.soort === 'glij') ctx.rotate(Math.sin(o.t * 20) * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // schaduw op de muur
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(3, 2, 7, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // benen
  ctx.strokeStyle = '#1d2140';
  ctx.lineWidth = 3.2;
  for (const kant of [-1, 1]) {
    const op = o.soort === 'glij' ? 3 : o.top ? 0 : kant * fase * 3;
    ctx.beginPath();
    ctx.moveTo(kant * 2, 4);
    ctx.lineTo(kant * 4.5, 9 - op);
    ctx.lineTo(kant * 3.5, 14 - op);
    ctx.stroke();
  }
  // schoenen
  ctx.fillStyle = '#5b3a1e';
  for (const kant of [-1, 1]) {
    const op = o.soort === 'glij' ? 3 : o.top ? 0 : kant * fase * 3;
    ctx.beginPath();
    ctx.ellipse(kant * 4, 14.5 - op, 2.3, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // rugzak
  ctx.fillStyle = '#ff6400';
  rondRechthoek(ctx, -5.5, -7, 11, 9, 2.5);
  ctx.fill();
  // lijf
  const lijf = ctx.createLinearGradient(-5, 0, 5, 0);
  lijf.addColorStop(0, '#2c55e8');
  lijf.addColorStop(1, '#0f2a9e');
  ctx.fillStyle = lijf;
  rondRechthoek(ctx, -4.5, -8, 9, 13, 3);
  ctx.fill();
  // gordel
  ctx.fillStyle = '#ffd84d';
  ctx.fillRect(-4.5, 2, 9, 1.6);
  // armen
  ctx.strokeStyle = '#2c55e8';
  ctx.lineWidth = 2.8;
  for (const kant of [-1, 1]) {
    const reik = o.top
      ? -17 + Math.sin(o.t * 8 + kant) * 2
      : o.soort === 'glij'
        ? -16
        : -12 + kant * fase * 3;
    const hx = o.top ? kant * 9 : kant * 6;
    ctx.beginPath();
    ctx.moveTo(kant * 3.5, -6);
    ctx.lineTo(hx, reik);
    ctx.stroke();
    ctx.fillStyle = '#f2c29b';
    ctx.beginPath();
    ctx.arc(hx, reik - 1, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  // hoofd en helm
  ctx.fillStyle = '#f2c29b';
  ctx.beginPath();
  ctx.arc(0, -12, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff6400';
  ctx.beginPath();
  ctx.arc(0, -13, 4.2, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-4.8, -13.4, 9.6, 1.4);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(-1.6, -15.2, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // stofwolkjes bij het glijden
  if (o.soort === 'glij') {
    ctx.fillStyle = 'rgba(230,220,200,0.7)';
    for (let n = 0; n < 4; n++) {
      const v = (o.t * 3 + n / 4) % 1;
      ctx.globalAlpha = 1 - v;
      ctx.beginPath();
      ctx.arc(x + (n - 1.5) * 4, y + 16 + v * 10, 2 + v * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// --- de wereld, één keer getekend ----------------------------------------------------------------

let sceneBeeld: { r: number; doek: HTMLCanvasElement } | undefined;

function scene(r: number): HTMLCanvasElement {
  if (sceneBeeld?.r === r) return sceneBeeld.doek;
  const doekEl = document.createElement('canvas');
  doekEl.width = Math.round(B * r);
  doekEl.height = Math.round(SCENE_H * r);
  const ctx = doekEl.getContext('2d');
  if (ctx) {
    ctx.scale(r, r);
    verte(ctx);
    kerk(ctx);
    toren(ctx);
    huizen(ctx);
    markt(ctx);
  }
  sceneBeeld = { r, doek: doekEl };
  return doekEl;
}

/** Een vast getal tussen 0 en 1 voor n (zo ziet de wereld er steeds hetzelfde uit). */
const vastGetal = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** De gemeente in de verte, in de nevel. */
function verte(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(96,120,160,0.32)';
  let x = -10;
  let n = 0;
  ctx.beginPath();
  ctx.moveTo(-10, sy(0));
  while (x < B + 10) {
    const w = 14 + vastGetal(n) * 22;
    const h = 7 + vastGetal(n + 50) * 12;
    ctx.lineTo(x, sy(h));
    if (vastGetal(n + 90) > 0.5) ctx.lineTo(x + w / 2, sy(h + 4));
    ctx.lineTo(x + w, sy(h));
    x += w;
    n++;
  }
  ctx.lineTo(B + 10, sy(0));
  ctx.closePath();
  ctx.fill();
  // een spitse kerktoren in de verte (de Der Aa-kerk)
  ctx.beginPath();
  ctx.moveTo(52, sy(0));
  ctx.lineTo(52, sy(24));
  ctx.lineTo(55, sy(30));
  ctx.lineTo(58, sy(42));
  ctx.lineTo(61, sy(30));
  ctx.lineTo(64, sy(24));
  ctx.lineTo(64, sy(0));
  ctx.closePath();
  ctx.fill();
  // nog een laag, iets dichterbij
  ctx.fillStyle = 'rgba(86,104,140,0.35)';
  for (let k = 0; k < 9; k++) {
    const bx = 250 + k * 26;
    const h = 9 + vastGetal(k + 7) * 8;
    ctx.fillRect(bx, sy(h), 22, h * S);
  }
}

/** Baksteen: een vlak met een verloop van licht (links) naar donker (rechts) en voegen. */
function baksteen(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  m0: number,
  m1: number,
  kleur: [string, string, string] = ['#b8613d', '#9c4a2a', '#73331d'],
): void {
  const y0 = sy(m1);
  const y1 = sy(m0);
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, kleur[0]);
  g.addColorStop(0.55, kleur[1]);
  g.addColorStop(1, kleur[2]);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  ctx.fillStyle = 'rgba(40,15,5,0.13)';
  let rij = 0;
  for (let y = y1 - 3; y > y0; y -= 3) {
    ctx.fillRect(x0, y, x1 - x0, 0.6);
    for (let x = x0 + (rij % 2 ? 3.5 : 0); x < x1; x += 7) ctx.fillRect(x, y, 0.6, 3);
    rij++;
  }
  // wat losse stenen die iets lichter of donkerder zijn
  for (let n = 0; n < ((x1 - x0) * (y1 - y0)) / 90; n++) {
    const bx = x0 + vastGetal(n + x0) * (x1 - x0);
    const by = y0 + vastGetal(n * 3 + y0) * (y1 - y0);
    ctx.fillStyle = n % 2 ? 'rgba(255,200,160,0.10)' : 'rgba(60,20,10,0.10)';
    ctx.fillRect(Math.round(bx / 7) * 7, Math.round(by / 3) * 3, 7, 3);
  }
  ctx.restore();
}

/** Een spitsboog als pad: onderaan y, breedte w en hoogte h (beeldpunten). */
function spitsboog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const boog = w * 0.9;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h + boog);
  ctx.quadraticCurveTo(x, y - h + boog * 0.25, x + w / 2, y - h);
  ctx.quadraticCurveTo(x + w, y - h + boog * 0.25, x + w, y - h + boog);
  ctx.lineTo(x + w, y);
  ctx.closePath();
}

/** Een spitsboogvenster met een stenen rand, een middenstijl en een rondje in de top. */
function venster(
  ctx: CanvasRenderingContext2D,
  cx: number,
  m0: number,
  bm: number,
  hm: number,
  galm = false,
): void {
  const w = bm * S;
  const h = hm * S;
  const x = cx - w / 2;
  const y = sy(m0);
  // nis
  spitsboog(ctx, x - 2, y + 1, w + 4, h + 3);
  ctx.fillStyle = '#e4d6b4';
  ctx.fill();
  spitsboog(ctx, x - 1, y, w + 2, h + 1);
  ctx.fillStyle = '#c7b48c';
  ctx.fill();
  spitsboog(ctx, x, y, w, h);
  const g = ctx.createLinearGradient(x, y - h, x + w, y);
  g.addColorStop(0, '#3d4c5e');
  g.addColorStop(1, '#1b2430');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (galm) {
    // galmborden: schuine latten voor het geluid van de klokken
    ctx.strokeStyle = 'rgba(170,140,100,0.75)';
    ctx.lineWidth = 1.2;
    for (let yy = y - 2; yy > y - h + w * 0.6; yy -= 3.4) {
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy - 1);
      ctx.stroke();
    }
  } else {
    // glas in lood met een weerkaatsing
    ctx.strokeStyle = 'rgba(200,210,220,0.25)';
    ctx.lineWidth = 0.5;
    for (let yy = y - 3; yy > y - h; yy -= 4) {
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 1, y - h, w * 0.3, h);
  }
  ctx.restore();
  // middenstijl en rondje
  ctx.strokeStyle = '#e4d6b4';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, y - h + w * 0.95);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, y - h + w * 0.55, w * 0.2, 0, Math.PI * 2);
  ctx.stroke();
}

/** Een omloop: een stenen rand met een balustrade en pinakels (torentjes) op de hoeken. */
function omloop(ctx: CanvasRenderingContext2D, m: number, half: number, pinakel = 4): void {
  const x0 = TX - half * S;
  const x1 = TX + half * S;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, '#f1e7cf');
  g.addColorStop(0.6, '#d9c9a4');
  g.addColorStop(1, '#a8946c');
  // kraag
  ctx.fillStyle = g;
  ctx.fillRect(x0, sy(m + 0.5), x1 - x0, 0.5 * S);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x0, sy(m), x1 - x0, 1.5);
  // balustrade met openingen
  ctx.fillStyle = g;
  ctx.fillRect(x0 + 2, sy(m + 1.9), x1 - x0 - 4, 1.4 * S);
  ctx.fillStyle = 'rgba(40,30,20,0.55)';
  for (let x = x0 + 6; x < x1 - 8; x += 7) {
    ctx.beginPath();
    ctx.ellipse(x + 2.5, sy(m + 1.2), 2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f6eedb';
  ctx.fillRect(x0 + 1, sy(m + 2.1), x1 - x0 - 2, 1.4);
  // pinakels op de hoeken
  for (const px of [x0 + 2, x1 - 2]) {
    const pg = ctx.createLinearGradient(px - 3, 0, px + 3, 0);
    pg.addColorStop(0, '#f4ead2');
    pg.addColorStop(1, '#a8946c');
    ctx.fillStyle = pg;
    ctx.fillRect(px - 2.5, sy(m + 2 + pinakel * 0.55), 5, pinakel * 0.55 * S);
    ctx.beginPath();
    ctx.moveTo(px - 3, sy(m + 2 + pinakel * 0.55));
    ctx.lineTo(px, sy(m + 2 + pinakel));
    ctx.lineTo(px + 3, sy(m + 2 + pinakel * 0.55));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8b04a';
    ctx.beginPath();
    ctx.arc(px, sy(m + 2 + pinakel) - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Steunberen: de dikke randen van de onderbouw. */
function steunbeer(ctx: CanvasRenderingContext2D, x: number, m0: number, m1: number, kant: -1 | 1) {
  const w = 1.3 * S;
  const bx = kant < 0 ? x : x - w;
  baksteen(
    ctx,
    bx,
    bx + w,
    m0,
    m1,
    kant < 0 ? ['#c97250', '#b35f3c', '#9c4a2a'] : ['#8a3e22', '#76341c', '#5e2814'],
  );
  // afzaten met een stenen dekplaat
  for (let m = m0 + 9; m < m1; m += 9) {
    ctx.fillStyle = '#d9c9a4';
    ctx.fillRect(bx - 0.5, sy(m), w + 1, 2);
  }
}

function toren(ctx: CanvasRenderingContext2D): void {
  // slagschaduw achter de toren (op de kerk)
  ctx.fillStyle = 'rgba(30,20,40,0.18)';
  ctx.fillRect(TX + 7 * S, sy(30), 22, 30 * S);

  // --- onderbouw: 0 tot 28 m
  const a0 = TX - 7 * S;
  const a1 = TX + 7 * S;
  baksteen(ctx, a0, a1, 0, 28);
  steunbeer(ctx, a0, 0, 28, -1);
  steunbeer(ctx, a1, 0, 28, 1);
  // plint van natuursteen
  ctx.fillStyle = '#b9a98a';
  ctx.fillRect(a0 - 3, sy(1.6), a1 - a0 + 6, 1.6 * S);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(a0 - 3, sy(1.6), a1 - a0 + 6, 1);
  // de ingang: een grote spitsboog met een houten deur
  const dw = 3.6 * S;
  for (const [n, kleur] of ['#e4d6b4', '#c7b48c', '#b2a079'].entries()) {
    spitsboog(ctx, TX - dw / 2 - 6 + n * 3, sy(1.6), dw + 12 - n * 6, 8 * S - n * 3);
    ctx.fillStyle = kleur;
    ctx.fill();
  }
  spitsboog(ctx, TX - dw / 2, sy(1.6), dw, 7.2 * S - 6);
  const deur = ctx.createLinearGradient(TX - dw / 2, 0, TX + dw / 2, 0);
  deur.addColorStop(0, '#6b3b1d');
  deur.addColorStop(1, '#43230f');
  ctx.fillStyle = deur;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.8;
  for (let x = TX - dw / 2 + 3.5; x < TX + dw / 2; x += 3.5) {
    ctx.beginPath();
    ctx.moveTo(x, sy(1.6));
    ctx.lineTo(x, sy(6.4));
    ctx.stroke();
  }
  ctx.fillStyle = '#d8b04a';
  ctx.beginPath();
  ctx.arc(TX + 3, sy(4.5), 1.2, 0, Math.PI * 2);
  ctx.fill();
  // spitsboogvensters
  venster(ctx, TX, 11, 4.2, 12.5);
  for (const dx of [-4.3, 4.3]) venster(ctx, TX + dx * S, 13, 1.8, 8);
  // een fries van kleine boogjes onder de omloop
  ctx.strokeStyle = 'rgba(240,225,190,0.55)';
  ctx.lineWidth = 1;
  for (let x = a0 + 9; x < a1 - 9; x += 6) {
    ctx.beginPath();
    ctx.arc(x + 3, sy(26.2), 3, Math.PI, 0);
    ctx.stroke();
  }
  omloop(ctx, 27, 7.8, 4.5);

  // --- tweede geleding: 29 tot 48 m, met galmgaten
  const b0 = TX - 6 * S;
  const b1 = TX + 6 * S;
  baksteen(ctx, b0, b1, 29.1, 47);
  steunbeer(ctx, b0, 29.1, 47, -1);
  steunbeer(ctx, b1, 29.1, 47, 1);
  for (const dx of [-2.2, 2.2]) venster(ctx, TX + dx * S, 31.5, 2.6, 13, true);
  ctx.strokeStyle = 'rgba(240,225,190,0.55)';
  for (let x = b0 + 9; x < b1 - 9; x += 6) {
    ctx.beginPath();
    ctx.arc(x + 3, sy(46.2), 3, Math.PI, 0);
    ctx.stroke();
  }
  omloop(ctx, 47, 6.8, 4);

  // --- derde geleding: 49 tot 61 m, met de wijzerplaat
  const c0 = TX - 5 * S;
  const c1 = TX + 5 * S;
  baksteen(ctx, c0, c1, 49.1, 61);
  // nissen naast de klok
  for (const dx of [-3.6, 3.6]) {
    spitsboog(ctx, TX + dx * S - 3, sy(50.5), 6, 9 * S);
    ctx.fillStyle = 'rgba(40,15,5,0.28)';
    ctx.fill();
  }
  wijzerplaat(ctx, TX, sy(55.3), 2.9 * S);
  omloop(ctx, 61, 5.8, 3.6);

  // --- klokkenverdieping: 63 tot 74 m, lichte steen met open bogen
  const d0 = TX - 4.2 * S;
  const d1 = TX + 4.2 * S;
  const steen = ctx.createLinearGradient(d0, 0, d1, 0);
  steen.addColorStop(0, '#f0e4c6');
  steen.addColorStop(0.6, '#d6c49c');
  steen.addColorStop(1, '#a8946c');
  ctx.fillStyle = steen;
  ctx.fillRect(d0, sy(73.5), d1 - d0, 10.4 * S);
  for (const dx of [-2.1, 2.1]) {
    const w = 3 * S;
    spitsboog(ctx, TX + dx * S - w / 2, sy(64.2), w, 8 * S);
    const binnen = ctx.createLinearGradient(0, sy(72), 0, sy(64));
    binnen.addColorStop(0, '#1d1a24');
    binnen.addColorStop(1, '#3a2f2a');
    ctx.fillStyle = binnen;
    ctx.fill();
    klok(ctx, TX + dx * S, sy(68.8), 4.5);
  }
  ctx.strokeStyle = 'rgba(120,100,70,0.6)';
  ctx.lineWidth = 0.8;
  for (let m = 64; m < 73.5; m += 1.6) {
    ctx.beginPath();
    ctx.moveTo(d0, sy(m));
    ctx.lineTo(d0 + 3, sy(m));
    ctx.moveTo(d1 - 3, sy(m));
    ctx.lineTo(d1, sy(m));
    ctx.stroke();
  }
  omloop(ctx, 73.5, 4.8, 3);

  // --- open lantaarn: 75,5 tot 84 m; door de bogen zie je de lucht
  const e0 = TX - 3.2 * S;
  const e1 = TX + 3.2 * S;
  ctx.fillStyle = steen;
  ctx.fillRect(e0, sy(84), e1 - e0, 8.5 * S);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (const dx of [-1.6, 0, 1.6].slice(0, 3)) {
    spitsboog(ctx, TX + dx * S - 3.6, sy(76.2), 7.2, 6.6 * S);
    ctx.fill();
  }
  ctx.restore();
  // de klok in de lantaarn
  klok(ctx, TX, sy(79.6), 3.6);
  ctx.fillStyle = '#fff3c4';
  ctx.fillRect(e0 - 1, sy(84.2), e1 - e0 + 2, 2);
  ctx.fillRect(e0 - 2, sy(76), e1 - e0 + 4, 2);

  // --- de koperen koepel: 84 tot 92 m
  ctx.beginPath();
  ctx.moveTo(TX - 3.6 * S, sy(84.4));
  ctx.bezierCurveTo(TX - 4.3 * S, sy(87.5), TX - 2 * S, sy(89.5), TX - 0.9 * S, sy(91.6));
  ctx.lineTo(TX + 0.9 * S, sy(91.6));
  ctx.bezierCurveTo(TX + 2 * S, sy(89.5), TX + 4.3 * S, sy(87.5), TX + 3.6 * S, sy(84.4));
  ctx.closePath();
  const koper = ctx.createLinearGradient(TX - 4 * S, 0, TX + 4 * S, 0);
  koper.addColorStop(0, '#9ad8bf');
  koper.addColorStop(0.35, '#4fa58b');
  koper.addColorStop(0.8, '#2b6b5a');
  koper.addColorStop(1, '#1f4f43');
  ctx.fillStyle = koper;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(20,60,50,0.45)';
  ctx.lineWidth = 0.9;
  for (const dx of [-2.2, -0.8, 0.8, 2.2]) {
    ctx.beginPath();
    ctx.moveTo(TX + dx * S * 1.3, sy(84.4));
    ctx.quadraticCurveTo(TX + dx * S * 1.4, sy(88), TX + dx * S * 0.3, sy(91.6));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(TX - 1.8 * S, sy(86.8), 2, 7, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // een rand van goud onderaan de koepel
  ctx.fillStyle = '#d8b04a';
  ctx.fillRect(TX - 3.7 * S, sy(84.6), 7.4 * S, 1.6);

  // --- het lantaarntje, de gouden bol, de spits en de windvaan
  ctx.fillStyle = koper;
  ctx.fillRect(TX - 0.9 * S, sy(93.2), 1.8 * S, 1.6 * S);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  spitsboog(ctx, TX - 1.5, sy(91.8), 3, 1.1 * S);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(TX - 1.2 * S, sy(93.2));
  ctx.quadraticCurveTo(TX, sy(94.4), TX + 1.2 * S, sy(93.2));
  ctx.closePath();
  ctx.fillStyle = '#2b6b5a';
  ctx.fill();
  const goud = ctx.createRadialGradient(TX - 1.5, sy(94.4) - 1.5, 0.5, TX, sy(94.4), 4.5);
  goud.addColorStop(0, '#fff5c0');
  goud.addColorStop(0.5, '#e7bf4a');
  goud.addColorStop(1, '#9c7410');
  ctx.fillStyle = goud;
  ctx.beginPath();
  ctx.arc(TX, sy(94.4), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(TX, sy(95));
  ctx.lineTo(TX, sy(97.6));
  ctx.stroke();
  // windvaan: een gouden vaantje met een pijl
  ctx.fillStyle = '#e7bf4a';
  ctx.strokeStyle = '#9c7410';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(TX, sy(97.4));
  ctx.lineTo(TX + 11, sy(97.1));
  ctx.lineTo(TX + 8, sy(96.6));
  ctx.lineTo(TX + 11, sy(96.1));
  ctx.lineTo(TX, sy(96.3));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(TX - 7, sy(96.8));
  ctx.lineTo(TX - 3, sy(97.2));
  ctx.lineTo(TX - 3, sy(96.4));
  ctx.closePath();
  ctx.fill();
}

/** Een wijzerplaat: blauw met gouden cijferstreepjes en wijzers. */
function wijzerplaat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = '#e4d6b4';
  ctx.fillRect(x - r - 4, y - r - 4, 2 * r + 8, 2 * r + 8);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x - r - 4, y + r + 3, 2 * r + 8, 1);
  const ring = ctx.createRadialGradient(x - r / 3, y - r / 3, 1, x, y, r + 2);
  ring.addColorStop(0, '#fff2b0');
  ring.addColorStop(1, '#a8800f');
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
  ctx.fill();
  const plaat = ctx.createRadialGradient(x - r / 3, y - r / 3, 1, x, y, r);
  plaat.addColorStop(0, '#2f4f8f');
  plaat.addColorStop(1, '#14244d');
  ctx.fillStyle = plaat;
  ctx.beginPath();
  ctx.arc(x, y, r - 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e7bf4a';
  for (let u = 0; u < 12; u++) {
    const a = (u / 12) * Math.PI * 2;
    ctx.lineWidth = u % 3 ? 0.9 : 1.8;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72);
    ctx.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
    ctx.stroke();
  }
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(-2.6) * r * 0.5, y + Math.sin(-2.6) * r * 0.5);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(-0.55) * r * 0.75, y + Math.sin(-0.55) * r * 0.75);
  ctx.stroke();
  ctx.fillStyle = '#e7bf4a';
  ctx.beginPath();
  ctx.arc(x, y, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

/** Een klok (om te luiden) van brons. */
function klok(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.strokeStyle = '#4a3a2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.6);
  ctx.lineTo(x, y - r);
  ctx.stroke();
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, '#e0b45a');
  g.addColorStop(0.5, '#a9772a');
  g.addColorStop(1, '#5e3f12');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y - r);
  ctx.quadraticCurveTo(x - r * 0.7, y + r * 0.2, x - r, y + r * 0.8);
  ctx.lineTo(x + r, y + r * 0.8);
  ctx.quadraticCurveTo(x + r * 0.7, y + r * 0.2, x + r * 0.55, y - r);
  ctx.closePath();
  ctx.fill();
}

/** De Martinikerk naast de toren: bakstenen muur, hoge vensters en een leien dak. */
function kerk(ctx: CanvasRenderingContext2D): void {
  const x0 = TX + 6 * S;
  const x1 = B + 10;
  // dak
  const dak = ctx.createLinearGradient(0, sy(26), 0, sy(13));
  dak.addColorStop(0, '#7b8796');
  dak.addColorStop(1, '#4b5563');
  ctx.fillStyle = dak;
  ctx.beginPath();
  ctx.moveTo(x0, sy(13));
  ctx.lineTo(x0 + 6, sy(25));
  ctx.lineTo(x1, sy(25));
  ctx.lineTo(x1, sy(13));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,35,45,0.25)';
  ctx.lineWidth = 0.6;
  for (let m = 14; m < 25; m += 1.1) {
    ctx.beginPath();
    ctx.moveTo(x0 + (m - 13) / 2, sy(m));
    ctx.lineTo(x1, sy(m));
    ctx.stroke();
  }
  ctx.fillStyle = '#c9cfd8';
  ctx.fillRect(x0 + 6, sy(25.3), x1 - x0, 1.6);
  // dwarsschip met een trapgevel
  const tx0 = 352;
  const tx1 = 420;
  baksteen(ctx, tx0, tx1, 13, 22, ['#b25a37', '#99482a', '#7a3820']);
  ctx.beginPath();
  ctx.moveTo(tx0, sy(22));
  for (let k = 0; k < 5; k++) {
    const xa = tx0 + k * 6.8;
    ctx.lineTo(xa, sy(22 + k * 2));
    ctx.lineTo(xa + 6.8, sy(22 + k * 2));
  }
  for (let k = 4; k >= 0; k--) {
    const xb = tx1 - k * 6.8;
    ctx.lineTo(xb - 6.8, sy(22 + k * 2));
    ctx.lineTo(xb, sy(22 + k * 2));
  }
  ctx.closePath();
  ctx.fillStyle = '#99482a';
  ctx.fill();
  venster(ctx, (tx0 + tx1) / 2, 16, 3.2, 10);
  // muur van het schip
  baksteen(ctx, x0, x1, 0, 13, ['#a85434', '#93452a', '#7a3820']);
  for (let x = x0 + 26; x < x1 - 10; x += 44) venster(ctx, x, 2.2, 2.6, 9);
  // steunberen
  for (let x = x0 + 4; x < x1; x += 44) {
    ctx.fillStyle = '#7f3a20';
    ctx.fillRect(x, sy(11), 5, 11 * S);
    ctx.fillStyle = '#d9c9a4';
    ctx.fillRect(x - 0.5, sy(11), 6, 1.5);
  }
  ctx.fillStyle = '#d9c9a4';
  ctx.fillRect(x0, sy(13.2), x1 - x0, 1.6);
}

type Huis = { x: number; w: number; h: number; kleur: string; gevel: 'trap' | 'hals' | 'punt' };
const HUIZEN: Huis[] = [
  { x: -6, w: 42, h: 13, kleur: '#c9b28a', gevel: 'hals' },
  { x: 36, w: 38, h: 15, kleur: '#a8452e', gevel: 'trap' },
  { x: 74, w: 40, h: 12, kleur: '#e7dcc6', gevel: 'punt' },
  { x: 114, w: 36, h: 14.5, kleur: '#7f3a2c', gevel: 'trap' },
];

/** Huizen aan de Grote Markt met trapgevels, halsgevels en winkels. */
function huizen(ctx: CanvasRenderingContext2D): void {
  for (const [n, h] of HUIZEN.entries()) {
    const top = sy(h.h);
    // gevel
    ctx.fillStyle = h.kleur;
    ctx.beginPath();
    ctx.moveTo(h.x, sy(0));
    ctx.lineTo(h.x, top);
    if (h.gevel === 'trap') {
      const tree = h.w / 7;
      for (let k = 0; k < 3; k++) {
        ctx.lineTo(h.x + k * tree, top - k * 9);
        ctx.lineTo(h.x + (k + 1) * tree, top - k * 9);
      }
      ctx.lineTo(h.x + 3 * tree, top - 27);
      ctx.lineTo(h.x + 4 * tree, top - 27);
      for (let k = 2; k >= 0; k--) {
        ctx.lineTo(h.x + h.w - k * tree - tree, top - k * 9);
        ctx.lineTo(h.x + h.w - k * tree, top - k * 9);
      }
    } else if (h.gevel === 'hals') {
      ctx.lineTo(h.x + h.w * 0.25, top);
      ctx.quadraticCurveTo(h.x + h.w * 0.3, top - 10, h.x + h.w * 0.32, top - 22);
      ctx.lineTo(h.x + h.w * 0.68, top - 22);
      ctx.quadraticCurveTo(h.x + h.w * 0.7, top - 10, h.x + h.w * 0.75, top);
    } else {
      ctx.lineTo(h.x + h.w / 2, top - 20);
    }
    ctx.lineTo(h.x + h.w, top);
    ctx.lineTo(h.x + h.w, sy(0));
    ctx.closePath();
    ctx.fill();
    // licht van links, schaduw rechts
    const glans = ctx.createLinearGradient(h.x, 0, h.x + h.w, 0);
    glans.addColorStop(0, 'rgba(255,255,255,0.12)');
    glans.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = glans;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // ramen
    const kolommen = 3;
    const rw = 6;
    for (let rij = 0; rij < Math.floor((h.h - 4.5) / 3.2); rij++) {
      for (let k = 0; k < kolommen; k++) {
        const rx = h.x + (h.w / kolommen) * (k + 0.5) - rw / 2;
        const ry = sy(5.2 + rij * 3.2) - 11;
        ctx.fillStyle = '#f4efe6';
        ctx.fillRect(rx - 1, ry - 1, rw + 2, 13);
        const glas = ctx.createLinearGradient(rx, ry, rx + rw, ry + 11);
        glas.addColorStop(0, '#5b7493');
        glas.addColorStop(1, '#2a3a50');
        ctx.fillStyle = glas;
        ctx.fillRect(rx, ry, rw, 11);
        ctx.fillStyle = '#f4efe6';
        ctx.fillRect(rx, ry + 5, rw, 1);
        ctx.fillRect(rx + rw / 2 - 0.5, ry, 1, 11);
      }
    }
    // zolderraam in de gevel
    ctx.fillStyle = '#2a3a50';
    ctx.beginPath();
    ctx.arc(h.x + h.w / 2, top - 7, 3, 0, Math.PI * 2);
    ctx.fill();
    // winkel met een luifel
    const pui = ctx.createLinearGradient(0, sy(3.6), 0, sy(0));
    pui.addColorStop(0, '#2e3b4e');
    pui.addColorStop(1, '#4b5d78');
    ctx.fillStyle = pui;
    ctx.fillRect(h.x + 3, sy(3.4), h.w - 6, 3.4 * S);
    ctx.fillStyle = 'rgba(255,240,190,0.35)';
    ctx.fillRect(h.x + 5, sy(3.0), h.w - 10, 2.2 * S);
    const kleuren = n % 2 ? ['#2f8f5b', '#ffffff'] : ['#c4321e', '#ffffff'];
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = kleuren[k % 2] ?? '#fff';
      ctx.beginPath();
      const lx = h.x + 1 + (k * (h.w - 2)) / 7;
      const lw = (h.w - 2) / 7;
      ctx.moveTo(lx, sy(4.4));
      ctx.lineTo(lx + lw, sy(4.4));
      ctx.lineTo(lx + lw + 1, sy(3.5));
      ctx.lineTo(lx - 1, sy(3.5));
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** De Grote Markt: keien, marktkramen, lantaarns, een boom en mensen. */
function markt(ctx: CanvasRenderingContext2D): void {
  const y0 = sy(0);
  const g = ctx.createLinearGradient(0, y0, 0, SCENE_H);
  g.addColorStop(0, '#a99d8b');
  g.addColorStop(1, '#7c705f');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, B, SCENE_H - y0);
  // stoeprand
  ctx.fillStyle = '#d6cdbd';
  ctx.fillRect(0, y0, B, 2);
  // keien in rijen, groter naar voren
  for (let rij = 0; rij < 9; rij++) {
    const y = y0 + 5 + rij * (3 + rij * 0.55);
    const w = 5 + rij * 0.9;
    for (let x = (rij % 2) * (w / 2) - w; x < B + w; x += w + 1.5) {
      ctx.fillStyle = vastGetal(x * 7 + rij) > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, 1.2 + rij * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // een linde voor de kerk
  boom(ctx, 300, y0 + 3);
  boom(ctx, 446, y0 + 4);
  // lantaarns
  for (const x of [148, 262]) lantaarn(ctx, x, y0 + 6);
  // marktkramen
  kraam(ctx, 18, y0 + 26, ['#c4321e', '#ffffff']);
  kraam(ctx, 380, y0 + 30, ['#1233c4', '#ffffff']);
  // mensen
  const mensen: [number, string][] = [
    [96, '#e8590c'],
    [118, '#2f8f5b'],
    [236, '#1233c4'],
    [276, '#7a3fb0'],
    [330, '#d6336c'],
    [350, '#1d2140'],
  ];
  for (const [n, [x, kleur]] of mensen.entries()) persoon(ctx, x, y0 + 14 + (n % 3) * 7, kleur, n);
  // een fiets
  ctx.strokeStyle = '#1d2140';
  ctx.lineWidth = 1;
  for (const wx of [212, 224]) {
    ctx.beginPath();
    ctx.arc(wx, y0 + 34, 4.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(212, y0 + 34);
  ctx.lineTo(217, y0 + 28);
  ctx.lineTo(224, y0 + 34);
  ctx.moveTo(217, y0 + 28);
  ctx.lineTo(222, y0 + 28);
  ctx.lineTo(224, y0 + 34);
  ctx.stroke();
}

function boom(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#5b3a1e';
  ctx.fillRect(x - 2, y - 30, 4, 30);
  const blad = ctx.createRadialGradient(x - 8, y - 52, 4, x, y - 44, 26);
  blad.addColorStop(0, '#8fcf6a');
  blad.addColorStop(0.6, '#4c9a3c');
  blad.addColorStop(1, '#2f6b2a');
  ctx.fillStyle = blad;
  ctx.beginPath();
  for (const [dx, dy, r] of [
    [-12, -38, 13],
    [10, -40, 14],
    [0, -52, 16],
    [-6, -30, 11],
    [8, -28, 10],
  ] as const) {
    ctx.moveTo(x + dx + r, y + dy);
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
  }
  ctx.fill();
}

function lantaarn(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#23283a';
  ctx.fillRect(x - 1, y - 32, 2, 32);
  ctx.fillRect(x - 3, y - 2, 6, 2);
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 32);
  ctx.lineTo(x + 4, y - 32);
  ctx.lineTo(x + 2.5, y - 39);
  ctx.lineTo(x - 2.5, y - 39);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe8a3';
  ctx.fillRect(x - 2, y - 37, 4, 4);
}

function kraam(ctx: CanvasRenderingContext2D, x: number, y: number, kleuren: string[]): void {
  const w = 62;
  ctx.fillStyle = '#6b4a2b';
  ctx.fillRect(x + 2, y - 22, 2, 22);
  ctx.fillRect(x + w - 4, y - 22, 2, 22);
  // tafel met groente en fruit
  ctx.fillStyle = '#8a6239';
  ctx.fillRect(x, y - 9, w, 4);
  const fruit = ['#e23a5b', '#ffb400', '#5aa83c', '#ff7a1a'];
  for (let k = 0; k < 12; k++) {
    ctx.fillStyle = fruit[k % fruit.length] ?? '#e23a5b';
    ctx.beginPath();
    ctx.arc(x + 5 + k * 4.6, y - 10.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // luifel met strepen
  for (let k = 0; k < 8; k++) {
    ctx.fillStyle = kleuren[k % 2] ?? '#fff';
    const lx = x - 4 + (k * (w + 8)) / 8;
    ctx.beginPath();
    ctx.moveTo(lx + 3, y - 30);
    ctx.lineTo(lx + 3 + (w + 8) / 8, y - 30);
    ctx.lineTo(lx + (w + 8) / 8, y - 22);
    ctx.lineTo(lx, y - 22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x - 4, y - 22, w + 8, 1.5);
}

function persoon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kleur: string,
  n: number,
): void {
  ctx.fillStyle = '#1d2140';
  ctx.fillRect(x - 2, y - 6, 1.6, 6);
  ctx.fillRect(x + 0.4, y - 6, 1.6, 6);
  ctx.fillStyle = kleur;
  rondRechthoek(ctx, x - 2.8, y - 14, 5.6, 9, 2);
  ctx.fill();
  ctx.fillStyle = n % 2 ? '#f2c29b' : '#a8714a';
  ctx.beginPath();
  ctx.arc(x, y - 16.5, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

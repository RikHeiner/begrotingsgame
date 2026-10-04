/**
 * Euroborg: "Penalty's voor de pot". Een penaltyspel in een vol stadion. Elke penalty is een post
 * van de begroting. Vóór de trap kies je: schrappen (schieten) of laten staan.
 *
 * Schiet je, dan zwaait een vizier over het doel: tik één keer voor de richting en nog een keer voor
 * de hoogte. Bij een eigen keuze van de gemeente staat er een gewone keeper; scoor je, dan bespaart
 * de gemeente geld. Moet de post van de wet, dan komt er een reus van een keeper in het doel met de
 * naam van de wet op zijn shirt. Die houdt alles tegen.
 *
 * Bij minder beweging zwaait het vizier niet en loopt er geen klok: je kiest links, midden of rechts
 * met knoppen (of door op die kant van het doel te tikken).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KANTEN,
  PER_RONDE,
  RONDES,
  beoordeel,
  bezier,
  DUIK_X,
  maakRondes,
  melding as maakMelding,
  rustigSchot,
  schiet,
  telOp,
  vizierX,
  vizierY,
  type Beurt,
  type Kant,
  type Keuze,
  type Penalty,
  type Uitkomst,
} from '../../game/mgEuroborg';
import { Hud, Meldingen, PauzeKnop, SpelKaart, type Melding } from './kader/kader';
import {
  breekTekst,
  maakScherp,
  metTeken,
  mln,
  rondRechthoek,
  useKlok,
  useLus,
  useStil,
  useToetsen,
} from './kader/hulp';
import type { MinigameProps } from './types';
import './Euroborg.css';

// Het speelveld in beeldpunten (het canvas schaalt mee).
const BREEDTE = 480;
const HOOGTE = 360;

type Fase = 'start' | 'spelen' | 'ronde' | 'klaar';
type Stap = 'kiezen' | 'richten' | 'hoogte' | 'vlucht' | 'uitslag';

const KANT_TEKST: Record<Kant, string> = {
  links: 'links',
  midden: 'in het midden',
  rechts: 'rechts',
};

export default function Euroborg({ data, onKlaar }: MinigameProps) {
  const stil = useStil();
  const jaar = data.begroting.begrotingsjaar;
  const [rondes] = useState(() => maakRondes(data));
  const totaal = useMemo(() => rondes.reduce((s, r) => s + r.length, 0), [rondes]);
  const [fase, setFase] = useState<Fase>('start');
  const [rondeNr, setRondeNr] = useState(0);
  const [nr, setNr] = useState(0);
  const [stap, setStap] = useState<Stap>('kiezen');
  const [beurten, setBeurten] = useState<Beurt[]>([]);
  const [laatste, setLaatste] = useState<Beurt>();
  const [melding, setMelding] = useState<Melding>();
  const [pauze, setPauze] = useState(false);
  const [vizier, setVizier] = useState<{ x: number; y: number }>({ x: 0, y: 0.5 });

  const ronde = RONDES[rondeNr] ?? RONDES[0];
  const post = rondes[rondeNr]?.[nr];
  const actief = stap === 'kiezen' || stap === 'richten' || stap === 'hoogte';
  const [tijd, setTijd] = useKlok(
    ronde?.tijd ?? 15,
    fase === 'spelen' && !stil && !pauze && actief,
  );

  const doek = useRef<HTMLCanvasElement>(null);
  const hoofdKnop = useRef<HTMLButtonElement>(null);
  const anim = useRef<Animatie>(nieuweAnimatie());
  const staat = useRef({ fase, stap, pauze, tijd, post, rondeNr, nr });
  useEffect(() => {
    staat.current = { fase, stap, pauze, tijd, post, rondeNr, nr };
  });

  const som = useMemo(() => telOp(beurten), [beurten]);
  const dezeRonde = beurten.filter((b) => rondes[rondeNr]?.some((p) => p.id === b.post.id));

  // De belangrijkste knop krijgt de focus als de stap verandert, zodat je met het toetsenbord
  // gewoon door kunt spelen.
  useEffect(() => {
    if (fase === 'spelen') hoofdKnop.current?.focus({ preventScroll: true });
  }, [fase, stap]);

  // ---------------------------------------------------------------------------------------------
  // Spelverloop
  // ---------------------------------------------------------------------------------------------

  const begin = (r: number) => {
    setRondeNr(r);
    setNr(0);
    setStap('kiezen');
    setLaatste(undefined);
    setMelding(undefined);
    setPauze(false);
    setTijd(RONDES[r]?.tijd ?? 15);
    anim.current = nieuweAnimatie();
    setFase('spelen');
  };

  const afronden = useCallback((b: Beurt) => {
    const m = maakMelding(b);
    anim.current.beurt = b;
    setBeurten((bs) => [...bs, b]);
    setLaatste(b);
    setMelding({
      tekst: (
        <>
          <strong>{m.titel}</strong> {m.tekst}
        </>
      ),
      toon: m.goed ? 'goed' : 'fout',
      tijd: performance.now(),
    });
    setStap('uitslag');
  }, []);

  const kies = (k: Keuze) => {
    const s = staat.current;
    if (s.fase !== 'spelen' || s.stap !== 'kiezen' || s.pauze || !s.post) return;
    if (k === 'schrappen') {
      anim.current.vizierTijd = 0;
      anim.current.muurBegin = s.post.soort === 'wet' ? performance.now() : undefined;
      setVizier({ x: 0, y: 0.5 });
      setStap('richten');
    } else afronden(beoordeel(s.post, k));
  };

  /** De trap: de bal gaat naar (x, y), de keeper duikt. */
  const trap = (schot: { x: number; y: number }) => {
    const s = staat.current;
    const r = RONDES[s.rondeNr];
    if (!s.post || !r) return;
    const uit = schiet(s.post, schot, r);
    const beurt = beoordeel(s.post, 'schrappen', uit.uitkomst);
    const a = anim.current;
    a.vlucht = maakVlucht(schot, uit.uitkomst, performance.now(), uit.duik);
    a.beurt = beurt;
    a.duik = uit.duik;
    setVizier(schot);
    if (stil) afronden(beurt);
    else setStap('vlucht');
  };

  /** Tik op het veld, spatie of de grote knop. */
  const tik = () => {
    const s = staat.current;
    if (s.fase !== 'spelen' || s.pauze) return;
    const a = anim.current;
    if (s.stap === 'richten' && !stil) {
      const x = vizierX(a.vizierTijd, ronde?.periode ?? 2000);
      a.vastX = x;
      a.vizierTijd = 0;
      setVizier({ x, y: 0.5 });
      setStap('hoogte');
    } else if (s.stap === 'hoogte') {
      trap({ x: a.vastX, y: vizierY(a.vizierTijd, ronde?.periode ?? 2000) });
    } else if (s.stap === 'uitslag') volgende();
  };

  const schietRustig = (k: Kant) => {
    if (staat.current.stap !== 'richten') return;
    trap(rustigSchot(k));
  };

  const volgende = () => {
    const s = staat.current;
    if (s.nr + 1 < (rondes[s.rondeNr]?.length ?? 0)) {
      setNr(s.nr + 1);
      setStap('kiezen');
      setMelding(undefined);
      setLaatste(undefined);
      setTijd(RONDES[s.rondeNr]?.tijd ?? 15);
      anim.current = nieuweAnimatie();
    } else setFase(s.rondeNr + 1 < rondes.length ? 'ronde' : 'klaar');
  };

  // Elk beeld: het vizier bewegen, de bal laten vliegen en alles tekenen.
  useLus(fase === 'spelen' && !stil, (dt, nu) => {
    const s = staat.current;
    const a = anim.current;
    const r = RONDES[s.rondeNr];
    if (!s.pauze) {
      if (s.stap === 'richten' || s.stap === 'hoogte') a.vizierTijd += dt * 1000;
      if (s.stap === 'vlucht' && a.vlucht && a.beurt && nu >= a.vlucht.einde && !a.vlucht.klaar) {
        a.vlucht.klaar = true;
        afronden(a.beurt);
      }
      if ((s.stap === 'kiezen' || s.stap === 'richten' || s.stap === 'hoogte') && s.tijd <= 0) {
        if (s.post) afronden(beoordeel(s.post, 'telaat'));
      }
    } else a.pauzeTijd += dt * 1000;
    if (!s.post || !r) return;
    const v =
      s.stap === 'richten'
        ? { x: vizierX(a.vizierTijd, r.periode), y: 0.5 }
        : s.stap === 'hoogte'
          ? { x: a.vastX, y: vizierY(a.vizierTijd, r.periode) }
          : undefined;
    teken(doek.current, {
      post: s.post,
      stap: s.stap,
      ronde: s.rondeNr,
      nr: s.nr,
      per: rondes[s.rondeNr]?.length ?? PER_RONDE,
      anim: a,
      vizier: v,
      stil: false,
      nu: nu - a.pauzeTijd,
    });
  });

  // Met minder beweging: alleen tekenen als er iets verandert.
  useEffect(() => {
    if (!stil || fase !== 'spelen' || !post) return;
    teken(doek.current, {
      post,
      stap,
      ronde: rondeNr,
      nr,
      per: rondes[rondeNr]?.length ?? PER_RONDE,
      anim: anim.current,
      stil: true,
      nu: performance.now(),
    });
  }, [stil, fase, post, stap, rondeNr, nr, rondes, laatste]);

  // Toetsen: S schrappen, L laten staan; spatie of Enter schiet; bij minder beweging de pijltjes.
  useToetsen(fase === 'spelen', (e) => {
    const s = staat.current;
    const toets = e.key.toLowerCase();
    if (s.stap === 'kiezen' && (toets === 's' || toets === 'l')) {
      e.preventDefault();
      kies(toets === 's' ? 'schrappen' : 'laten');
    } else if (stil && s.stap === 'richten') {
      const k: Kant | undefined =
        e.key === 'ArrowLeft'
          ? 'links'
          : e.key === 'ArrowRight'
            ? 'rechts'
            : e.key === 'ArrowUp'
              ? 'midden'
              : undefined;
      if (k) {
        e.preventDefault();
        schietRustig(k);
      }
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      tik();
    }
  });

  // ---------------------------------------------------------------------------------------------
  // Scherm
  // ---------------------------------------------------------------------------------------------

  const hud = (
    <Hud
      testid="mg-eb-stand"
      icoon="⚽"
      links={[
        { label: 'Punten', waarde: `${som.punten}`, testid: 'mg-eb-punten' },
        {
          label: 'Bespaard',
          waarde: mln(som.bespaardMln),
          toon: som.bespaardMln > 0 ? 'goed' : undefined,
        },
      ]}
      rechts={[
        stil
          ? { label: 'Penalty', waarde: `${nr + 1} van ${rondes[rondeNr]?.length ?? PER_RONDE}` }
          : { label: 'Tijd', waarde: `${tijd}`, toon: tijd <= 5 ? 'fout' : undefined },
        { label: 'Ronde', waarde: `${rondeNr + 1} van ${rondes.length}` },
      ]}
    />
  );

  if (fase === 'start')
    return (
      <div className="mg-kader mg-eb">
        <SpelKaart
          titel="Penalty's voor de pot"
          knop={{ tekst: 'Start ronde 1', onClick: () => begin(0) }}
        >
          <p>
            Elke penalty is een post van de begroting {jaar}. Kies vóór de trap:{' '}
            <strong>schrappen</strong> (je schiet) of <strong>laten staan</strong>.
          </p>
          <ul className="klein">
            <li>
              🧤 Is het een <strong>eigen keuze</strong> van de gemeente? Dan staat er een gewone
              keeper. Scoor je, dan bespaart de gemeente geld.
            </li>
            <li>
              🧱 Moet het <strong>van de wet</strong>? Dan staat er een reus in het doel met de naam
              van de wet op zijn shirt. Die houdt alles tegen.
            </li>
            <li>
              ⭐ Spelregel: een goal is 1 punt. Een post van de wet laten staan is ook 1 punt. Een
              eigen keuze laten staan mag, maar geeft geen punt.
            </li>
          </ul>
          <p className="klein">
            {stil
              ? 'Schieten: kies links, midden of rechts met de knoppen of de pijltjes.'
              : 'Schieten: tik op het veld (of druk op spatie) als het vizier goed staat. Eerst de richting, dan de hoogte.'}{' '}
            Drie rondes van {PER_RONDE} penalty&apos;s. De keeper wordt steeds beter
            {stil ? '' : ' en het vizier steeds sneller'}.
          </p>
        </SpelKaart>
      </div>
    );

  if (fase === 'ronde') {
    const r = telOp(dezeRonde);
    const volgendeRonde = RONDES[rondeNr + 1];
    return (
      <div className="mg-kader mg-eb">
        {hud}
        <SpelKaart
          testid="mg-eb-ronde"
          status
          titel={`Ronde ${rondeNr + 1} klaar: ${r.punten} van ${dezeRonde.length} punten`}
          knop={{
            tekst: `Ronde ${rondeNr + 2}: ${volgendeRonde?.naam ?? ''}`,
            onClick: () => begin(rondeNr + 1),
          }}
          extra={
            <button type="button" className="knop" onClick={() => setFase('klaar')}>
              Stoppen
            </button>
          }
        >
          <p className="klein">
            {r.goals} goals, {mln(r.bespaardMln)} bespaard. {volgendeRonde?.uitleg}
          </p>
          <PostenLijst beurten={dezeRonde} />
        </SpelKaart>
      </div>
    );
  }

  if (fase === 'klaar')
    return (
      <div className="mg-kader mg-eb" data-testid="mg-eb-uitslag">
        <SpelKaart
          titel={`Eindstand: ${som.punten} van de ${totaal} punten`}
          knop={{ tekst: 'Naar de uitslag', onClick: () => onKlaar(som.punten, totaal) }}
        >
          <p>
            ⚽ <strong>{som.goals}</strong> goals uit {som.schoten}{' '}
            {som.schoten === 1 ? 'schot' : 'schoten'}. De gemeente bespaart{' '}
            <strong>{mln(som.bespaardMln)}</strong> per jaar.
          </p>
          <div className="mg-eb-les">
            <strong>Wat je leerde:</strong> wat moet van de wet, kun je niet zomaar schrappen. De
            gemeente kan wel kiezen hóéveel ze eraan uitgeeft, maar niet stoppen. Bij een eigen
            keuze kan de gemeente wél schrappen.
          </div>
          <PostenLijst beurten={beurten} />
          <p className="klein">
            Bedragen uit de begroting {jaar} van de gemeente Groningen. ⚠︎ Spelregel: schrappen is
            hier de hele post weg. Horen er inkomsten bij (zoals kaartjes), dan vallen die ook weg.
          </p>
        </SpelKaart>
      </div>
    );

  if (!post || !ronde) return null;
  const uitslag = stap === 'uitslag' && laatste;
  const label = canvasLabel(post, stap, vizier, laatste, stil);

  return (
    <div className="mg-kader mg-eb">
      {hud}
      <div className="mg-strook mg-eb-post" data-testid="mg-penalty">
        <p className="mg-eb-kop klein">
          Ronde {rondeNr + 1}: {ronde.naam} · Penalty {nr + 1} van{' '}
          {rondes[rondeNr]?.length ?? PER_RONDE}
        </p>
        <p className="mg-eb-naam">
          <strong>{post.naam}</strong>{' '}
          <span className="mg-eb-bedrag">{mln(post.bedragMln)} per jaar</span>
        </p>
        <p className="mg-eb-uitleg klein">{post.uitleg}</p>
        {uitslag && <SoortLabel post={post} />}
      </div>
      <canvas
        ref={doek}
        className="mg-veld mg-eb-veld"
        width={BREEDTE}
        height={HOOGTE}
        role="img"
        aria-label={label}
        onPointerDown={(e) => {
          e.preventDefault();
          if (stil && stap === 'richten') {
            const vak = e.currentTarget.getBoundingClientRect();
            const f = (e.clientX - vak.left) / vak.width;
            schietRustig(f < 0.4 ? 'links' : f > 0.6 ? 'rechts' : 'midden');
          } else tik();
        }}
      />
      <div className="mg-knoppen">
        {stap === 'kiezen' && (
          <>
            <button
              ref={hoofdKnop}
              type="button"
              className="knop-indienen mg-grote-knop"
              onClick={() => kies('schrappen')}
              disabled={pauze}
            >
              ✂️ Schrappen
            </button>
            <button
              type="button"
              className="knop mg-grote-knop"
              onClick={() => kies('laten')}
              disabled={pauze}
            >
              🛡️ Laten staan
            </button>
          </>
        )}
        {stap === 'richten' &&
          stil &&
          KANTEN.map((k, i) => (
            <button
              key={k}
              ref={i === 1 ? hoofdKnop : undefined}
              type="button"
              className="knop-indienen mg-eb-kant"
              onClick={() => schietRustig(k)}
            >
              {k === 'links' ? '◀ Links' : k === 'rechts' ? 'Rechts ▶' : '▲ Midden'}
            </button>
          ))}
        {(stap === 'richten' || stap === 'hoogte') && !stil && (
          <button
            ref={hoofdKnop}
            type="button"
            className="knop-indienen mg-grote-knop"
            onClick={tik}
            disabled={pauze}
          >
            {stap === 'richten' ? '🎯 Richting vast' : '⚽ Schiet!'}
          </button>
        )}
        {stap === 'vlucht' && (
          <button type="button" className="knop-indienen mg-grote-knop" disabled>
            ⚽ …
          </button>
        )}
        {stap === 'uitslag' && (
          <button
            ref={hoofdKnop}
            type="button"
            className="knop-indienen mg-grote-knop"
            onClick={volgende}
          >
            {nr + 1 < (rondes[rondeNr]?.length ?? 0)
              ? 'Volgende penalty ▶'
              : rondeNr + 1 < rondes.length
                ? 'Einde van de ronde ▶'
                : 'Bekijk de eindstand ▶'}
          </button>
        )}
        {!stil && actief && <PauzeKnop pauze={pauze} onWissel={() => setPauze((p) => !p)} />}
      </div>
      <Meldingen melding={melding}>
        {stap === 'kiezen' && !melding && (
          <p className="klein mg-eb-hint">
            Schrappen of laten staan? Moet dit van de wet, of is het een eigen keuze van de
            gemeente?
          </p>
        )}
        {stap === 'richten' && (
          <p className="klein mg-eb-hint">
            {post.soort === 'wet'
              ? `Er staat een reus in het doel: ${post.wet}. `
              : `De keeper wacht af. `}
            {stil
              ? 'Kies een kant.'
              : 'Tik als het vizier goed staat (richting), daarna nog een keer (hoogte).'}
          </p>
        )}
        {stap === 'hoogte' && (
          <p className="klein mg-eb-hint">Nu de hoogte: tik als het vizier goed staat.</p>
        )}
      </Meldingen>
    </div>
  );
}

function SoortLabel({ post }: { post: Penalty }) {
  return post.soort === 'wet' ? (
    <span className="mg-eb-soort mg-eb-soort-wet">⚖️ Moet van de wet: {post.wet}</span>
  ) : (
    <span className="mg-eb-soort mg-eb-soort-keuze">🧭 Eigen keuze van de gemeente</span>
  );
}

const WAT_JE_DEED: Record<Uitkomst | 'laten' | 'telaat', string> = {
  goal: 'gescoord',
  gestopt: 'gestopt door de keeper',
  naast: 'naast',
  over: 'over',
  wet: 'gestopt door de wet',
  laten: 'laten staan',
  telaat: 'te laat',
};

function PostenLijst({ beurten }: { beurten: Beurt[] }) {
  if (!beurten.length) return null;
  return (
    <ul className="mg-lijst mg-eb-lijst">
      {beurten.map((b) => (
        <li key={b.post.id} className={b.punt ? 'mg-eb-punt' : undefined}>
          <span aria-hidden="true">{b.punt ? '✅ ' : '▫️ '}</span>
          <strong>{b.post.naam}</strong>: {mln(b.post.bedragMln)} per jaar.{' '}
          {b.post.soort === 'wet' ? (
            <span className="mg-eb-soort-wet-tekst">moet van de wet ({b.post.wet})</span>
          ) : (
            <span className="mg-eb-soort-keuze-tekst">eigen keuze</span>
          )}
          <span className="klein">
            {' '}
            · jij: {WAT_JE_DEED[b.keuze === 'schrappen' ? (b.uitkomst ?? 'naast') : b.keuze]}
            {b.bespaardMln > 0 ? ` (${metTeken(b.bespaardMln)} voor de pot)` : ''}
            {b.punt ? ' · +1 punt' : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

function canvasLabel(
  post: Penalty,
  stap: Stap,
  vizier: { x: number; y: number },
  laatste: Beurt | undefined,
  stil: boolean,
): string {
  const begin = `Penalty in de Euroborg: ${post.naam}, ${mln(post.bedragMln)} per jaar.`;
  if (stap === 'kiezen') return `${begin} De bal ligt op de stip. Kies: schrappen of laten staan.`;
  const reus =
    post.soort === 'wet' ? ` Er staat een reus in het doel met ${post.wet} op zijn shirt.` : '';
  if (stap === 'richten')
    return `${begin}${reus} ${stil ? 'Kies links, midden of rechts.' : 'Het vizier zwaait heen en weer over het doel.'}`;
  if (stap === 'hoogte')
    return `${begin}${reus} Het vizier staat ${KANT_TEKST[kantVanX(vizier.x)]} en gaat op en neer.`;
  if (stap === 'vlucht') return `${begin}${reus} De bal is onderweg.`;
  if (!laatste) return begin;
  return `${begin} ${maakMelding(laatste).titel}`;
}

const kantVanX = (x: number): Kant => (x < -1 / 3 ? 'links' : x > 1 / 3 ? 'rechts' : 'midden');

// -------------------------------------------------------------------------------------------------
// Animatie
// -------------------------------------------------------------------------------------------------

type Punt = { x: number; y: number };
/** Een stuk van de vlucht van de bal: een bocht van `van` naar `naar`, met de straal erbij. */
type Stuk = {
  van: Punt;
  via: Punt;
  naar: Punt;
  r0: number;
  r1: number;
  duur: number;
  val?: boolean;
};
type Vlucht = {
  begin: number;
  stukken: Stuk[];
  einde: number;
  uitkomst: Uitkomst;
  doel: Punt;
  /** vanaf dit stuk is de bal in het net (achter de palen en de keeper) */
  inNet: number;
  klaar?: boolean;
};

type Animatie = {
  vizierTijd: number;
  vastX: number;
  pauzeTijd: number;
  muurBegin?: number;
  vlucht?: Vlucht;
  beurt?: Beurt;
  duik?: Kant;
};

const nieuweAnimatie = (): Animatie => ({ vizierTijd: 0, vastX: 0, pauzeTijd: 0 });

// Het doel: x van −1 (linkerpaal) tot 1 (rechterpaal), y van 0 (gras) tot 1 (lat).
const DOEL = { mx: 240, lijn: 214, half: 118, hoog: 80 };
const px = (x: number) => DOEL.mx + x * DOEL.half;
const py = (y: number) => DOEL.lijn - y * DOEL.hoog;
const STIP = { x: 240, y: 318 };
const BAL_R = 10;
const LUCHT_MS = 560;

function maakVlucht(schot: Punt, uitkomst: Uitkomst, begin: number, duik: Kant): Vlucht {
  const doel = { x: px(schot.x), y: py(schot.y) };
  const kant = schot.x === 0 ? (duik === 'links' ? 1 : -1) : Math.sign(schot.x);
  // effect: de bal draait eerst iets naar buiten en dan naar binnen
  const via = {
    x: (STIP.x + doel.x) / 2 - kant * 34,
    y: Math.min(STIP.y, doel.y) - 18 - schot.y * 26,
  };
  const stukken: Stuk[] = [{ van: STIP, via, naar: doel, r0: BAL_R, r1: 5.6, duur: LUCHT_MS }];
  let inNet = 99;
  if (uitkomst === 'goal') {
    const diep = { x: 240 + (doel.x - 240) * 0.86, y: 200 - (DOEL.lijn - doel.y) * 0.66 };
    stukken.push(
      { van: doel, via: midden(doel, diep), naar: diep, r0: 5.6, r1: 4.8, duur: 170 },
      {
        van: diep,
        via: { x: diep.x, y: diep.y },
        naar: { x: diep.x + kant * 4, y: 199 },
        r0: 4.8,
        r1: 4.8,
        duur: 420,
        val: true,
      },
    );
    inNet = 1;
  } else if (uitkomst === 'gestopt') {
    const terug = { x: doel.x + kant * 46, y: 286 };
    stukken.push({
      van: doel,
      via: { x: doel.x + kant * 30, y: doel.y - 30 },
      naar: terug,
      r0: 5.6,
      r1: 8.5,
      duur: 480,
    });
  } else if (uitkomst === 'wet') {
    const terug = { x: 240 + (doel.x - 240) * 0.3 - kant * 40, y: 338 };
    stukken.push({
      van: doel,
      via: { x: doel.x, y: doel.y - 60 },
      naar: terug,
      r0: 5.6,
      r1: 15,
      duur: 650,
    });
  } else if (uitkomst === 'naast') {
    stukken.push({
      van: doel,
      via: { x: doel.x + kant * 20, y: doel.y - 14 },
      naar: { x: doel.x + kant * 36, y: 160 },
      r0: 5.6,
      r1: 4.4,
      duur: 300,
    });
  } else {
    stukken.push({
      van: doel,
      via: { x: doel.x + kant * 6, y: doel.y - 30 },
      naar: { x: doel.x + kant * 12, y: 92 },
      r0: 5.6,
      r1: 3.4,
      duur: 340,
    });
  }
  const duur = stukken.reduce((s, x) => s + x.duur, 0);
  return { begin, stukken, einde: begin + duur + 280, uitkomst, doel, inNet };
}

const midden = (a: Punt, b: Punt): Punt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Waar de bal is op tijd t (ms na de trap): plek, straal, draaiing, hoogte boven het gras. */
function balOp(
  v: Vlucht,
  t: number,
): { p: Punt; r: number; stuk: number; draai: number; f: number } {
  let rest = t;
  for (let i = 0; i < v.stukken.length; i++) {
    const s = v.stukken[i];
    if (!s) break;
    if (rest <= s.duur || i === v.stukken.length - 1) {
      const lin = Math.max(0, Math.min(1, rest / s.duur));
      const f = s.val
        ? lin * lin
        : i === 0
          ? 1 - (1 - lin) * (1 - lin) * 0.35 - 0.65 * (1 - lin)
          : lin;
      const k = Math.max(0, Math.min(1, f));
      return {
        p: bezier(s.van, s.via, s.naar, k),
        r: s.r0 + (s.r1 - s.r0) * k,
        stuk: i,
        draai: (t / 1000) * 14,
        f: i === 0 ? k : 1,
      };
    }
    rest -= s.duur;
  }
  return { p: STIP, r: BAL_R, stuk: 0, draai: 0, f: 0 };
}

const vloeiend = (f: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, f)), 3);

// -------------------------------------------------------------------------------------------------
// Tekenen
// -------------------------------------------------------------------------------------------------

/** Vaste toevalsgetallen, zodat het publiek er steeds hetzelfde uitziet. */
function toeval(zaad: number): () => number {
  let s = zaad >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const SCHERP = 2;
let tribuneBeeld: HTMLCanvasElement | undefined;
let voorgrondBeeld: HTMLCanvasElement | undefined;

function laag(): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = BREEDTE * SCHERP;
  c.height = HOOGTE * SCHERP;
  const ctx = c.getContext('2d');
  ctx?.scale(SCHERP, SCHERP);
  return [c, ctx];
}

/** De tribunes vol publiek in groen en wit. Wordt één keer gemaakt. */
function tribune(): HTMLCanvasElement {
  if (tribuneBeeld) return tribuneBeeld;
  const [c, ctx] = laag();
  tribuneBeeld = c;
  if (!ctx) return c;
  const rnd = toeval(1971);
  // achterwand en lucht onder het dak
  const wand = ctx.createLinearGradient(0, 0, 0, 160);
  wand.addColorStop(0, '#0d1a14');
  wand.addColorStop(1, '#173826');
  ctx.fillStyle = wand;
  ctx.fillRect(0, 0, BREEDTE, 166);

  const shirts = ['#12924a', '#12924a', '#0e7a3c', '#f4f7f2', '#f4f7f2', '#1b2a22', '#2db35f'];
  const huid = ['#f1c7a3', '#e0ac85', '#c98d64', '#8d5a3b', '#f6d5bb'];
  const rij = (y: number, hoofd: number, stap: number, ruimte: number) => {
    // stoelen
    ctx.fillStyle = '#0b5e2e';
    ctx.fillRect(0, y + hoofd * 0.6, BREEDTE, hoofd * 1.6);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, y + hoofd * 0.6, BREEDTE, 1);
    for (let x = -4 + rnd() * stap; x < BREEDTE + 4; x += stap * (0.85 + rnd() * 0.35)) {
      // trappen tussen de vakken
      if (Math.abs(((x + 30) % 120) - 60) < ruimte) continue;
      if (rnd() < 0.08) continue;
      const shirt = shirts[Math.floor(rnd() * shirts.length)] ?? '#12924a';
      const dy = (rnd() - 0.5) * hoofd * 0.5;
      ctx.fillStyle = shirt;
      rondRechthoek(
        ctx,
        x - hoofd * 1.05,
        y + dy + hoofd * 0.7,
        hoofd * 2.1,
        hoofd * 2.2,
        hoofd * 0.7,
      );
      ctx.fill();
      ctx.fillStyle = huid[Math.floor(rnd() * huid.length)] ?? '#f1c7a3';
      ctx.beginPath();
      ctx.arc(x, y + dy, hoofd * 0.78, 0, Math.PI * 2);
      ctx.fill();
      // haar of een muts
      ctx.fillStyle = rnd() < 0.2 ? '#12924a' : rnd() < 0.5 ? '#3b2a1e' : '#c9a66b';
      ctx.beginPath();
      ctx.arc(x, y + dy - hoofd * 0.15, hoofd * 0.8, Math.PI, 0);
      ctx.fill();
      // een sjaal omhoog
      if (rnd() < 0.07) {
        ctx.save();
        ctx.translate(x, y + dy - hoofd * 1.4);
        ctx.rotate((rnd() - 0.5) * 0.4);
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = i % 2 ? '#ffffff' : '#12924a';
          ctx.fillRect(-hoofd * 3 + i * hoofd, -hoofd * 0.4, hoofd, hoofd * 0.8);
        }
        ctx.restore();
      }
    }
  };
  // bovenring
  for (let y = 30; y < 82; y += 5.2) rij(y, 1.5 + (y - 30) * 0.008, 4.6, 5);
  // balkon met naam
  const balkon = ctx.createLinearGradient(0, 84, 0, 96);
  balkon.addColorStop(0, '#0f7a3b');
  balkon.addColorStop(1, '#09532a');
  ctx.fillStyle = balkon;
  ctx.fillRect(0, 84, BREEDTE, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '800 8px Asap, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  for (let x = 40; x < BREEDTE; x += 130) ctx.fillText('E U R O B O R G', x, 90.5);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, 84, BREEDTE, 1);
  // onderring
  for (let y = 100; y < 150; y += 6.4) rij(y, 2 + (y - 100) * 0.012, 5.8, 7);
  // vlaggen
  for (const [x, y] of [
    [70, 112],
    [205, 60],
    [318, 120],
    [430, 70],
  ] as const) {
    ctx.strokeStyle = '#dcdcdc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 14);
    ctx.lineTo(x, y - 6);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#12924a';
      ctx.fillRect(x, y - 6 + i * 3.4, 16, 3.4);
    }
  }
  // licht van boven op het publiek
  const licht = ctx.createLinearGradient(0, 20, 0, 160);
  licht.addColorStop(0, 'rgba(255,250,220,0.10)');
  licht.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = licht;
  ctx.fillRect(0, 20, BREEDTE, 146);
  return c;
}

/** Het dak, de lichtmasten, de reclameborden en het gras. Wordt één keer gemaakt. */
function voorgrond(): HTMLCanvasElement {
  if (voorgrondBeeld) return voorgrondBeeld;
  const [c, ctx] = laag();
  voorgrondBeeld = c;
  if (!ctx) return c;
  const rnd = toeval(2027);

  // dak met spanten en een rij lampen
  const dak = ctx.createLinearGradient(0, 0, 0, 26);
  dak.addColorStop(0, '#05080b');
  dak.addColorStop(1, '#1f2a33');
  ctx.fillStyle = dak;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(BREEDTE, 0);
  ctx.lineTo(BREEDTE, 20);
  ctx.quadraticCurveTo(BREEDTE / 2, 30, 0, 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,180,195,0.35)';
  ctx.lineWidth = 0.8;
  for (let x = 0; x < BREEDTE; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 2);
    ctx.lineTo(x + 12, 21);
    ctx.lineTo(x + 24, 2);
    ctx.stroke();
  }
  for (let x = 8; x < BREEDTE; x += 16) {
    const y = 20 + Math.sin((x / BREEDTE) * Math.PI) * 8.5;
    const gloed = ctx.createRadialGradient(x, y, 0, x, y, 9);
    gloed.addColorStop(0, 'rgba(255,252,230,0.9)');
    gloed.addColorStop(1, 'rgba(255,252,230,0)');
    ctx.fillStyle = gloed;
    ctx.fillRect(x - 9, y - 9, 18, 18);
  }

  // lichtmasten in de hoeken
  for (const kant of [-1, 1]) {
    const x = kant < 0 ? 24 : BREEDTE - 24;
    const paal = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
    paal.addColorStop(0, '#59636d');
    paal.addColorStop(0.5, '#c9d1d8');
    paal.addColorStop(1, '#4a535c');
    ctx.fillStyle = paal;
    ctx.beginPath();
    ctx.moveTo(x - 4.5, 166);
    ctx.lineTo(x - 2, 30);
    ctx.lineTo(x + 2, 30);
    ctx.lineTo(x + 4.5, 166);
    ctx.closePath();
    ctx.fill();
    // vakwerk
    ctx.strokeStyle = 'rgba(40,46,52,0.6)';
    ctx.lineWidth = 0.6;
    for (let y = 40; y < 160; y += 10) {
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y + 10);
      ctx.stroke();
    }
    // lampenkop
    ctx.save();
    ctx.translate(x, 22);
    ctx.rotate(kant * 0.12);
    ctx.fillStyle = '#2a3138';
    rondRechthoek(ctx, -19, -12, 38, 22, 3);
    ctx.fill();
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 2; j++) {
        const lx = -15 + i * 9 + 2.5;
        const ly = -8 + j * 9 + 2.5;
        const lamp = ctx.createRadialGradient(lx, ly, 0, lx, ly, 4);
        lamp.addColorStop(0, '#ffffff');
        lamp.addColorStop(0.6, '#fff5c4');
        lamp.addColorStop(1, '#d9c27a');
        ctx.fillStyle = lamp;
        ctx.fillRect(lx - 3.5, ly - 3.5, 7, 7);
      }
    ctx.restore();
    // gloed en lichtbundel
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gloed = ctx.createRadialGradient(x, 22, 2, x, 22, 70);
    gloed.addColorStop(0, 'rgba(255,250,215,0.55)');
    gloed.addColorStop(0.3, 'rgba(255,245,200,0.16)');
    gloed.addColorStop(1, 'rgba(255,245,200,0)');
    ctx.fillStyle = gloed;
    ctx.fillRect(x - 70, 0, 140, 92);
    const bundel = ctx.createLinearGradient(x, 30, 240, 300);
    bundel.addColorStop(0, 'rgba(255,250,220,0.10)');
    bundel.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = bundel;
    ctx.beginPath();
    ctx.moveTo(x - 10, 30);
    ctx.lineTo(x + 10, 30);
    ctx.lineTo(240 + kant * 10, 330);
    ctx.lineTo(240 + kant * 190, 330);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // reclameborden (de tekst loopt, die komt er elk beeld bij)
  ctx.fillStyle = '#0a0f0c';
  ctx.fillRect(0, 150, BREEDTE, 17);
  ctx.fillStyle = '#1c2621';
  ctx.fillRect(0, 150, BREEDTE, 1.5);
  ctx.fillStyle = '#2b3a33';
  for (let x = 0; x < BREEDTE; x += 120) ctx.fillRect(x, 150, 1.2, 17);

  // gras met maaipatroon in banen (dichterbij breder)
  const banen = 10;
  for (let i = 0; i < banen; i++) {
    const y0 = 167 + 193 * Math.pow(i / banen, 1.45);
    const y1 = 167 + 193 * Math.pow((i + 1) / banen, 1.45);
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    const licht = i % 2 === 0;
    g.addColorStop(0, licht ? '#3fa94c' : '#318f3e');
    g.addColorStop(1, licht ? '#3aa047' : '#2d8639');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, BREEDTE, y1 - y0 + 0.5);
  }
  // schuine banen in de lengte, heel licht
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = -6; i <= 6; i += 2) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(240 + i * 26, 167);
    ctx.lineTo(240 + (i + 1) * 26, 167);
    ctx.lineTo(240 + (i + 1) * 110, HOOGTE);
    ctx.lineTo(240 + i * 110, HOOGTE);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // grassprietjes
  for (let i = 0; i < 900; i++) {
    const y = 168 + rnd() * 192;
    const x = rnd() * BREEDTE;
    const d = (y - 160) / 200;
    ctx.strokeStyle = rnd() < 0.5 ? 'rgba(20,70,25,0.35)' : 'rgba(160,230,140,0.25)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 1.5, y - 1.2 - d * 2.5);
    ctx.stroke();
  }

  // lijnen
  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, DOEL.lijn);
  ctx.lineTo(BREEDTE, DOEL.lijn);
  ctx.stroke();
  ctx.lineWidth = 1.9;
  // doelgebied
  ctx.beginPath();
  ctx.moveTo(240 - 166, DOEL.lijn);
  ctx.lineTo(240 - 190, 238);
  ctx.lineTo(240 + 190, 238);
  ctx.lineTo(240 + 166, DOEL.lijn);
  ctx.stroke();
  // strafschopgebied
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.moveTo(-40, 308);
  ctx.lineTo(BREEDTE + 40, 308);
  ctx.stroke();
  // stip
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(STIP.x, STIP.y + 3, 5, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // boog van het strafschopgebied
  ctx.beginPath();
  ctx.ellipse(240, 316, 120, 40, 0, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  // schaduw onder het doel en donkere hoeken
  ctx.fillStyle = 'rgba(0,30,10,0.28)';
  ctx.beginPath();
  ctx.moveTo(px(-1), DOEL.lijn);
  ctx.lineTo(px(-1) + 16, 199);
  ctx.lineTo(px(1) - 16, 199);
  ctx.lineTo(px(1), DOEL.lijn);
  ctx.closePath();
  ctx.fill();
  const hoek = ctx.createRadialGradient(240, 250, 120, 240, 250, 330);
  hoek.addColorStop(0, 'rgba(0,0,0,0)');
  hoek.addColorStop(1, 'rgba(0,10,0,0.45)');
  ctx.fillStyle = hoek;
  ctx.fillRect(0, 166, BREEDTE, 194);
  return c;
}

/** De lopende tekst op de reclameborden: de uitleg van de post. */
function ledBord(ctx: CanvasRenderingContext2D, post: Penalty, nu: number, stil: boolean): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 151.5, BREEDTE, 15);
  ctx.clip();
  const tekst = `${post.naam.toUpperCase()}  ·  ${post.uitleg}   ●   SCHRAPPEN OF LATEN STAAN?   ●   `;
  ctx.font = '700 9.5px Asap, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const b = ctx.measureText(tekst).width;
  const verschuif = stil ? 0 : ((nu / 1000) * 38) % b;
  ctx.shadowColor = 'rgba(80,255,140,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#b8ffcf';
  for (let x = 6 - verschuif; x < BREEDTE; x += b) ctx.fillText(tekst, x, 159.5);
  ctx.restore();
  // pixelraster
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 152; y < 167; y += 2) ctx.fillRect(0, y, BREEDTE, 0.6);
}

/** Het scorebord dat aan het dak hangt: de post en wat er gebeurt. */
function scorebord(
  ctx: CanvasRenderingContext2D,
  post: Penalty,
  kop: string,
  onder: { tekst: string; kleur: string },
): void {
  const x = 150;
  const y = 30;
  const b = 180;
  const h = 62;
  // kabels
  ctx.strokeStyle = '#3a454f';
  ctx.lineWidth = 1;
  for (const kx of [x + 20, x + b - 20]) {
    ctx.beginPath();
    ctx.moveTo(kx, 22);
    ctx.lineTo(kx, y);
    ctx.stroke();
  }
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#20262c';
  rondRechthoek(ctx, x - 3, y - 3, b + 6, h + 6, 5);
  ctx.fill();
  ctx.restore();
  const scherm = ctx.createLinearGradient(0, y, 0, y + h);
  scherm.addColorStop(0, '#07130c');
  scherm.addColorStop(1, '#0c1f14');
  ctx.fillStyle = scherm;
  rondRechthoek(ctx, x, y, b, h, 3);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7dffaa';
  ctx.font = '700 8px Asap, system-ui, sans-serif';
  ctx.fillText(kop, x + b / 2, y + 8);
  // de naam van de post, zo groot als past
  let maat = 15;
  let regels: string[] = [];
  for (; maat >= 10; maat -= 1) {
    ctx.font = `800 ${maat}px Asap, system-ui, sans-serif`;
    regels = breekTekst(ctx, post.naam, b - 14);
    if (regels.length <= 2) break;
  }
  regels = regels.slice(0, 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255,255,255,0.5)';
  ctx.shadowBlur = 3;
  const midden = y + 29;
  regels.forEach((r, i) =>
    ctx.fillText(r, x + b / 2, midden + (i - (regels.length - 1) / 2) * (maat + 1)),
  );
  ctx.shadowBlur = 0;
  ctx.fillStyle = onder.kleur;
  ctx.fillRect(x + 3, y + h - 15, b - 6, 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 8.5px Asap, system-ui, sans-serif';
  ctx.fillText(onder.tekst, x + b / 2, y + h - 8.6);
  // pixelraster
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let yy = y + 1; yy < y + h; yy += 2) ctx.fillRect(x, yy, b, 0.5);
}

/** Het net: achterkant, dak en zijkanten, met een bolling waar de bal erin gaat. */
function net(ctx: CanvasRenderingContext2D, bol?: { p: Punt; kracht: number }): void {
  const L = px(-1);
  const R = px(1);
  const T = py(1);
  const A = { l: L + 16, r: R - 16, t: T + 13, o: 199 };
  const vervorm = (p: Punt): Punt => {
    if (!bol || bol.kracht <= 0.001) return p;
    const dx = p.x - bol.p.x;
    const dy = p.y - bol.p.y;
    const d2 = dx * dx + dy * dy;
    const f = bol.kracht * Math.exp(-d2 / (2 * 30 * 30));
    // het net wordt naar achteren gedrukt: naar het midden van de achterkant toe, en iets omlaag
    return { x: p.x - dx * f * 0.45, y: p.y - dy * f * 0.45 + f * 7 };
  };
  const vlak = (a: Punt, b: Punt, c: Punt, d: Punt, nu: number, nv: number) => {
    // a-b boven, d-c onder (bilineair)
    const op = (u: number, v: number): Punt =>
      vervorm({
        x: (1 - v) * ((1 - u) * a.x + u * b.x) + v * ((1 - u) * d.x + u * c.x),
        y: (1 - v) * ((1 - u) * a.y + u * b.y) + v * ((1 - u) * d.y + u * c.y),
      });
    // achtergrond van het vlak, iets donker
    ctx.fillStyle = 'rgba(10,30,15,0.18)';
    ctx.beginPath();
    const rand = [op(0, 0), op(1, 0), op(1, 1), op(0, 1)];
    rand.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i <= nu; i++) {
      for (let j = 0; j <= 8; j++) {
        const p = op(i / nu, j / 8);
        if (j) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
    }
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= 12; i++) {
        const p = op(i / 12, j / nv);
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
    }
    ctx.stroke();
  };
  ctx.save();
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = 'rgba(235,240,245,0.55)';
  // achterkant
  vlak({ x: A.l, y: A.t }, { x: A.r, y: A.t }, { x: A.r, y: A.o }, { x: A.l, y: A.o }, 22, 9);
  // dak
  ctx.strokeStyle = 'rgba(235,240,245,0.45)';
  vlak({ x: L, y: T }, { x: R, y: T }, { x: A.r, y: A.t }, { x: A.l, y: A.t }, 24, 2);
  // zijkanten
  ctx.strokeStyle = 'rgba(235,240,245,0.5)';
  vlak({ x: L, y: T }, { x: A.l, y: A.t }, { x: A.l, y: A.o }, { x: L, y: DOEL.lijn }, 2, 9);
  vlak({ x: A.r, y: A.t }, { x: R, y: T }, { x: R, y: DOEL.lijn }, { x: A.r, y: A.o }, 2, 9);
  // schaduw van de bolling
  if (bol && bol.kracht > 0.02) {
    const s = ctx.createRadialGradient(bol.p.x, bol.p.y, 0, bol.p.x, bol.p.y, 26);
    s.addColorStop(0, `rgba(0,0,0,${0.35 * bol.kracht})`);
    s.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = s;
    ctx.fillRect(bol.p.x - 26, bol.p.y - 26, 52, 52);
  }
  // steunen achter
  ctx.strokeStyle = 'rgba(210,215,220,0.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(L, T);
  ctx.lineTo(A.l, A.t);
  ctx.lineTo(A.l, A.o);
  ctx.moveTo(R, T);
  ctx.lineTo(A.r, A.t);
  ctx.lineTo(A.r, A.o);
  ctx.stroke();
  ctx.restore();
}

/** Palen en lat: wit, rond (met een verloop). */
function doelraam(ctx: CanvasRenderingContext2D): void {
  const L = px(-1);
  const R = px(1);
  const T = py(1);
  const dik = 5;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  for (const x of [L, R]) {
    const g = ctx.createLinearGradient(x - dik / 2, 0, x + dik / 2, 0);
    g.addColorStop(0, '#c8cdd2');
    g.addColorStop(0.45, '#ffffff');
    g.addColorStop(1, '#a9b0b6');
    ctx.fillStyle = g;
    ctx.fillRect(x - dik / 2, T - dik / 2, dik, DOEL.lijn - T + dik / 2);
  }
  const g = ctx.createLinearGradient(0, T - dik / 2, 0, T + dik / 2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#b3b9bf');
  ctx.fillStyle = g;
  ctx.fillRect(L - dik / 2, T - dik / 2, R - L + dik, dik);
  ctx.restore();
}

type KeeperKleur = { shirt: string; donker: string; broek: string; handschoen: string };
const KEEPER_EERST: KeeperKleur = {
  shirt: '#ff8a1f',
  donker: '#c25e05',
  broek: '#1d1d1f',
  handschoen: '#b7ff3c',
};
const KEEPER_KLEUR: KeeperKleur[] = [
  KEEPER_EERST,
  { shirt: '#8a4dff', donker: '#5a23c4', broek: '#1d1d1f', handschoen: '#ffe14d' },
  { shirt: '#1c1c22', donker: '#000000', broek: '#1c1c22', handschoen: '#ffd23c' },
];

/** De keeper. (hx, hy) is zijn heup; `draai` kantelt hem (duiken), `armen` 0 = laag, 1 = gestrekt. */
function keeper(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  draai: number,
  armen: number,
  schaal: number,
  kleur: KeeperKleur,
  nu: number,
): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(draai);
  ctx.scale(schaal, schaal);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // benen
  const spreid = 5 + armen * 3;
  for (const k of [-1, 1]) {
    ctx.strokeStyle = '#e9b48d';
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(k * 3.5, 4);
    ctx.lineTo(k * spreid, 22);
    ctx.stroke();
    // kousen en schoenen
    ctx.strokeStyle = kleur.shirt;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(k * (3.5 + (spreid - 3.5) * 0.55), 14);
    ctx.lineTo(k * spreid, 22);
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(k * spreid + k * 1.5, 24, 3.6, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // broek
  ctx.fillStyle = kleur.broek;
  rondRechthoek(ctx, -8, -2, 16, 9, 2);
  ctx.fill();
  // lijf
  const lijf = ctx.createLinearGradient(-9, 0, 9, 0);
  lijf.addColorStop(0, kleur.donker);
  lijf.addColorStop(0.45, kleur.shirt);
  lijf.addColorStop(1, kleur.donker);
  ctx.fillStyle = lijf;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-10, -22);
  ctx.quadraticCurveTo(0, -26, 10, -22);
  ctx.lineTo(8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '800 7px Asap, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', 0, -11);
  // armen
  const wieb = Math.sin(nu / 220) * 0.12 * (1 - armen);
  for (const k of [-1, 1]) {
    const hoek = (0.75 + armen * 1.95 + wieb * k) * k;
    const sx = k * 9;
    const sy = -20;
    const ex = sx + Math.sin(hoek) * 17;
    const ey = sy + Math.cos(hoek) * 17;
    ctx.strokeStyle = kleur.shirt;
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = kleur.handschoen;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(ex + Math.sin(hoek) * 2, ey + Math.cos(hoek) * 2, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // hoofd
  ctx.fillStyle = '#e9b48d';
  ctx.beginPath();
  ctx.arc(0, -31, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2618';
  ctx.beginPath();
  ctx.arc(0, -32.5, 6.2, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-2.2, -30.5, 0.9, 0, Math.PI * 2);
  ctx.arc(2.2, -30.5, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** De reus van de wet: een enorme keeper met de naam van de wet op zijn shirt. */
function wetReus(ctx: CanvasRenderingContext2D, wet: string, op: number, nu: number): void {
  const dy = (1 - vloeiend(op)) * 230;
  const adem = Math.sin(nu / 600) * 1.5;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, BREEDTE, DOEL.lijn + 6);
  ctx.clip();
  ctx.translate(0, dy);
  // gloed achter de reus
  const gloed = ctx.createRadialGradient(240, 120, 20, 240, 120, 180);
  gloed.addColorStop(0, `rgba(255,70,50,${0.28 * op})`);
  gloed.addColorStop(1, 'rgba(255,70,50,0)');
  ctx.fillStyle = gloed;
  ctx.fillRect(40, 0, 400, 230);
  // muur van wetsartikelen in het doel
  ctx.fillStyle = 'rgba(120,20,25,0.35)';
  ctx.fillRect(px(-1), py(1), px(1) - px(-1), DOEL.lijn - py(1));
  ctx.strokeStyle = 'rgba(255,200,190,0.35)';
  ctx.lineWidth = 0.8;
  for (let y = py(1) + 10; y < DOEL.lijn; y += 10) {
    const v = ((y / 10) % 2) * 14;
    ctx.beginPath();
    ctx.moveTo(px(-1), y);
    ctx.lineTo(px(1), y);
    ctx.stroke();
    for (let x = px(-1) + v; x < px(1); x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
  const kleur = '#2a3550';
  const donker = '#151b2c';
  // benen
  ctx.fillStyle = donker;
  rondRechthoek(ctx, 196, 168, 26, 50, 8);
  ctx.fill();
  rondRechthoek(ctx, 258, 168, 26, 50, 8);
  ctx.fill();
  ctx.fillStyle = '#0b0b0d';
  rondRechthoek(ctx, 188, 206, 38, 12, 6);
  ctx.fill();
  rondRechthoek(ctx, 254, 206, 38, 12, 6);
  ctx.fill();
  // lijf
  const lijf = ctx.createLinearGradient(170, 0, 310, 0);
  lijf.addColorStop(0, donker);
  lijf.addColorStop(0.5, kleur);
  lijf.addColorStop(1, donker);
  ctx.fillStyle = lijf;
  ctx.beginPath();
  ctx.moveTo(186, 176);
  ctx.lineTo(166, 66 + adem);
  ctx.quadraticCurveTo(240, 44 + adem, 314, 66 + adem);
  ctx.lineTo(294, 176);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d4a93a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // armen wijd: van paal tot paal
  for (const k of [-1, 1]) {
    ctx.strokeStyle = kleur;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(240 + k * 64, 74 + adem);
    ctx.quadraticCurveTo(240 + k * 110, 70 + adem, 240 + k * 128, 108);
    ctx.stroke();
    // handschoen
    const hx = 240 + k * 130;
    const hy = 118;
    const hs = ctx.createRadialGradient(hx - 4, hy - 4, 2, hx, hy, 20);
    hs.addColorStop(0, '#fff3a8');
    hs.addColorStop(1, '#e0a400');
    ctx.fillStyle = hs;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 17, 20, k * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6300';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // § op de achtergrond van het shirt
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.font = '900 96px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('§', 240, 122);
  // de naam van de wet
  ctx.fillStyle = '#ffffff';
  let maat = 20;
  let regels: string[] = [];
  for (; maat >= 11; maat -= 1) {
    ctx.font = `900 ${maat}px Asap, system-ui, sans-serif`;
    regels = breekTekst(ctx, wet.toUpperCase(), 108);
    if (regels.length <= 3 && regels.every((r) => ctx.measureText(r).width <= 112)) break;
  }
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  regels.forEach((r, i) => ctx.fillText(r, 240, 112 + (i - (regels.length - 1) / 2) * (maat + 2)));
  ctx.shadowBlur = 0;
  // hoofd
  ctx.fillStyle = '#e2a982';
  ctx.beginPath();
  ctx.arc(240, 34 + adem, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b1d14';
  ctx.beginPath();
  ctx.arc(240, 28 + adem, 22.5, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  // boze wenkbrauwen, ogen, mond
  ctx.strokeStyle = '#2b1d14';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(226, 28 + adem);
  ctx.lineTo(236, 32 + adem);
  ctx.moveTo(254, 28 + adem);
  ctx.lineTo(244, 32 + adem);
  ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(231, 37 + adem, 2.2, 0, Math.PI * 2);
  ctx.arc(249, 37 + adem, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(232, 47 + adem);
  ctx.lineTo(248, 47 + adem);
  ctx.stroke();
  ctx.restore();
}

/** De bal, met vlakken die meedraaien. */
function bal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, draai: number): void {
  ctx.save();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.7, '#e9edf0');
  g.addColorStop(1, '#9aa3ab');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#1f2328';
  const vijfhoek = (cx: number, cy: number, s: number, a: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const h = a + (i * 2 * Math.PI) / 5;
      const qx = cx + Math.cos(h) * s;
      const qy = cy + Math.sin(h) * s;
      if (i) ctx.lineTo(qx, qy);
      else ctx.moveTo(qx, qy);
    }
    ctx.closePath();
    ctx.fill();
  };
  const ox = Math.sin(draai) * r * 0.25;
  vijfhoek(x + ox, y, r * 0.34, draai);
  for (let i = 0; i < 5; i++) {
    const h = draai + (i * 2 * Math.PI) / 5 + Math.PI / 5;
    vijfhoek(x + ox + Math.cos(h) * r * 0.92, y + Math.sin(h) * r * 0.92, r * 0.3, h);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.28, r * 0.15, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function vizierTekenen(ctx: CanvasRenderingContext2D, v: Punt, stap: Stap, nu: number): void {
  const x = px(v.x);
  const y = py(v.y);
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (stap === 'richten') {
    ctx.moveTo(px(-1.25), y);
    ctx.lineTo(px(1.25), y);
  } else {
    ctx.moveTo(x, DOEL.lijn);
    ctx.lineTo(x, py(1.25));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const puls = 1 + Math.sin(nu / 130) * 0.08;
  const r = 12 * puls;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ff3b30';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, r - 3.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    ctx.moveTo(x + dx * (r - 4), y + dy * (r - 4));
    ctx.lineTo(x + dx * (r + 5), y + dy * (r + 5));
  }
  ctx.stroke();
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Drie doelen om aan te tikken (rustige modus). */
function kantenTekenen(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  KANTEN.forEach((k) => {
    const s = rustigSchot(k);
    const x = px(s.x);
    const y = py(s.y);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 13px Asap, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(k === 'links' ? '◀' : k === 'rechts' ? '▶' : '▲', x, y + 0.5);
  });
  ctx.restore();
}

const BANIER: Record<Uitkomst | 'laten' | 'telaat', { tekst: string; kleur: string }> = {
  goal: { tekst: 'GOAL!', kleur: '#ffe14d' },
  gestopt: { tekst: 'GESTOPT!', kleur: '#ffffff' },
  naast: { tekst: 'NAAST!', kleur: '#ffffff' },
  over: { tekst: 'OVER!', kleur: '#ffffff' },
  wet: { tekst: 'MOET VAN DE WET', kleur: '#ff5a4a' },
  laten: { tekst: 'LATEN STAAN', kleur: '#ffffff' },
  telaat: { tekst: 'TE LAAT!', kleur: '#ff5a4a' },
};

function banier(ctx: CanvasRenderingContext2D, soort: keyof typeof BANIER, f: number): void {
  const b = BANIER[soort];
  const schaal = 0.6 + 0.4 * vloeiend(f * 2.2) + (f < 0.45 ? Math.sin(f * 7) * 0.05 : 0);
  ctx.save();
  ctx.translate(240, 262);
  ctx.rotate(soort === 'wet' ? -0.08 : 0);
  ctx.scale(schaal, schaal);
  ctx.globalAlpha = Math.min(1, f * 4);
  ctx.font = `900 ${soort === 'wet' || soort === 'laten' ? 30 : 42}px Asap, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (soort === 'wet') {
    const w = ctx.measureText(b.tekst).width + 26;
    ctx.fillStyle = 'rgba(80,0,0,0.55)';
    rondRechthoek(ctx, -w / 2, -24, w, 48, 8);
    ctx.fill();
    ctx.strokeStyle = b.kleur;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = soort === 'goal' ? '#0b5e2e' : 'rgba(0,0,0,0.75)';
  ctx.strokeText(b.tekst, 0, 2);
  ctx.fillStyle = b.kleur;
  ctx.fillText(b.tekst, 0, 2);
  ctx.restore();
}

type Beeld = {
  post: Penalty;
  stap: Stap;
  ronde: number;
  nr: number;
  per: number;
  anim: Animatie;
  vizier?: Punt;
  stil: boolean;
  nu: number;
};

function teken(canvas: HTMLCanvasElement | null, b: Beeld): void {
  const ctx = maakScherp(canvas, BREEDTE, HOOGTE);
  if (!ctx) return;
  const { anim: a, nu, stil, post } = b;
  const v = a.vlucht;
  const t = v ? (stil ? Infinity : nu - v.begin) : 0;
  const beurt = b.stap === 'uitslag' || b.stap === 'vlucht' ? a.beurt : undefined;
  const goal = v?.uitkomst === 'goal';
  const juich = goal && !stil ? Math.max(0, 1 - (t - LUCHT_MS) / 2600) : 0;

  // publiek (springt bij een goal)
  const spring =
    juich > 0 && t > LUCHT_MS ? -Math.abs(Math.sin((t - LUCHT_MS) / 110)) * 3 * juich : 0;
  ctx.drawImage(tribune(), 0, spring, BREEDTE, HOOGTE);
  // flitsen van camera's bij een goal
  if (juich > 0 && t > LUCHT_MS) {
    const rnd = toeval(Math.floor(nu / 70));
    for (let i = 0; i < 9; i++) {
      const fx = rnd() * BREEDTE;
      const fy = 30 + rnd() * 115;
      const fl = ctx.createRadialGradient(fx, fy, 0, fx, fy, 6);
      fl.addColorStop(0, `rgba(255,255,255,${0.95 * juich})`);
      fl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fl;
      ctx.fillRect(fx - 6, fy - 6, 12, 12);
    }
  }
  ctx.drawImage(voorgrond(), 0, 0, BREEDTE, HOOGTE);
  ledBord(ctx, post, nu, stil);

  // scorebord
  const onder =
    b.stap === 'uitslag' && a.beurt
      ? a.beurt.keuze === 'schrappen'
        ? a.beurt.uitkomst === 'goal'
          ? { tekst: `GOAL! ${mln(a.beurt.bespaardMln).toUpperCase()} BESPAARD`, kleur: '#12924a' }
          : a.beurt.uitkomst === 'wet'
            ? { tekst: `GESTOPT: ${post.wet?.toUpperCase() ?? 'DE WET'}`, kleur: '#b3261e' }
            : { tekst: 'GEEN GOAL', kleur: '#59636d' }
        : a.beurt.keuze === 'laten'
          ? {
              tekst: post.soort === 'wet' ? 'GOED: MOET VAN DE WET' : 'EIGEN KEUZE: MAG',
              kleur: post.soort === 'wet' ? '#12924a' : '#59636d',
            }
          : { tekst: 'TE LAAT', kleur: '#b3261e' }
      : b.stap === 'kiezen'
        ? { tekst: 'SCHRAPPEN OF LATEN STAAN?', kleur: '#0e6b35' }
        : { tekst: `${mln(post.bedragMln).toUpperCase()} PER JAAR`, kleur: '#0e6b35' };
  scorebord(ctx, post, `RONDE ${b.ronde + 1}  ·  PENALTY ${b.nr + 1}/${b.per}`, onder);

  // net, met een bolling bij een goal
  let bol: { p: Punt; kracht: number } | undefined;
  if (goal && v && t > LUCHT_MS) {
    const s = stil ? 0 : (t - LUCHT_MS) / 1000;
    const kracht = stil ? 0.55 : Math.exp(-s * 2.4) * (0.75 + 0.25 * Math.cos(s * 16));
    bol = { p: v.doel, kracht };
  }
  net(ctx, bol);

  // de bal in het net komt achter de palen en de keeper
  const balNu =
    v && b.stap !== 'kiezen' && b.stap !== 'richten' && b.stap !== 'hoogte'
      ? balOp(v, t)
      : undefined;
  if (balNu && v && balNu.stuk >= v.inNet) bal(ctx, balNu.p.x, balNu.p.y, balNu.r, balNu.draai);

  // de keeper (niet bij een post van de wet: dan staat de reus er)
  const reus = post.soort === 'wet' && a.muurBegin !== undefined;
  if (!reus) {
    const kleur = KEEPER_KLEUR[b.ronde] ?? KEEPER_EERST;
    const schaal = 1 + b.ronde * 0.06;
    const staand = { x: 240, y: DOEL.lijn - 26 * schaal };
    const duik = v && a.duik ? vloeiend(stil ? 1 : (t - 110) / 460) : 0;
    if (duik > 0 && a.duik) {
      const doelX = px(DUIK_X[a.duik]);
      const midden = a.duik === 'midden';
      const hx = staand.x + (doelX - staand.x) * duik;
      const hy =
        staand.y -
        Math.sin(Math.min(1, duik) * Math.PI * 0.6) * (midden ? 26 : 22) * (stil ? 0.9 : 1);
      const draai = midden ? 0 : (a.duik === 'links' ? -1 : 1) * 1.25 * duik;
      keeper(ctx, hx, hy, draai, duik, schaal, kleur, nu);
    } else {
      const wieg = stil ? 0 : Math.sin(nu / 380) * 5;
      keeper(ctx, staand.x + wieg, staand.y, wieg * 0.01, 0.15, schaal, kleur, nu);
    }
    // schaduw van de keeper op het gras
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(
      240 + (duik && a.duik ? (px(DUIK_X[a.duik]) - 240) * duik : 0),
      DOEL.lijn + 1,
      16,
      3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  doelraam(ctx);

  if (reus && a.muurBegin !== undefined)
    wetReus(ctx, post.wet ?? 'Wet', stil ? 1 : Math.min(1, (nu - a.muurBegin) / 750), nu);

  // de bal: op de stip, of in de lucht
  if (!balNu) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(STIP.x + 2, STIP.y + BAL_R - 1, BAL_R * 1.1, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    bal(ctx, STIP.x, STIP.y, BAL_R, 0.3);
  } else if (v && balNu.stuk < v.inNet) {
    // schaduw op het gras: van de stip naar de doellijn
    const grond = STIP.y + (DOEL.lijn - STIP.y) * Math.min(1, balNu.f);
    const hoogte = Math.max(0, grond - balNu.p.y);
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0.06, 0.3 - hoogte / 300)})`;
    ctx.beginPath();
    ctx.ellipse(
      balNu.p.x + hoogte * 0.08,
      grond + balNu.r * 0.6,
      balNu.r * 1.1,
      balNu.r * 0.32,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    // een staart achter de bal
    if (!stil && t < LUCHT_MS) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = balNu.r * 1.2;
      ctx.lineCap = 'round';
      const terug = balOp(v, Math.max(0, t - 45)).p;
      ctx.beginPath();
      ctx.moveTo(terug.x, terug.y);
      ctx.lineTo(balNu.p.x, balNu.p.y);
      ctx.stroke();
    }
    bal(ctx, balNu.p.x, balNu.p.y, balNu.r, balNu.draai);
    // een klap tegen de reus
    if (v.uitkomst === 'wet' && t > LUCHT_MS && t < LUCHT_MS + 260) {
      const f = (t - LUCHT_MS) / 260;
      ctx.save();
      ctx.translate(v.doel.x, v.doel.y);
      ctx.strokeStyle = `rgba(255,240,180,${1 - f})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const h = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(h) * (6 + f * 10), Math.sin(h) * (6 + f * 10));
        ctx.lineTo(Math.cos(h) * (14 + f * 18), Math.sin(h) * (14 + f * 18));
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // vizier
  if (b.vizier && (b.stap === 'richten' || b.stap === 'hoogte'))
    vizierTekenen(ctx, b.vizier, b.stap, nu);
  if (stil && b.stap === 'richten') kantenTekenen(ctx);

  // banier met de uitkomst
  if (b.stap === 'uitslag' && beurt) {
    const soort = beurt.keuze === 'schrappen' ? (beurt.uitkomst ?? 'naast') : beurt.keuze;
    const f = stil || !v ? 1 : Math.min(1, (nu - v.einde + 280) / 500);
    banier(ctx, soort, beurt.keuze === 'schrappen' ? f : 1);
    if (soort === 'goal') {
      ctx.save();
      ctx.font = '800 16px Asap, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0b5e2e';
      const tekst = `${metTeken(beurt.bespaardMln)} voor de pot`;
      ctx.strokeText(tekst, 240, 296);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tekst, 240, 296);
      ctx.restore();
    }
  }
}

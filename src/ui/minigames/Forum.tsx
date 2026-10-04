/**
 * Forum: "Geldtoren op het dakterras". Op het dakterras van het Forum, met uitzicht over de
 * gemeente en de Martinitoren, bouw je een stapel geld zo hoog als jij denkt dat de gemeente per
 * jaar aan iets uitgeeft. Met de schuif, of door op het veld te slepen. Bij "Raad!" groeit de
 * echte stapel ernaast en zie je hoe dichtbij je zat.
 *
 * Drie levels van drie vragen; elke vraag heeft een tijd. Bij minder beweging loopt er geen tijd
 * en beweegt er niets vanzelf: je speelt in je eigen tempo.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatEuro } from '../../engine';
import {
  DOEL_STERREN,
  HULP_KOST,
  LEVELS,
  MAX_STERREN,
  STAPPEN,
  VRAGEN_PER_LEVEL,
  forumBasis,
  groei,
  hoogteVan,
  hulpPost,
  oordeel,
  perInwonerEuro,
  puntenVoor,
  schaalVoor,
  stapNaarWaarde,
  sterrenVoor,
  toonBedrag,
  vergelijking,
  vergelijkTekst,
  vragenVoorLevel,
  waardeNaarStap,
  type Schaal,
  type Vraag,
} from '../../game/mgForum';
import type { BekendePost } from '../../game/minigames';
import { Hud, Meldingen, PauzeKnop, SpelKaart, type Melding } from './kader/kader';
import { breekTekst, maakScherp, rondRechthoek, useLus, useStil, useToetsen } from './kader/hulp';
import type { MinigameProps } from './types';
import './Forum.css';

// Het speelveld in beeldpunten (het canvas schaalt mee).
const BREEDTE = 400;
const HOOGTE = 360;
/** Hier staan de stapels (de vloer van het dakterras) en zo hoog kan een stapel worden. */
const VLOER = 300;
const TOP = 46;
const JIJ_X = 150;
const ECHT_X = 290;
const STAPEL_B = 64;
/** Zo lang groeit de echte stapel (ms). */
const GROEI_MS = 1300;

type Fase = 'start' | 'vraag' | 'uitslag' | 'level' | 'klaar';

type Antwoord = {
  vraag: Vraag;
  gok: number;
  sterren: number;
  punten: number;
  hulp: boolean;
  level: number;
};

/** Wat het canvas nodig heeft om te tekenen; staat in een ref, zodat de lus het kan lezen. */
type Beeld = {
  schaal: Schaal;
  gok: number;
  echt?: number;
  /** wanneer de echte stapel begon te groeien (performance.now) */
  sinds: number;
  sterren: number;
  oordeel: string;
  hulp?: { naam: string; waarde: number };
  pauze: boolean;
  stil: boolean;
};

const sterTekst = (n: number) => '★'.repeat(n) + '☆'.repeat(MAX_STERREN - n);

export default function Forum({ data, onKlaar }: MinigameProps) {
  const stil = useStil();
  const basis = useMemo(() => forumBasis(data), [data]);
  const jaar = data.begroting.begrotingsjaar;

  const [fase, setFase] = useState<Fase>('start');
  const [levelNr, setLevelNr] = useState(1);
  const [vragen, setVragen] = useState<Vraag[]>([]);
  const [vraagNr, setVraagNr] = useState(0);
  const [stap, setStap] = useState(0);
  const [hulp, setHulp] = useState<BekendePost>();
  const [antwoorden, setAntwoorden] = useState<Antwoord[]>([]);
  const [alle, setAlle] = useState<Antwoord[]>([]);
  const [besteSterren, setBesteSterren] = useState<number[]>([0, 0, 0]);
  const [punten, setPunten] = useState(0);
  const [tijd, setTijd] = useState(0);
  const [pauze, setPauze] = useState(false);
  const [melding, setMelding] = useState<Melding>();

  const id = useId();
  const doek = useRef<HTMLCanvasElement>(null);
  const schuif = useRef<HTMLInputElement>(null);
  const volgendeKnop = useRef<HTMLButtonElement>(null);
  const resterend = useRef(0);
  const sinds = useRef(0);
  const sleept = useRef(false);
  /** de hoogte van jouw stapel zoals hij nu getekend wordt (groeit vloeiend naar je schatting) */
  const gokHoogte = useRef(0);
  /** de vraag is al beantwoord (zodat de klok niet twee keer raadt) */
  const beantwoord = useRef(false);

  const instelling = LEVELS[levelNr - 1] ?? LEVELS[0];
  const vraag = vragen[vraagNr];
  const schaal = schaalVoor(vraag?.eenheid ?? instelling?.eenheid ?? 'mln');
  const gok = stapNaarWaarde(stap, schaal);
  const laatste = antwoorden[antwoorden.length - 1];
  const levelSterren = antwoorden.reduce((s, a) => s + a.sterren, 0);
  const totaalSterren = besteSterren.reduce((s, x) => s + x, 0);
  const maxSterren = LEVELS.length * VRAGEN_PER_LEVEL * MAX_STERREN;
  const eenheidTekst = schaal.eenheid === 'mln' ? 'per jaar' : 'per inwoner per jaar';

  const beeld = useRef<Beeld>({
    schaal,
    gok,
    sinds: 0,
    sterren: 0,
    oordeel: '',
    pauze: false,
    stil,
  });
  useEffect(() => {
    beeld.current = {
      schaal,
      gok,
      echt: fase === 'uitslag' ? vraag?.echt : undefined,
      sinds: sinds.current,
      sterren: laatste?.sterren ?? 0,
      oordeel: fase === 'uitslag' && laatste ? oordeel(laatste.gok, laatste.vraag.echt) : '',
      hulp:
        hulp && vraag && fase === 'vraag'
          ? {
              naam: hulp.naam,
              waarde:
                vraag.eenheid === 'mln'
                  ? hulp.bedragMln
                  : perInwonerEuro(hulp.bedragMln, basis.inwoners),
            }
          : undefined,
      pauze,
      stil,
    };
  });

  // -------------------------------------------------------------------------------------------
  // Een level beginnen, een vraag beginnen, raden
  // -------------------------------------------------------------------------------------------

  const startVraag = useCallback((lijst: Vraag[], nr: number, lvl: number) => {
    const v = lijst[nr];
    const sch = schaalVoor(v?.eenheid ?? 'mln');
    setVraagNr(nr);
    setStap(waardeNaarStap(sch.begin, sch));
    gokHoogte.current = hoogteVan(sch.begin, sch);
    setHulp(undefined);
    setMelding(undefined);
    beantwoord.current = false;
    setPauze(false);
    const t = LEVELS[lvl - 1]?.tijd ?? 20;
    resterend.current = t;
    setTijd(t);
    setFase('vraag');
  }, []);

  const beginLevel = useCallback(
    (nr: number) => {
      const gehad = new Set(alle.map((a) => a.vraag.post.id));
      const lijst = vragenVoorLevel(basis.posten, nr, basis.inwoners, Math.random, gehad);
      setLevelNr(nr);
      setVragen(lijst);
      setAntwoorden([]);
      startVraag(lijst, 0, nr);
    },
    [alle, basis, startVraag],
  );

  const raad = useCallback(
    (tijdOp = false) => {
      if (fase !== 'vraag' || !vraag || beantwoord.current || (pauze && !tijdOp)) return;
      beantwoord.current = true;
      const over = stil ? 0 : Math.max(0, Math.ceil(resterend.current));
      const sterren = sterrenVoor(gok, vraag.echt);
      const p = puntenVoor(gok, vraag.echt, over, !!hulp);
      const a: Antwoord = { vraag, gok, sterren, punten: p, hulp: !!hulp, level: levelNr };
      setAntwoorden((l) => [...l, a]);
      setPunten((x) => x + p);
      sinds.current = performance.now();
      setFase('uitslag');
      const v = vergelijking(basis.posten, vraag.post);
      const anderBedrag = v
        ? toonBedrag(
            vraag.eenheid === 'mln'
              ? v.post.bedragMln
              : perInwonerEuro(v.post.bedragMln, basis.inwoners),
            vraag.eenheid,
          )
        : '';
      setMelding({
        tijd: performance.now(),
        toon: sterren >= 2 ? 'goed' : sterren === 0 ? 'fout' : undefined,
        tekst: (
          <>
            {tijdOp && <>⏰ De tijd is op, je schatting telt. </>}
            <strong>
              {vraag.post.naam}: {toonBedrag(vraag.echt, vraag.eenheid)} {eenheidTekst}.
            </strong>{' '}
            {vraag.eenheid === 'mln' ? (
              <>Dat is {formatEuro(perInwonerEuro(vraag.echt, basis.inwoners))} per inwoner.</>
            ) : (
              <>In totaal {toonBedrag(vraag.post.bedragMln, 'mln')} per jaar.</>
            )}{' '}
            Jij zei {toonBedrag(gok, vraag.eenheid)}: {oordeel(gok, vraag.echt)}{' '}
            <span className="mg-fo-ster" aria-label={`${sterren} van de ${MAX_STERREN} sterren`}>
              {sterTekst(sterren)}
            </span>{' '}
            +{p} punten.
            {v && (
              <>
                <br />
                <span className="klein">
                  📏 Dat is {vergelijkTekst(v)} ({anderBedrag}).
                </span>
              </>
            )}
          </>
        ),
      });
    },
    [fase, vraag, pauze, stil, gok, hulp, levelNr, basis, eenheidTekst],
  );

  const volgende = () => {
    if (vraagNr + 1 < vragen.length) {
      startVraag(vragen, vraagNr + 1, levelNr);
      return;
    }
    setBesteSterren((b) => b.map((x, i) => (i === levelNr - 1 ? Math.max(x, levelSterren) : x)));
    setAlle((l) => [...l, ...antwoorden]);
    setMelding(undefined);
    setFase('level');
  };

  const vraagHulp = () => {
    if (fase !== 'vraag' || !vraag || hulp || pauze) return;
    setHulp(hulpPost(basis.posten, vraag));
  };

  const schuifStap = (d: number) => setStap((s) => Math.max(0, Math.min(STAPPEN, s + d)));

  // Focus: na het raden op "Volgende", bij een nieuwe vraag op de schuif.
  useEffect(() => {
    if (fase === 'uitslag') volgendeKnop.current?.focus();
    else if (fase === 'vraag') schuif.current?.focus({ preventScroll: true });
  }, [fase, vraagNr]);

  // -------------------------------------------------------------------------------------------
  // Toetsen, slepen, klok en tekenen
  // -------------------------------------------------------------------------------------------

  useToetsen(fase === 'vraag' || fase === 'uitslag', (e) => {
    if (fase === 'vraag') {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        schuifStap(e.shiftKey ? 10 : 2);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        schuifStap(e.shiftKey ? -10 : -2);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        raad();
      } else if (e.key === 'h' || e.key === 'H') vraagHulp();
    }
  });

  const naarStap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const y = ((e.clientY - r.top) / r.height) * HOOGTE;
    const f = (VLOER - y) / (VLOER - TOP);
    setStap(Math.round(Math.max(0, Math.min(1, f)) * STAPPEN));
  };

  const loopt = !stil && (fase === 'vraag' || fase === 'uitslag');
  useLus(loopt, (dt, nu) => {
    const b = beeld.current;
    if (fase === 'vraag' && !b.pauze) {
      const voor = Math.ceil(resterend.current);
      resterend.current = Math.max(0, resterend.current - dt);
      const na = Math.ceil(resterend.current);
      if (na !== voor) setTijd(na);
      if (resterend.current <= 0) raad(true);
    }
    const doel = hoogteVan(b.gok, b.schaal);
    gokHoogte.current += (doel - gokHoogte.current) * Math.min(1, dt * 14);
    teken(doek.current, b, gokHoogte.current, nu);
  });

  // Bij minder beweging: alleen tekenen als er iets verandert.
  useEffect(() => {
    if (!stil || (fase !== 'vraag' && fase !== 'uitslag')) return;
    gokHoogte.current = hoogteVan(beeld.current.gok, beeld.current.schaal);
    teken(doek.current, beeld.current, gokHoogte.current, performance.now());
  }, [stil, fase, stap, hulp, vraagNr]);

  // -------------------------------------------------------------------------------------------
  // Scherm
  // -------------------------------------------------------------------------------------------

  const hud = (
    <Hud
      testid="mg-forum-stand"
      icoon="🏢"
      links={[
        { label: 'Punten', waarde: punten },
        { label: 'Sterren', waarde: `${levelSterren} van ${VRAGEN_PER_LEVEL * MAX_STERREN}` },
      ]}
      rechts={[
        stil || fase !== 'vraag'
          ? {
              label: 'Vraag',
              waarde: `${Math.min(vraagNr + 1, VRAGEN_PER_LEVEL)} van ${VRAGEN_PER_LEVEL}`,
            }
          : {
              label: 'Tijd',
              waarde: tijd,
              toon: tijd <= 5 ? 'fout' : undefined,
              testid: 'mg-forum-tijd',
            },
        { label: 'Level', waarde: `${levelNr} van ${LEVELS.length}` },
      ]}
    />
  );

  if (fase === 'start')
    return (
      <div className="mg-kader mg-fo">
        <SpelKaart
          titel="Geldtoren op het dakterras"
          knop={{ tekst: 'Start level 1', onClick: () => beginLevel(1) }}
          testid="mg-forum-start"
        >
          <p>
            Je staat op het dakterras van het Forum. Hoeveel geld geeft de gemeente per jaar uit aan
            bijvoorbeeld de jeugdzorg of het ophalen van afval?
          </p>
          <ul className="klein">
            <li>
              🔵 Bouw <strong>jouw stapel</strong> geld zo hoog als jij denkt: met de schuif, de
              pijltjes of door op het veld te slepen.
            </li>
            <li>
              🟡 Druk op <strong>Raad!</strong> De <strong>echte stapel</strong> groeit ernaast. Zit
              je dichtbij, dan krijg je tot 3 sterren.
            </li>
            <li>
              📏 De strepen (€ 1 mln, € 10 mln, € 100 mln) helpen je. Elke streep is tien keer
              zoveel als de vorige.
            </li>
            <li>
              💡 Het <strong>hulpje</strong> laat een andere post zien als ijkpunt. Dat kost{' '}
              {HULP_KOST} punten.
            </li>
          </ul>
          <p className="klein">
            Drie levels: grote posten, middelgrote posten en tot slot <strong>per inwoner</strong>.
            {stil
              ? ' Je speelt in je eigen tempo: er loopt geen tijd.'
              : ' Elke vraag heeft een tijd; hoe sneller, hoe meer punten.'}{' '}
            Haal {DOEL_STERREN} sterren in een level om door te gaan (spelregels).
          </p>
        </SpelKaart>
      </div>
    );

  if (fase === 'klaar')
    return (
      <div className="mg-kader mg-fo" data-testid="mg-forum-uitslag">
        <SpelKaart
          titel={`Klaar! ${totaalSterren} van de ${maxSterren} sterren`}
          knop={{ tekst: 'Naar de uitslag', onClick: () => onKlaar(totaalSterren, maxSterren) }}
        >
          <p>
            Je haalde <strong>{punten}</strong> punten. Zo zaten je schattingen naast de begroting{' '}
            {jaar}:
          </p>
          <Overzicht lijst={alle} />
          <WatJeLeerde data={data} lijst={alle} posten={basis.posten} inwoners={basis.inwoners} />
          <p className="klein">
            Bron: de begroting {jaar} van de gemeente Groningen (uitgaven per jaar). Per inwoner:
            gedeeld door {basis.inwoners.toLocaleString('nl-NL')} inwoners. Sterren, punten en tijd
            zijn spelregels.
          </p>
        </SpelKaart>
      </div>
    );

  if (fase === 'level') {
    const gehaald = levelSterren >= DOEL_STERREN;
    const laatsteLevel = levelNr >= LEVELS.length;
    return (
      <div className="mg-kader mg-fo">
        {hud}
        <SpelKaart
          status
          testid="mg-forum-einde"
          titel={
            gehaald
              ? `Level ${levelNr} gehaald: ${levelSterren} van de ${VRAGEN_PER_LEVEL * MAX_STERREN} sterren! 🎉`
              : `Level ${levelNr}: ${levelSterren} ${levelSterren === 1 ? 'ster' : 'sterren'}, je hebt er ${DOEL_STERREN} nodig`
          }
          knop={
            gehaald && !laatsteLevel
              ? {
                  tekst: `Level ${levelNr + 1}: ${LEVELS[levelNr]?.naam ?? ''}`,
                  onClick: () => beginLevel(levelNr + 1),
                }
              : !gehaald
                ? { tekst: 'Probeer opnieuw', onClick: () => beginLevel(levelNr) }
                : { tekst: 'Bekijk je schattingen', onClick: () => setFase('klaar') }
          }
          extra={
            !(gehaald && laatsteLevel) && (
              <button type="button" className="knop" onClick={() => setFase('klaar')}>
                Stoppen
              </button>
            )
          }
        >
          <Overzicht lijst={antwoorden} />
        </SpelKaart>
      </div>
    );
  }

  if (!vraag) return null;
  const soort =
    vraag.post.soort === 'wet'
      ? `⚖️ Moet van de wet${vraag.post.wet ? ` (${vraag.post.wet})` : ''}`
      : vraag.post.soort === 'keuze'
        ? '🙋 Eigen keuze van de gemeente'
        : '';

  return (
    <div className="mg-kader mg-fo">
      {hud}
      <div className="mg-strook mg-fo-vraag" data-testid="mg-forum-vraag">
        <span className="mg-fo-level klein">
          Level {levelNr}: {instelling?.naam} · vraag {vraagNr + 1} van {vragen.length}
        </span>
        <h3>
          {vraag.eenheid === 'mln' ? (
            <>Hoeveel geeft de gemeente per jaar uit aan </>
          ) : (
            <>Wat kost dit elke inwoner per jaar: </>
          )}
          <span className="mg-fo-naam">{vraag.post.naam}</span>?
        </h3>
        <p className="klein">
          {vraag.post.uitleg}
          {soort && <span className="mg-fo-soort">{soort}</span>}
        </p>
      </div>
      <canvas
        ref={doek}
        className="mg-veld mg-fo-veld"
        width={BREEDTE}
        height={HOOGTE}
        role="img"
        aria-label={`Het dakterras van het Forum, met uitzicht over de gemeente. Jouw stapel: ${toonBedrag(
          gok,
          schaal.eenheid,
        )}. ${
          fase === 'uitslag'
            ? `De echte stapel: ${toonBedrag(vraag.echt, vraag.eenheid)}.`
            : 'De echte stapel is nog verborgen.'
        }${hulp ? ` Ter vergelijking: ${hulp.naam}.` : ''}`}
        onPointerDown={(e) => {
          if (fase !== 'vraag' || pauze) return;
          e.preventDefault();
          sleept.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          naarStap(e);
        }}
        onPointerMove={(e) => {
          if (sleept.current && fase === 'vraag' && !pauze) naarStap(e);
        }}
        onPointerUp={() => {
          sleept.current = false;
        }}
        onPointerCancel={() => {
          sleept.current = false;
        }}
      />
      {fase === 'vraag' && (
        <div className="mg-fo-gok">
          <label htmlFor={`${id}-schuif`}>
            Jouw schatting:{' '}
            <output htmlFor={`${id}-schuif`}>{toonBedrag(gok, schaal.eenheid)}</output>{' '}
            <span className="klein">{eenheidTekst}</span>
          </label>
          <div className="mg-fo-schuifrij">
            <button
              type="button"
              className="knop mg-fo-klein"
              aria-label="Minder"
              onClick={() => schuifStap(-2)}
              disabled={pauze || stap <= 0}
            >
              −
            </button>
            <input
              ref={schuif}
              id={`${id}-schuif`}
              type="range"
              min={0}
              max={STAPPEN}
              step={1}
              value={stap}
              disabled={pauze}
              aria-valuetext={`${toonBedrag(gok, schaal.eenheid)} ${eenheidTekst}`}
              onChange={(e) => setStap(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // anders klikt dezelfde Enter meteen op "Volgende vraag", die de focus krijgt
                  e.preventDefault();
                  raad();
                }
              }}
            />
            <button
              type="button"
              className="knop mg-fo-klein"
              aria-label="Meer"
              onClick={() => schuifStap(2)}
              disabled={pauze || stap >= STAPPEN}
            >
              +
            </button>
          </div>
        </div>
      )}
      <div className="mg-knoppen">
        {fase === 'vraag' ? (
          <>
            <button
              type="button"
              className="knop"
              onClick={vraagHulp}
              disabled={!!hulp || pauze}
              data-testid="mg-forum-hulp"
            >
              💡 Hulpje (−{HULP_KOST})
            </button>
            <button
              type="button"
              className="knop-indienen mg-grote-knop"
              onClick={() => raad()}
              disabled={pauze}
              data-testid="mg-forum-raad"
            >
              Raad!
            </button>
            {!stil && <PauzeKnop pauze={pauze} onWissel={() => setPauze((p) => !p)} />}
          </>
        ) : (
          <button
            ref={volgendeKnop}
            type="button"
            className="knop-indienen mg-grote-knop"
            onClick={volgende}
            data-testid="mg-forum-volgende"
          >
            {vraagNr + 1 < vragen.length ? 'Volgende vraag' : 'Einde van het level'}
          </button>
        )}
      </div>
      <Meldingen melding={melding}>
        {fase === 'vraag' && hulp && (
          <p className="klein mg-fo-hulp">
            💡 Ter vergelijking: <strong>{hulp.naam}</strong> kost{' '}
            {toonBedrag(
              vraag.eenheid === 'mln'
                ? hulp.bedragMln
                : perInwonerEuro(hulp.bedragMln, basis.inwoners),
              vraag.eenheid,
            )}{' '}
            {eenheidTekst}. Kijk naar de stippellijn.
          </p>
        )}
        {fase === 'vraag' && pauze && <p className="klein">⏸ Pauze. De tijd staat stil.</p>}
      </Meldingen>
    </div>
  );
}

/** Je schattingen naast de echte bedragen. */
function Overzicht({ lijst }: { lijst: Antwoord[] }) {
  if (!lijst.length) return <p className="klein">Je hebt nog niets geschat.</p>;
  return (
    <ul className="mg-lijst mg-fo-overzicht">
      {lijst.map((a, i) => (
        <li key={`${a.vraag.post.id}-${i}`}>
          <strong>{a.vraag.post.naam}</strong>{' '}
          <span className="mg-fo-ster" aria-label={`${a.sterren} van de ${MAX_STERREN} sterren`}>
            {sterTekst(a.sterren)}
          </span>
          <br />
          <span className="klein">
            Jij: {toonBedrag(a.gok, a.vraag.eenheid)} · echt:{' '}
            <strong>{toonBedrag(a.vraag.echt, a.vraag.eenheid)}</strong>
            {a.vraag.eenheid === 'euro' ? ' per inwoner' : ''} · {oordeel(a.gok, a.vraag.echt)}
            {a.hulp ? ' (met hulpje)' : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Wat je leerde: een paar feiten uit de begroting, bij de posten die je zag. */
function WatJeLeerde({
  data,
  lijst,
  posten,
  inwoners,
}: {
  data: MinigameProps['data'];
  lijst: Antwoord[];
  posten: BekendePost[];
  inwoners: number;
}) {
  const jaar = data.begroting.begrotingsjaar;
  const grootste = [...lijst].sort((a, b) => b.vraag.post.bedragMln - a.vraag.post.bedragMln)[0];
  const kleinste = [...lijst].sort((a, b) => a.vraag.post.bedragMln - b.vraag.post.bedragMln)[0];
  const top = [...posten].sort((a, b) => b.bedragMln - a.bedragMln).slice(0, 10);
  const wet = top.filter((p) => p.soort === 'wet').length;
  return (
    <>
      <h4>Wat je leerde</h4>
      <ul className="klein">
        {grootste && (
          <li>
            De grootste post die je zag: <strong>{grootste.vraag.post.naam}</strong>,{' '}
            {toonBedrag(grootste.vraag.post.bedragMln, 'mln')} per jaar. Dat is{' '}
            {formatEuro(perInwonerEuro(grootste.vraag.post.bedragMln, inwoners))} per inwoner.
          </li>
        )}
        {kleinste && kleinste !== grootste && (
          <li>
            De kleinste: <strong>{kleinste.vraag.post.naam}</strong>,{' '}
            {toonBedrag(kleinste.vraag.post.bedragMln, 'mln')}. Dat is{' '}
            {formatEuro(perInwonerEuro(kleinste.vraag.post.bedragMln, inwoners))} per inwoner.
          </li>
        )}
        <li>
          Voor de gemeente is € 1 mln niet veel: elke inwoner betaalt daar ongeveer{' '}
          {formatEuro(perInwonerEuro(1, inwoners))} aan.
        </li>
        {top.length > 0 && (
          <li>
            Van de {top.length} grootste posten in dit spel moeten er {wet} van de wet. Daar kan de
            gemeente maar een deel van zelf kiezen.
          </li>
        )}
      </ul>
      <p className="klein">Alle bedragen: begroting {jaar}.</p>
    </>
  );
}

// -------------------------------------------------------------------------------------------------
// Tekenen
// -------------------------------------------------------------------------------------------------

const yVan = (h: number) => VLOER - h * (VLOER - TOP);

/** De achtergrond (lucht, de gemeente, de Martinitoren, het dakterras); één keer gemaakt. */
let achtergrondBeeld: HTMLCanvasElement | undefined;
function achtergrond(): HTMLCanvasElement {
  if (achtergrondBeeld) return achtergrondBeeld;
  const c = document.createElement('canvas');
  c.width = BREEDTE * 2;
  c.height = HOOGTE * 2;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.scale(2, 2);

  // lucht: een zachte namiddag
  const lucht = ctx.createLinearGradient(0, 0, 0, 270);
  lucht.addColorStop(0, '#3f7fd0');
  lucht.addColorStop(0.55, '#8fc3ee');
  lucht.addColorStop(1, '#fde3b8');
  ctx.fillStyle = lucht;
  ctx.fillRect(0, 0, BREEDTE, HOOGTE);
  // zon met gloed
  const zon = ctx.createRadialGradient(345, 70, 4, 345, 70, 70);
  zon.addColorStop(0, 'rgba(255,250,215,1)');
  zon.addColorStop(0.18, 'rgba(255,236,170,0.95)');
  zon.addColorStop(0.45, 'rgba(255,220,150,0.25)');
  zon.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = zon;
  ctx.fillRect(260, 0, 140, 150);

  // verre gemeente: daken in waas
  const horizon = 268;
  ctx.fillStyle = '#b9c9dc';
  for (let i = 0; i < 26; i++) {
    const x = i * 16 - 6;
    const h = 8 + ((i * 53) % 17);
    ctx.fillRect(x, horizon - h, 15, h);
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.moveTo(x, horizon - h);
      ctx.lineTo(x + 7.5, horizon - h - 7);
      ctx.lineTo(x + 15, horizon - h);
      ctx.fill();
    }
  }
  // de Der Aa-kerk in de verte
  ctx.fillStyle = '#a9bad0';
  ctx.fillRect(248, horizon - 46, 12, 30);
  ctx.beginPath();
  ctx.moveTo(246, horizon - 46);
  ctx.lineTo(254, horizon - 72);
  ctx.lineTo(262, horizon - 46);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(254, horizon - 52, 5, Math.PI, 0);
  ctx.fill();

  martinitoren(ctx, 62, horizon);

  // dichterbij: grachtenpanden met trapgevels
  const kleuren = ['#8c5a44', '#a0634a', '#6f4a3c', '#9b7357', '#7d4f3f', '#b07c5e'];
  let x = -4;
  let i = 0;
  while (x < BREEDTE) {
    const b = 20 + ((i * 7) % 12);
    const h = 18 + ((i * 11) % 16);
    const top = horizon + 6 - h;
    ctx.fillStyle = kleuren[i % kleuren.length] ?? '#8c5a44';
    ctx.beginPath();
    ctx.moveTo(x, horizon + 8);
    ctx.lineTo(x, top);
    if (i % 2 === 0) {
      // trapgevel
      const s = b / 6;
      ctx.lineTo(x + s, top);
      ctx.lineTo(x + s, top - 4);
      ctx.lineTo(x + 2 * s, top - 4);
      ctx.lineTo(x + 2 * s, top - 8);
      ctx.lineTo(x + 4 * s, top - 8);
      ctx.lineTo(x + 4 * s, top - 4);
      ctx.lineTo(x + 5 * s, top - 4);
      ctx.lineTo(x + 5 * s, top);
    } else {
      ctx.lineTo(x + b / 2, top - 9);
    }
    ctx.lineTo(x + b, top);
    ctx.lineTo(x + b, horizon + 8);
    ctx.closePath();
    ctx.fill();
    // ramen
    ctx.fillStyle = 'rgba(255,240,200,0.55)';
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < 2; k++) ctx.fillRect(x + 4 + k * (b / 2 - 1), top + 4 + r * 7, 3, 4);
    x += b + 1;
    i++;
  }
  // bomen ertussen
  for (const [bx, br] of [
    [118, 9],
    [210, 11],
    [330, 10],
    [24, 8],
  ] as const) {
    const g = ctx.createRadialGradient(bx - 3, horizon - 2, 1, bx, horizon + 2, br);
    g.addColorStop(0, '#6dab55');
    g.addColorStop(1, '#3d7a33');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, horizon + 2, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // het Forum zelf: de schuine glazen gevel rechts, die over het dakterras naar beneden loopt
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(BREEDTE, 150);
  ctx.lineTo(BREEDTE - 36, 222);
  ctx.lineTo(BREEDTE - 58, VLOER + 4);
  ctx.lineTo(BREEDTE, VLOER + 4);
  ctx.closePath();
  const glas = ctx.createLinearGradient(BREEDTE - 60, 150, BREEDTE, VLOER);
  glas.addColorStop(0, '#d7e9f7');
  glas.addColorStop(0.4, '#8db4d6');
  glas.addColorStop(1, '#4d6f93');
  ctx.fillStyle = glas;
  ctx.fill();
  ctx.clip();
  // spiegeling van de lucht
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(BREEDTE - 10, 150);
  ctx.lineTo(BREEDTE, 150);
  ctx.lineTo(BREEDTE - 40, VLOER);
  ctx.lineTo(BREEDTE - 52, VLOER);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,60,85,0.55)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    ctx.moveTo(BREEDTE - 70, 150 + k * 20);
    ctx.lineTo(BREEDTE, 136 + k * 20);
    ctx.stroke();
  }
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(BREEDTE - 58 + k * 18, VLOER + 4);
    ctx.lineTo(BREEDTE - 36 + k * 14, 150);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#2f3f52';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(BREEDTE, 150);
  ctx.lineTo(BREEDTE - 36, 222);
  ctx.lineTo(BREEDTE - 58, VLOER + 4);
  ctx.stroke();

  // het dakterras: houten vloer in perspectief
  const vloer = ctx.createLinearGradient(0, VLOER - 4, 0, HOOGTE);
  vloer.addColorStop(0, '#c99a66');
  vloer.addColorStop(1, '#8a5f38');
  ctx.fillStyle = vloer;
  ctx.fillRect(0, VLOER - 4, BREEDTE, HOOGTE - VLOER + 4);
  ctx.strokeStyle = 'rgba(70,40,20,0.35)';
  ctx.lineWidth = 1;
  for (let k = -12; k <= 12; k++) {
    ctx.beginPath();
    ctx.moveTo(BREEDTE / 2 + k * 22, VLOER - 4);
    ctx.lineTo(BREEDTE / 2 + k * 46, HOOGTE);
    ctx.stroke();
  }
  for (const y of [314, 332, 354]) {
    ctx.strokeStyle = 'rgba(70,40,20,0.2)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(BREEDTE, y);
    ctx.stroke();
  }

  // glazen balustrade met stalen staanders en een leuning
  const balY = 262;
  ctx.fillStyle = 'rgba(200,230,250,0.28)';
  ctx.fillRect(0, balY, BREEDTE - 50, VLOER - 4 - balY);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let k = 0; k < 8; k++) {
    ctx.beginPath();
    ctx.moveTo(k * 52 + 8, VLOER - 4);
    ctx.lineTo(k * 52 + 20, balY);
    ctx.lineTo(k * 52 + 26, balY);
    ctx.lineTo(k * 52 + 14, VLOER - 4);
    ctx.fill();
  }
  ctx.fillStyle = '#5d6b7a';
  for (let k = 0; k < 8; k++) ctx.fillRect(k * 52 - 1, balY, 3, VLOER - 4 - balY);
  const leuning = ctx.createLinearGradient(0, balY - 3, 0, balY + 3);
  leuning.addColorStop(0, '#e8eef4');
  leuning.addColorStop(1, '#7b8896');
  ctx.fillStyle = leuning;
  ctx.fillRect(0, balY - 3, BREEDTE - 48, 5);

  // plantenbakken links en rechts op het terras
  plantenbak(ctx, 26, 336);
  plantenbak(ctx, 380, 340);

  achtergrondBeeld = c;
  return c;
}

/** De Martinitoren: zes lagen, steeds smaller, met een open lantaarn en een spits. */
function martinitoren(ctx: CanvasRenderingContext2D, x: number, grond: number): void {
  const steen = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
  steen.addColorStop(0, '#9b8a78');
  steen.addColorStop(0.5, '#b8a690');
  steen.addColorStop(1, '#857462');
  const lagen = [
    { b: 26, h: 48 },
    { b: 23, h: 34 },
    { b: 20, h: 26 },
    { b: 16, h: 20 },
    { b: 12, h: 16 },
    { b: 9, h: 12 },
  ];
  let y = grond;
  lagen.forEach((l, i) => {
    ctx.fillStyle = steen;
    ctx.fillRect(x - l.b / 2, y - l.h, l.b, l.h);
    // lijst bovenop
    ctx.fillStyle = '#7a6a59';
    ctx.fillRect(x - l.b / 2 - 1.5, y - l.h - 1.5, l.b + 3, 2.5);
    // spitsboogramen
    ctx.fillStyle = 'rgba(40,40,55,0.6)';
    const n = l.b > 18 ? 3 : l.b > 11 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const wx = x - l.b / 2 + ((k + 0.5) * l.b) / n;
      const wh = Math.min(12, l.h * 0.5);
      ctx.beginPath();
      ctx.moveTo(wx - 1.5, y - l.h * 0.25);
      ctx.lineTo(wx - 1.5, y - l.h * 0.25 - wh);
      ctx.lineTo(wx, y - l.h * 0.25 - wh - 2.5);
      ctx.lineTo(wx + 1.5, y - l.h * 0.25 - wh);
      ctx.lineTo(wx + 1.5, y - l.h * 0.25);
      ctx.fill();
    }
    // de klok in de derde laag
    if (i === 2) {
      ctx.fillStyle = '#f2ead8';
      ctx.beginPath();
      ctx.arc(x, y - l.h + 8, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a3026';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y - l.h + 8);
      ctx.lineTo(x, y - l.h + 5.2);
      ctx.moveTo(x, y - l.h + 8);
      ctx.lineTo(x + 2, y - l.h + 8.6);
      ctx.stroke();
    }
    y -= l.h + 1.5;
  });
  // groene koperen spits met bol en haan
  ctx.fillStyle = '#5e9c8a';
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.quadraticCurveTo(x - 4, y - 8, x, y - 22);
  ctx.quadraticCurveTo(x + 4, y - 8, x + 5, y);
  ctx.fill();
  ctx.fillStyle = '#d9b44a';
  ctx.beginPath();
  ctx.arc(x, y - 23, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3c3c3c';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y - 24);
  ctx.lineTo(x, y - 30);
  ctx.stroke();
  ctx.fillStyle = '#d9b44a';
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 30);
  ctx.lineTo(x + 3, y - 31);
  ctx.lineTo(x + 1, y - 33);
  ctx.fill();
}

function plantenbak(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 18, 26, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const bak = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
  bak.addColorStop(0, '#4a4f57');
  bak.addColorStop(0.5, '#6d747e');
  bak.addColorStop(1, '#3c4148');
  ctx.fillStyle = bak;
  rondRechthoek(ctx, x - 22, y - 2, 44, 20, 3);
  ctx.fill();
  for (const [dx, dy, r, k] of [
    [-12, -6, 10, '#3f8a3c'],
    [8, -9, 12, '#4f9d45'],
    [-2, -14, 9, '#62b257'],
    [14, -2, 7, '#3a7d36'],
  ] as const) {
    ctx.fillStyle = k;
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff8a3d';
  for (const [dx, dy] of [
    [-6, -14],
    [10, -16],
    [2, -6],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Wolken die langzaam voorbij drijven (stil: ze staan stil). */
function wolken(ctx: CanvasRenderingContext2D, t: number): void {
  const lijst = [
    { x: 40, y: 64, s: 1 },
    { x: 220, y: 40, s: 0.8 },
    { x: 330, y: 118, s: 0.65 },
    { x: 150, y: 150, s: 0.55 },
  ];
  for (const w of lijst) {
    const x = ((w.x + t * 6 * w.s + 60) % (BREEDTE + 120)) - 60;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.beginPath();
    ctx.ellipse(x, w.y, 26 * w.s, 9 * w.s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 14 * w.s, w.y - 7 * w.s, 15 * w.s, 10 * w.s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 12 * w.s, w.y - 4 * w.s, 12 * w.s, 8 * w.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** De strepen op de schaal: € 1 mln, € 10 mln, € 100 mln (of € 1, € 10 ... per inwoner). */
function strepen(ctx: CanvasRenderingContext2D, schaal: Schaal): void {
  ctx.font = '700 14px Asap, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  for (const w of schaal.ijk) {
    const y = yVan(hoogteVan(w, schaal));
    const tekst = toonBedrag(w, schaal.eenheid);
    const b = ctx.measureText(tekst).width + 14;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(10 + b, y);
    ctx.lineTo(BREEDTE - 62, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(21,25,58,0.8)';
    rondRechthoek(ctx, 4, y - 11, b, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tekst, 11, y + 0.5);
  }
}

/** Een stapel bundels bankbiljetten (jij) of gouden munten (echt). */
function stapel(
  ctx: CanvasRenderingContext2D,
  x: number,
  hoogte: number,
  soort: 'jij' | 'echt',
): void {
  const px = Math.max(3, hoogte * (VLOER - TOP));
  const laag = soort === 'jij' ? 9 : 6;
  // schaduw op de vloer
  ctx.fillStyle = 'rgba(40,20,5,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 6, VLOER + 2, STAPEL_B / 2 + 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - STAPEL_B, VLOER - px - 20, STAPEL_B * 2, px + 24);
  ctx.clip();
  const n = Math.ceil(px / laag);
  for (let i = 0; i < n; i++) {
    const y = VLOER - (i + 1) * laag;
    if (y + laag < VLOER - px - 1) break;
    const schuif = Math.sin(i * 2.3) * 2.2;
    const bx = x - STAPEL_B / 2 + schuif;
    if (soort === 'jij') {
      const g = ctx.createLinearGradient(bx, 0, bx + STAPEL_B, 0);
      g.addColorStop(0, '#2c4fd8');
      g.addColorStop(0.45, '#6f8ff2');
      g.addColorStop(1, '#1a33a3');
      ctx.fillStyle = g;
      rondRechthoek(ctx, bx, y, STAPEL_B, laag - 1, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,20,80,0.55)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // randjes van de biljetten
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(bx + 3, y + 3);
      ctx.lineTo(bx + STAPEL_B - 3, y + 3);
      ctx.stroke();
      // de papieren band
      ctx.fillStyle = '#f4ead0';
      ctx.fillRect(bx + STAPEL_B / 2 - 6, y, 12, laag - 1);
      ctx.fillStyle = '#ff6400';
      ctx.fillRect(bx + STAPEL_B / 2 - 6, y + (laag - 1) / 2 - 0.6, 12, 1.2);
    } else {
      const g = ctx.createLinearGradient(bx, 0, bx + STAPEL_B, 0);
      g.addColorStop(0, '#a8740a');
      g.addColorStop(0.35, '#ffe58a');
      g.addColorStop(0.6, '#f2c230');
      g.addColorStop(1, '#94650a');
      ctx.fillStyle = g;
      rondRechthoek(ctx, bx, y, STAPEL_B, laag, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(110,70,0,0.6)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // de rand van de munten (geribbeld)
      ctx.strokeStyle = 'rgba(120,80,0,0.35)';
      for (let k = 6; k < STAPEL_B - 4; k += 5) {
        ctx.beginPath();
        ctx.moveTo(bx + k, y + 1.5);
        ctx.lineTo(bx + k, y + laag - 1.5);
        ctx.stroke();
      }
    }
  }
  // de bovenkant
  const top = VLOER - px;
  if (soort === 'echt') {
    const g = ctx.createRadialGradient(x - 8, top - 2, 2, x, top, STAPEL_B / 2);
    g.addColorStop(0, '#fff6c8');
    g.addColorStop(1, '#e0a91c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, top, STAPEL_B / 2 - 1, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(140,90,0,0.6)';
    ctx.font = '800 7px Asap, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('€', x, top + 0.5);
  }
  ctx.restore();
}

/** Een ballon met het bedrag boven een stapel. */
function ballon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tekst: string,
  kleur: string,
  tekstKleur = '#ffffff',
): void {
  ctx.font = '800 17px Asap, system-ui, sans-serif';
  const b = ctx.measureText(tekst).width + 16;
  const bx = Math.max(4, Math.min(BREEDTE - b - 4, x - b / 2));
  const by = Math.max(4, y - 36);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = kleur;
  rondRechthoek(ctx, bx, by, b, 26, 8);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = kleur;
  ctx.beginPath();
  ctx.moveTo(x - 5, by + 25);
  ctx.lineTo(x, by + 31);
  ctx.lineTo(x + 5, by + 25);
  ctx.fill();
  ctx.fillStyle = tekstKleur;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tekst, bx + b / 2, by + 13.5);
}

/** Een bordje op de vloer onder een stapel. */
function bordje(ctx: CanvasRenderingContext2D, x: number, tekst: string, kleur: string): void {
  ctx.font = '800 15px Asap, system-ui, sans-serif';
  const b = ctx.measureText(tekst).width + 16;
  ctx.fillStyle = kleur;
  rondRechthoek(ctx, x - b / 2, VLOER + 11, b, 23, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tekst, x, VLOER + 23);
}

function ster(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, vol: boolean): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const s = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
  }
  ctx.closePath();
  ctx.fillStyle = vol ? '#ffd23a' : 'rgba(255,255,255,0.35)';
  ctx.strokeStyle = vol ? '#a86d00' : 'rgba(30,40,70,0.5)';
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
}

function teken(canvas: HTMLCanvasElement | null, b: Beeld, gokH: number, nu: number): void {
  const ctx = maakScherp(canvas, BREEDTE, HOOGTE);
  if (!ctx) return;
  ctx.drawImage(achtergrond(), 0, 0, BREEDTE, HOOGTE);
  wolken(ctx, b.stil ? 0 : nu / 1000);
  strepen(ctx, b.schaal);

  // het hulpje: een stippellijn met een andere post
  if (b.hulp) {
    const y = yVan(hoogteVan(b.hulp.waarde, b.schaal));
    ctx.strokeStyle = '#ffb000';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(110, y);
    ctx.lineTo(BREEDTE - 40, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '700 13px Asap, system-ui, sans-serif';
    const regels = breekTekst(
      ctx,
      `💡 ${b.hulp.naam}: ${toonBedrag(b.hulp.waarde, b.schaal.eenheid)}`,
      190,
    );
    const lb = Math.max(...regels.map((r) => ctx.measureText(r).width)) + 12;
    const lh = regels.length * 15 + 6;
    const ly = y < TOP + lh + 6 ? y + 4 : y - lh - 4;
    const lx = BREEDTE - 44 - lb;
    ctx.fillStyle = 'rgba(255,248,225,0.95)';
    rondRechthoek(ctx, lx, ly, lb, lh, 6);
    ctx.fill();
    ctx.strokeStyle = '#ffb000';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#4a2c0a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    regels.forEach((r, i) => ctx.fillText(r, lx + 6, ly + 4 + i * 15));
  }

  // jouw stapel
  stapel(ctx, JIJ_X, gokH, 'jij');
  bordje(ctx, JIJ_X, 'Jij', '#1233c4');

  // de echte stapel, of een vraagteken
  if (b.echt === undefined) {
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    const zweef = b.stil ? 0 : Math.sin(nu / 400) * 3;
    rondRechthoek(ctx, ECHT_X - STAPEL_B / 2, VLOER - 120 + zweef, STAPEL_B, 112, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 44px Asap, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.fillText('?', ECHT_X, VLOER - 64 + zweef);
    ctx.shadowColor = 'transparent';
    bordje(ctx, ECHT_X, 'Echt', '#8a6200');
  } else {
    const t = b.stil ? 1 : (nu - b.sinds) / GROEI_MS;
    const h = hoogteVan(b.echt, b.schaal) * groei(t);
    stapel(ctx, ECHT_X, h, 'echt');
    bordje(ctx, ECHT_X, 'Echt', '#8a6200');
    if (t >= 1) {
      // de afstand tussen de twee toppen
      const yJ = yVan(gokH);
      const yE = yVan(hoogteVan(b.echt, b.schaal));
      const mx = (JIJ_X + ECHT_X) / 2;
      ctx.strokeStyle = 'rgba(21,25,58,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(JIJ_X + STAPEL_B / 2 + 2, yJ);
      ctx.lineTo(mx, yJ);
      ctx.lineTo(mx, yE);
      ctx.lineTo(ECHT_X - STAPEL_B / 2 - 2, yE);
      ctx.stroke();
      ballon(ctx, ECHT_X, yE, toonBedrag(b.echt, b.schaal.eenheid), '#f2b705', '#2b1a08');
      // sterren springen één voor één tevoorschijn
      // op een bordje tussen de stapels, vlak boven de vloer
      const sy = VLOER - 22;
      ctx.fillStyle = 'rgba(21,25,58,0.8)';
      rondRechthoek(ctx, mx - 35, sy - 14, 70, 28, 14);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const st = b.stil ? 1 : Math.min(1, Math.max(0, (nu - b.sinds - GROEI_MS - i * 180) / 260));
        if (st <= 0) continue;
        const r = 10 * (st < 1 ? 0.6 + 0.6 * Math.sin(st * Math.PI * 0.75) : 1);
        ster(ctx, mx - 21 + i * 21, sy + 1, r, i < b.sterren);
      }
      // feest bij drie sterren
      if (b.sterren === 3 && !b.stil) confetti(ctx, mx, yE, nu - b.sinds - GROEI_MS);
    }
  }
  ballon(ctx, JIJ_X, yVan(gokH), toonBedrag(b.gok, b.schaal.eenheid), '#1233c4');

  if (b.pauze) {
    ctx.fillStyle = 'rgba(21,25,58,0.55)';
    ctx.fillRect(0, 0, BREEDTE, HOOGTE);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px Asap, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Pauze', BREEDTE / 2, HOOGTE / 2);
  }
}

function confetti(ctx: CanvasRenderingContext2D, x: number, y: number, ms: number): void {
  if (ms < 0 || ms > 1800) return;
  const t = ms / 1000;
  const kleuren = ['#ff6400', '#1233c4', '#ffd23a', '#15875a', '#ffffff'];
  ctx.globalAlpha = Math.max(0, 1 - ms / 1800);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const v = 70 + (i % 5) * 18;
    const px = x + Math.cos(a) * v * t;
    const py = y + Math.sin(a) * v * t + 90 * t * t;
    ctx.fillStyle = kleuren[i % kleuren.length] ?? '#ffd23a';
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(t * 6 + i);
    ctx.fillRect(-3, -1.5, 6, 3);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

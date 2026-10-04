/**
 * Noorderplantsoen: "Parkploeg". Het park van bovenaf, met kronkelende paden, de vijver met de
 * fontein, grote bomen, bankjes, lantaarns en een speeltuin. Er gaat steeds iets kapot. Tik erop
 * (of kies het in de lijst) en de werkbus van de gemeente rijdt erheen. Snel repareren is
 * goedkoop; wie wacht, betaalt meer, en nog later gebeurt er een ongeluk en komt er een klacht.
 *
 * Bij minder beweging loopt er geen klok en beweegt niets vanzelf: je speelt in dagen. Per dag doet
 * de ploeg twee klussen, daarna kies je "Volgende dag".
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatEuro } from '../../engine';
import {
  BANKJES,
  BOMEN,
  BREEDTE,
  DAG,
  HOOGTE,
  KLUSSEN_PER_DAG,
  LANTAARNS,
  LEVELS,
  PADEN,
  PRIJS_ERGER,
  PRIJS_ONGELUK,
  PRIJS_SNEL,
  RING,
  SOORTEN,
  SPEELTUIN,
  TE_LAAT_VOOR_STER,
  VIJVER,
  WERF,
  busStap,
  dagen,
  fase as faseVan,
  level as levelRegels,
  naamNu,
  nieuweBus,
  nieuwPark,
  onderhoudsPost,
  opBocht,
  opRing,
  prijsNu,
  raak,
  rekening,
  repareer,
  stap,
  voortgang,
  type Bus,
  type Gebeurtenis,
  type LevelRegels,
  type Park,
  type Punt,
  type Rekening,
  type Schade,
} from '../../game/mgNoorderplantsoen';
import { Hud, Meldingen, PauzeKnop, SpelKaart, type Melding } from './kader/kader';
import { maakScherp, mln, rondRechthoek, useLus, useStil, useToetsen } from './kader/hulp';
import type { MinigameProps } from './types';
import './Noorderplantsoen.css';

type Fase = 'start' | 'spelen' | 'klaar';
/** Een bedrag of tekst die even boven het park zweeft. */
type Zwever = { tekst: string; x: number; y: number; begin: number; kleur: string };
/** Een rode flits waar een ongeluk gebeurde. */
type Flits = { x: number; y: number; begin: number };

const euro = (x: number) => formatEuro(x);
const sterren = (n: number, max = 3) => '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n));

export default function Noorderplantsoen({ data, onKlaar }: MinigameProps) {
  const stil = useStil();
  const [fase, setFase] = useState<Fase>('start');
  const [levelNr, setLevelNr] = useState(1);
  const [park, setPark] = useState<Park>(nieuwPark);
  const [rij, setRij] = useState<string[]>([]);
  const [klussen, setKlussen] = useState(0);
  const [pauze, setPauze] = useState(false);
  const [melding, setMelding] = useState<Melding>();
  const [uitslagen, setUitslagen] = useState<Record<number, Rekening>>({});

  const doek = useRef<HTMLCanvasElement>(null);
  const parkRef = useRef<Park>(park);
  const busRef = useRef<Bus>(nieuweBus());
  const zwevers = useRef<Zwever[]>([]);
  const flitsen = useRef<Flits[]>([]);
  const l = levelRegels(levelNr);
  const jaar = data.begroting.begrotingsjaar;
  const post = onderhoudsPost(data);

  const levelKlaar = fase === 'spelen' && park.t >= l.tijd;
  const spelen = fase === 'spelen' && !levelKlaar;
  const over = l.budget - park.uitgegeven;
  const dag = Math.min(dagen(l), Math.floor(park.t / DAG) + 1);

  /** Zet het park (de echte toestand staat in een ref, voor de lus). */
  const zetPark = useCallback((p: Park) => {
    parkRef.current = p;
    setPark(p);
  }, []);

  // ---------------------------------------------------------------------------------------------
  // Een level beginnen
  // ---------------------------------------------------------------------------------------------

  const begin = (nr: number) => {
    const regels = levelRegels(nr);
    // In de rustige modus begint de eerste dag met iets dat al kapot is.
    zetPark(stil ? stap(nieuwPark(), regels, 1).park : nieuwPark());
    busRef.current = nieuweBus();
    zwevers.current = [];
    flitsen.current = [];
    setLevelNr(nr);
    setRij([]);
    setKlussen(0);
    setPauze(false);
    setMelding(undefined);
    setFase('spelen');
  };

  /** Onthoudt de beste rekening per level, voor de eindkaart. */
  const boek = () => {
    const r = rekening(park, l);
    setUitslagen((u) => {
      const oud = u[levelNr];
      return !oud || r.sterren > oud.sterren || (r.sterren === oud.sterren && r.totaal < oud.totaal)
        ? { ...u, [levelNr]: r }
        : u;
    });
  };

  // ---------------------------------------------------------------------------------------------
  // Wat er gebeurt
  // ---------------------------------------------------------------------------------------------

  /** Meldingen en effecten bij wat er gebeurde. */
  const verwerk = useCallback(
    (gebeurd: Gebeurtenis[], nu: number) => {
      for (const g of gebeurd) {
        if (g.soort !== 'ongeluk') continue;
        const s = SOORTEN[g.schade.plek.soort];
        setMelding({
          tekst: (
            <>
              ⚠️ <strong>{s.ongeluk}</strong> Klacht van een inwoner: “{s.klacht}” Spoedreparatie:{' '}
              {euro(PRIJS_ONGELUK)}.
            </>
          ),
          toon: 'fout',
          tijd: nu,
        });
        if (!stil) {
          flitsen.current.push({ x: g.schade.plek.x, y: g.schade.plek.y, begin: nu });
          zwevers.current.push({
            tekst: `−${euro(PRIJS_ONGELUK)}`,
            x: g.schade.plek.x,
            y: g.schade.plek.y - 14,
            begin: nu,
            kleur: '#c4321e',
          });
          zwevers.current.push({
            tekst: '😠 Klacht!',
            x: g.schade.plek.x,
            y: g.schade.plek.y - 34,
            begin: nu + 150,
            kleur: '#7a1b0e',
          });
        }
      }
    },
    [stil],
  );

  const meldReparatie = useCallback(
    (naam: string, prijs: number, x: number, y: number, nu: number) => {
      const snel = prijs === PRIJS_SNEL;
      setMelding({
        tekst: snel ? (
          <>
            🛠️ Gerepareerd: {naam}. Op tijd, dus maar {euro(prijs)}.
          </>
        ) : (
          <>
            🛠️ Gerepareerd: {naam}. Te lang gewacht: {euro(prijs)} in plaats van {euro(PRIJS_SNEL)}.
          </>
        ),
        toon: snel ? 'goed' : undefined,
        tijd: nu,
      });
      if (!stil)
        zwevers.current.push({
          tekst: `−${euro(prijs)}`,
          x,
          y: y - 16,
          begin: nu,
          kleur: snel ? '#15875a' : '#c26a00',
        });
    },
    [stil],
  );

  /** Kies een klus: met de klok gaat de bus erheen, in de rustige modus repareert de ploeg meteen. */
  const kies = useCallback(
    (id: string) => {
      const p = parkRef.current;
      const s = p.schades.find((x) => x.id === id);
      if (!s || fase !== 'spelen' || p.t >= l.tijd || pauze) return;
      const nu = performance.now();
      if (stil) {
        if (klussen >= KLUSSEN_PER_DAG) {
          setMelding({
            tekst: `De ploeg heeft vandaag al ${KLUSSEN_PER_DAG} klussen gedaan. Kies "Volgende dag".`,
            tijd: nu,
          });
          return;
        }
        const naam = naamNu(s, p.t, l);
        const r = repareer(p, l, id);
        if (!r) return;
        zetPark(r.park);
        setKlussen((k) => k + 1);
        meldReparatie(naam, r.reparatie.prijs, s.plek.x, s.plek.y, nu);
        return;
      }
      const bus = busRef.current;
      if (bus.rij.includes(id)) return;
      busRef.current = { ...bus, rij: [...bus.rij, id] };
      setRij(busRef.current.rij);
    },
    [fase, l, pauze, stil, klussen, zetPark, meldReparatie],
  );

  const volgendeDag = () => {
    const p = parkRef.current;
    if (!stil || p.t >= l.tijd) return;
    const r = stap(p, l, Math.min(l.tijd, p.t + DAG));
    zetPark(r.park);
    setKlussen(0);
    const nu = performance.now();
    const kapot = r.gebeurd.filter((g) => g.soort === 'kapot');
    if (r.park.t >= l.tijd) return;
    if (r.gebeurd.some((g) => g.soort === 'ongeluk')) verwerk(r.gebeurd, nu);
    else
      setMelding({
        tekst: kapot.length
          ? `Dag ${Math.floor(r.park.t / DAG) + 1}. Nieuw kapot: ${kapot
              .map((g) => SOORTEN[g.schade.plek.soort].naam.toLowerCase())
              .join(', ')}.`
          : `Dag ${Math.floor(r.park.t / DAG) + 1}. Niets nieuws kapot.`,
        tijd: nu,
      });
  };

  // ---------------------------------------------------------------------------------------------
  // De lus: de tijd loopt, de bus rijdt en alles wordt getekend
  // ---------------------------------------------------------------------------------------------

  useLus(spelen && !stil && !pauze, (dt, nu) => {
    const oud = parkRef.current;
    const r = stap(oud, l, Math.min(l.tijd, oud.t + dt));
    let p = r.park;
    verwerk(r.gebeurd, nu);
    const b = busStap(busRef.current, p, l, dt);
    const rijVoor = busRef.current.rij;
    busRef.current = b.bus;
    p = b.park;
    if (b.reparatie && b.bus.bij) {
      const naam =
        b.reparatie.fase === 'nieuw'
          ? SOORTEN[b.reparatie.soort].naam
          : SOORTEN[b.reparatie.soort].erger;
      meldReparatie(naam, b.reparatie.prijs, b.bus.bij.x, b.bus.bij.y, nu);
    }
    parkRef.current = p;
    const anders =
      r.gebeurd.length > 0 ||
      b.reparatie !== undefined ||
      Math.floor(p.t * 4) !== Math.floor(oud.t * 4) ||
      p.t >= l.tijd;
    if (anders) setPark(p);
    if (b.bus.rij !== rijVoor) setRij(b.bus.rij);
    teken(doek.current, l, p, b.bus, zwevers.current, flitsen.current, nu, false);
  });

  // Zonder lus (rustige modus of pauze): opnieuw tekenen als er iets verandert.
  useEffect(() => {
    if (fase !== 'spelen' || (!stil && !pauze)) return;
    teken(doek.current, l, park, busRef.current, [], [], stil ? 0 : performance.now(), pauze);
  }, [fase, stil, pauze, park, l, rij]);

  // Toetsen: 1 tot 9 kiest een klus, P pauzeert, N is de volgende dag.
  useToetsen(spelen, (e) => {
    if (/^[1-9]$/.test(e.key)) {
      const s = park.schades[Number(e.key) - 1];
      if (s) {
        e.preventDefault();
        kies(s.id);
      }
    } else if (!stil && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      setPauze((x) => !x);
    } else if (stil && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      volgendeDag();
    }
  });

  // ---------------------------------------------------------------------------------------------
  // Scherm
  // ---------------------------------------------------------------------------------------------

  const hud = (
    <Hud
      testid="mg-park-stand"
      icoon="🦺"
      links={[
        {
          label: 'Budget over',
          waarde: euro(over),
          toon: over < 0 ? 'fout' : over < PRIJS_ERGER ? undefined : 'goed',
        },
        {
          label: 'Klachten',
          waarde: park.ongelukken.length,
          toon: park.ongelukken.length ? 'fout' : undefined,
        },
      ]}
      rechts={[
        stil
          ? { label: 'Dag', waarde: `${dag} van ${dagen(l)}` }
          : {
              label: 'Tijd',
              waarde: Math.max(0, Math.ceil(l.tijd - park.t)),
              toon: l.tijd - park.t <= 5 ? 'fout' : undefined,
            },
        { label: 'Level', waarde: `${levelNr} van ${LEVELS.length}` },
      ]}
    />
  );

  if (fase === 'start')
    return (
      <div className="mg-kader mg-park">
        <SpelKaart titel="🌳 Parkploeg" knop={{ tekst: 'Start level 1', onClick: () => begin(1) }}>
          <p>
            Jij bent de baas van de parkploeg in het <strong>Noorderplantsoen</strong>. Er gaat
            steeds iets kapot. Repareer het voordat het erger wordt.
          </p>
          <ul className="klein mg-park-regels">
            <li>
              🛠️ <strong>Snel</strong> repareren kost <strong>{euro(PRIJS_SNEL)}</strong>.
            </li>
            <li>
              ⏳ <strong>Te lang gewacht</strong>: het wordt erger (een groter gat, roest) en kost{' '}
              <strong>{euro(PRIJS_ERGER)}</strong>.
            </li>
            <li>
              ⚠️ Nog langer: een <strong>ongeluk</strong> en een klacht. De spoedreparatie kost{' '}
              <strong>{euro(PRIJS_ONGELUK)}</strong>.
            </li>
          </ul>
          <p className="klein">
            {stil
              ? `Er loopt geen klok. Per dag doet je ploeg ${KLUSSEN_PER_DAG} klussen: tik op iets dat kapot is of kies het in de lijst. Daarna kies je "Volgende dag".`
              : 'Tik op iets dat kapot is (of kies het in de lijst, of druk op het nummer). De werkbus rijdt erheen. Je kunt meer klussen tegelijk klaarzetten.'}{' '}
            Elk level heeft een onderhoudsbudget. Drie levels: lente, zomer en een herfststorm.
          </p>
          <p className="klein mg-park-let">
            ⚠︎ De bedragen in dit spel zijn spelregels, geen bedragen uit de begroting.
          </p>
        </SpelKaart>
      </div>
    );

  if (fase === 'klaar')
    return <Eindkaart uitslagen={uitslagen} jaar={jaar} post={post} onKlaar={onKlaar} />;

  if (levelKlaar) {
    const r = rekening(park, l);
    const laatste = levelNr >= LEVELS.length;
    return (
      <div className="mg-kader mg-park">
        {hud}
        <SpelKaart
          testid="mg-park-einde"
          status
          titel={
            r.binnenBudget
              ? `Level ${levelNr} gehaald: binnen het budget! ${r.sterren === 3 ? '🎉' : ''}`
              : `Level ${levelNr}: ${euro(r.totaal - r.budget)} over het budget`
          }
          knop={
            r.binnenBudget && !laatste
              ? {
                  tekst: `Level ${levelNr + 1}: ${LEVELS[levelNr]?.naam ?? ''}`,
                  onClick: () => {
                    boek();
                    begin(levelNr + 1);
                  },
                }
              : !r.binnenBudget
                ? {
                    tekst: 'Probeer opnieuw',
                    onClick: () => {
                      boek();
                      begin(levelNr);
                    },
                  }
                : {
                    tekst: 'Bekijk wat je deed',
                    onClick: () => {
                      boek();
                      setFase('klaar');
                    },
                  }
          }
          extra={
            !(r.binnenBudget && laatste) && (
              <button
                type="button"
                className="knop"
                onClick={() => {
                  boek();
                  setFase('klaar');
                }}
              >
                Stoppen
              </button>
            )
          }
        >
          <p className="mg-sterren" aria-label={`${r.sterren} van de 3 sterren`}>
            {sterren(r.sterren)}
          </p>
          <RekeningLijst r={r} />
        </SpelKaart>
      </div>
    );
  }

  const label = beschrijf(park, l, rij, stil);
  return (
    <div className="mg-kader mg-park">
      {hud}
      <p className="mg-strook klein">
        <strong>
          Level {levelNr}: {l.naam}.
        </strong>{' '}
        {l.uitleg} Budget: {euro(l.budget)} (spelregel).
        {stil && (
          <>
            {' '}
            Klussen vandaag:{' '}
            <strong data-testid="mg-park-klussen">
              {klussen} van {KLUSSEN_PER_DAG}
            </strong>
            .
          </>
        )}
      </p>
      <canvas
        ref={doek}
        className="mg-veld mg-park-veld"
        width={BREEDTE}
        height={HOOGTE}
        role="img"
        aria-label={label}
        onPointerDown={(e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * BREEDTE;
          const y = ((e.clientY - rect.top) / rect.height) * HOOGTE;
          const s = raak(parkRef.current.schades, x, y);
          if (s) kies(s.id);
        }}
      />
      <div className="mg-park-klussen" aria-label="Wat is er kapot?" role="group">
        {park.schades.length === 0 && <p className="klein mg-park-leeg">Alles is heel. 🌷</p>}
        {park.schades.map((s, i) => {
          const f = faseVan(s, park.t, l);
          const inRij = rij.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              className={`mg-park-klus mg-park-klus-${f}${inRij ? ' mg-park-klus-rij' : ''}`}
              onClick={() => kies(s.id)}
              disabled={pauze || inRij || (stil && klussen >= KLUSSEN_PER_DAG)}
              aria-label={`Repareer: ${naamNu(s, park.t, l)} (${f === 'nieuw' ? 'nog nieuw' : 'al erger'}, ${euro(prijsNu(s, park.t, l))})${inRij ? ', de bus komt eraan' : ''}`}
            >
              <span className="mg-park-nr" aria-hidden="true">
                {i + 1}
              </span>
              <span aria-hidden="true">{SOORTEN[s.plek.soort].icoon}</span>{' '}
              <span aria-hidden="true">
                {naamNu(s, park.t, l)} · {inRij ? '🚐' : euro(prijsNu(s, park.t, l))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mg-knoppen">
        {stil ? (
          <button type="button" className="knop-indienen mg-grote-knop" onClick={volgendeDag}>
            {dag >= dagen(l) ? 'Einde van het level ▶' : 'Volgende dag ▶'}
          </button>
        ) : (
          <PauzeKnop pauze={pauze} onWissel={() => setPauze((x) => !x)} />
        )}
      </div>
      <Meldingen melding={melding} />
    </div>
  );
}

/** Wat er op het canvas te zien is, voor wie het niet ziet. */
function beschrijf(park: Park, l: LevelRegels, rij: string[], stil: boolean): string {
  const lijst = park.schades.map(
    (s, i) =>
      `${i + 1}: ${naamNu(s, park.t, l).toLowerCase()}${rij.includes(s.id) ? ' (bus onderweg)' : ''}`,
  );
  return `Het Noorderplantsoen van bovenaf. ${
    lijst.length ? `Kapot: ${lijst.join('; ')}.` : 'Alles is heel.'
  }${stil ? '' : ` De werkbus heeft ${rij.length} klussen in de rij.`}`;
}

function RekeningLijst({ r }: { r: Rekening }) {
  return (
    <ul className="mg-lijst klein">
      <li>
        🛠️ Snel gerepareerd: <strong>{r.snel}</strong> × {euro(PRIJS_SNEL)}
      </li>
      <li>
        ⏳ Te laat gerepareerd: <strong>{r.laat}</strong> × {euro(PRIJS_ERGER)}
      </li>
      <li>
        ⚠️ Ongelukken en klachten: <strong>{r.ongelukken}</strong> × {euro(PRIJS_ONGELUK)}
      </li>
      {r.nogKapot > 0 && (
        <li>
          📋 Nog kapot aan het eind: <strong>{r.nogKapot}</strong>. Dat schuif je door: het staat op
          de rekening voor de prijs van nu.
        </li>
      )}
      <li>
        Totaal <strong>{euro(r.totaal)}</strong> van een budget van {euro(r.budget)}.{' '}
        {r.extra > 0 ? (
          <>
            Uitstel kostte <strong className="mg-hud-fout">{euro(r.extra)} extra</strong>.
          </>
        ) : (
          <>Uitstel kostte niets extra. Knap!</>
        )}
      </li>
      <li>
        Sterren: {r.redenen.budget ? '★' : '☆'} binnen het budget, {r.redenen.veilig ? '★' : '☆'}{' '}
        geen ongelukken, {r.redenen.snel ? '★' : '☆'} hooguit {TE_LAAT_VOOR_STER} keer te laat.
      </li>
    </ul>
  );
}

function Eindkaart({
  uitslagen,
  jaar,
  post,
  onKlaar,
}: {
  uitslagen: Record<number, Rekening>;
  jaar: number;
  post: ReturnType<typeof onderhoudsPost>;
  onKlaar: MinigameProps['onKlaar'];
}) {
  const lijst = LEVELS.flatMap((x) => {
    const r = uitslagen[x.nr];
    return r ? [{ l: x, r }] : [];
  });
  const som = (f: (r: Rekening) => number) => lijst.reduce((s, x) => s + f(x.r), 0);
  const totaalSterren = som((r) => r.sterren);
  const max = LEVELS.length * 3;
  const extra = som((r) => r.extra);
  return (
    <div className="mg-kader mg-park" data-testid="mg-park-uitslag">
      <SpelKaart
        titel={
          totaalSterren === max
            ? 'Het park is piekfijn! 🌳'
            : `Je haalde ${totaalSterren} van de ${max} sterren`
        }
        knop={{ tekst: 'Naar de uitslag', onClick: () => onKlaar(totaalSterren, max) }}
      >
        <p className="mg-sterren" aria-hidden="true">
          {sterren(totaalSterren, max)}
        </p>
        {lijst.length > 0 ? (
          <ul className="mg-lijst klein">
            {lijst.map(({ l, r }) => (
              <li key={l.nr}>
                <strong>
                  Level {l.nr}, {l.naam.toLowerCase()}:
                </strong>{' '}
                {r.snel + r.laat} gerepareerd ({r.snel} snel, {r.laat} te laat), {r.ongelukken}{' '}
                {r.ongelukken === 1 ? 'ongeluk' : 'ongelukken'}. Totaal {euro(r.totaal)}
                {r.extra > 0 ? `, waarvan ${euro(r.extra)} door uitstel` : ''}. {sterren(r.sterren)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="klein">Je speelde geen level helemaal uit.</p>
        )}
        <p>
          <strong>Wat leer je?</strong>{' '}
          {extra > 0
            ? `Uitstel kostte je in totaal ${euro(extra)} extra. `
            : 'Jij repareerde alles op tijd. '}
          Onderhoud uitstellen lijkt goedkoop, maar kost later meer: het wordt erger, en soms
          gebeurt er een ongeluk.
        </p>
        {post && (
          <p className="mg-park-echt">
            In het echt geeft de gemeente in {jaar} <strong>{mln(post.bedragMln)}</strong> uit aan{' '}
            <strong>{post.naam.toLowerCase()}</strong>: {post.uitleg.toLowerCase()}
            {post.soort === 'wet' && post.wet && (
              <>
                {' '}
                <span className="mg-park-wet">Moet van de wet ({post.wet}).</span>
              </>
            )}
          </p>
        )}
        <p className="klein mg-park-let">
          ⚠︎ De bedragen in het spel ({euro(PRIJS_SNEL)}, {euro(PRIJS_ERGER)}, {euro(PRIJS_ONGELUK)}{' '}
          en het budget) zijn spelregels. Het bedrag voor onderhoud komt uit de begroting {jaar} van
          de gemeente Groningen.
        </p>
      </SpelKaart>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// Tekenen
// -------------------------------------------------------------------------------------------------

/** Een vast getal per tekst, voor variatie die niet verspringt. */
function hash(tekst: string): number {
  let h = 2166136261;
  for (const c of tekst) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** Een reeks vaste "toevallige" getallen. */
function reeks(zaad: number): () => number {
  let a = zaad || 1;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
}

function schaduw(ctx: CanvasRenderingContext2D, blur: number, y = 2, kleur = 'rgba(0,0,0,0.3)') {
  ctx.shadowColor = kleur;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = y * 0.6;
  ctx.shadowOffsetY = y;
}
const geenSchaduw = (ctx: CanvasRenderingContext2D) => {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
};

/** Een pad tekenen langs een bocht of de ring. */
function padVorm(ctx: CanvasRenderingContext2D, i: number): void {
  ctx.beginPath();
  if (i < 0) {
    ctx.ellipse(RING.x, RING.y, RING.rx, RING.ry, 0, 0, Math.PI * 2);
    return;
  }
  const b = PADEN[i];
  if (!b) return;
  ctx.moveTo(b[0].x, b[0].y);
  ctx.bezierCurveTo(b[1].x, b[1].y, b[2].x, b[2].y, b[3].x, b[3].y);
}

let achtergrond: { beeld: HTMLCanvasElement; r: number } | undefined;
let kruinen: { beeld: HTMLCanvasElement; r: number } | undefined;

/** Het park zonder wat beweegt: gras, paden, vijverrand, bloemen, bankjes, speeltuin. */
function grond(r: number): HTMLCanvasElement {
  if (achtergrond?.r === r) return achtergrond.beeld;
  const c = document.createElement('canvas');
  c.width = BREEDTE * r;
  c.height = HOOGTE * r;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.scale(r, r);
  const kans = reeks(7);

  // gras met maaibanen
  const gras = ctx.createLinearGradient(0, 0, BREEDTE, HOOGTE);
  gras.addColorStop(0, '#86c95e');
  gras.addColorStop(0.5, '#73b94d');
  gras.addColorStop(1, '#5fa53f');
  ctx.fillStyle = gras;
  ctx.fillRect(0, 0, BREEDTE, HOOGTE);
  ctx.save();
  ctx.rotate(-0.35);
  for (let x = -200; x < BREEDTE + 200; x += 36) {
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fillRect(x, -100, 18, HOOGTE + 300);
  }
  ctx.restore();
  for (let i = 0; i < 900; i++) {
    const x = kans() * BREEDTE;
    const y = kans() * HOOGTE;
    ctx.fillStyle = kans() < 0.5 ? 'rgba(40,90,20,0.18)' : 'rgba(210,240,150,0.16)';
    ctx.fillRect(x, y, 1.2, 2.4);
  }
  // klavers en madeliefjes
  for (let i = 0; i < 70; i++) {
    const x = kans() * BREEDTE;
    const y = kans() * HOOGTE;
    ctx.fillStyle = kans() < 0.7 ? '#ffffff' : '#ffe14d';
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // boomschaduwen
  for (const b of BOMEN) {
    ctx.fillStyle = 'rgba(20,60,10,0.28)';
    ctx.beginPath();
    ctx.ellipse(b.p.x + b.r * 0.35, b.p.y + b.r * 0.45, b.r * 1.02, b.r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // bloemperken (de rozentuin)
  const perken = [
    { x: 236, y: 26, rx: 34, ry: 13 },
    { x: 96, y: 222, rx: 13, ry: 22 },
  ];
  for (const p of perken) {
    ctx.fillStyle = '#6b4a2b';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx + 2, p.ry + 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f7d2c';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    const kleuren = ['#e8394d', '#ff8fb1', '#ffd23f', '#ffffff', '#c13584'];
    for (let i = 0; i < 46; i++) {
      const a = kans() * Math.PI * 2;
      const d = Math.sqrt(kans()) * 0.85;
      ctx.fillStyle = kleuren[i % kleuren.length] ?? '#fff';
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * p.rx * d, p.y + Math.sin(a) * p.ry * d, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // paden: rand, grind, licht midden
  const paden = [-1, 0, 1, 2, 3];
  ctx.lineCap = 'round';
  for (const i of paden) {
    padVorm(ctx, i);
    ctx.strokeStyle = 'rgba(40,60,20,0.35)';
    ctx.lineWidth = 19;
    ctx.stroke();
  }
  for (const i of paden) {
    padVorm(ctx, i);
    ctx.strokeStyle = '#c9ae7a';
    ctx.lineWidth = 16;
    ctx.stroke();
  }
  for (const i of paden) {
    padVorm(ctx, i);
    ctx.strokeStyle = '#ead8aa';
    ctx.lineWidth = 12.5;
    ctx.stroke();
    padVorm(ctx, i);
    ctx.strokeStyle = 'rgba(255,248,225,0.55)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  // grind
  const grindOp = (p: Punt) => {
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = kans() < 0.5 ? 'rgba(120,95,55,0.35)' : 'rgba(255,255,255,0.5)';
      ctx.fillRect(p.x + (kans() - 0.5) * 11, p.y + (kans() - 0.5) * 11, 1.1, 1.1);
    }
  };
  for (let t = 0; t <= 1; t += 0.006) for (const b of PADEN) grindOp(opBocht(b, t));
  for (let h = 0; h < 360; h += 1.5) grindOp(opRing(h));

  // vijverrand van keien
  ctx.fillStyle = '#a7a493';
  ctx.beginPath();
  ctx.ellipse(VIJVER.x, VIJVER.y + 1, VIJVER.rx + 6, VIJVER.ry + 6, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let h = 0; h < 360; h += 9) {
    const a = (h * Math.PI) / 180;
    ctx.fillStyle = h % 18 ? '#c3bfac' : '#8f8b7b';
    ctx.beginPath();
    ctx.ellipse(
      VIJVER.x + Math.cos(a) * (VIJVER.rx + 3),
      VIJVER.y + Math.sin(a) * (VIJVER.ry + 3),
      4,
      3,
      a,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // speeltuin: zand met een houten rand
  const st = SPEELTUIN;
  schaduw(ctx, 4, 2);
  rondRechthoek(ctx, st.x - st.b / 2, st.y - st.h / 2, st.b, st.h, 10);
  ctx.fillStyle = '#8a5a2e';
  ctx.fill();
  geenSchaduw(ctx);
  rondRechthoek(ctx, st.x - st.b / 2 + 3, st.y - st.h / 2 + 3, st.b - 6, st.h - 6, 8);
  const zand = ctx.createRadialGradient(st.x - 10, st.y - 10, 4, st.x, st.y, st.b / 1.6);
  zand.addColorStop(0, '#fbe7b5');
  zand.addColorStop(1, '#e8c785');
  ctx.fillStyle = zand;
  ctx.fill();
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = 'rgba(160,120,60,0.25)';
    ctx.fillRect(
      st.x - st.b / 2 + 5 + kans() * (st.b - 10),
      st.y - st.h / 2 + 5 + kans() * (st.h - 10),
      1,
      1,
    );
  }

  // bankjes
  for (const b of BANKJES) {
    ctx.save();
    ctx.translate(b.p.x, b.p.y);
    ctx.rotate(b.hoek);
    schaduw(ctx, 3, 2);
    ctx.fillStyle = '#7a4b25';
    rondRechthoek(ctx, -11, -4.5, 22, 9, 2);
    ctx.fill();
    geenSchaduw(ctx);
    ctx.fillStyle = '#a8703f';
    for (let k = 0; k < 3; k++) ctx.fillRect(-10, -3.6 + k * 2.6, 20, 1.8);
    ctx.fillStyle = '#3b3b3b';
    ctx.fillRect(-10, -5, 2, 10);
    ctx.fillRect(8, -5, 2, 10);
    ctx.restore();
  }

  // de werf van de gemeente bij de ingang
  ctx.save();
  schaduw(ctx, 3, 2);
  rondRechthoek(ctx, WERF.x - 26, WERF.y - 4, 40, 26, 4);
  ctx.fillStyle = '#9aa1a9';
  ctx.fill();
  geenSchaduw(ctx);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1;
  ctx.strokeRect(WERF.x - 20, WERF.y, 28, 18);
  ctx.restore();

  achtergrond = { beeld: c, r };
  return c;
}

/** Een boomkruin van bovenaf: lagen bladeren, licht van linksboven. */
function kruin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, zaad: number): void {
  const kans = reeks(zaad);
  const lobben = 7;
  schaduw(ctx, 6, 3, 'rgba(10,40,5,0.35)');
  ctx.fillStyle = '#2f6b25';
  ctx.beginPath();
  for (let i = 0; i < lobben; i++) {
    const a = (i / lobben) * Math.PI * 2 + kans();
    const d = r * (0.55 + kans() * 0.12);
    ctx.moveTo(x + Math.cos(a) * d + r * 0.5, y + Math.sin(a) * d);
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.5, 0, Math.PI * 2);
  }
  ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
  geenSchaduw(ctx);
  // lichtere lagen
  const lagen: [number, string][] = [
    [0.78, '#3f8a30'],
    [0.56, '#55a23b'],
    [0.34, '#74bb4f'],
  ];
  for (const [f, kleur] of lagen) {
    ctx.fillStyle = kleur;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = kans() * Math.PI * 2;
      const d = r * f * 0.45;
      const px = x - r * (0.8 - f) * 0.6 + Math.cos(a) * d;
      const py = y - r * (0.8 - f) * 0.6 + Math.sin(a) * d;
      ctx.moveTo(px + r * f * 0.42, py);
      ctx.arc(px, py, r * f * 0.42, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  // glans
  ctx.fillStyle = 'rgba(220,255,170,0.25)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

function bomenLaag(r: number): HTMLCanvasElement {
  if (kruinen?.r === r) return kruinen.beeld;
  const c = document.createElement('canvas');
  c.width = BREEDTE * r;
  c.height = HOOGTE * r;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.scale(r, r);
  BOMEN.forEach((b, i) => kruin(ctx, b.p.x, b.p.y, b.r, 11 + i * 7));
  kruinen = { beeld: c, r };
  return c;
}

/** De vijver met water, golfjes, eenden en de fontein. */
function vijver(ctx: CanvasRenderingContext2D, nu: number): void {
  const v = VIJVER;
  const water = ctx.createRadialGradient(v.x - 18, v.y - 14, 6, v.x, v.y, v.rx);
  water.addColorStop(0, '#8fd3ee');
  water.addColorStop(0.6, '#4fa6cf');
  water.addColorStop(1, '#2f7fae');
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.ellipse(v.x, v.y, v.rx, v.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // golfjes rond de fontein
  for (let k = 0; k < 3; k++) {
    const f = (((nu / 2600 + k / 3) % 1) + 1) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.45 * (1 - f)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(v.x, v.y, 8 + f * 46, 5 + f * 29, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // glinstering
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const x = v.x - 44 + ((i * 23 + nu / 90) % 88);
    const y = v.y - 26 + ((i * 37) % 52);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 7, y);
    ctx.stroke();
  }
  ctx.restore();
  // eenden
  for (let i = 0; i < 2; i++) {
    const a = nu / (5200 + i * 1500) + i * 2.6;
    const x = v.x + Math.cos(a) * (v.rx - 18);
    const y = v.y + Math.sin(a) * (v.ry - 12);
    const richting = a + Math.PI / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(richting);
    ctx.fillStyle = 'rgba(0,40,70,0.25)';
    ctx.beginPath();
    ctx.ellipse(1, 1.5, 5.5, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = i ? '#f4f1e8' : '#8a6a44';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = i ? '#f4f1e8' : '#1f6b3a';
    ctx.beginPath();
    ctx.arc(4.5, 0, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9f1a';
    ctx.fillRect(6.4, -0.7, 2, 1.4);
    ctx.restore();
  }
  // de fontein: bak en waterstralen
  ctx.fillStyle = '#d9d6c8';
  ctx.beginPath();
  ctx.ellipse(v.x, v.y, 9, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7ec6e6';
  ctx.beginPath();
  ctx.ellipse(v.x, v.y, 6.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const f = (((nu / 900 + i * 0.37) % 1) + 1) % 1;
    const d = 4 + f * 15;
    ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - f)})`;
    ctx.beginPath();
    ctx.arc(
      v.x + Math.cos(a) * d,
      v.y + Math.sin(a) * d * 0.65 - Math.sin(f * Math.PI) * 6,
      1.5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(v.x, v.y - 3, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

/** De toestellen in de speeltuin; kapot als er een schade op die plek is. */
function speeltoestellen(
  ctx: CanvasRenderingContext2D,
  kapot: Map<string, Schade>,
  l: LevelRegels,
  t: number,
  nu: number,
): void {
  const st = SPEELTUIN;
  // schommel (speel-1)
  const s1 = kapot.get('speel-1');
  const x1 = st.x - 24;
  const y1 = st.y - 4;
  const roest1 = s1 && faseVan(s1, t, l) === 'erger';
  ctx.save();
  schaduw(ctx, 3, 2);
  ctx.fillStyle = roest1 ? '#8b4a22' : '#d2452f';
  ctx.fillRect(x1 - 18, y1 - 14, 36, 4);
  geenSchaduw(ctx);
  ctx.fillStyle = roest1 ? '#6e3a1b' : '#a53322';
  ctx.fillRect(x1 - 19, y1 - 16, 4, 8);
  ctx.fillRect(x1 + 15, y1 - 16, 4, 8);
  // kettingen en zitjes
  for (const [i, dx] of [-8, 8].entries()) {
    const los = s1 && i === 1;
    const zwaai = nu ? Math.sin(nu / 500 + i) * 2 : 0;
    const zx = x1 + dx + (los ? 5 : 0);
    const zy = y1 + 6 + (los ? 6 : zwaai);
    ctx.strokeStyle = '#7b7f87';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1 + dx - 3, y1 - 11);
    ctx.lineTo(zx - 3, zy);
    if (!los) {
      ctx.moveTo(x1 + dx + 3, y1 - 11);
      ctx.lineTo(zx + 3, zy);
    }
    ctx.stroke();
    ctx.save();
    ctx.translate(zx, zy);
    if (los) ctx.rotate(0.9);
    ctx.fillStyle = '#2f3540';
    rondRechthoek(ctx, -4.5, -2, 9, 4, 1.5);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // glijbaan (speel-2)
  const s2 = kapot.get('speel-2');
  const x2 = st.x + 24;
  const y2 = st.y + 2;
  const roest2 = s2 && faseVan(s2, t, l) === 'erger';
  ctx.save();
  ctx.translate(x2, y2);
  ctx.rotate(-0.25);
  schaduw(ctx, 3, 2);
  ctx.fillStyle = '#5b6470';
  ctx.fillRect(-6, -18, 12, 10);
  geenSchaduw(ctx);
  const baan = ctx.createLinearGradient(-5, 0, 5, 0);
  baan.addColorStop(0, roest2 ? '#8a5a2a' : '#1d8ad6');
  baan.addColorStop(0.5, roest2 ? '#b07a3a' : '#5bb8f5');
  baan.addColorStop(1, roest2 ? '#7a4a20' : '#1d8ad6');
  ctx.fillStyle = baan;
  rondRechthoek(ctx, -5, -10, 10, 30, 4);
  ctx.fill();
  if (s2) {
    // een scheur en een losse trede
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(0, 7);
    ctx.lineTo(-2, 10);
    ctx.lineTo(3, 13);
    ctx.stroke();
  }
  if (roest2) {
    ctx.fillStyle = 'rgba(150,70,20,0.75)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(-3 + ((i * 5) % 7), -6 + i * 4, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // zandbak-speelgoed
  ctx.fillStyle = '#ff6a00';
  ctx.beginPath();
  ctx.arc(st.x - 2, st.y + 20, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(st.x + 2, st.y + 18, 4, 3);
  // lint om wat onveilig is
  for (const [s, x, y] of [
    [s1, x1, y1],
    [s2, x2, y2],
  ] as const)
    if (s && faseVan(s, t, l) === 'erger') lint(ctx, x, y, 22, 16);
}

/** Rood-wit afzetlint rond een plek. */
function lint(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineDashOffset = 4;
  ctx.strokeStyle = '#e02020';
  ctx.stroke();
  ctx.restore();
}

/** Een lantaarn van bovenaf: paal, kap en (als hij werkt) licht. */
function lantaarn(
  ctx: CanvasRenderingContext2D,
  p: Punt,
  s: Schade | undefined,
  l: LevelRegels,
  t: number,
  nu: number,
): void {
  const erger = s && faseVan(s, t, l) === 'erger';
  if (!s) {
    const gloed = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 16);
    gloed.addColorStop(0, 'rgba(255,236,150,0.55)');
    gloed.addColorStop(1, 'rgba(255,236,150,0)');
    ctx.fillStyle = gloed;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  // schaduw van de paal
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + 10, p.y + 8);
  ctx.stroke();
  ctx.save();
  ctx.translate(p.x, p.y);
  if (erger) ctx.rotate(0.35);
  schaduw(ctx, 3, 2);
  ctx.fillStyle = erger ? '#7a4a2a' : '#2f343c';
  ctx.beginPath();
  ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
  ctx.fill();
  geenSchaduw(ctx);
  // de lamp
  const flikker = s && !erger && nu ? (Math.sin(nu / 70) > 0.6 ? 1 : 0) : 0;
  ctx.fillStyle = !s ? '#fff3b0' : flikker ? '#d8c97a' : erger ? '#5a3a24' : '#6b7079';
  ctx.beginPath();
  ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
  ctx.fill();
  if (erger) {
    ctx.fillStyle = '#c0622a';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(Math.cos(i * 1.3) * 4, Math.sin(i * 1.3) * 4, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Wat kapot is, op zijn plek (behalve lantaarns en speeltoestellen: die tekenen zichzelf). */
function schade(
  ctx: CanvasRenderingContext2D,
  s: Schade,
  l: LevelRegels,
  t: number,
  nu: number,
): void {
  const { x, y } = s.plek;
  const v = voortgang(s, t, l);
  const erger = faseVan(s, t, l) === 'erger';
  const kans = reeks(hash(s.plek.id));
  if (s.plek.soort === 'gat') {
    const r = 4.5 + v * 7;
    // een rafelig gat met barsten
    ctx.fillStyle = 'rgba(90,70,40,0.5)';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const d = (r + 3) * (0.8 + kans() * 0.35);
      if (i) ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.75);
      else ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.75);
    }
    ctx.fill();
    const binnen = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    binnen.addColorStop(0, '#2a2118');
    binnen.addColorStop(1, '#5b4630');
    ctx.fillStyle = binnen;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const d = r * (0.75 + kans() * 0.3);
      if (i) ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.72);
      else ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.72);
    }
    ctx.closePath();
    ctx.fill();
    if (erger) {
      // een plas in het gat
      ctx.fillStyle = 'rgba(110,160,190,0.7)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + 1, r * 0.5, r * 0.32, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(60,45,25,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4 + (erger ? 3 : 0); i++) {
      const a = kans() * Math.PI * 2;
      ctx.moveTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.7);
      ctx.lineTo(x + Math.cos(a) * (r + 5 + v * 5), y + Math.sin(a) * (r + 4 + v * 4) * 0.75);
    }
    ctx.stroke();
    if (erger) pion(ctx, x + r + 6, y - 4);
  } else if (s.plek.soort === 'tak') {
    const lang = 14 + v * 10;
    const hoek = kans() * Math.PI;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(hoek);
    schaduw(ctx, 3, 2);
    ctx.strokeStyle = '#6b4423';
    ctx.lineCap = 'round';
    ctx.lineWidth = erger ? 4.5 : 3.2;
    ctx.beginPath();
    ctx.moveTo(-lang / 2, 0);
    ctx.lineTo(lang / 2, 0);
    ctx.moveTo(-lang / 6, 0);
    ctx.lineTo(-lang / 6 + 6, -7);
    ctx.moveTo(lang / 5, 0);
    ctx.lineTo(lang / 5 + 5, 7);
    ctx.stroke();
    geenSchaduw(ctx);
    ctx.fillStyle = erger ? '#7c8b3a' : '#4f9a36';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(
        -lang / 2 + kans() * lang,
        (kans() - 0.5) * 12,
        3.4,
        2,
        kans() * 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
    if (erger) lint(ctx, x, y, 18, 13);
  } else if (s.plek.soort === 'afval') {
    const aantal = 4 + Math.round(v * 10);
    const kleuren = ['#ffffff', '#e23b3b', '#3b7be2', '#f2c230', '#b9c2cc', '#46b04a'];
    for (let i = 0; i < aantal; i++) {
      const ax = x + (kans() - 0.5) * (14 + v * 16);
      const ay = y + (kans() - 0.5) * (10 + v * 12);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(kans() * 3);
      ctx.fillStyle = kleuren[i % kleuren.length] ?? '#fff';
      if (i % 3 === 0) {
        // blikje
        ctx.fillRect(-2.5, -1.3, 5, 2.6);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(-2.5, -1.3, 5, 0.8);
      } else if (i % 3 === 1) {
        // papiertje
        ctx.beginPath();
        ctx.moveTo(-2.5, -2);
        ctx.lineTo(2.5, -1.4);
        ctx.lineTo(2, 2);
        ctx.lineTo(-2.2, 1.6);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (erger) {
      // een rat
      const rx = x + 10 + (nu ? Math.sin(nu / 400) * 4 : 0);
      const ry = y + 6;
      ctx.fillStyle = '#6d6a66';
      ctx.beginPath();
      ctx.ellipse(rx, ry, 4.5, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rx + 4.2, ry - 0.3, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d8a7a0';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(rx - 4.5, ry);
      ctx.quadraticCurveTo(rx - 9, ry + 3, rx - 11, ry - 1);
      ctx.stroke();
    }
  }
}

/** Een oranje pion met witte band. */
function pion(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  schaduw(ctx, 2, 1.5);
  ctx.fillStyle = '#ff6a00';
  ctx.beginPath();
  ctx.arc(x, y, 3.6, 0, Math.PI * 2);
  ctx.fill();
  geenSchaduw(ctx);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.stroke();
}

/** Een ring om wat kapot is: hoe vol, hoe dichter bij een ongeluk. En het nummer. */
function merk(
  ctx: CanvasRenderingContext2D,
  s: Schade,
  nr: number,
  inRij: boolean,
  l: LevelRegels,
  t: number,
  nu: number,
): void {
  const v = voortgang(s, t, l);
  const erger = faseVan(s, t, l) === 'erger';
  const { x, y } = s.plek;
  const puls = erger && nu ? 1 + Math.sin(nu / 140) * 0.08 : 1;
  const r = 15 * puls;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = v < 0.45 ? '#f2b705' : v < 0.75 ? '#ff7a00' : '#e02020';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + v * Math.PI * 2);
  ctx.stroke();
  // nummer
  const bx = x + 12;
  const by = y - 12;
  schaduw(ctx, 3, 1.5);
  ctx.fillStyle = inRij ? '#1233c4' : erger ? '#c4321e' : '#ffffff';
  ctx.beginPath();
  ctx.arc(bx, by, 7, 0, Math.PI * 2);
  ctx.fill();
  geenSchaduw(ctx);
  ctx.fillStyle = inRij || erger ? '#ffffff' : '#1e3b14';
  ctx.font = '800 9.5px Asap, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(nr), bx, by + 0.5);
}

/** Een wandelaar of fietser van bovenaf. */
function mens(
  ctx: CanvasRenderingContext2D,
  p: Punt,
  hoek: number,
  kleur: string,
  fiets: boolean,
  haar: string,
): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(hoek);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(1.5, 2, fiets ? 7.5 : 4, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (fiets) {
    ctx.strokeStyle = '#2b2f36';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.stroke();
    ctx.fillStyle = '#2b2f36';
    ctx.fillRect(4, -3.5, 1.4, 7);
  }
  // schouders en hoofd
  ctx.fillStyle = kleur;
  ctx.beginPath();
  ctx.ellipse(fiets ? -1 : 0, 0, 2.6, 4.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = haar;
  ctx.beginPath();
  ctx.arc(fiets ? -0.5 : 0.5, 0, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const MENSEN: {
  pad: number;
  snel: number;
  start: number;
  kleur: string;
  haar: string;
  fiets: boolean;
  kant: number;
}[] = [
  { pad: -1, snel: 0.018, start: 0, kleur: '#e84a5f', haar: '#3b2a1a', fiets: false, kant: 3 },
  { pad: -1, snel: -0.012, start: 140, kleur: '#2a9d8f', haar: '#e9c46a', fiets: false, kant: -3 },
  { pad: -1, snel: 0.03, start: 250, kleur: '#264653', haar: '#2b2b2b', fiets: true, kant: -3 },
  { pad: 0, snel: 0.07, start: 0.2, kleur: '#f4a261', haar: '#5a3a1a', fiets: true, kant: 3 },
  { pad: 1, snel: 0.035, start: 0.6, kleur: '#7b5ea7', haar: '#d9b38c', fiets: false, kant: 3 },
  { pad: 2, snel: 0.05, start: 0.1, kleur: '#1233c4', haar: '#2b2b2b', fiets: false, kant: -3 },
  { pad: 3, snel: 0.08, start: 0.5, kleur: '#e76f51', haar: '#f1e3c6', fiets: true, kant: 3 },
];

function mensen(ctx: CanvasRenderingContext2D, nu: number): void {
  const s = nu / 1000;
  for (const m of MENSEN) {
    let p: Punt;
    let q: Punt;
    if (m.pad < 0) {
      const h = m.start + s * m.snel * 360;
      p = opRing(h);
      q = opRing(h + Math.sign(m.snel) * 2);
    } else {
      const b = PADEN[m.pad];
      if (!b) continue;
      const f = (m.start + s * m.snel) % 2;
      const terug = f > 1;
      const t = 0.04 + (terug ? 2 - f : f) * 0.92;
      p = opBocht(b, t);
      q = opBocht(b, Math.min(1, Math.max(0, t + (terug ? -0.01 : 0.01))));
    }
    const hoek = Math.atan2(q.y - p.y, q.x - p.x);
    const zij = { x: p.x - Math.sin(hoek) * m.kant, y: p.y + Math.cos(hoek) * m.kant };
    mens(ctx, zij, hoek, m.kleur, m.fiets, m.haar);
  }
}

/** De werkbus van de gemeente, en de werkman als hij aan het werk is. */
function bus(ctx: CanvasRenderingContext2D, b: Bus, nu: number): void {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(1.3, 1.3);
  ctx.rotate(b.hoek);
  schaduw(ctx, 5, 3);
  ctx.fillStyle = '#ffffff';
  rondRechthoek(ctx, -14, -8, 28, 16, 3.5);
  ctx.fill();
  geenSchaduw(ctx);
  // dak met lichtbalk
  const dak = ctx.createLinearGradient(0, -8, 0, 8);
  dak.addColorStop(0, '#ffffff');
  dak.addColorStop(1, '#dfe3e8');
  ctx.fillStyle = dak;
  rondRechthoek(ctx, -12, -6.5, 18, 13, 2);
  ctx.fill();
  ctx.fillStyle = '#ff6a00';
  ctx.fillRect(-14, -8, 28, 2.2);
  ctx.fillRect(-14, 5.8, 28, 2.2);
  // voorruit
  ctx.fillStyle = '#2c4a6e';
  rondRechthoek(ctx, 7, -6, 5, 12, 1.5);
  ctx.fill();
  // zwaailicht
  const aan = nu ? Math.sin(nu / 120) > 0 : true;
  ctx.fillStyle = aan ? '#ffb000' : '#a86a00';
  ctx.beginPath();
  ctx.arc(-3, 0, 2.6, 0, Math.PI * 2);
  ctx.fill();
  if (aan && nu) {
    ctx.fillStyle = 'rgba(255,190,40,0.25)';
    ctx.beginPath();
    ctx.arc(-3, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (b.bij && b.werk > 0) werkman(ctx, b.bij, nu);
}

function werkman(ctx: CanvasRenderingContext2D, p: Punt, nu: number): void {
  const x = p.x - 10;
  const y = p.y + 4;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 1.5, y + 2, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff6a00';
  ctx.beginPath();
  ctx.ellipse(x, y, 4.5, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9ff3a';
  ctx.fillRect(x - 4.5, y - 0.6, 9, 1.2);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(x, y, 2.6, 0, Math.PI * 2);
  ctx.fill();
  // hamer die op en neer gaat
  const slag = Math.sin(nu / 70);
  ctx.save();
  ctx.translate(x + 3, y);
  ctx.rotate(-0.6 + slag * 0.6);
  ctx.strokeStyle = '#7a4b25';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(7, 0);
  ctx.stroke();
  ctx.fillStyle = '#5b6470';
  ctx.fillRect(6, -2, 3, 4);
  ctx.restore();
  if (slag > 0.7) {
    ctx.fillStyle = '#fff6a0';
    for (let i = 0; i < 4; i++) {
      const a = i * 1.6 + nu / 50;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 4, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function teken(
  canvas: HTMLCanvasElement | null,
  l: LevelRegels,
  park: Park,
  b: Bus,
  zwevers: Zwever[],
  flitsen: Flits[],
  nu: number,
  pauze: boolean,
): void {
  const ctx = maakScherp(canvas, BREEDTE, HOOGTE);
  if (!ctx || !canvas) return;
  const r = canvas.width / BREEDTE;
  ctx.drawImage(grond(r), 0, 0, BREEDTE, HOOGTE);
  vijver(ctx, nu);
  const kapot = new Map(park.schades.map((s) => [s.plek.id, s]));
  speeltoestellen(ctx, kapot, l, park.t, nu);
  for (const s of park.schades) schade(ctx, s, l, park.t, nu);
  LANTAARNS.forEach((p, i) => lantaarn(ctx, p, kapot.get(`lamp-${i + 1}`), l, park.t, nu));
  mensen(ctx, nu || 4200);
  bus(ctx, b, nu);
  ctx.drawImage(bomenLaag(r), 0, 0, BREEDTE, HOOGTE);
  // rode flitsen bij een ongeluk
  for (let i = flitsen.length - 1; i >= 0; i--) {
    const f = flitsen[i];
    if (!f) continue;
    const d = (nu - f.begin) / 900;
    if (d >= 1) {
      flitsen.splice(i, 1);
      continue;
    }
    ctx.fillStyle = `rgba(224,32,32,${0.45 * (1 - d)})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 10 + d * 30, 0, Math.PI * 2);
    ctx.fill();
  }
  park.schades.forEach((s, i) => merk(ctx, s, i + 1, b.rij.includes(s.id), l, park.t, nu));

  // zwevende bedragen
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '800 15px Asap, system-ui, sans-serif';
  for (let i = zwevers.length - 1; i >= 0; i--) {
    const z = zwevers[i];
    if (!z) continue;
    const f = (nu - z.begin) / 1400;
    if (f >= 1) {
      zwevers.splice(i, 1);
      continue;
    }
    if (f < 0) continue;
    const x = Math.max(40, Math.min(BREEDTE - 40, z.x));
    ctx.globalAlpha = 1 - f;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(z.tekst, x, z.y - f * 26);
    ctx.fillStyle = z.kleur;
    ctx.fillText(z.tekst, x, z.y - f * 26);
    ctx.globalAlpha = 1;
  }

  if (pauze) {
    ctx.fillStyle = 'rgba(20,40,15,0.45)';
    ctx.fillRect(0, 0, BREEDTE, HOOGTE);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px Asap, system-ui, sans-serif';
    ctx.fillText('Pauze', BREEDTE / 2, HOOGTE / 2 + 10);
  }
}

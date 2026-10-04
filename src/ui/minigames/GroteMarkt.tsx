/**
 * Grote Markt: "Begrotingstetris". Tetris in een marktkraam op de Grote Markt. Elk vallend blok is
 * een uitgave van de gemeente; een volle rij betekent: de begroting sluit. Een eigen keuze kun je
 * schrappen (dan bespaar je het bedrag), wat moet van de wet niet: dat blok valt meteen.
 *
 * Bij minder beweging valt er niets vanzelf en telt de tijd niet: je duwt het blok zelf omlaag en
 * hebt een vast aantal blokken. De regels staan in game/mgTetris.ts.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import {
  BREED,
  HOOG,
  RIJ_PUNTEN,
  RIJEN_PER_LEVEL,
  RUSTIG_BLOKKEN,
  SCHRAP_PUNTEN,
  SCORE_MAX,
  SECONDEN_PER_LEVEL,
  SPEELTIJD,
  beginStand,
  bespaardMln,
  cellen,
  doe,
  landing,
  levelVoor,
  score,
  stapelHoogte,
  tetrisPosten,
  valTijd,
  verdeling,
  vormCellen,
  type Actie,
  type Blok,
  type Bord,
  type Gebeurtenis,
  type Stand,
  type TetrisPost,
} from '../../game/mgTetris';
import { Hud, Meldingen, PauzeKnop, SpelKaart, type Melding } from './kader/kader';
import {
  breekTekst,
  maakScherp,
  mln,
  rondRechthoek,
  useKlok,
  useLus,
  useStil,
  useToetsen,
} from './kader/hulp';
import type { MinigameProps } from './types';
import './GroteMarkt.css';

// Het veld in beeldpunten (het canvas schaalt mee).
const BREEDTE = 400;
const HOOGTE = 520;
const CEL = 26;
const BX = 14; // linkerkant van het bord
const BY = 64; // bovenkant van het bord
const BB = BREED * CEL;
const BH = HOOG * CEL;
const PX = BX + BB + 14; // het paneel rechts
const PB = BREEDTE - PX - 10;
const GROND = BY + BH;

/** Zo lang (ms) knippert een volle rij voordat hij verdwijnt. */
const WIS_MS = 420;

type Fase = 'start' | 'spelen';

type Munt = { x: number; y: number; vx: number; vy: number; r: number };
type Effect =
  | { soort: 'wis'; begin: number; rijen: number[]; bordVoor: Bord }
  | { soort: 'munten'; begin: number; munten: Munt[] }
  | {
      soort: 'tekst';
      begin: number;
      tekst: string;
      x: number;
      y: number;
      kleur: string;
      groot?: boolean;
    }
  | { soort: 'schrap'; begin: number; blok: Blok }
  | { soort: 'wet'; begin: number; blok: Blok };

const duurVan = (e: Effect): number =>
  e.soort === 'wis' ? WIS_MS : e.soort === 'munten' ? 1200 : e.soort === 'tekst' ? 1500 : 900;

export default function GroteMarkt({ data, onKlaar }: MinigameProps) {
  const stil = useStil();
  const posten = useMemo(() => tetrisPosten(data), [data]);
  const [fase, setFase] = useState<Fase>('start');
  const [stand, setStand] = useState<Stand>(() => beginStand(posten));
  const [pauze, setPauze] = useState(false);
  const [tijd, setTijd] = useKlok(SPEELTIJD, fase === 'spelen' && !stil && !pauze && !stand.over);

  const jaar = data.begroting.begrotingsjaar;
  const verstreken = stil ? 0 : SPEELTIJD - tijd;
  const level = levelVoor(stand.rijen, verstreken);
  const over = stand.over ?? (!stil && fase === 'spelen' && tijd <= 0 ? 'tijd' : undefined);
  const bezig = fase === 'spelen' && !over;
  const speelbaar = bezig && !pauze;
  const blok = stand.blok;
  const volgend = stand.rij[0];

  const doek = useRef<HTMLCanvasElement>(null);
  const effecten = useRef<Effect[]>([]);
  const gezien = useRef(0);
  const vorigLevel = useRef(1);
  const tijdTotVal = useRef(0);

  const begin = () => {
    setStand(beginStand(posten, stil ? { maxBlokken: RUSTIG_BLOKKEN } : {}));
    setTijd(SPEELTIJD);
    setPauze(false);
    effecten.current = [];
    gezien.current = 0;
    vorigLevel.current = 1;
    tijdTotVal.current = 0;
    setFase('spelen');
  };

  const doeActie = useCallback(
    (a: Actie) => {
      if (!speelbaar) return;
      setStand((s) => doe(s, a, level));
    },
    [speelbaar, level],
  );

  // ---------------------------------------------------------------------------------------------
  // Effecten bij wat er gebeurt (alleen als er beweging mag zijn)
  // ---------------------------------------------------------------------------------------------

  useEffect(() => {
    const l = stand.laatste;
    if (!l || l.nr === gezien.current) return;
    gezien.current = l.nr;
    if (stil) return;
    const nu = performance.now();
    for (const g of l.lijst) effecten.current.push(...effectenVoor(g, nu));
  }, [stand.laatste, stil]);

  useEffect(() => {
    if (level > vorigLevel.current && !stil && bezig)
      effecten.current.push({
        soort: 'tekst',
        begin: performance.now() + 300,
        tekst: `Level ${level}: sneller!`,
        x: BX + BB / 2,
        y: BY + BH * 0.42,
        kleur: '#ffd84d',
        groot: true,
      });
    vorigLevel.current = level;
  }, [level, stil, bezig]);

  // ---------------------------------------------------------------------------------------------
  // Elk beeld: zwaartekracht en tekenen
  // ---------------------------------------------------------------------------------------------

  useLus(bezig && !stil, (dt, nu) => {
    const wissen = effecten.current.some((e) => e.soort === 'wis' && nu - e.begin < WIS_MS);
    if (!pauze && !wissen) {
      tijdTotVal.current += dt * 1000;
      if (tijdTotVal.current >= valTijd(level)) {
        tijdTotVal.current = 0;
        setStand((s) => doe(s, 'val', level));
      }
    }
    teken(doek.current, { stand, effecten: effecten.current, nu, pauze, jaar });
  });

  // Met minder beweging: alleen opnieuw tekenen als er iets verandert.
  useEffect(() => {
    if (stil && bezig)
      teken(doek.current, { stand, effecten: [], nu: performance.now(), pauze, jaar });
  }, [stil, bezig, stand, pauze, jaar]);

  // ---------------------------------------------------------------------------------------------
  // Bediening: toetsen, knoppen (ingedrukt houden herhaalt) en vegen op het veld
  // ---------------------------------------------------------------------------------------------

  useToetsen(bezig, (e) => {
    const toets: Record<string, Actie> = {
      ArrowLeft: 'links',
      ArrowRight: 'rechts',
      ArrowUp: 'draai',
      x: 'draai',
      X: 'draai',
      ArrowDown: 'zak',
      ' ': 'hard',
      s: 'schrap',
      S: 'schrap',
      Delete: 'schrap',
    };
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      setPauze((p) => !p);
      return;
    }
    const a = toets[e.key];
    if (!a) return;
    e.preventDefault();
    doeActie(a);
  });

  const actieRef = useRef(doeActie);
  useEffect(() => {
    actieRef.current = doeActie;
  });
  const herhaling = useRef(0);
  const stopHerhaal = () => window.clearTimeout(herhaling.current);
  useEffect(() => stopHerhaal, []);
  const startHerhaal = (a: Actie) => {
    stopHerhaal();
    actieRef.current(a);
    if (stil) return;
    const stap = (wacht: number) => {
      herhaling.current = window.setTimeout(() => {
        actieRef.current(a);
        stap(70);
      }, wacht);
    };
    stap(220);
  };
  const houdKnop = (a: Actie) => ({
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      startHerhaal(a);
    },
    onPointerUp: stopHerhaal,
    onPointerLeave: stopHerhaal,
    onPointerCancel: stopHerhaal,
    // met het toetsenbord (Enter of spatie op de knop)
    onClick: (e: MouseEvent) => {
      if (e.detail === 0) doeActie(a);
    },
    onMouseDown: (e: MouseEvent) => e.preventDefault(),
  });

  type Veeg = { x: number; y: number; t: number; kol: number; rij: number; ver: boolean };
  const veeg = useRef<Veeg | null>(null);
  const onVeegBegin = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!speelbaar) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    veeg.current = { x: e.clientX, y: e.clientY, t: performance.now(), kol: 0, rij: 0, ver: false };
  };
  const schaal = (el: HTMLCanvasElement) => BREEDTE / Math.max(1, el.getBoundingClientRect().width);
  const onVeeg = (e: PointerEvent<HTMLCanvasElement>) => {
    const v = veeg.current;
    if (!v) return;
    const f = schaal(e.currentTarget);
    const dx = (e.clientX - v.x) * f;
    const dy = (e.clientY - v.y) * f;
    if (Math.hypot(dx, dy) > 10) v.ver = true;
    const kol = Math.trunc(dx / (CEL * 0.9));
    for (; v.kol < kol; v.kol++) doeActie('rechts');
    for (; v.kol > kol; v.kol--) doeActie('links');
    // omlaag vegen duwt het blok omlaag (niet als je vooral opzij veegt)
    if (Math.abs(dy) > Math.abs(dx)) {
      const rij = Math.trunc(Math.max(0, dy) / CEL);
      for (; v.rij < rij; v.rij++) doeActie('zak');
    }
  };
  const onVeegEind = (e: PointerEvent<HTMLCanvasElement>) => {
    const v = veeg.current;
    veeg.current = null;
    if (!v) return;
    const f = schaal(e.currentTarget);
    const dy = (e.clientY - v.y) * f;
    const dx = (e.clientX - v.x) * f;
    const duur = performance.now() - v.t;
    if (!v.ver && duur < 400) doeActie('draai');
    else if (!stil && dy > 2 * CEL && dy > Math.abs(dx) * 1.5 && dy / Math.max(1, duur) > 0.8)
      doeActie('hard');
  };

  // ---------------------------------------------------------------------------------------------
  // Scherm
  // ---------------------------------------------------------------------------------------------

  const hud = (
    <Hud
      testid="mg-tetris-stand"
      icoon="🧺"
      links={[
        { label: 'Punten', waarde: stand.punten, testid: 'mg-tetris-punten' },
        { label: 'Rijen', waarde: stand.rijen },
      ]}
      rechts={[
        stil
          ? {
              label: 'Blok',
              waarde: `${Math.min(stand.blokken + 1, RUSTIG_BLOKKEN)} van ${RUSTIG_BLOKKEN}`,
            }
          : {
              label: 'Tijd',
              waarde: `${Math.floor(tijd / 60)}:${String(tijd % 60).padStart(2, '0')}`,
              ...(tijd <= 10 ? { toon: 'fout' as const } : {}),
            },
        { label: 'Level', waarde: level },
      ]}
    />
  );

  if (fase === 'start')
    return (
      <div className="mg-kader mg-tetris">
        <SpelKaart titel="Begrotingstetris" knop={{ tekst: 'Start', onClick: begin }}>
          <p>
            Op de Grote Markt vallen de uitgaven van de gemeente naar beneden. Leg ze netjes neer.
            Is een rij vol? Dan <strong>sluit de begroting</strong> en krijg je punten.
          </p>
          <ul className="klein">
            <li>
              <Krat soort="wet" /> <strong>Blauw: moet van de wet.</strong> Die kun je niet
              schrappen. Probeer je het toch, dan valt het blok meteen naar beneden.
            </li>
            <li>
              <Krat soort="keuze" /> <strong>Oranje: een eigen keuze</strong> van de gemeente. Met{' '}
              <strong>✂ Schrappen</strong> haal je het blok weg en bespaar je het bedrag.
            </li>
            <li>
              {stil
                ? `Je krijgt ${RUSTIG_BLOKKEN} blokken. Ze vallen niet vanzelf: duw ze omlaag met ▼ of laat ze vallen met ⤓.`
                : `Je hebt ${SPEELTIJD / 60} minuten. Elke ${RIJEN_PER_LEVEL} rijen of ${SECONDEN_PER_LEVEL} seconden gaat het sneller.`}
            </li>
          </ul>
          <p className="klein">
            Toetsen: ← → schuiven, ↑ draaien, ↓ omlaag, spatie laten vallen, S schrappen
            {stil ? '' : ', P pauze'}. Op een telefoon: tik op het veld om te draaien, veeg om te
            schuiven.
          </p>
          <p className="klein">
            Spelregels: een rij is {RIJ_PUNTEN[1]} punten keer het level (meer rijen tegelijk geeft
            meer), schrappen {SCHRAP_PUNTEN} punten. De bedragen komen uit de begroting {jaar}.
          </p>
        </SpelKaart>
      </div>
    );

  if (over)
    return (
      <div className="mg-kader mg-tetris">
        {hud}
        <Einde
          stand={stand}
          over={over}
          posten={posten}
          jaar={jaar}
          onKlaar={() => onKlaar(score(stand), SCORE_MAX)}
        />
      </div>
    );

  const plek = blok ? cellen(blok) : [];
  const kolommen = plek.map((c) => c.x + 1);
  const melding = meldingVan(stand.laatste);

  return (
    <div className="mg-kader mg-tetris">
      {hud}
      {blok && <NuBlok post={blok.post} />}
      <canvas
        ref={doek}
        className="mg-veld mg-tetris-veld"
        width={BREEDTE}
        height={HOOGTE}
        role="img"
        aria-label={`Het bord. ${
          blok
            ? `Vallend blok: ${blok.post.naam} (${blok.post.soort === 'wet' ? 'moet van de wet' : 'eigen keuze'}), kolom ${Math.min(...kolommen)} tot ${Math.max(...kolommen)}, ${Math.max(0, Math.min(...plek.map((c) => c.y)))} rijen van boven.`
            : ''
        } De stapel is ${stapelHoogte(stand.bord)} van de ${HOOG} rijen hoog.${
          volgend ? ` Volgende: ${volgend.post.naam}.` : ''
        }${pauze ? ' Pauze.' : ''}`}
        onPointerDown={onVeegBegin}
        onPointerMove={onVeeg}
        onPointerUp={onVeegEind}
        onPointerCancel={() => (veeg.current = null)}
      />
      <div className="mg-tetris-pad">
        <button
          type="button"
          className="knop"
          aria-label="Naar links"
          title="Naar links (←)"
          disabled={pauze}
          {...houdKnop('links')}
        >
          ◀
        </button>
        <button
          type="button"
          className="knop"
          aria-label="Naar rechts"
          title="Naar rechts (→)"
          disabled={pauze}
          {...houdKnop('rechts')}
        >
          ▶
        </button>
        <button
          type="button"
          className="knop"
          aria-label="Draaien"
          title="Draaien (↑)"
          disabled={pauze}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => doeActie('draai')}
        >
          ⟳
        </button>
        <button
          type="button"
          className="knop"
          aria-label="Omlaag"
          title="Omlaag (↓)"
          disabled={pauze}
          {...houdKnop('zak')}
        >
          ▼
        </button>
        <button
          type="button"
          className="knop"
          aria-label="Laten vallen"
          title="Laten vallen (spatie)"
          disabled={pauze}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => doeActie('hard')}
        >
          ⤓
        </button>
      </div>
      <div className="mg-knoppen">
        <button
          type="button"
          className="knop-indienen mg-grote-knop mg-tetris-schrap"
          disabled={pauze}
          title="Schrappen (S)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => doeActie('schrap')}
        >
          ✂ Schrappen
        </button>
        {!stil && <PauzeKnop pauze={pauze} onWissel={() => setPauze((p) => !p)} />}
      </div>
      <Meldingen {...(melding ? { melding } : {})}>
        {stand.geschrapt.length > 0 && (
          <p className="klein mg-tetris-bespaard">
            Bespaard: <strong>{mln(bespaardMln(stand))}</strong> per jaar
          </p>
        )}
      </Meldingen>
    </div>
  );
}

/** Een klein krat in de kleur van de soort, voor in de tekst. */
function Krat({ soort }: { soort: 'wet' | 'keuze' }) {
  return (
    <span className={`mg-tetris-krat mg-tetris-krat-${soort}`} aria-hidden="true">
      {soort === 'wet' ? '§' : '€'}
    </span>
  );
}

/** Welke post er nu valt: de naam, het bedrag, wet of keuze, en de uitleg. */
function NuBlok({ post }: { post: TetrisPost }) {
  return (
    <div className="mg-strook mg-tetris-nu" data-testid="mg-tetris-nu" data-soort={post.soort}>
      <Krat soort={post.soort} />
      <div>
        <strong>{post.naam}</strong> <span className="mg-tetris-bedrag">{mln(post.bedragMln)}</span>
        <span className={`mg-tetris-soort mg-tetris-soort-${post.soort}`}>
          {post.soort === 'wet' ? `Moet van de wet (${post.wet})` : 'Eigen keuze: kun je schrappen'}
        </span>
        <span className="mg-tetris-uitleg">{post.uitleg}</span>
      </div>
    </div>
  );
}

function meldingVan(l: Stand['laatste']): Melding | undefined {
  if (!l) return undefined;
  const wet = l.lijst.find((g) => g.soort === 'wet');
  const weg = l.lijst.find((g) => g.soort === 'geschrapt');
  const rijen = l.lijst.find((g) => g.soort === 'rijen');
  const vol = l.lijst.some((g) => g.soort === 'vol');
  const rijTekst = rijen
    ? `De begroting sluit! ${rijen.rijen.length === 1 ? 'Een rij' : `${rijen.rijen.length} rijen`} vol: +${rijen.punten} punten.`
    : '';
  if (wet)
    return {
      tekst: `§ Moet van de wet (${wet.post.wet}): ${wet.post.naam} kun je niet schrappen. Het blok valt meteen naar beneden.${rijTekst ? ` ${rijTekst}` : ''}`,
      toon: 'fout',
      tijd: l.nr,
    };
  if (weg)
    return {
      tekst: `✂ ${weg.post.naam} geschrapt: een eigen keuze van de gemeente. Bespaard: ${mln(weg.post.bedragMln)} per jaar. +${weg.punten} punten.`,
      toon: 'goed',
      tijd: l.nr,
    };
  if (vol) return { tekst: 'De begroting loopt over!', toon: 'fout', tijd: l.nr };
  if (rijen) return { tekst: rijTekst, toon: 'goed', tijd: l.nr };
  return undefined;
}

/** De eindkaart: punten, rijen, wat je schrapte en wat niet kon. */
function Einde({
  stand,
  over,
  posten,
  jaar,
  onKlaar,
}: {
  stand: Stand;
  over: 'vol' | 'blokken' | 'tijd';
  posten: TetrisPost[];
  jaar: number;
  onKlaar: () => void;
}) {
  const v = verdeling(posten);
  const pogingen = [...new Map(stand.wetPogingen.map((p) => [p.id, p])).values()];
  return (
    <SpelKaart
      testid="mg-tetris-einde"
      status
      titel={
        over === 'vol'
          ? 'De begroting loopt over!'
          : over === 'tijd'
            ? 'De tijd is op'
            : 'Alle blokken zijn geweest'
      }
      knop={{ tekst: 'Naar de uitslag', onClick: onKlaar }}
    >
      <p>
        Je haalde <strong>{stand.punten} punten</strong>. De begroting sloot{' '}
        <strong>
          {stand.rijen} {stand.rijen === 1 ? 'keer' : 'keer'}
        </strong>{' '}
        (volle rijen).
      </p>
      {stand.geschrapt.length > 0 ? (
        <>
          <p>
            Je schrapte {stand.geschrapt.length}{' '}
            {stand.geschrapt.length === 1 ? 'eigen keuze' : 'eigen keuzes'}. Bespaard:{' '}
            <strong>{mln(bespaardMln(stand))}</strong> per jaar.
          </p>
          <ul className="mg-lijst" data-testid="mg-tetris-geschrapt">
            {stand.geschrapt.map((p, i) => (
              <li key={`${p.id}-${i}`}>
                <strong>
                  {p.naam}: {mln(p.bedragMln)}
                </strong>{' '}
                <span className="klein">{p.uitleg}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Je schrapte niets.</p>
      )}
      {pogingen.length > 0 && (
        <>
          <p>Deze wettelijke taken probeerde je te schrappen. Dat kan niet:</p>
          <ul className="mg-lijst" data-testid="mg-tetris-wet">
            {pogingen.map((p) => (
              <li key={p.id}>
                <strong>{p.naam}</strong> <span className="klein">moet van de {p.wet}.</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <h4>Wat leer je hiervan?</h4>
      <p>
        Van de {posten.length} uitgaven in dit spel moeten er <strong>{v.wet.aantal}</strong> van de
        wet: samen <strong>{mln(v.wet.mln)}</strong> per jaar. Er zijn {v.keuze.aantal} eigen keuzes
        van de gemeente: samen <strong>{mln(v.keuze.mln)}</strong>. Schrappen kan dus alleen in het
        kleinere deel. Wel kiest de gemeente vaak zelf hoe ze een wettelijke taak uitvoert.
      </p>
      <p className="klein">
        Bedragen: de begroting {jaar} van de gemeente Groningen, per jaar. Spelregels: een rij is{' '}
        {RIJ_PUNTEN[1]} punten keer het level, schrappen {SCHRAP_PUNTEN} punten. Je score is je
        punten, tot {SCORE_MAX}. ⚠︎ In het spel scheelt schrappen meteen het hele bedrag; in het echt
        gaat dat vaak stap voor stap.
      </p>
    </SpelKaart>
  );
}

// -------------------------------------------------------------------------------------------------
// Effecten
// -------------------------------------------------------------------------------------------------

function midden(b: Blok): { x: number; y: number } {
  const c = cellen(b);
  const x = c.reduce((s, p) => s + p.x, 0) / c.length;
  const y = c.reduce((s, p) => s + p.y, 0) / c.length;
  return { x: BX + (x + 0.5) * CEL, y: BY + (y + 0.5) * CEL };
}

function effectenVoor(g: Gebeurtenis, nu: number): Effect[] {
  if (g.soort === 'rijen') {
    const munten: Munt[] = [];
    for (const r of g.rijen)
      for (let i = 0; i < 7; i++)
        munten.push({
          x: BX + (i + 0.5 + Math.random() * 0.6) * (BB / 7.3),
          y: BY + (r + 0.5) * CEL,
          vx: (Math.random() - 0.5) * 160,
          vy: -140 - Math.random() * 160,
          r: 5 + Math.random() * 3,
        });
    const y = BY + (Math.min(...g.rijen) + 0.5) * CEL;
    return [
      { soort: 'wis', begin: nu, rijen: g.rijen, bordVoor: g.bordVoor },
      { soort: 'munten', begin: nu + WIS_MS * 0.5, munten },
      {
        soort: 'tekst',
        begin: nu,
        tekst: 'De begroting sluit!',
        x: BX + BB / 2,
        y: y - 4,
        kleur: '#ffd84d',
        groot: true,
      },
      {
        soort: 'tekst',
        begin: nu + 150,
        tekst: `+${g.punten}`,
        x: BX + BB / 2,
        y: y + 22,
        kleur: '#7dffb5',
      },
    ];
  }
  if (g.soort === 'geschrapt') {
    const m = midden(g.blok);
    return [
      { soort: 'schrap', begin: nu, blok: g.blok },
      {
        soort: 'tekst',
        begin: nu + 100,
        tekst: `Bespaard ${mln(g.post.bedragMln)}`,
        x: m.x,
        y: m.y,
        kleur: '#7dffb5',
      },
    ];
  }
  if (g.soort === 'wet') {
    const m = midden(g.blok);
    return [
      { soort: 'wet', begin: nu, blok: g.blok },
      {
        soort: 'tekst',
        begin: nu,
        tekst: '§ Moet van de wet',
        x: m.x,
        y: m.y - 20,
        kleur: '#ff8f80',
      },
    ];
  }
  return [];
}

// -------------------------------------------------------------------------------------------------
// Tekenen
// -------------------------------------------------------------------------------------------------

const KLEUR = {
  wet: { licht: '#8aa4ff', midden: '#3d60f2', donker: '#1d3cc0', rand: '#0c1f7a', teken: '§' },
  keuze: { licht: '#ffc27a', midden: '#ff7d1a', donker: '#d45200', rand: '#7f3000', teken: '€' },
} as const;
const LETTER = 'Asap, system-ui, sans-serif';

/** Een krat: een vakje van een blok, in de kleur van de soort, met § of €. */
function krat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  soort: 'wet' | 'keuze',
): void {
  const k = KLEUR[soort];
  const g = ctx.createLinearGradient(x, y, x + s * 0.6, y + s);
  g.addColorStop(0, k.licht);
  g.addColorStop(0.45, k.midden);
  g.addColorStop(1, k.donker);
  rondRechthoek(ctx, x + 1, y + 1, s - 2, s - 2, s * 0.16);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = k.rand;
  ctx.stroke();
  // de planken van het krat
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  rondRechthoek(ctx, x + s * 0.17, y + s * 0.17, s * 0.66, s * 0.66, s * 0.08);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(x + s * 0.14, y + 2.2, s * 0.72, Math.max(1, s * 0.07));
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + s * 0.14, y + s - 3.6, s * 0.72, Math.max(1, s * 0.07));
  // spijkertjes
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const [a, b] of [
    [0.17, 0.17],
    [0.83, 0.17],
    [0.17, 0.83],
    [0.83, 0.83],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x + s * a, y + s * b, Math.max(0.7, s * 0.035), 0, Math.PI * 2);
    ctx.fill();
  }
  if (s >= 14) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `800 ${Math.round(s * 0.48)}px ${LETTER}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(k.teken, x + s / 2, y + s / 2 + 1);
  }
}

/** De achtergrond: lucht, de Martinitoren, gevels, kinderkopjes en de kraam. Eén keer gemaakt. */
let achtergrondBeeld: HTMLCanvasElement | undefined;
function achtergrond(): HTMLCanvasElement {
  if (achtergrondBeeld) return achtergrondBeeld;
  const c = document.createElement('canvas');
  c.width = BREEDTE * 2;
  c.height = HOOGTE * 2;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.scale(2, 2);

  // lucht
  const lucht = ctx.createLinearGradient(0, 0, 0, HOOGTE);
  lucht.addColorStop(0, '#6fb8f0');
  lucht.addColorStop(0.55, '#bfe2fa');
  lucht.addColorStop(1, '#f6ead2');
  ctx.fillStyle = lucht;
  ctx.fillRect(0, 0, BREEDTE, HOOGTE);
  const zon = ctx.createRadialGradient(370, 30, 4, 370, 30, 90);
  zon.addColorStop(0, 'rgba(255,250,220,0.95)');
  zon.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = zon;
  ctx.fillRect(250, 0, 150, 140);
  // wolken
  const wolk = (x: number, y: number, s: number) => {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [dx, dy, r] of [
      [0, 0, 1],
      [0.9, -0.35, 0.8],
      [1.7, 0, 0.9],
      [0.8, 0.25, 0.9],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(x + dx * s, y + dy * s, r * s, r * s * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  wolk(300, 250, 11);
  wolk(20, 18, 9);
  wolk(330, 330, 7);

  // gevels van de Grote Markt rond de toren
  const gevel = (
    x: number,
    b: number,
    h: number,
    kleur: string,
    soort: 'trap' | 'klok' | 'plat',
  ) => {
    const y = GROND - h;
    ctx.fillStyle = kleur;
    ctx.beginPath();
    ctx.moveTo(x, GROND);
    ctx.lineTo(x, y);
    if (soort === 'trap') {
      const t = b / 6;
      for (let i = 0; i < 3; i++) {
        ctx.lineTo(x + t * i, y - t * i);
        ctx.lineTo(x + t * (i + 1), y - t * i);
      }
      ctx.lineTo(x + b / 2, y - t * 3.4);
      for (let i = 2; i >= 0; i--) {
        ctx.lineTo(x + b - t * (i + 1), y - t * i);
        ctx.lineTo(x + b - t * i, y - t * i);
      }
    } else if (soort === 'klok') {
      ctx.lineTo(x + b * 0.2, y);
      ctx.quadraticCurveTo(x + b * 0.2, y - b * 0.5, x + b / 2, y - b * 0.55);
      ctx.quadraticCurveTo(x + b * 0.8, y - b * 0.5, x + b * 0.8, y);
    }
    ctx.lineTo(x + b, y);
    ctx.lineTo(x + b, GROND);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(x + b - 3, y, 3, h);
    // ramen
    for (let ry = y + 8; ry < GROND - 22; ry += 20)
      for (let rx = x + 5; rx + 6 < x + b - 3; rx += 11) {
        ctx.fillStyle = '#f8f4ea';
        ctx.fillRect(rx, ry, 7, 11);
        ctx.fillStyle = '#5d7d9c';
        ctx.fillRect(rx + 1, ry + 1, 5, 9);
        ctx.fillStyle = '#f8f4ea';
        ctx.fillRect(rx + 3, ry + 1, 1, 9);
      }
    // deur
    ctx.fillStyle = '#5a3820';
    ctx.fillRect(x + b / 2 - 4, GROND - 16, 8, 16);
  };
  gevel(PX - 6, 34, 104, '#b4533a', 'trap');
  gevel(PX + 78, 34, 120, '#e8d9b5', 'klok');
  gevel(PX + 28, 54, 70, '#c98f5a', 'plat');

  // de Martinitoren
  const tx = PX + 54;
  const delen = [
    { b: 34, h: 70, kleur: '#a88664' },
    { b: 30, h: 46, kleur: '#b39070' },
    { b: 25, h: 36, kleur: '#bb9878' },
    { b: 19, h: 26, kleur: '#c4a284' },
    { b: 13, h: 20, kleur: '#cdad8f' },
  ];
  let ty = GROND - 40;
  delen.forEach((d, i) => {
    const y = ty - d.h;
    const g = ctx.createLinearGradient(tx - d.b / 2, 0, tx + d.b / 2, 0);
    g.addColorStop(0, d.kleur);
    g.addColorStop(0.6, d.kleur);
    g.addColorStop(1, '#7d5f44');
    ctx.fillStyle = g;
    ctx.fillRect(tx - d.b / 2, y, d.b, d.h);
    // rand en pinakels
    ctx.fillStyle = '#e6d3b5';
    ctx.fillRect(tx - d.b / 2 - 2, y - 2, d.b + 4, 3);
    ctx.fillStyle = '#8a6a4c';
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(tx + k * (d.b / 2) - 2, y - 2);
      ctx.lineTo(tx + k * (d.b / 2), y - 9);
      ctx.lineTo(tx + k * (d.b / 2) + 2, y - 2);
      ctx.fill();
    }
    // spitsboogramen
    ctx.fillStyle = i === 2 ? '#2e2a33' : '#4f4650';
    const rb = Math.max(3, d.b * 0.16);
    for (const k of i < 3 ? [-0.22, 0.22] : [0]) {
      const rx = tx + k * d.b - rb / 2;
      const ry = y + d.h * 0.25;
      const rh = d.h * 0.55;
      ctx.beginPath();
      ctx.moveTo(rx, ry + rh);
      ctx.lineTo(rx, ry + rb / 2);
      ctx.quadraticCurveTo(rx + rb / 2, ry - rb / 2, rx + rb, ry + rb / 2);
      ctx.lineTo(rx + rb, ry + rh);
      ctx.fill();
    }
    if (i === 1) {
      // de klok
      ctx.fillStyle = '#f7f1e3';
      ctx.beginPath();
      ctx.arc(tx, y + d.h * 0.42, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = '#2b2b2b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tx, y + d.h * 0.42);
      ctx.lineTo(tx, y + d.h * 0.42 - 5);
      ctx.moveTo(tx, y + d.h * 0.42);
      ctx.lineTo(tx + 3.5, y + d.h * 0.42 + 1);
      ctx.stroke();
    }
    ty = y;
  });
  // koepeltje en windvaan
  ctx.fillStyle = '#4d6b5e';
  ctx.beginPath();
  ctx.ellipse(tx, ty - 3, 7, 7, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(tx - 0.8, ty - 22, 1.6, 14);
  ctx.beginPath();
  ctx.arc(tx, ty - 12, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tx, ty - 22);
  ctx.lineTo(tx + 8, ty - 19);
  ctx.lineTo(tx, ty - 17);
  ctx.fill();
  // de voet van de toren
  ctx.fillStyle = '#9b7a5a';
  ctx.fillRect(tx - 19, GROND - 40, 38, 40);
  ctx.fillStyle = '#3c2c22';
  ctx.beginPath();
  ctx.moveTo(tx - 6, GROND);
  ctx.lineTo(tx - 6, GROND - 14);
  ctx.quadraticCurveTo(tx, GROND - 22, tx + 6, GROND - 14);
  ctx.lineTo(tx + 6, GROND);
  ctx.fill();

  // kinderkopjes
  ctx.fillStyle = '#8e8478';
  ctx.fillRect(0, GROND, BREEDTE, HOOGTE - GROND);
  for (let y = GROND + 2; y < HOOGTE; y += 5)
    for (let x = ((y / 5) % 2) * 4 - 4; x < BREEDTE; x += 8) {
      ctx.fillStyle = (x * 7 + y) % 3 ? '#a59a8c' : '#b5ab9c';
      rondRechthoek(ctx, x, y, 7, 4, 2);
      ctx.fill();
    }

  // de kraam: palen, de achterwand (het bord) en de luifel
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(BX - 4, GROND - 2, BB + 8, 6);
  for (const x of [BX - 7, BX + BB + 1]) {
    const hout = ctx.createLinearGradient(x, 0, x + 6, 0);
    hout.addColorStop(0, '#9a6235');
    hout.addColorStop(1, '#5e3a1c');
    ctx.fillStyle = hout;
    ctx.fillRect(x, 36, 6, GROND - 34);
  }
  const wand = ctx.createLinearGradient(0, BY, 0, GROND);
  wand.addColorStop(0, '#3b2a20');
  wand.addColorStop(1, '#1e1510');
  ctx.fillStyle = wand;
  ctx.fillRect(BX, BY, BB, BH);
  // de planken van de achterwand, met nerf
  for (let i = 0; i < BREED / 2; i++) {
    const x = BX + i * CEL * 2;
    ctx.fillStyle = i % 2 ? 'rgba(255,220,180,0.035)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, BY, CEL * 2, BH);
    ctx.strokeStyle = 'rgba(255,225,190,0.035)';
    ctx.lineWidth = 1;
    for (let n = 0; n < 3; n++) {
      ctx.beginPath();
      const nx = x + 9 + n * 15 + ((i * 7) % 5);
      ctx.moveTo(nx, BY);
      for (let y = BY; y <= GROND; y += 20) ctx.lineTo(nx + Math.sin(y / 37 + i + n) * 2, y);
      ctx.stroke();
    }
  }
  // rasterlijnen
  ctx.strokeStyle = 'rgba(255,235,210,0.07)';
  ctx.lineWidth = 1;
  for (let i = 1; i < BREED; i++) {
    ctx.beginPath();
    ctx.moveTo(BX + i * CEL + 0.5, BY);
    ctx.lineTo(BX + i * CEL + 0.5, GROND);
    ctx.stroke();
  }
  for (let i = 1; i < HOOG; i++) {
    ctx.beginPath();
    ctx.moveTo(BX, BY + i * CEL + 0.5);
    ctx.lineTo(BX + BB, BY + i * CEL + 0.5);
    ctx.stroke();
  }
  // luifel met rood-witte banen en een geschulpte rand
  const lx = BX - 12;
  const lb = BB + 24;
  const baan = lb / 12;
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? '#fbf3e4' : '#d6362b';
    ctx.beginPath();
    ctx.moveTo(lx + 6 + i * ((lb - 12) / 12), 26);
    ctx.lineTo(lx + 6 + (i + 1) * ((lb - 12) / 12), 26);
    ctx.lineTo(lx + (i + 1) * baan, 58);
    ctx.lineTo(lx + i * baan, 58);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx + (i + 0.5) * baan, 58, baan / 2, 0, Math.PI);
    ctx.fill();
  }
  const schaduw = ctx.createLinearGradient(0, 26, 0, 66);
  schaduw.addColorStop(0, 'rgba(255,255,255,0.18)');
  schaduw.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = schaduw;
  ctx.fillRect(lx, 26, lb, 32);
  ctx.fillStyle = '#7a4a24';
  ctx.fillRect(lx + 2, 22, lb - 4, 5);
  // schaduw van de luifel op de achterwand
  const onder = ctx.createLinearGradient(0, BY, 0, BY + 18);
  onder.addColorStop(0, 'rgba(0,0,0,0.35)');
  onder.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = onder;
  ctx.fillRect(BX, BY, BB, 18);

  achtergrondBeeld = c;
  return c;
}

/** Het etiket bij het vallende blok: naam en bedrag. */
function etiket(ctx: CanvasRenderingContext2D, b: Blok): void {
  const c = cellen(b);
  const links = Math.min(...c.map((p) => p.x));
  const rechts = Math.max(...c.map((p) => p.x)) + 1;
  const boven = Math.min(...c.map((p) => p.y));
  const cx = BX + ((links + rechts) / 2) * CEL;
  const top = BY + boven * CEL;
  ctx.font = `700 13px ${LETTER}`;
  const bedrag = ` · ${mln(b.post.bedragMln)}`;
  const ruimte = 250 - ctx.measureText(bedrag).width;
  let naam = b.post.naam;
  if (ctx.measureText(naam).width > ruimte) {
    while (naam.length > 4 && ctx.measureText(`${naam}…`).width > ruimte) naam = naam.slice(0, -1);
    naam = `${naam.trimEnd()}…`;
  }
  const tekst = `${naam}${bedrag}`;
  const w = ctx.measureText(tekst).width + 34;
  const h = 22;
  const x = Math.max(4, Math.min(BREEDTE - 4 - w, cx - w / 2));
  const y = Math.max(2, top - h - 7);
  const k = KLEUR[b.post.soort];
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  rondRechthoek(ctx, x, y, w, h, 11);
  ctx.fillStyle = 'rgba(255,253,247,0.97)';
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = k.midden;
  ctx.lineWidth = 2;
  rondRechthoek(ctx, x, y, w, h, 11);
  ctx.stroke();
  // het puntje naar het blok
  ctx.fillStyle = k.midden;
  const px = Math.max(x + 12, Math.min(x + w - 12, cx));
  ctx.beginPath();
  ctx.moveTo(px - 6, y + h);
  ctx.lineTo(px, y + h + 6);
  ctx.lineTo(px + 6, y + h);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 12, y + h / 2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `800 11px ${LETTER}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(k.teken, x + 12, y + h / 2 + 0.5);
  ctx.fillStyle = '#1f1a14';
  ctx.font = `700 13px ${LETTER}`;
  ctx.textAlign = 'left';
  ctx.fillText(tekst, x + 25, y + h / 2 + 0.5);
}

/** Een kaartje in het paneel rechts. */
function kaartje(ctx: CanvasRenderingContext2D, y: number, h: number, titel: string): void {
  ctx.save();
  ctx.shadowColor = 'rgba(40,20,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  rondRechthoek(ctx, PX, y, PB, h, 9);
  ctx.fillStyle = 'rgba(255,250,240,0.96)';
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 2;
  rondRechthoek(ctx, PX, y, PB, h, 9);
  ctx.stroke();
  ctx.fillStyle = '#6b4219';
  ctx.font = `800 10px ${LETTER}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(titel.toUpperCase(), PX + PB / 2, y + 7);
}

function teken(
  canvas: HTMLCanvasElement | null,
  o: { stand: Stand; effecten: Effect[]; nu: number; pauze: boolean; jaar: number },
): void {
  const ctx = maakScherp(canvas, BREEDTE, HOOGTE);
  if (!ctx) return;
  const { stand, nu } = o;
  // effecten die voorbij zijn, gaan weg
  for (let i = o.effecten.length - 1; i >= 0; i--) {
    const e = o.effecten[i];
    if (e && nu - e.begin > duurVan(e)) o.effecten.splice(i, 1);
  }
  ctx.drawImage(achtergrond(), 0, 0, BREEDTE, HOOGTE);

  // het bordje op de luifel
  ctx.fillStyle = '#fff8e6';
  rondRechthoek(ctx, BX + BB / 2 - 62, 4, 124, 18, 4);
  ctx.fill();
  ctx.strokeStyle = '#7a4a24';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#7a4a24';
  ctx.font = `800 11px ${LETTER}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`BEGROTING ${o.jaar}`, BX + BB / 2, 13.5);

  // trillen als je een wettelijke taak probeerde te schrappen
  const wet = o.effecten.find((e) => e.soort === 'wet');
  const tril = wet ? Math.max(0, 1 - (nu - wet.begin) / 320) : 0;
  ctx.save();
  if (tril > 0) ctx.translate(Math.sin(nu / 18) * 5 * tril, 0);
  ctx.beginPath();
  ctx.rect(BX, BY - 40, BB, BH + 40);
  ctx.clip();

  const wis = o.effecten.find(
    (e): e is Extract<Effect, { soort: 'wis' }> => e.soort === 'wis' && nu - e.begin < WIS_MS,
  );
  const bord = wis ? wis.bordVoor : stand.bord;
  bord.forEach((rij, y) => {
    const f = wis?.rijen.includes(y) ? (nu - wis.begin) / WIS_MS : 0;
    rij.forEach((cel, x) => {
      if (!cel) return;
      if (f > 0) {
        // de krat krimpt naar het midden van de rij
        const s = CEL * (1 - f * 0.8);
        krat(ctx, BX + x * CEL + (CEL - s) / 2, BY + y * CEL + (CEL - s) / 2, s, cel.soort);
      } else krat(ctx, BX + x * CEL, BY + y * CEL, CEL, cel.soort);
    });
    if (wis?.rijen.includes(y)) {
      const f2 = (nu - wis.begin) / WIS_MS;
      ctx.fillStyle = `rgba(255,236,150,${0.75 * (1 - f2) * (0.6 + 0.4 * Math.sin(nu / 25))})`;
      ctx.fillRect(BX, BY + y * CEL, BB, CEL);
    }
  });

  const b = stand.blok;
  if (b) {
    // waar het blok landt
    const doel = landing(stand.bord, b);
    if (doel.y !== b.y) {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1.5;
      for (const p of cellen(doel)) {
        rondRechthoek(ctx, BX + p.x * CEL + 2.5, BY + p.y * CEL + 2.5, CEL - 5, CEL - 5, 4);
        ctx.fill();
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    for (const p of cellen(b)) krat(ctx, BX + p.x * CEL, BY + p.y * CEL, CEL, b.post.soort);
    ctx.restore();
  }

  // een geschrapt blok verdwijnt met een stempel
  for (const e of o.effecten) {
    if (e.soort !== 'schrap') continue;
    const f = Math.min(1, (nu - e.begin) / duurVan(e));
    const m = midden(e.blok);
    ctx.save();
    ctx.globalAlpha = 1 - f;
    ctx.translate(m.x, m.y - f * 30);
    ctx.rotate(f * 0.5);
    ctx.scale(1 - f * 0.6, 1 - f * 0.6);
    for (const p of cellen(e.blok))
      krat(ctx, BX + p.x * CEL - m.x, BY + p.y * CEL - m.y, CEL, e.blok.post.soort);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = Math.min(1, 2.2 * (1 - f));
    ctx.translate(m.x, m.y);
    ctx.rotate(-0.2);
    const sch = 1 + Math.max(0, 0.5 - f * 3);
    ctx.scale(sch, sch);
    ctx.strokeStyle = '#d11f1f';
    ctx.lineWidth = 3;
    rondRechthoek(ctx, -52, -14, 104, 28, 5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
    ctx.fillStyle = '#d11f1f';
    ctx.font = `900 16px ${LETTER}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GESCHRAPT', 0, 1);
    ctx.restore();
  }

  // een wettelijke taak: rood knipperen
  if (wet) {
    const f = Math.min(1, (nu - wet.begin) / duurVan(wet));
    ctx.strokeStyle = `rgba(255,70,50,${(1 - f) * (0.6 + 0.4 * Math.sin(nu / 40))})`;
    ctx.lineWidth = 3;
    for (const p of cellen(wet.blok)) {
      rondRechthoek(ctx, BX + p.x * CEL + 1, BY + p.y * CEL + 1, CEL - 2, CEL - 2, 4);
      ctx.stroke();
    }
  }
  ctx.restore();

  // munten die opspringen als de begroting sluit
  for (const e of o.effecten) {
    if (e.soort !== 'munten') continue;
    const t = (nu - e.begin) / 1000;
    if (t < 0) continue;
    ctx.globalAlpha = Math.max(0, 1 - t / 1.2);
    for (const m of e.munten) {
      const x = m.x + m.vx * t;
      const y = m.y + m.vy * t + 380 * t * t;
      const breed = Math.abs(Math.cos(t * 9 + m.x));
      const g = ctx.createRadialGradient(x - m.r * 0.3, y - m.r * 0.3, 1, x, y, m.r);
      g.addColorStop(0, '#fff6b0');
      g.addColorStop(0.6, '#f2b705');
      g.addColorStop(1, '#a26d00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, m.r * Math.max(0.25, breed), m.r, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (b) etiket(ctx, b);

  // zwevende teksten
  for (const e of o.effecten) {
    if (e.soort !== 'tekst') continue;
    const f = (nu - e.begin) / duurVan(e);
    if (f < 0) continue;
    const groot = e.groot ? 22 : 17;
    const sch = e.groot ? 1 + Math.max(0, 0.35 - f * 2) : 1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - f) * 2.5);
    ctx.translate(e.x, e.y - f * 26);
    ctx.scale(sch, sch);
    ctx.font = `900 ${groot}px ${LETTER}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(20,16,40,0.85)';
    ctx.strokeText(e.tekst, 0, 0);
    ctx.fillStyle = e.kleur;
    ctx.fillText(e.tekst, 0, 0);
    ctx.restore();
  }

  // het paneel: het volgende blok en wat je bespaarde
  kaartje(ctx, BY, 124, 'Volgende');
  const v = stand.rij[0];
  if (v) {
    const c = vormCellen(v.vorm, 0);
    const s = 15;
    const bx = Math.max(...c.map((p) => p.x)) + 1;
    const minY = Math.min(...c.map((p) => p.y));
    const by = Math.max(...c.map((p) => p.y)) + 1 - minY;
    const ox = PX + PB / 2 - (bx * s) / 2;
    const oy = BY + 22 + (32 - by * s) / 2;
    for (const p of c) krat(ctx, ox + p.x * s, oy + (p.y - minY) * s, s, v.post.soort);
    ctx.fillStyle = '#2b1a08';
    ctx.font = `700 11px ${LETTER}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const regels = breekTekst(ctx, v.post.naam, PB - 10);
    const toon = regels.slice(0, 3);
    if (regels.length > 3) toon[2] = `${toon[2] ?? ''}…`;
    toon.forEach((r, i) => ctx.fillText(r, PX + PB / 2, BY + 60 + i * 13));
    ctx.fillStyle = KLEUR[v.post.soort].donker;
    ctx.font = `800 11px ${LETTER}`;
    ctx.fillText(mln(v.post.bedragMln), PX + PB / 2, BY + 62 + toon.length * 13);
  }
  kaartje(ctx, BY + 134, 50, 'Bespaard');
  ctx.fillStyle = stand.geschrapt.length ? '#0e6b45' : '#6b5a48';
  ctx.font = `800 15px ${LETTER}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mln(bespaardMln(stand)), PX + PB / 2, BY + 134 + 33);

  if (o.pauze) {
    ctx.fillStyle = 'rgba(10,14,30,0.6)';
    ctx.fillRect(BX, BY, BB, BH);
    ctx.fillStyle = '#fff';
    ctx.font = `900 28px ${LETTER}`;
    ctx.textAlign = 'center';
    ctx.fillText('Pauze', BX + BB / 2, BY + BH / 2);
  }
}

/**
 * Groninger Museum: "Moet het of mag het?". Voor het museum, aan het water, staat steeds een
 * kunstwerk op een sokkel: een taak van de gemeente, met wat de gemeente eraan uitgeeft. Veeg het
 * naar links, naar de zaal "Moet van de wet", of naar rechts, naar de zaal "Eigen keuze". Of gebruik
 * de knoppen of de pijltjestoetsen. Goed op rij geeft een reeks en meer punten; drie levels met
 * steeds meer kunstwerken.
 *
 * Bij minder beweging loopt er geen klok en beweegt er niets vanzelf: twaalf kunstwerken, in
 * beurten.
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  BEGIN_STAND,
  FOUT_STRAF,
  GEHAALD_DEEL,
  KANTEN,
  LEVELS,
  STIL_KAARTEN,
  antwoord,
  gehaald,
  kaartenVoorLevel,
  kantVanVeeg,
  maxPunten,
  museumPosten,
  nodig,
  tekstVan,
  uitlegVan,
  type MuseumKaart,
  type Soort,
  type Stand,
} from '../../game/mgMuseum';
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
import './Museum.css';

// Het veld in beeldpunten (het canvas schaalt mee): staand, zodat het op een telefoon groot is.
const B = 360;
const H = 440;
/** Het kunstwerk op de sokkel. */
const KUNST = { x: 80, y: 144, b: 200, h: 198 };
const MIDDEN = { x: KUNST.x + KUNST.b / 2, y: KUNST.y + KUNST.h / 2 };
/** De twee zalen, links en rechts. */
const ZAAL_B = 70;
const ZAAL_TOP = 222;
/** Waterlijn en kade. */
const WATER = 150;
const KADE = 198;

const FONT = 'Asap, system-ui, sans-serif';

type Fase = 'start' | 'spelen' | 'klaar';
type Antwoord = { kaart: MuseumKaart; goed: boolean };

/** Alles wat beweegt, buiten React (het verandert elk beeld). */
type Anim = {
  dx: number;
  dy: number;
  slepen: boolean;
  startX: number;
  startY: number;
  vlieg?: { kaart: MuseumKaart; kant: Soort; begin: number; x0: number; y0: number };
  binnen: number;
  flits?: { kant: Soort; goed: boolean; begin: number };
  zwevers: { tekst: string; x: number; y: number; begin: number; kleur: string; groot: number }[];
  deeltjes: { x: number; y: number; vx: number; vy: number; kleur: string; begin: number }[];
  schud: number;
};

const nieuweAnim = (): Anim => ({
  dx: 0,
  dy: 0,
  slepen: false,
  startX: 0,
  startY: 0,
  binnen: 0,
  zwevers: [],
  deeltjes: [],
  schud: 0,
});

export default function Museum({ data, onKlaar }: MinigameProps) {
  const stil = useStil();
  const jaar = data.begroting.begrotingsjaar;
  const posten = useMemo(() => museumPosten(data), [data]);

  const [fase, setFase] = useState<Fase>('start');
  const [levelNr, setLevelNr] = useState(1);
  const [kaarten, setKaarten] = useState<MuseumKaart[]>([]);
  const [i, setI] = useState(0);
  const [stand, setStand] = useState<Stand>(BEGIN_STAND);
  const [pauze, setPauze] = useState(false);
  const [afgerond, setAfgerond] = useState(false);
  const [melding, setMelding] = useState<Melding>();
  const [deze, setDeze] = useState<Antwoord[]>([]);
  /** het laatste antwoord per post, over het hele spel */
  const [alle, setAlle] = useState<Record<string, boolean>>({});
  /** de beste punten per level */
  const [beste, setBeste] = useState<Record<number, number>>({});
  const [besteReeks, setBesteReeks] = useState(0);
  /** de levels die je haalde */
  const [gehaaldNrs, setGehaaldNrs] = useState<number[]>([]);
  const [laatste, setLaatste] = useState<{ kant: Soort; goed: boolean }>();

  const levelKaarten = stil ? STIL_KAARTEN : (LEVELS[levelNr - 1]?.kaarten ?? 10);
  const levelTijd = LEVELS[levelNr - 1]?.tijd ?? 45;
  const kaart = kaarten[i];
  const [tijd, setTijd] = useKlok(LEVELS[0].tijd, fase === 'spelen' && !stil && !pauze);
  const levelKlaar = fase === 'spelen' && (afgerond || (!stil && tijd <= 0));
  const spelen = fase === 'spelen' && !levelKlaar;

  const doek = useRef<HTMLCanvasElement>(null);
  const anim = useRef<Anim>(nieuweAnim());
  const wacht = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(wacht.current), []);

  // ---------------------------------------------------------------------------------------------
  // Een level beginnen en eindigen
  // ---------------------------------------------------------------------------------------------

  const begin = (nr: number) => {
    const aantal = stil ? STIL_KAARTEN : (LEVELS[nr - 1]?.kaarten ?? 10);
    setLevelNr(nr);
    setKaarten(kaartenVoorLevel(posten, aantal, Math.random, new Set(Object.keys(alle))));
    setI(0);
    setStand(BEGIN_STAND);
    setTijd(LEVELS[nr - 1]?.tijd ?? 45);
    setPauze(false);
    setAfgerond(false);
    setMelding(undefined);
    setDeze([]);
    setLaatste(undefined);
    window.clearTimeout(wacht.current);
    anim.current = { ...nieuweAnim(), binnen: performance.now() };
    setFase('spelen');
  };

  /** Onthoudt de punten van dit level, en of je het haalde. */
  const boek = (ok: boolean) => {
    setBeste((b) => ({ ...b, [levelNr]: Math.max(b[levelNr] ?? 0, stand.punten) }));
    if (ok) setGehaaldNrs((g) => (g.includes(levelNr) ? g : [...g, levelNr]));
  };

  const totaal = stil ? stand.punten : Object.values(beste).reduce((s, p) => s + p, 0);
  const maxTotaal = stil
    ? maxPunten(STIL_KAARTEN)
    : LEVELS.reduce((s, l) => s + maxPunten(l.kaarten), 0);
  const levelsGehaald = gehaaldNrs.length;

  // ---------------------------------------------------------------------------------------------
  // Kiezen
  // ---------------------------------------------------------------------------------------------

  const kies = (kant: Soort) => {
    if (!spelen || pauze || !kaart || afgerond) return;
    const nu = performance.now();
    const r = antwoord(stand, kaart, kant);
    const a = anim.current;
    setStand(r.stand);
    setBesteReeks((b) => Math.max(b, r.stand.besteReeks));
    setDeze((d) => [...d, { kaart, goed: r.goed }]);
    setAlle((x) => ({ ...x, [kaart.id]: r.goed }));
    setLaatste({ kant, goed: r.goed });
    if (!r.goed && !stil) setTijd((t) => Math.max(0, t - FOUT_STRAF));
    setMelding({
      tekst: (
        <>
          <strong>
            {r.goed ? '✅ Goed!' : `❌ Helaas. Dit is: ${tekstVan(kaart.soort).toLowerCase()}.`}
          </strong>
          <br />
          <strong>{kaart.naam}</strong>: {uitlegVan(kaart)} De gemeente geeft hier in {jaar}{' '}
          {mln(kaart.bedragMln)} aan uit (begroting {jaar}).
        </>
      ),
      toon: r.goed ? 'goed' : 'fout',
      tijd: nu,
    });

    // beweging
    const deurX = kant === 'wet' ? ZAAL_B / 2 : B - ZAAL_B / 2;
    if (!stil) {
      a.vlieg = { kaart, kant, begin: nu, x0: MIDDEN.x + a.dx, y0: MIDDEN.y + a.dy };
      a.flits = { kant, goed: r.goed, begin: nu + 260 };
      if (r.goed) {
        a.zwevers.push({
          tekst: `+${r.erbij}`,
          x: deurX,
          y: ZAAL_TOP - 30,
          begin: nu + 200,
          kleur: '#13804f',
          groot: 20,
        });
        if (r.stand.reeks >= 2)
          a.zwevers.push({
            tekst: `Reeks ${r.stand.reeks}!`,
            x: B / 2,
            y: 44,
            begin: nu + 120,
            kleur: '#c2185b',
            groot: 26,
          });
        const kleuren = ['#f5c400', '#e8418b', '#13a3a3', '#ff7a1a', '#7b4bd1', '#ffffff'];
        for (let n = 0; n < 22; n++) {
          const hoek = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
          const v = 90 + Math.random() * 150;
          a.deeltjes.push({
            x: deurX,
            y: ZAAL_TOP + 40,
            vx: Math.cos(hoek) * v,
            vy: Math.sin(hoek) * v,
            kleur: kleuren[n % kleuren.length] ?? '#fff',
            begin: nu + 260,
          });
        }
      } else {
        a.schud = nu + 260;
        a.zwevers.push({
          tekst: `−${FOUT_STRAF} s`,
          x: deurX,
          y: ZAAL_TOP - 30,
          begin: nu + 200,
          kleur: '#c4321e',
          groot: 20,
        });
      }
    }
    a.dx = 0;
    a.dy = 0;
    a.slepen = false;
    a.binnen = nu + (stil ? 0 : 180);

    setI(i + 1);
    if (i + 1 >= kaarten.length) {
      if (stil) setAfgerond(true);
      else wacht.current = window.setTimeout(() => setAfgerond(true), 650);
    }
  };

  // Toetsen: pijl links en rechts kiezen, P is pauze
  useToetsen(spelen, (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      kies(e.key === 'ArrowLeft' ? 'wet' : 'keuze');
    } else if (!stil && (e.key === 'p' || e.key === 'P')) setPauze((p) => !p);
  });

  // Vegen met de vinger of de muis; tikken op een zaal kiest die zaal
  const punt = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * B) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const neer = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!spelen || pauze || !kaart) return;
    e.preventDefault();
    const p = punt(e);
    const a = anim.current;
    if (p.y > ZAAL_TOP - 10 && (p.x < ZAAL_B || p.x > B - ZAAL_B)) {
      kies(p.x < ZAAL_B ? 'wet' : 'keuze');
      return;
    }
    if (
      p.x >= KUNST.x - 10 &&
      p.x <= KUNST.x + KUNST.b + 10 &&
      p.y >= KUNST.y - 10 &&
      p.y <= KUNST.y + KUNST.h + 50
    ) {
      a.slepen = true;
      a.startX = p.x;
      a.startY = p.y;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };
  const beweeg = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const a = anim.current;
    if (!a.slepen) return;
    const p = punt(e);
    a.dx = p.x - a.startX;
    a.dy = (p.y - a.startY) * 0.25;
    if (stil) tekenNu();
  };
  const los = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const a = anim.current;
    if (!a.slepen) return;
    a.slepen = false;
    const kant = kantVanVeeg(a.dx, 55);
    if (e.type === 'pointerup' && kant) kies(kant);
    else if (stil) {
      a.dx = 0;
      a.dy = 0;
      tekenNu();
    }
  };

  // ---------------------------------------------------------------------------------------------
  // Tekenen: elk beeld, of (bij minder beweging) als er iets verandert
  // ---------------------------------------------------------------------------------------------

  const tekenNu = (nu = performance.now()) =>
    teken(doek.current, {
      kaart,
      nr: i + 1,
      n: kaarten.length,
      jaar,
      anim: anim.current,
      nu,
      stil,
      pauze,
      tijdDeel: stil ? undefined : tijd / levelTijd,
      laatste,
      hint: i === 0 && levelNr === 1,
    });

  useLus(spelen && !stil, (dt, nu) => {
    const a = anim.current;
    if (!a.slepen && !a.vlieg) {
      // terugveren
      a.dx *= Math.pow(0.0005, dt);
      a.dy *= Math.pow(0.0005, dt);
      if (Math.abs(a.dx) < 0.3) a.dx = 0;
    }
    tekenNu(nu);
  });

  useEffect(() => {
    if (stil && spelen) tekenNu();
  });

  // ---------------------------------------------------------------------------------------------
  // Scherm
  // ---------------------------------------------------------------------------------------------

  const hud = (
    <Hud
      testid="mg-museum-stand"
      icoon="🖼️"
      links={[
        { label: 'Punten', waarde: stand.punten, testid: 'mg-museum-punten' },
        {
          label: 'Reeks',
          waarde: stand.reeks >= 2 ? `🔥 ${stand.reeks}` : stand.reeks,
          toon: stand.reeks >= 2 ? 'goed' : undefined,
        },
      ]}
      rechts={
        stil
          ? [
              {
                label: 'Kunstwerk',
                waarde: Math.min(i + 1, kaarten.length),
              },
              {
                label: 'van de',
                waarde: kaarten.length,
              },
            ]
          : [
              { label: 'Tijd', waarde: tijd, toon: tijd <= 10 ? 'fout' : undefined },
              { label: 'Level', waarde: levelNr },
            ]
      }
    />
  );

  if (fase === 'start')
    return (
      <div className="mg-kader mg-gm">
        <SpelKaart
          titel="Moet het, of kiest de gemeente?"
          knop={{ tekst: stil ? 'Start' : 'Start level 1', onClick: () => begin(1) }}
        >
          <p>
            Voor het Groninger Museum staan vandaag geen schilderijen, maar taken van de gemeente.
            Bij elk kunstwerk zie je wat de gemeente eraan uitgeeft in {jaar}.
          </p>
          <ul className="klein">
            <li>
              <strong>◀ Naar links: moet van de wet.</strong> Een wet zegt dat de gemeente dit moet
              doen.
            </li>
            <li>
              <strong>Naar rechts ▶: eigen keuze.</strong> De gemeente kiest dit zelf.
            </li>
            <li>
              Goed op rij is een <strong>reeks</strong>: dan krijg je steeds meer punten
              {stil ? '.' : `. Fout kost ${FOUT_STRAF} seconden.`}
            </li>
          </ul>
          <p className="klein">
            Veeg het kunstwerk, tik op een zaal, of gebruik de knoppen of de pijltjestoetsen.{' '}
            {stil
              ? `${STIL_KAARTEN} kunstwerken, zonder klok.`
              : `Drie levels met steeds meer kunstwerken. Haal er ${Math.round(GEHAALD_DEEL * 100)}% goed om door te gaan.`}{' '}
            (Punten, tijd en levels zijn spelregels.)
          </p>
        </SpelKaart>
      </div>
    );

  if (fase === 'klaar')
    return (
      <div className="mg-kader mg-gm" data-testid="mg-museum-uitslag">
        <SpelKaart
          titel={`Je score: ${totaal} van de ${maxTotaal} punten`}
          knop={{ tekst: 'Naar de uitslag', onClick: () => onKlaar(totaal, maxTotaal) }}
        >
          <p>
            {stil
              ? `Je had er ${stand.goed} van de ${STIL_KAARTEN} goed.`
              : `Je haalde ${levelsGehaald} van de ${LEVELS.length} levels.`}{' '}
            Je langste reeks: {besteReeks}.
          </p>
          <h4 className="mg-gm-kop">Wat je leerde</h4>
          <ul className="klein">
            <li>
              Veel taken moeten van de wet, zoals jeugdzorg en de bijstand. Maar ook dan kiest de
              gemeente hoeveel geld ze eraan uitgeeft en hoe ze het doet.
            </li>
            <li>
              Andere dingen kiest de gemeente zelf, zoals sport, cultuur en citymarketing. Die kan
              ze ook laten, of minder doen.
            </li>
            <li>
              ⚠︎ Soms is het niet zwart-wit. Taken waarbij het niet duidelijk is, deden niet mee.
            </li>
          </ul>
          <Overzicht posten={posten} alle={alle} jaar={jaar} />
          <p className="klein">Bedragen: de begroting {jaar} van de gemeente Groningen.</p>
        </SpelKaart>
      </div>
    );

  if (levelKlaar) {
    const goed = deze.filter((d) => d.goed).length;
    const ok = gehaald(goed, levelKaarten);
    const fout = deze.filter((d) => !d.goed);
    const laatsteLevel = levelNr >= LEVELS.length;
    return (
      <div className="mg-kader mg-gm">
        {hud}
        <SpelKaart
          testid="mg-museum-einde"
          status
          titel={
            stil
              ? `Klaar! ${goed} van de ${levelKaarten} goed`
              : ok
                ? `Level ${levelNr} gehaald! 🎉`
                : `Level ${levelNr}: ${goed} goed, je had er ${nodig(levelKaarten)} nodig`
          }
          knop={
            stil
              ? { tekst: 'Bekijk je score', onClick: () => setFase('klaar') }
              : ok && !laatsteLevel
                ? {
                    tekst: `Level ${levelNr + 1}: ${LEVELS[levelNr]?.naam}`,
                    onClick: () => {
                      boek(true);
                      begin(levelNr + 1);
                    },
                  }
                : ok
                  ? {
                      tekst: 'Bekijk je score',
                      onClick: () => {
                        boek(true);
                        setFase('klaar');
                      },
                    }
                  : {
                      tekst: 'Probeer opnieuw',
                      onClick: () => {
                        boek(false);
                        begin(levelNr);
                      },
                    }
          }
          extra={
            !stil &&
            !(ok && laatsteLevel) && (
              <button
                type="button"
                className="knop"
                onClick={() => {
                  boek(ok);
                  setFase('klaar');
                }}
              >
                Stoppen
              </button>
            )
          }
        >
          <p>
            {goed} van de {levelKaarten} goed{deze.length < levelKaarten ? ' (de tijd was op)' : ''}
            . {stand.punten} punten, langste reeks {stand.besteReeks}.
          </p>
          {fout.length > 0 && (
            <>
              <p className="klein">Deze had je niet goed:</p>
              <ul className="mg-lijst klein">
                {fout.map(({ kaart: k }) => (
                  <li key={k.id}>
                    <strong>{k.naam}</strong>:{' '}
                    {k.soort === 'wet' ? `moet van de ${k.wet}` : 'eigen keuze'}.
                  </li>
                ))}
              </ul>
            </>
          )}
        </SpelKaart>
        <Meldingen melding={melding} />
      </div>
    );
  }

  const naam = kaart
    ? `Kunstwerk ${i + 1} van ${kaarten.length}: ${kaart.naam}. ${kaart.uitleg} De gemeente geeft hier in ${jaar} ${mln(kaart.bedragMln)} aan uit.`
    : '';
  return (
    <div className="mg-kader mg-gm">
      {hud}
      <p className="mg-strook klein" data-testid="mg-museum-zaal">
        {stil ? (
          <>
            Kunstwerk {Math.min(i + 1, kaarten.length)} van {kaarten.length}
          </>
        ) : (
          <>
            <strong>
              Level {levelNr}: {LEVELS[levelNr - 1]?.naam}.
            </strong>{' '}
            Kunstwerk {Math.min(i + 1, kaarten.length)} van {kaarten.length}. Haal er{' '}
            {nodig(levelKaarten)} goed.
          </>
        )}
      </p>
      <canvas
        ref={doek}
        className="mg-veld mg-gm-veld"
        width={B}
        height={H}
        role="img"
        aria-label={
          pauze
            ? 'Het spel staat op pauze.'
            : `${naam} Veeg naar links voor "Moet van de wet" of naar rechts voor "Eigen keuze van de gemeente".`
        }
        onPointerDown={neer}
        onPointerMove={beweeg}
        onPointerUp={los}
        onPointerCancel={los}
      />
      <div className="mg-knoppen mg-gm-knoppen">
        {KANTEN.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`knop-indienen mg-grote-knop mg-gm-kies mg-gm-${k.id}`}
            onClick={() => kies(k.id)}
            disabled={pauze || !kaart}
            aria-label={k.tekst}
          >
            {k.id === 'wet' ? `◀ ${k.kort}` : `${k.kort} ▶`}
          </button>
        ))}
        {!stil && <PauzeKnop pauze={pauze} onWissel={() => setPauze((p) => !p)} />}
      </div>
      <Meldingen melding={melding} />
    </div>
  );
}

/** Alle taken, met het goede antwoord en de wet. ✅ en ❌: hoe jij het deed. */
function Overzicht({
  posten,
  alle,
  jaar,
}: {
  posten: MuseumKaart[];
  alle: Record<string, boolean>;
  jaar: number;
}) {
  return (
    <div className="mg-gm-overzicht" data-testid="mg-museum-overzicht">
      {KANTEN.map((kant) => (
        <section key={kant.id}>
          <h4 className={`mg-gm-kop mg-gm-kop-${kant.id}`}>{kant.tekst}</h4>
          <ul className="mg-lijst klein">
            {posten
              .filter((p) => p.soort === kant.id)
              .sort((a, b) => b.bedragMln - a.bedragMln)
              .map((p) => (
                <li key={p.id}>
                  {p.id in alle && (
                    <span aria-label={alle[p.id] ? 'jij: goed' : 'jij: fout'}>
                      {alle[p.id] ? '✅ ' : '❌ '}
                    </span>
                  )}
                  <strong>{p.naam}</strong>
                  {p.wet ? ` – ${p.wet}` : ''}. {mln(p.bedragMln)} in {jaar}.
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// Tekenen
// -------------------------------------------------------------------------------------------------

type Scene = {
  kaart?: MuseumKaart;
  nr: number;
  n: number;
  jaar: number;
  anim: Anim;
  nu: number;
  stil: boolean;
  pauze: boolean;
  /** hoeveel tijd er over is, van 0 tot 1 (geen klok: undefined) */
  tijdDeel?: number;
  /** het laatste antwoord (bij minder beweging blijft dat te zien) */
  laatste?: { kant: Soort; goed: boolean };
  /** de eerste keer: laat zien dat je kunt vegen */
  hint: boolean;
};

const PASTEL = [
  { doek: '#fff5cf', accent: '#f5c400', tweede: '#e8418b' },
  { doek: '#ffe4ef', accent: '#e8418b', tweede: '#13a3a3' },
  { doek: '#d9f4f1', accent: '#13a3a3', tweede: '#f5c400' },
  { doek: '#ece5ff', accent: '#7b4bd1', tweede: '#ff7a1a' },
  { doek: '#ffe9d6', accent: '#ff7a1a', tweede: '#1f4fbf' },
];

function hash(s: string): number {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

const zacht = (t: number) => t * t * (3 - 2 * t);

/** De achtergrond: lucht, het museum, het Verbindingskanaal en de kade. Eén keer gemaakt. */
let achtergrondBeeld: HTMLCanvasElement | undefined;
function achtergrond(): HTMLCanvasElement {
  if (achtergrondBeeld) return achtergrondBeeld;
  const c = document.createElement('canvas');
  c.width = B * 2;
  c.height = H * 2;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.scale(2, 2);

  // lucht
  const lucht = ctx.createLinearGradient(0, 0, 0, WATER);
  lucht.addColorStop(0, '#4fa9e6');
  lucht.addColorStop(0.7, '#a9dcfb');
  lucht.addColorStop(1, '#e4f5ff');
  ctx.fillStyle = lucht;
  ctx.fillRect(0, 0, B, WATER);
  const zon = ctx.createRadialGradient(312, 30, 2, 312, 30, 60);
  zon.addColorStop(0, 'rgba(255,250,215,0.95)');
  zon.addColorStop(0.25, 'rgba(255,240,170,0.55)');
  zon.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = zon;
  ctx.fillRect(240, 0, 120, 100);
  // wolken
  for (const [x, y, s] of [
    [52, 30, 1],
    [118, 52, 0.7],
    [258, 22, 0.8],
  ] as const) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(x, y, 26 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 12 * s, y - 5 * s, 13 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 9 * s, y - 7 * s, 15 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // bomen aan de overkant
  ctx.fillStyle = '#5c9a5a';
  for (let x = -6; x < B + 10; x += 15) {
    ctx.beginPath();
    ctx.arc(x, WATER - 4 - ((x * 7) % 5), 10 + ((x * 3) % 4), Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = '#4a874b';
  ctx.fillRect(0, WATER - 6, B, 6);

  museumGebouw(ctx);

  // het water, met de weerspiegeling van het museum
  const water = ctx.createLinearGradient(0, WATER, 0, KADE);
  water.addColorStop(0, '#3d93c4');
  water.addColorStop(1, '#1b5c8a');
  ctx.fillStyle = water;
  ctx.fillRect(0, WATER, B, KADE - WATER);
  const f = (KADE - WATER) / WATER;
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.translate(0, WATER + WATER * f);
  ctx.scale(1, -f);
  ctx.drawImage(c, 0, 0, B * 2, WATER * 2, 0, 0, B, WATER);
  ctx.restore();
  ctx.fillStyle = 'rgba(20,70,110,0.25)';
  ctx.fillRect(0, WATER, B, KADE - WATER);

  // de kade
  const kade = ctx.createLinearGradient(0, KADE, 0, KADE + 12);
  kade.addColorStop(0, '#c9ccd1');
  kade.addColorStop(1, '#8d939b');
  ctx.fillStyle = kade;
  ctx.fillRect(0, KADE, B, 12);
  ctx.strokeStyle = 'rgba(60,60,70,0.35)';
  ctx.lineWidth = 1;
  for (let x = 8; x < B; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, KADE + 2);
    ctx.lineTo(x, KADE + 12);
    ctx.stroke();
  }

  // het terras: terrazzo met tegels in perspectief
  const vloer = ctx.createLinearGradient(0, KADE + 12, 0, H);
  vloer.addColorStop(0, '#e2d8c6');
  vloer.addColorStop(1, '#f3ede2');
  ctx.fillStyle = vloer;
  ctx.fillRect(0, KADE + 12, B, H - KADE - 12);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, KADE + 12, B, H);
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,100,80,0.18)';
  ctx.lineWidth = 1;
  const vx = B / 2;
  const vy = 120;
  for (let x = -400; x <= B + 400; x += 44) {
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let k = 0, y = KADE + 18; y < H; k++, y += 8 + k * 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(B, y);
    ctx.stroke();
  }
  const spikkels = ['#f5c400', '#e8418b', '#13a3a3', '#7b4bd1', '#555'];
  for (let n = 0; n < 260; n++) {
    const x = (n * 73) % B;
    const y = KADE + 14 + ((n * 131) % (H - KADE - 14));
    ctx.fillStyle = spikkels[n % spikkels.length] ?? '#555';
    ctx.globalAlpha = 0.28;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();
  achtergrondBeeld = c;
  return c;
}

/** Het Groninger Museum: bakstenen paviljoen met zilveren cilinder, roze ingang, gele toren,
 * turquoise blok en de schuine, gekantelde zalen van staal en glas. */
function museumGebouw(ctx: CanvasRenderingContext2D): void {
  const voet = WATER;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 6;

  // bakstenen paviljoen
  const steen = ctx.createLinearGradient(0, 96, 0, voet);
  steen.addColorStop(0, '#c45a3e');
  steen.addColorStop(1, '#8f3c2a');
  ctx.fillStyle = steen;
  ctx.fillRect(14, 98, 86, voet - 98);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,220,200,0.18)';
  ctx.lineWidth = 0.7;
  for (let y = 102; y < voet; y += 4) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(100, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40,20,20,0.55)';
  for (let x = 24; x < 96; x += 18) ctx.fillRect(x, 118, 8, 18);

  // zilveren cilinder
  const zilver = ctx.createLinearGradient(24, 0, 90, 0);
  zilver.addColorStop(0, '#8e98a3');
  zilver.addColorStop(0.35, '#f4f7fa');
  zilver.addColorStop(0.6, '#c4ccd4');
  zilver.addColorStop(1, '#6f7a86');
  ctx.fillStyle = zilver;
  ctx.fillRect(26, 74, 62, 24);
  ctx.beginPath();
  ctx.ellipse(57, 98, 31, 5, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#e9eef3';
  ctx.beginPath();
  ctx.ellipse(57, 74, 31, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,90,100,0.4)';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(80,90,100,0.3)';
  for (let x = 34; x < 88; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 79);
    ctx.lineTo(x, 99);
    ctx.stroke();
  }

  // roze ingang met turquoise band
  ctx.fillStyle = '#e8418b';
  ctx.fillRect(96, 112, 58, voet - 112);
  ctx.fillStyle = '#13a3a3';
  ctx.fillRect(96, 120, 58, 7);
  ctx.fillStyle = '#ffd1e4';
  ctx.fillRect(96, 112, 58, 3);
  ctx.fillStyle = 'rgba(30,20,40,0.55)';
  ctx.fillRect(112, 134, 26, voet - 134);

  // turquoise blok rechts van de toren
  const turk = ctx.createLinearGradient(196, 0, 240, 0);
  turk.addColorStop(0, '#36c2b6');
  turk.addColorStop(1, '#1b8e86');
  ctx.fillStyle = turk;
  ctx.fillRect(196, 86, 42, voet - 86);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let y = 92; y < voet; y += 10) ctx.fillRect(196, y, 42, 2);
  ctx.fillStyle = '#f5c400';
  ctx.fillRect(196, 86, 42, 4);

  // de schuine zalen: gekantelde platen staal en glas
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6;
  const staal = ctx.createLinearGradient(230, 60, 320, voet);
  staal.addColorStop(0, '#6f9ab5');
  staal.addColorStop(1, '#3a5f78');
  ctx.fillStyle = staal;
  ctx.beginPath();
  ctx.moveTo(228, voet);
  ctx.lineTo(236, 96);
  ctx.lineTo(304, 70);
  ctx.lineTo(322, voet);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(20,40,55,0.45)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 6; k++) {
    ctx.beginPath();
    ctx.moveTo(236 + k * 14, voet);
    ctx.lineTo(240 + k * 12, 92 - k * 4);
    ctx.stroke();
  }
  // een plaat die naar buiten steekt
  ctx.fillStyle = '#4b7189';
  ctx.beginPath();
  ctx.moveTo(300, voet);
  ctx.lineTo(312, 108);
  ctx.lineTo(356, 120);
  ctx.lineTo(350, voet);
  ctx.closePath();
  ctx.fill();
  // glazen scherf, schuin over alles heen
  const glas = ctx.createLinearGradient(262, 90, 352, 130);
  glas.addColorStop(0, 'rgba(170,236,222,0.95)');
  glas.addColorStop(1, 'rgba(90,190,175,0.95)');
  ctx.fillStyle = glas;
  ctx.beginPath();
  ctx.moveTo(258, 118);
  ctx.lineTo(350, 82);
  ctx.lineTo(356, 96);
  ctx.lineTo(268, 140);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  for (let k = 1; k < 7; k++) {
    const t = k / 7;
    ctx.beginPath();
    ctx.moveTo(258 + 92 * t, 118 - 36 * t);
    ctx.lineTo(268 + 88 * t, 140 - 44 * t);
    ctx.stroke();
  }
  // balk schuin omhoog
  ctx.strokeStyle = '#2b4456';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(244, voet - 2);
  ctx.lineTo(328, 64);
  ctx.stroke();

  // de gele toren
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 8;
  const goud = ctx.createLinearGradient(150, 0, 198, 0);
  goud.addColorStop(0, '#ffe55c');
  goud.addColorStop(0.45, '#f7c600');
  goud.addColorStop(1, '#d19c00');
  ctx.fillStyle = goud;
  ctx.fillRect(150, 16, 48, voet - 16);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(160,110,0,0.35)';
  for (let y = 28; y < voet; y += 12) ctx.fillRect(150, y, 48, 1);
  ctx.fillStyle = '#fff3a6';
  ctx.fillRect(150, 16, 48, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(156, 16);
  ctx.lineTo(166, 16);
  ctx.lineTo(160, voet);
  ctx.lineTo(154, voet);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Golfjes en een bootje op het water. */
function water(ctx: CanvasRenderingContext2D, nu: number, stil: boolean): void {
  const t = stil ? 0 : nu / 1000;
  // bootje
  const bx = stil ? 300 : ((t * 14) % (B + 80)) - 40;
  const by = WATER + 22 + (stil ? 0 : Math.sin(t * 2) * 0.8);
  ctx.fillStyle = '#7a4a26';
  ctx.beginPath();
  ctx.moveTo(bx - 14, by);
  ctx.lineTo(bx + 14, by);
  ctx.lineTo(bx + 10, by + 5);
  ctx.lineTo(bx - 11, by + 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx - 6, by - 5, 9, 5);
  ctx.fillStyle = '#1f4fbf';
  ctx.fillRect(bx - 6, by - 6, 9, 1.5);
  // golfjes
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  for (let r = 0; r < 6; r++) {
    const y = WATER + 6 + r * 7.5;
    const schuif = ((t * (r % 2 ? 9 : -7)) % 40) + ((r * 13) % 40);
    for (let x = -40 + schuif; x < B; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 5, y - 1.6, x + 10 + r, y);
      ctx.stroke();
    }
  }
}

/** Een zaal aan de kant: blauw met een kluis (de wet) of roze met een open deur (eigen keuze). */
function zaal(
  ctx: CanvasRenderingContext2D,
  kant: Soort,
  gloei: number,
  flits: { goed: boolean; sterkte: number } | undefined,
): void {
  const links = kant === 'wet';
  const x = links ? 0 : B - ZAAL_B;
  const w = ZAAL_B;
  const dakBuiten = ZAAL_TOP - 10;
  const dakBinnen = ZAAL_TOP + 12;
  const yL = links ? dakBuiten : dakBinnen;
  const yR = links ? dakBinnen : dakBuiten;
  ctx.save();
  // gloed als je die kant op veegt, of na een antwoord
  if (flits) {
    ctx.shadowColor = flits.goed
      ? `rgba(24,160,88,${0.9 * flits.sterkte})`
      : `rgba(214,58,47,${0.9 * flits.sterkte})`;
    ctx.shadowBlur = 24 * flits.sterkte;
  } else if (gloei > 0) {
    ctx.shadowColor = links ? `rgba(80,140,255,${gloei})` : `rgba(255,80,160,${gloei})`;
    ctx.shadowBlur = 22 * gloei;
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
  }
  const kleur = ctx.createLinearGradient(x, ZAAL_TOP, x + w, H);
  if (links) {
    kleur.addColorStop(0, '#3567e0');
    kleur.addColorStop(1, '#173c9c');
  } else {
    kleur.addColorStop(0, '#f45da3');
    kleur.addColorStop(1, '#b8226a');
  }
  ctx.fillStyle = kleur;
  ctx.beginPath();
  ctx.moveTo(x, H);
  ctx.lineTo(x, yL);
  ctx.lineTo(x + w, yR);
  ctx.lineTo(x + w, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (gloei > 0) {
    ctx.fillStyle = `rgba(255,255,255,${gloei * 0.18})`;
    ctx.fill();
  }
  // dakrand in geel
  ctx.strokeStyle = '#f5c400';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, yL);
  ctx.lineTo(x + w, yR);
  ctx.stroke();
  // strepen op de gevel
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let y = ZAAL_TOP + 70; y < H; y += 14) ctx.fillRect(x, y, w, 3);

  // bordje met de naam
  const by = ZAAL_TOP + 18;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 4;
  rondRechthoek(ctx, x + 5, by, w - 10, 40, 6);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = links ? '#173c9c' : '#b8226a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 11.5px ${FONT}`;
  const [r1, r2] = links ? ['Moet van', 'de wet'] : ['Eigen', 'keuze'];
  ctx.fillText(r1, x + w / 2, by + 13);
  ctx.fillText(r2, x + w / 2, by + 28);

  // de deur
  const dx = x + 11;
  const dy = ZAAL_TOP + 72;
  const db = w - 22;
  const dh = H - dy;
  if (links) {
    // een kluis met het wetboek-teken
    const binnen = ctx.createLinearGradient(dx, dy, dx, dy + dh);
    binnen.addColorStop(0, '#0e1f52');
    binnen.addColorStop(1, '#09163b');
    ctx.fillStyle = binnen;
    rondRechthoek(ctx, dx, dy, db, dh + 10, 6);
    ctx.fill();
    const kx = dx + db / 2;
    const ky = dy + 48;
    const staal = ctx.createRadialGradient(kx - 6, ky - 6, 2, kx, ky, 22);
    staal.addColorStop(0, '#f2f4f7');
    staal.addColorStop(0.6, '#aeb6c0');
    staal.addColorStop(1, '#6b7480');
    ctx.fillStyle = staal;
    ctx.beginPath();
    ctx.arc(kx, ky, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4b535d';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = '#59626d';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      const h = (k / 6) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(kx + Math.cos(h) * 9, ky + Math.sin(h) * 9);
      ctx.lineTo(kx + Math.cos(h) * 17, ky + Math.sin(h) * 17);
      ctx.stroke();
    }
    ctx.fillStyle = '#173c9c';
    ctx.beginPath();
    ctx.arc(kx, ky, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText('§', kx, ky + 1);
    // wetboeken op een plank
    const boeken = ['#b02a17', '#1f4fbf', '#0e6b45', '#7b4bd1', '#d49a0c'];
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(dx + 2, ky + 52, db - 4, 3);
    boeken.forEach((b, n) => {
      ctx.fillStyle = b;
      ctx.fillRect(dx + 5 + n * 8, ky + 34 - (n % 2) * 2, 6, 18 + (n % 2) * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(dx + 5 + n * 8, ky + 39, 6, 1);
    });
  } else {
    // een open deur met warm licht en een vinkje
    const licht = ctx.createLinearGradient(dx, dy, dx, dy + dh);
    licht.addColorStop(0, '#fff3b0');
    licht.addColorStop(1, '#ffc94a');
    ctx.fillStyle = licht;
    rondRechthoek(ctx, dx, dy, db, dh + 10, 6);
    ctx.fill();
    // de deur zelf, opengedraaid
    ctx.fillStyle = '#8a1a4f';
    ctx.beginPath();
    ctx.moveTo(dx, dy + 2);
    ctx.lineTo(dx + 12, dy + 12);
    ctx.lineTo(dx + 12, H);
    ctx.lineTo(dx, H);
    ctx.closePath();
    ctx.fill();
    const kx = dx + db / 2 + 5;
    const ky = dy + 48;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 4;
    rondRechthoek(ctx, kx - 15, ky - 15, 30, 30, 6);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#e8418b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(kx - 8, ky);
    ctx.lineTo(kx - 2, ky + 7);
    ctx.lineTo(kx + 9, ky - 8);
    ctx.stroke();
    // een plant in een pot
    ctx.fillStyle = '#e8418b';
    ctx.fillRect(kx - 6, ky + 44, 12, 12);
    ctx.fillStyle = '#2f9a5a';
    for (const h of [-0.6, 0, 0.6]) {
      ctx.beginPath();
      ctx.ellipse(kx + Math.sin(h) * 7, ky + 36, 3.5, 9, h, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // pijltjes als je die kant op veegt
  if (gloei > 0.05) {
    ctx.globalAlpha = Math.min(1, gloei * 1.4);
    ctx.fillStyle = links ? '#1f4fbf' : '#c2185b';
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText(links ? '‹‹' : '››', links ? x + w + 10 : x - 10, ZAAL_TOP + 120);
    ctx.globalAlpha = 1;
  }

  // na een antwoord: een vinkje of een kruis boven de zaal
  if (flits && flits.sterkte > 0) {
    const cx = x + w / 2;
    const cy = ZAAL_TOP - 8;
    ctx.globalAlpha = flits.sterkte;
    ctx.fillStyle = flits.goed ? '#18a058' : '#d63a2f';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (flits.goed) {
      ctx.moveTo(cx - 7, cy);
      ctx.lineTo(cx - 2, cy + 6);
      ctx.lineTo(cx + 8, cy - 6);
    } else {
      ctx.moveTo(cx - 6, cy - 6);
      ctx.lineTo(cx + 6, cy + 6);
      ctx.moveTo(cx + 6, cy - 6);
      ctx.lineTo(cx - 6, cy + 6);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** De witte sokkel onder het kunstwerk, met een koperen bordje. */
function sokkel(ctx: CanvasRenderingContext2D, nr: number, n: number): void {
  const x = MIDDEN.x - 62;
  const y = KUNST.y + KUNST.h - 4;
  const b = 124;
  const h = 52;
  // schaduw op de vloer
  ctx.fillStyle = 'rgba(60,40,20,0.18)';
  ctx.beginPath();
  ctx.ellipse(MIDDEN.x + 6, y + h + 2, b * 0.62, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const voor = ctx.createLinearGradient(x, 0, x + b, 0);
  voor.addColorStop(0, '#ffffff');
  voor.addColorStop(0.7, '#eeeae4');
  voor.addColorStop(1, '#d3cdc4');
  ctx.fillStyle = voor;
  ctx.fillRect(x, y + 6, b, h - 6);
  // rand onder de lijst, met een randje schaduw
  const kap = ctx.createLinearGradient(0, y, 0, y + 9);
  kap.addColorStop(0, '#ffffff');
  kap.addColorStop(1, '#e4ded4');
  ctx.fillStyle = kap;
  rondRechthoek(ctx, x - 6, y, b + 12, 9, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(80,60,40,0.18)';
  ctx.fillRect(x, y + 9, b, 3);
  ctx.fillStyle = 'rgba(80,60,40,0.12)';
  ctx.fillRect(x, y + h - 4, b, 4);
  // koperen bordje
  const koper = ctx.createLinearGradient(0, y + 22, 0, y + 40);
  koper.addColorStop(0, '#f1d48a');
  koper.addColorStop(1, '#b8892e');
  ctx.fillStyle = koper;
  rondRechthoek(ctx, MIDDEN.x - 38, y + 22, 76, 18, 3);
  ctx.fill();
  ctx.fillStyle = '#4a3410';
  ctx.font = `700 10.5px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(n ? `Kunstwerk ${Math.min(nr, n)} / ${n}` : '', MIDDEN.x, y + 31.5);
}

/** Het kunstwerk: een gouden lijst met een doek in de kleuren van het museum, en de tekst. */
function kunstwerk(
  ctx: CanvasRenderingContext2D,
  k: MuseumKaart,
  cx: number,
  cy: number,
  draai: number,
  schaal: number,
  alpha: number,
  stempel: number,
  jaar: number,
): void {
  const { b, h } = KUNST;
  const p = PASTEL[hash(k.id) % PASTEL.length] ?? PASTEL[0];
  if (!p) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(draai);
  ctx.scale(schaal, schaal);
  const x = -b / 2;
  const y = -h / 2;

  // lijst
  ctx.shadowColor = 'rgba(30,20,10,0.45)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  const lijst = ctx.createLinearGradient(x, y, x + b, y + h);
  lijst.addColorStop(0, '#fbe7a1');
  lijst.addColorStop(0.3, '#d7a93a');
  lijst.addColorStop(0.55, '#f6d778');
  lijst.addColorStop(0.8, '#b8861f');
  lijst.addColorStop(1, '#e9c766');
  ctx.fillStyle = lijst;
  rondRechthoek(ctx, x, y, b, h, 4);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#8a6214';
  ctx.lineWidth = 1;
  ctx.stroke();
  // binnenrand
  const r = 11;
  ctx.strokeStyle = 'rgba(255,248,220,0.8)';
  ctx.strokeRect(x + 4, y + 4, b - 8, h - 8);
  ctx.fillStyle = '#7a5410';
  ctx.fillRect(x + r - 2, y + r - 2, b - 2 * r + 4, h - 2 * r + 4);

  // doek
  const ix = x + r;
  const iy = y + r;
  const ib = b - 2 * r;
  const ih = h - 2 * r;
  ctx.fillStyle = p.doek;
  ctx.fillRect(ix, iy, ib, ih);
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, ib, ih);
  ctx.clip();
  ctx.globalAlpha = alpha * 0.33;
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(ix + ib - 6, iy + 4, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.tweede;
  ctx.beginPath();
  ctx.moveTo(ix, iy + ih);
  ctx.lineTo(ix, iy + ih - 44);
  ctx.lineTo(ix + 40, iy + ih);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = p.accent;
  for (let s = 0; s < 4; s++) ctx.fillRect(ix + ib - 46 + s * 10, iy + ih - 16, 5, 16);
  ctx.strokeStyle = p.tweede;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ix - 4, iy + 22);
  ctx.lineTo(ix + 28, iy - 4);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = alpha;

  // tekst
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 16.5px ${FONT}`;
  const naam = breekTekst(ctx, k.naam, ib - 22).slice(0, 3);
  ctx.font = `500 12px ${FONT}`;
  const uitleg = breekTekst(ctx, k.uitleg, ib - 18).slice(0, 4);
  const hoog = naam.length * 19 + 10 + uitleg.length * 15 + 12 + 22;
  let ty = iy + Math.max(6, (ih - hoog) / 2) + 14;
  ctx.fillStyle = '#1d1a2b';
  ctx.font = `800 16.5px ${FONT}`;
  for (const regel of naam) {
    ctx.fillText(regel, 0, ty);
    ty += 19;
  }
  ctx.fillStyle = p.accent;
  ctx.fillRect(-18, ty - 10, 36, 2.5);
  ty += 6;
  ctx.fillStyle = '#3d3a4d';
  ctx.font = `500 12px ${FONT}`;
  for (const regel of uitleg) {
    ctx.fillText(regel, 0, ty);
    ty += 15;
  }
  // bedrag
  ctx.font = `800 12.5px ${FONT}`;
  const bedrag = `${mln(k.bedragMln)} in ${jaar}`;
  const bb = ctx.measureText(bedrag).width + 22;
  ctx.fillStyle = '#1d1a2b';
  rondRechthoek(ctx, -bb / 2, ty - 4, bb, 22, 11);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(bedrag, 0, ty + 7.5);

  // stempel als je veegt
  const sterk = Math.min(1, Math.abs(stempel) * 1.3);
  if (sterk > 0.05) {
    const wet = stempel < 0;
    ctx.save();
    ctx.globalAlpha = alpha * sterk;
    ctx.translate(wet ? 18 : -18, h / 2 - 34);
    ctx.rotate(wet ? 0.22 : -0.22);
    ctx.font = `900 15px ${FONT}`;
    const tekst = wet ? 'MOET VAN DE WET' : 'EIGEN KEUZE';
    const sb = ctx.measureText(tekst).width + 18;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    rondRechthoek(ctx, -sb / 2, -15, sb, 30, 6);
    ctx.fill();
    ctx.strokeStyle = wet ? '#1f4fbf' : '#d81b72';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = wet ? '#1f4fbf' : '#d81b72';
    ctx.fillText(tekst, 0, 1);
    ctx.restore();
  }
  ctx.restore();
}

function teken(doek: HTMLCanvasElement | null, s: Scene): void {
  const ctx = maakScherp(doek, B, H);
  if (!ctx) return;
  const a = s.anim;
  const { nu } = s;
  ctx.drawImage(achtergrond(), 0, 0, B, H);
  water(ctx, nu, s.stil);

  // schudden na een fout
  let sx = 0;
  if (!s.stil && a.schud && nu > a.schud && nu - a.schud < 320) {
    const f = (nu - a.schud) / 320;
    sx = Math.sin(f * Math.PI * 7) * 6 * (1 - f);
  }

  // gloed en flits per zaal
  const neiging = s.pauze ? 0 : Math.max(-1, Math.min(1, a.dx / 70));
  const flitsVoor = (kant: Soort) => {
    if (s.stil) return s.laatste?.kant === kant ? { goed: s.laatste.goed, sterkte: 1 } : undefined;
    const f = a.flits;
    if (!f || f.kant !== kant || nu < f.begin) return undefined;
    const t = (nu - f.begin) / 900;
    if (t >= 1) return undefined;
    return { goed: f.goed, sterkte: t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85 };
  };
  ctx.save();
  ctx.translate(sx, 0);
  zaal(ctx, 'wet', neiging < 0 ? -neiging : 0, flitsVoor('wet'));
  zaal(ctx, 'keuze', neiging > 0 ? neiging : 0, flitsVoor('keuze'));
  sokkel(ctx, s.nr, s.n);

  if (s.pauze) {
    ctx.restore();
    ctx.fillStyle = 'rgba(20,20,40,0.55)';
    ctx.fillRect(0, 0, B, H);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 30px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Pauze', B / 2, H / 2 - 10);
    ctx.font = `500 14px ${FONT}`;
    ctx.fillText('Druk op Verder om door te gaan.', B / 2, H / 2 + 20);
    return;
  }

  // het vorige kunstwerk vliegt de zaal in
  if (a.vlieg) {
    const v = a.vlieg;
    const t = Math.min(1, (nu - v.begin) / 380);
    if (t >= 1) a.vlieg = undefined;
    else {
      const e = t * t;
      const doelX = v.kant === 'wet' ? ZAAL_B / 2 : B - ZAAL_B / 2;
      const doelY = ZAAL_TOP + 110;
      kunstwerk(
        ctx,
        v.kaart,
        v.x0 + (doelX - v.x0) * e,
        v.y0 + (doelY - v.y0) * e,
        (v.kant === 'wet' ? -1 : 1) * (0.15 + e * 0.5),
        1 - e * 0.8,
        1 - e * 0.6,
        v.kant === 'wet' ? -1 : 1,
        s.jaar,
      );
    }
  }

  // het kunstwerk van nu
  if (s.kaart) {
    const q = s.stil ? 1 : zacht(Math.max(0, Math.min(1, (nu - a.binnen) / 280)));
    if (q > 0)
      kunstwerk(
        ctx,
        s.kaart,
        MIDDEN.x + a.dx,
        MIDDEN.y + a.dy + (1 - q) * 26,
        a.dx / 480,
        0.88 + 0.12 * q,
        q,
        neiging,
        s.jaar,
      );
  }
  ctx.restore();

  // hint onder de sokkel
  if (s.kaart && s.hint && Math.abs(a.dx) < 5) {
    const t = s.stil ? 0 : Math.sin(nu / 260) * 4;
    ctx.fillStyle = 'rgba(40,30,60,0.75)';
    ctx.font = `700 12.5px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('‹  veeg naar een zaal  ›', MIDDEN.x + t, H - 22);
  }

  // confetti
  for (let n = a.deeltjes.length - 1; n >= 0; n--) {
    const d = a.deeltjes[n];
    if (!d) continue;
    const t = (nu - d.begin) / 1000;
    if (t < 0) continue;
    if (t > 1.1) {
      a.deeltjes.splice(n, 1);
      continue;
    }
    const x = d.x + d.vx * t;
    const y = d.y + d.vy * t + 260 * t * t;
    ctx.globalAlpha = Math.max(0, 1 - t / 1.1);
    ctx.fillStyle = d.kleur;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 8 + n);
    ctx.fillRect(-3, -1.5, 6, 3);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // zwevende tekst
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let n = a.zwevers.length - 1; n >= 0; n--) {
    const z = a.zwevers[n];
    if (!z) continue;
    const f = (nu - z.begin) / 1100;
    if (f < 0) continue;
    if (f >= 1) {
      a.zwevers.splice(n, 1);
      continue;
    }
    const groei = f < 0.15 ? 0.7 + (f / 0.15) * 0.3 : 1;
    ctx.globalAlpha = f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3;
    ctx.font = `900 ${z.groot * groei}px ${FONT}`;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(z.tekst, z.x, z.y - f * 26);
    ctx.fillStyle = z.kleur;
    ctx.fillText(z.tekst, z.x, z.y - f * 26);
  }
  ctx.globalAlpha = 1;

  // tijdbalk
  if (s.tijdDeel !== undefined) {
    const d = Math.max(0, Math.min(1, s.tijdDeel));
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, B, 6);
    ctx.fillStyle = d > 0.3 ? '#f5c400' : '#e8418b';
    ctx.fillRect(0, 0, B * d, 6);
  }
}

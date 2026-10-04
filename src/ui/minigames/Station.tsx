/**
 * Hoofdstation: "Ontwijk de onnodige uitgaven". Je fietst vanaf het Hoofdstation over een rood
 * fietspad met drie stroken naar de Grote Markt. Van boven komen borden met plannen uit het
 * Beleidshuis: rood is volgens VVD Groningen onnodig, oranje kan met minder geld. Ontwijk ze, pak munten en geldzakken, en
 * pak een groen bord (een kerntaak) voor een extra leven. Het gaat steeds sneller: rustig, druk en spits.
 *
 * Bij minder beweging beweegt er niets vanzelf: je kiest per beurt links, blijven of rechts, en
 * dan schuift alles één rij op. De logica staat in game/mgRace.ts.
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { formatEuro } from '../../engine';
import {
  BANEN,
  BEURTEN,
  BREEDTE,
  DUUR,
  FASES,
  HOOGTE,
  LEVENS,
  PUNTEN,
  RIJ_STIL,
  SPELER_Y,
  STROOK,
  WEG_LINKS,
  WEG_RECHTS,
  afstand,
  baanBij,
  beschrijfRij,
  bespaard,
  faseOp,
  maakRit,
  maxPunten,
  nieuweStand,
  passeer,
  rijCode,
  zet,
  type Gebeurtenis,
  type Kerntaak,
  type Rij,
  type Rit,
  type Stand,
  type Uitgave,
} from '../../game/mgRace';
import { Hud, Meldingen, PauzeKnop, SpelKaart, type Melding } from './kader/kader';
import {
  breekTekst,
  maakScherp,
  mln,
  rondRechthoek,
  useLus,
  useStil,
  useToetsen,
} from './kader/hulp';
import type { MinigameProps } from './types';
import './Station.css';

type Fase = 'start' | 'spelen' | 'klaar';
type Einde = 'aangekomen' | 'op';
type Zwever = { tekst: string; x: number; y: number; begin: number; kleur: string };

/** Alles wat elk beeld verandert, buiten React. */
type Wereld = {
  rit: Rit;
  stand: Stand;
  /** speeltijd in seconden (negatief: aftellen) */
  t: number;
  /** de strook waar je heen fietst, en waar je nu bent (beeldpunten) */
  baan: number;
  x: number;
  /** index van de volgende rij die je passeert */
  volgende: number;
  fase: number;
  /** tijd (ms) van de laatste botsing, en van de laatste nieuwe fase */
  bots: number;
  faseBegin: number;
  zwevers: Zwever[];
  /** vakken die je pakte of raakte ("rij:strook") */
  gepakt: Set<string>;
  tijdOver: number;
  einde?: Einde;
  eindeOp: number;
  gestopt: boolean;
};

const AFTELLEN = 2.4;
const KANTEN = ['links', 'in het midden', 'rechts'];

const nieuweWereld = (rit: Rit, stil: boolean): Wereld => ({
  rit,
  stand: nieuweStand(),
  t: stil ? 0 : -AFTELLEN,
  baan: 1,
  x: BANEN[1],
  volgende: 0,
  fase: 0,
  bots: -1e9,
  faseBegin: -1e9,
  zwevers: [],
  gepakt: new Set(),
  tijdOver: DUUR,
  eindeOp: 0,
  gestopt: false,
});

/** Bedrag kort: onder een miljoen in hele euro's, anders in miljoenen. */
const bedrag = (x: number): string => (x < 1 ? formatEuro(x * 1e6) : mln(x));
const hoeVaak = (u: Uitgave): string => (u.soort === 'S' ? 'elk jaar' : 'eenmalig');

export default function Station({ data, onKlaar }: MinigameProps) {
  const stil = useStil();
  const jaar = data.begroting.begrotingsjaar;
  const [fase, setFase] = useState<Fase>('start');
  const [rit, setRit] = useState<Rit>(() => maakRit(data, stil));
  const [stand, setStand] = useState<Stand>(nieuweStand);
  const [baan, setBaan] = useState(1);
  const [ritFase, setRitFase] = useState(0);
  const [tijd, setTijd] = useState(DUUR);
  const [pauze, setPauze] = useState(false);
  const [melding, setMelding] = useState<Melding>();
  const [einde, setEinde] = useState<Einde>();

  const doek = useRef<HTMLCanvasElement>(null);
  const wereld = useRef<Wereld>(nieuweWereld(rit, stil));
  const veeg = useRef<{ x: number; id: number }>(undefined);

  const spelen = fase === 'spelen';

  // ---------------------------------------------------------------------------------------------
  // Beginnen en eindigen
  // ---------------------------------------------------------------------------------------------

  const begin = () => {
    const r = maakRit(data, stil);
    wereld.current = nieuweWereld(r, stil);
    setRit(r);
    setStand(nieuweStand());
    setBaan(1);
    setRitFase(0);
    setTijd(DUUR);
    setPauze(false);
    setMelding(undefined);
    setEinde(undefined);
    setFase('spelen');
  };

  const stop = useCallback((e: Einde) => {
    setStand(wereld.current.stand);
    setEinde(e);
    setFase('klaar');
  }, []);

  // ---------------------------------------------------------------------------------------------
  // Een rij voorbij: punten, levens en een melding
  // ---------------------------------------------------------------------------------------------

  const voorbij = useCallback(
    (rij: Rij, nu: number) => {
      const w = wereld.current;
      const b = stil ? w.baan : baanBij(w.x);
      const { stand: s, gebeurtenissen } = passeer(w.stand, rij, b);
      w.stand = s;
      w.volgende += 1;
      if (rij.vakken[b]) w.gepakt.add(`${rij.nr}:${b}`);
      setStand(s);
      for (const g of gebeurtenissen) zweef(w, g, nu);
      if (gebeurtenissen.some((g) => g.soort === 'geraakt')) w.bots = nu;
      const tekst = meldingVoor(gebeurtenissen, stil);
      if (tekst) setMelding({ ...tekst, tijd: nu });
      if (s.levens <= 0 && !w.einde) {
        w.einde = 'op';
        w.eindeOp = nu;
      }
    },
    [stil],
  );

  /** Rustige modus: één beurt. */
  const beurt = (richting: number) => {
    const w = wereld.current;
    if (!spelen || w.einde) return;
    const rij = w.rit.rijen[w.volgende];
    if (!rij) return;
    w.baan = zet(w.baan, richting);
    w.x = BANEN[w.baan] ?? BANEN[1];
    setBaan(w.baan);
    voorbij(rij, performance.now());
    const volgende = w.rit.rijen[w.volgende];
    setRitFase(volgende?.fase ?? 2);
    if (w.stand.levens <= 0) stop('op');
    else if (!volgende) stop('aangekomen');
  };

  /** Naar links (-1), blijven (0) of naar rechts (1). */
  const stuur = (richting: number) => {
    if (!spelen) return;
    if (stil) {
      beurt(richting);
      return;
    }
    const w = wereld.current;
    if (pauze || richting === 0 || w.einde) return;
    w.baan = zet(w.baan, richting);
    setBaan(w.baan);
  };

  // ---------------------------------------------------------------------------------------------
  // Elk beeld (snel spel)
  // ---------------------------------------------------------------------------------------------

  useLus(spelen && !stil && !pauze, (dt, nu) => {
    const w = wereld.current;
    w.t += dt;
    const doelX = BANEN[w.baan] ?? BANEN[1];
    w.x += (doelX - w.x) * Math.min(1, dt * 16);
    const s = afstand(Math.max(0, w.t));
    // rijen die je nu passeert
    for (let rij = w.rit.rijen[w.volgende]; rij && rij.w - s <= 4; rij = w.rit.rijen[w.volgende])
      if (w.einde) w.volgende += 1;
      else voorbij(rij, nu);
    // fase en klok
    const f = w.t >= 0 ? faseOp(w.t) : 0;
    if (f !== w.fase) {
      w.fase = f;
      w.faseBegin = nu;
      setRitFase(f);
    }
    const over = Math.max(0, Math.min(DUUR, Math.ceil(DUUR - w.t)));
    if (over !== w.tijdOver) {
      w.tijdOver = over;
      setTijd(over);
    }
    if (w.t >= DUUR && !w.einde) {
      w.einde = 'aangekomen';
      w.eindeOp = nu;
    }
    if (w.einde && !w.gestopt && nu - w.eindeOp > 1100) {
      w.gestopt = true;
      stop(w.einde);
    }
    teken(doek.current, beeld(w, nu, false));
  });

  // Rustige modus (en pauze): alleen tekenen als er iets verandert.
  useEffect(() => {
    if (!spelen || (!stil && !pauze)) return;
    teken(doek.current, beeld(wereld.current, performance.now(), stil, pauze));
  }, [spelen, stil, pauze, stand, baan, rit]);

  // Toetsen: pijltjes links en rechts; in de rustige modus pijl omhoog of spatie om te blijven.
  useToetsen(spelen, (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') {
      e.preventDefault();
      stuur(-1);
    } else if (k === 'arrowright' || k === 'd') {
      e.preventDefault();
      stuur(1);
    } else if (stil && (k === 'arrowup' || k === 'arrowdown' || k === ' ')) {
      e.preventDefault();
      stuur(0);
    } else if (!stil && k === 'p') {
      e.preventDefault();
      setPauze((p) => !p);
    }
  });

  // Ander tabblad: pauze.
  useEffect(() => {
    if (!spelen || stil) return;
    const zicht = () => {
      if (document.hidden) setPauze(true);
    };
    document.addEventListener('visibilitychange', zicht);
    return () => document.removeEventListener('visibilitychange', zicht);
  }, [spelen, stil]);

  // Vegen of tikken op het veld.
  const druk = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    veeg.current = { x: e.clientX, id: e.pointerId };
  };
  const los = (e: PointerEvent<HTMLCanvasElement>) => {
    const v = veeg.current;
    veeg.current = undefined;
    if (!v || v.id !== e.pointerId) return;
    const dx = e.clientX - v.x;
    if (Math.abs(dx) > 24) {
      stuur(Math.sign(dx));
      return;
    }
    const vak = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - vak.left) / vak.width) * BREEDTE;
    const verschil = x - wereld.current.x;
    if (Math.abs(verschil) < STROOK / 2) stuur(0);
    else stuur(Math.sign(verschil));
  };

  // ---------------------------------------------------------------------------------------------
  // Scherm
  // ---------------------------------------------------------------------------------------------

  const volgendeRij = rit.rijen[stand.rij];
  const faseInfo = FASES[ritFase] ?? FASES[0];

  if (fase === 'start')
    return (
      <div className="mg-kader mg-race">
        <SpelKaart
          titel="Ontwijk de onnodige uitgaven"
          knop={{ tekst: 'Start de rit', onClick: begin }}
          testid="mg-race-start"
        >
          <p>
            Je fietst vanaf het <strong>Hoofdstation</strong> naar de <strong>Grote Markt</strong>.
            Onderweg staan borden met plannen uit de begroting {jaar}. Rood is{' '}
            <strong>volgens VVD Groningen onnodig</strong>, oranje kan volgens VVD Groningen{' '}
            <strong>met minder geld</strong>. Ontwijk ze!
          </p>
          <ul className="klein mg-race-uitleg">
            <li>
              <span className="mg-race-teken mg-race-teken-rood" aria-hidden="true" />{' '}
              <strong>Rood bord:</strong> een onnodige uitgave. Raak je er een, dan verlies je een
              leven. Je hebt er {LEVENS}.
            </li>
            <li>
              <span className="mg-race-teken mg-race-teken-oranje" aria-hidden="true" />{' '}
              <strong>Oranje bord:</strong> dit kan met minder geld. Ook dat bord ontwijk je.
            </li>
            <li>
              <span aria-hidden="true">🪙</span> <strong>Munt</strong> ({PUNTEN.munt} punten) en{' '}
              <span aria-hidden="true">💰</span> <strong>geldzak</strong> ({PUNTEN.zak} punten): pak
              ze.
            </li>
            <li>
              <span className="mg-race-teken mg-race-teken-groen" aria-hidden="true" />{' '}
              <strong>Groen bord:</strong> een kerntaak. Die moet de gemeente doen van de wet. Pak
              hem voor een extra leven.
            </li>
            <li>
              Elke uitgave die je ontwijkt, geeft {PUNTEN.ontweken} punten. En de gemeente hoeft dat
              geld niet uit te geven.
            </li>
          </ul>
          <p className="klein">
            {stil
              ? `Je hebt ${BEURTEN} beurten. Kies steeds: naar links, blijven of naar rechts. Dan schuift alles één rij op.`
              : `De rit duurt ${DUUR} seconden, in drie fases: rustig, druk en spits. Het gaat steeds sneller.`}{' '}
            Sturen: veeg of tik links of rechts van je fiets, gebruik de pijltjestoetsen of de
            knoppen ◀ ▶.
          </p>
          <p className="klein">
            Spelregel: punten en levens horen bij het spel. De bedragen komen uit de begroting{' '}
            {jaar}.
          </p>
        </SpelKaart>
      </div>
    );

  if (fase === 'klaar')
    return (
      <div className="mg-kader mg-race" data-testid="mg-race-uitslag">
        <Uitslag
          data={data}
          stand={stand}
          rit={rit}
          einde={einde ?? 'aangekomen'}
          onKlaar={() => onKlaar(stand.punten, maxPunten(rit))}
        />
      </div>
    );

  return (
    <div className="mg-kader mg-race">
      <Hud
        testid="mg-race-stand"
        icoon="🚲"
        links={[
          { label: 'Punten', waarde: stand.punten, testid: 'mg-race-punten' },
          {
            label: 'Levens',
            waarde: (
              <span aria-label={`${stand.levens} van de ${LEVENS}`}>
                {'♥'.repeat(Math.max(0, stand.levens))}
                <span className="mg-race-leeg">
                  {'♥'.repeat(LEVENS - Math.max(0, stand.levens))}
                </span>
              </span>
            ),
            toon: stand.levens <= 1 ? 'fout' : undefined,
            testid: 'mg-race-levens',
          },
        ]}
        rechts={[
          stil
            ? {
                label: 'Beurt',
                waarde: `${Math.min(stand.rij + 1, rit.rijen.length)} van ${rit.rijen.length}`,
              }
            : { label: 'Tijd', waarde: tijd, toon: tijd <= 10 ? 'fout' : undefined },
          { label: 'Fase', waarde: faseInfo.naam },
        ]}
      />
      <p className="mg-strook klein">
        <strong>
          Fase {ritFase + 1}: {faseInfo.naam}.
        </strong>{' '}
        {faseInfo.uitleg} Ontwijk de rode en oranje borden.
      </p>
      <canvas
        ref={doek}
        className="mg-veld mg-race-veld"
        width={BREEDTE}
        height={HOOGTE}
        role="img"
        data-rij={rijCode(volgendeRij)}
        data-baan={baan}
        aria-label={`Fietspad met drie stroken. Jij fietst ${KANTEN[baan]}. Hierna: ${beschrijfRij(volgendeRij)}.`}
        onPointerDown={druk}
        onPointerUp={los}
        onPointerCancel={() => {
          veeg.current = undefined;
        }}
      />
      <div className="mg-knoppen mg-race-knoppen">
        <button
          type="button"
          className="knop mg-grote-knop mg-race-pijl"
          aria-label="Naar links"
          onClick={() => stuur(-1)}
          disabled={pauze}
        >
          ◀
        </button>
        {stil ? (
          <button
            type="button"
            className="knop-indienen mg-grote-knop"
            onClick={() => stuur(0)}
            aria-label="Blijf in je strook"
          >
            ● Blijf
          </button>
        ) : (
          <PauzeKnop pauze={pauze} onWissel={() => setPauze((p) => !p)} />
        )}
        <button
          type="button"
          className="knop mg-grote-knop mg-race-pijl"
          aria-label="Naar rechts"
          onClick={() => stuur(1)}
          disabled={pauze}
        >
          ▶
        </button>
      </div>
      <Meldingen melding={melding} />
    </div>
  );
}

/** De melding na een rij. In het snelle spel alleen bij een botsing of een kerntaak. */
function meldingVoor(
  gebeurtenissen: Gebeurtenis[],
  stil: boolean,
): Omit<Melding, 'tijd'> | undefined {
  const delen: string[] = [];
  let toon: Melding['toon'];
  for (const g of gebeurtenissen) {
    if (g.soort === 'geraakt') {
      toon = 'fout';
      delen.unshift(
        `💥 Geraakt: ${g.uitgave.naam}, kost ${bedrag(g.uitgave.bedragMln)} ${hoeVaak(g.uitgave)}. Je verliest een leven.`,
      );
    } else if (g.soort === 'kern') {
      toon ??= 'goed';
      delen.push(
        `🛡️ Kerntaak: ${g.kern.naam} (${bedrag(g.kern.bedragMln)} per jaar). Dit moet de gemeente doen van de wet${g.kern.wet ? ` (${g.kern.wet})` : ''}. ${g.leven ? 'Je krijgt een leven erbij.' : `+${PUNTEN.kern} punten.`}`,
      );
    } else if (stil && g.soort === 'ontweken') {
      toon ??= 'goed';
      delen.push(
        `Ontweken: ${g.uitgave.naam} (${bedrag(g.uitgave.bedragMln)} ${hoeVaak(g.uitgave)}).`,
      );
    } else if (stil && g.soort === 'munt') delen.push(`🪙 Munt: +${PUNTEN.munt} punten.`);
    else if (stil && g.soort === 'zak') delen.push(`💰 Geldzak: +${PUNTEN.zak} punten.`);
  }
  if (!delen.length) return stil ? { tekst: 'Niets op deze rij.' } : undefined;
  return { tekst: delen.join(' '), ...(toon ? { toon } : {}) };
}

/** Een zwevend getal boven de plek waar het gebeurde. */
function zweef(w: Wereld, g: Gebeurtenis, nu: number): void {
  const y = SPELER_Y - 30;
  if (g.soort === 'geraakt')
    w.zwevers.push({ tekst: `−1 ♥`, x: w.x, y, begin: nu, kleur: '#d63a24' });
  else if (g.soort === 'munt')
    w.zwevers.push({ tekst: `+${PUNTEN.munt}`, x: w.x, y, begin: nu, kleur: '#b8860b' });
  else if (g.soort === 'zak')
    w.zwevers.push({ tekst: `+${PUNTEN.zak}`, x: w.x, y, begin: nu, kleur: '#b8860b' });
  else if (g.soort === 'kern')
    w.zwevers.push({
      tekst: g.leven ? '+1 ♥' : `+${PUNTEN.kern}`,
      x: w.x,
      y,
      begin: nu,
      kleur: '#15875a',
    });
  else {
    const b = w.rit.rijen[w.volgende - 1]?.vakken.findIndex(
      (v) => v?.soort === 'uitgave' && v.uitgave.id === g.uitgave.id,
    );
    w.zwevers.push({
      tekst: `+${PUNTEN.ontweken} bespaard`,
      x: BANEN[b ?? 1] ?? w.x,
      y: SPELER_Y - 10,
      begin: nu,
      kleur: '#15875a',
    });
  }
}

// -------------------------------------------------------------------------------------------------
// De eindkaart
// -------------------------------------------------------------------------------------------------

function Uitslag({
  data,
  stand,
  rit,
  einde,
  onKlaar,
}: {
  data: MinigameProps['data'];
  stand: Stand;
  rit: Rit;
  einde: Einde;
  onKlaar: () => void;
}) {
  const jaar = data.begroting.begrotingsjaar;
  const bron = data.minigames.find((m) => m.goud)?.goud;
  const b = bespaard(stand);
  const geraakt = new Set(stand.geraakt.map((u) => u.id));
  const ontweken = stand.ontweken.filter((u) => !geraakt.has(u.id));
  const route = Math.round((Math.min(stand.rij, rit.rijen.length) / rit.rijen.length) * 100);
  return (
    <SpelKaart
      titel={einde === 'aangekomen' ? 'Je bent bij de Grote Markt! 🏁' : 'Je levens zijn op 💥'}
      knop={{ tekst: 'Naar de uitslag', onClick: onKlaar }}
    >
      <p className="mg-race-telling">
        <span>
          <strong>{stand.punten}</strong> punten
        </span>
        <span>
          <strong>{stand.levens}</strong> van de {LEVENS} levens over
        </span>
        <span>
          <strong>{stand.munten}</strong> munten, <strong>{stand.zakken}</strong> geldzakken
        </span>
        <span>
          <strong>{route}%</strong> van de route
        </span>
      </p>
      <p>
        Je ontweek <strong>{ontweken.filter((u) => !u.minder).length}</strong> onnodige uitgaven.
        Doet de gemeente die niet, dan scheelt dat <strong>{mln(b.elkJaar)} elk jaar</strong> en{' '}
        <strong>{mln(b.eenmalig)} eenmalig</strong>.
        {ontweken.some((u) => u.minder) && (
          <>
            {' '}
            En {ontweken.filter((u) => u.minder).length} plannen kunnen met minder geld. Hoeveel
            minder, kies je zelf in het Beleidshuis.
          </>
        )}
      </p>
      {stand.geraakt.length > 0 && (
        <>
          <h4>Geraakt ({stand.geraakt.length})</h4>
          <UitgavenLijst lijst={stand.geraakt} testid="mg-race-geraakt" />
        </>
      )}
      {ontweken.length > 0 && (
        <>
          <h4>Ontweken ({ontweken.length})</h4>
          <UitgavenLijst lijst={ontweken} testid="mg-race-ontweken" />
        </>
      )}
      {stand.kern.length > 0 && (
        <>
          <h4>Kerntaken die je pakte</h4>
          <KernLijst lijst={stand.kern} />
        </>
      )}
      <p>
        <strong>Wat leer je?</strong> Veel kleine uitgaven samen worden miljoenen. Wat de gemeente
        niet doet, hoeft ze ook niet te betalen. Kerntaken, zoals de brandweer, moet ze wel blijven
        doen.
      </p>
      <p className="klein">
        Alle bedragen komen uit de begroting {jaar} van de gemeente Groningen. Welke plannen onnodig
        zijn en welke met minder geld kunnen, koos de fractie van VVD Groningen. Elk jaar en
        eenmalig tellen we apart: die kun je niet zomaar optellen. ⚠︎ Of het geld meteen vrij komt,
        hangt af van afspraken die al lopen.
        {bron && (
          <>
            {' '}
            Citaten:{' '}
            <a href={bron.url} target="_blank" rel="noopener noreferrer">
              {bron.bron}
            </a>
            .
          </>
        )}
      </p>
    </SpelKaart>
  );
}

function UitgavenLijst({ lijst, testid }: { lijst: Uitgave[]; testid: string }) {
  return (
    <ul className="mg-lijst" data-testid={testid}>
      {lijst.map((u) => (
        <li key={u.id}>
          <strong>
            {u.naam}: {bedrag(u.bedragMln)}
          </strong>{' '}
          <span className="klein">
            ({hoeVaak(u)}, begroting {u.jaar}). {u.uitleg}
          </span>
          {u.vvd ? (
            <blockquote className="mg-race-vvd">
              <strong>Volgens VVD Groningen niet nodig:</strong> “{u.vvd}”
              <footer>Verkiezingsprogramma VVD Groningen 2026-2030, p. {u.pagina}</footer>
            </blockquote>
          ) : (
            <span className="klein">
              {' '}
              {u.minder
                ? 'Kan volgens VVD Groningen met minder geld.'
                : 'Volgens VVD Groningen onnodig.'}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function KernLijst({ lijst }: { lijst: Kerntaak[] }) {
  return (
    <ul className="mg-lijst">
      {lijst.map((k) => (
        <li key={k.id}>
          <strong>
            {k.naam}: {bedrag(k.bedragMln)} per jaar
          </strong>{' '}
          <span className="klein">
            {k.uitleg}
            {k.wet ? ` Moet van de wet: ${k.wet}.` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

// -------------------------------------------------------------------------------------------------
// Tekenen
// -------------------------------------------------------------------------------------------------

/** Wat er in één beeld te zien is. */
type Beeld = {
  /** afgelegde afstand (beeldpunten) */
  s: number;
  x: number;
  kantel: number;
  /** de rijen met hun hoogte op het scherm */
  rijen: { rij: Rij; y: number }[];
  /** de finish, het station (hoogte op het scherm) */
  finishY: number;
  stationY: number;
  /** seconden, voor de animatie */
  anim: number;
  trappen: number;
  zwevers: Zwever[];
  gepakt: ReadonlySet<string>;
  nu: number;
  /** 0 tot 1: hoe sterk de botsing nog te zien is */
  bots: number;
  knipper: boolean;
  banner?: { tekst: string; sterkte: number };
  aftel?: string;
  pauze: boolean;
  stil: boolean;
  /** voetgangers op de stoep */
  voetgangers: { x: number; y: number; kleur: string; stap: number }[];
};

const VOETGANGERS = [
  { x: 56, w: 300, v: 18, kleur: '#c2410c' },
  { x: 300, w: 520, v: -22, kleur: '#0f766e' },
  { x: 54, w: 880, v: -15, kleur: '#7c3aed' },
  { x: 302, w: 1150, v: 20, kleur: '#be123c' },
  { x: 57, w: 1500, v: 24, kleur: '#1d4ed8' },
  { x: 299, w: 1820, v: -18, kleur: '#a16207' },
];
const VOETGANGER_LUS = 2200;

/** Maakt het beeld uit de wereld. */
function beeld(w: Wereld, nu: number, stil: boolean, pauze = false): Beeld {
  const tSpel = Math.max(0, w.t);
  const s = stil ? w.volgende * RIJ_STIL : afstand(tSpel);
  const plek = (r: Rij) => (stil ? (r.nr + 1) * RIJ_STIL : r.w);
  const rijen: Beeld['rijen'] = [];
  for (let i = Math.max(0, w.volgende - 2); i < w.rit.rijen.length; i++) {
    const rij = w.rit.rijen[i];
    if (!rij) continue;
    const y = SPELER_Y - (plek(rij) - s);
    if (y < -70) break;
    // wat je al passeerde blijft even liggen, behalve wat je pakte
    rijen.push({ rij, y });
  }
  const finish = stil ? (w.rit.rijen.length + 1) * RIJ_STIL : afstand(DUUR);
  const doelX = BANEN[w.baan] ?? BANEN[1];
  const sinds = (nu - w.bots) / 1000;
  const faseSinds = (nu - w.faseBegin) / 1000;
  const fase = FASES[w.fase];
  const lus = (y: number) => ((y % VOETGANGER_LUS) + VOETGANGER_LUS) % VOETGANGER_LUS;
  return {
    s,
    x: w.x,
    kantel: stil ? 0 : Math.max(-0.35, Math.min(0.35, ((doelX - w.x) / STROOK) * 0.35)),
    rijen,
    finishY: SPELER_Y - (finish - s),
    stationY: SPELER_Y + 135 + s,
    anim: stil ? 0 : nu / 1000,
    trappen: stil ? 0.6 : s / 14,
    zwevers: w.zwevers,
    gepakt: w.gepakt,
    nu,
    bots: stil ? 0 : Math.max(0, 1 - sinds / 0.6),
    knipper: !stil && sinds < 1.2 && Math.floor(sinds * 10) % 2 === 0,
    ...(!stil && fase && faseSinds < 1.8 && w.fase > 0
      ? {
          banner: {
            tekst: `Fase ${w.fase + 1}: ${fase.naam}!`,
            sterkte: Math.min(1, (1.8 - faseSinds) * 2),
          },
        }
      : {}),
    ...(!stil && w.t < 0
      ? { aftel: w.t < -AFTELLEN * 0.66 ? '3' : w.t < -AFTELLEN * 0.33 ? '2' : '1' }
      : !stil && w.t < 0.7
        ? { aftel: 'Fiets!' }
        : {}),
    pauze,
    stil,
    voetgangers: VOETGANGERS.map((v) => {
      const wy = v.w + v.v * (stil ? 0 : tSpel);
      return {
        x: v.x,
        y: lus(SPELER_Y - wy + s + 100) - 100,
        kleur: v.kleur,
        stap: stil ? 0 : Math.sin(nu / 160 + v.w),
      };
    }),
  };
}

/** Een vaste reeks "toevallige" getallen, zodat de straat er steeds hetzelfde uitziet. */
function reeks(zaad: number): () => number {
  let a = zaad;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
}

/** De straat is een tegel die zich herhaalt. */
const TEGEL = 960;
let tegelBeeld: HTMLCanvasElement | undefined;

function tegel(): HTMLCanvasElement {
  if (tegelBeeld) return tegelBeeld;
  const c = document.createElement('canvas');
  c.width = BREEDTE * 2;
  c.height = TEGEL * 2;
  const ctx = c.getContext('2d');
  tegelBeeld = c;
  if (!ctx) return c;
  ctx.scale(2, 2);
  const r = reeks(7);
  /** Iets tekenen dat over de rand van de tegel kan lopen: dan ook aan de andere kant. */
  const rond = (y: number, h: number, f: (y: number) => void) => {
    f(y);
    if (y - h < 0) f(y + TEGEL);
    if (y + h > TEGEL) f(y - TEGEL);
  };

  // gracht
  const water = ctx.createLinearGradient(0, 0, 40, 0);
  water.addColorStop(0, '#1f5a75');
  water.addColorStop(1, '#3a86a8');
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, 40, TEGEL);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const x = 3 + r() * 32;
    const y = r() * TEGEL;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 3, y - 1.5, x + 6, y);
    ctx.stroke();
  }
  // woonboten
  for (const y of [140, 610]) woonboot(ctx, y, r);
  // kade
  ctx.fillStyle = '#8d877d';
  ctx.fillRect(38, 0, 9, TEGEL);
  ctx.fillStyle = '#a39d92';
  for (let y = 0; y < TEGEL; y += 12) ctx.fillRect(39, y + 1, 7, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(38, 0, 1.5, TEGEL);
  // stoepen
  stoep(ctx, 47, 23);
  stoep(ctx, 290, 22);
  // stoepranden
  for (const x of [70, 288]) {
    ctx.fillStyle = '#a7a196';
    ctx.fillRect(x, 0, 2, TEGEL);
  }
  // fietspad: rood asfalt
  const asfalt = ctx.createLinearGradient(WEG_LINKS, 0, WEG_RECHTS, 0);
  asfalt.addColorStop(0, '#9c4136');
  asfalt.addColorStop(0.08, '#b04d40');
  asfalt.addColorStop(0.92, '#b04d40');
  asfalt.addColorStop(1, '#9c4136');
  ctx.fillStyle = asfalt;
  ctx.fillRect(WEG_LINKS, 0, WEG_RECHTS - WEG_LINKS, TEGEL);
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,220,200,0.10)';
    ctx.fillRect(WEG_LINKS + r() * (WEG_RECHTS - WEG_LINKS), r() * TEGEL, 1.2, 1.2);
  }
  // lijnen
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(WEG_LINKS + 3, 0, 2, TEGEL);
  ctx.fillRect(WEG_RECHTS - 5, 0, 2, TEGEL);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const x of [WEG_LINKS + STROOK, WEG_LINKS + 2 * STROOK])
    for (let y = 0; y < TEGEL; y += 40) ctx.fillRect(x - 1, y, 2, 20);
  // fietsjes op het asfalt
  ctx.globalAlpha = 0.55;
  fietsTeken(ctx, BANEN[0], 300);
  fietsTeken(ctx, BANEN[2], 780);
  ctx.globalAlpha = 1;
  // gevels met daken
  let y = 0;
  const daken = ['#7b3b2e', '#4b5563', '#8a4a2f', '#5a4636', '#6b2f2a', '#3f4b5a'];
  const muren = ['#8e3b2a', '#b5835a', '#7a2e22', '#d9c7a7', '#9a5a3c'];
  while (y < TEGEL) {
    const h = Math.min(TEGEL - y, 26 + Math.floor(r() * 18));
    if (h < 14) break;
    huis(
      ctx,
      y,
      h,
      daken[Math.floor(r() * daken.length)] ?? '#7b3b2e',
      muren[Math.floor(r() * muren.length)] ?? '#8e3b2a',
      r,
    );
    y += h;
  }
  // geparkeerde fietsen tegen de gevels
  for (const fy of [80, 95, 110, 420, 435, 700, 715, 730, 745]) {
    ctx.save();
    ctx.translate(304, fy);
    ctx.rotate(Math.PI / 2 - 0.35);
    geparkeerd(ctx, (fy * 7) % 5);
    ctx.restore();
  }
  // bomen en lantaarns
  for (let by = 40; by < TEGEL; by += 120 + Math.floor(r() * 40)) {
    const br = 15 + r() * 5;
    rond(by, br + 6, (yy) => boom(ctx, 56, yy, br, r()));
  }
  for (let ly = 100; ly < TEGEL; ly += 240) {
    rond(ly, 16, (yy) => lantaarn(ctx, 66, yy));
    rond(ly + 120, 16, (yy) => lantaarn(ctx, 294, yy));
  }
  return c;
}

function stoep(ctx: CanvasRenderingContext2D, x: number, b: number): void {
  ctx.fillStyle = '#d7d1c4';
  ctx.fillRect(x, 0, b, TEGEL);
  ctx.strokeStyle = '#bfb8aa';
  ctx.lineWidth = 0.7;
  for (let y = 0; y < TEGEL; y += 8) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + b, y);
    ctx.stroke();
  }
  for (let xx = x + 8; xx < x + b; xx += 8) {
    ctx.beginPath();
    ctx.moveTo(xx, 0);
    ctx.lineTo(xx, TEGEL);
    ctx.stroke();
  }
}

function woonboot(ctx: CanvasRenderingContext2D, y: number, r: () => number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rondRechthoek(ctx, 7, y + 3, 30, 92, 8);
  ctx.fill();
  ctx.fillStyle = r() < 0.5 ? '#2f4f3a' : '#3b4a6b';
  rondRechthoek(ctx, 5, y, 30, 92, 8);
  ctx.fill();
  ctx.fillStyle = '#e8e1d3';
  rondRechthoek(ctx, 9, y + 14, 22, 60, 3);
  ctx.fill();
  ctx.fillStyle = '#6b5644';
  ctx.fillRect(9, y + 42, 22, 2);
  ctx.fillStyle = '#4c8a3c';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(10 + r() * 20, y + 6 + r() * 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(20, y + 84, 3, 0, Math.PI * 2);
  ctx.fill();
}

function huis(
  ctx: CanvasRenderingContext2D,
  y: number,
  h: number,
  dak: string,
  muur: string,
  r: () => number,
): void {
  const x = 312;
  // gevel aan de straatkant
  ctx.fillStyle = muur;
  ctx.fillRect(x, y, 6, h);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let wy = y + 5; wy < y + h - 6; wy += 9) ctx.fillRect(x + 1.5, wy, 3, 5);
  // dak in twee helften, de nok in het midden
  ctx.fillStyle = dak;
  ctx.fillRect(x + 6, y, BREEDTE - x - 6, h);
  const licht = ctx.createLinearGradient(0, y, 0, y + h);
  licht.addColorStop(0, 'rgba(255,255,255,0.22)');
  licht.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  licht.addColorStop(0.5, 'rgba(0,0,0,0.12)');
  licht.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = licht;
  ctx.fillRect(x + 6, y, BREEDTE - x - 6, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 0.6;
  for (let dx = x + 10; dx < BREEDTE; dx += 4) {
    ctx.beginPath();
    ctx.moveTo(dx, y + 1);
    ctx.lineTo(dx, y + h - 1);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + 6, y + h / 2 - 0.6, BREEDTE - x - 6, 1.2);
  // schoorsteen of dakkapel
  if (r() < 0.6) {
    const sx = x + 18 + r() * 22;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(sx + 2, y + h / 2 - 3, 6, 6);
    ctx.fillStyle = '#7a3a2b';
    ctx.fillRect(sx, y + h / 2 - 5, 6, 6);
    ctx.fillStyle = '#3a2a24';
    ctx.fillRect(sx + 1.5, y + h / 2 - 3.5, 3, 3);
  } else {
    ctx.fillStyle = '#e5e1d8';
    ctx.fillRect(x + 10, y + h * 0.62, 10, h * 0.26);
    ctx.fillStyle = '#5b7a99';
    ctx.fillRect(x + 11.5, y + h * 0.66, 7, h * 0.16);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x, y, BREEDTE - x, 1);
}

function boom(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, v: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 6, r, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  const delen = [
    [0, 0, 1],
    [-0.45, -0.35, 0.6],
    [0.45, -0.3, 0.62],
    [-0.35, 0.45, 0.6],
    [0.4, 0.4, 0.58],
  ] as const;
  for (const [dx, dy, f] of delen) {
    const cx = x + dx * r;
    const cy = y + dy * r;
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 1, cx, cy, r * f);
    g.addColorStop(0, v < 0.5 ? '#8cc96a' : '#7dbb5c');
    g.addColorStop(0.6, v < 0.5 ? '#4f9a3b' : '#3f8a3a');
    g.addColorStop(1, '#2c6328');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * f, 0, Math.PI * 2);
    ctx.fill();
  }
}

function lantaarn(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const gloed = ctx.createRadialGradient(x, y, 1, x, y, 15);
  gloed.addColorStop(0, 'rgba(255,230,150,0.45)');
  gloed.addColorStop(1, 'rgba(255,230,150,0)');
  ctx.fillStyle = gloed;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 9, y + 9);
  ctx.stroke();
  ctx.fillStyle = '#2d3640';
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
}

/** Een fietsje als teken op het fietspad. */
function fietsTeken(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x - 9, y, 6, 0, Math.PI * 2);
  ctx.moveTo(x + 15, y);
  ctx.arc(x + 9, y, 6, 0, Math.PI * 2);
  ctx.moveTo(x - 9, y);
  ctx.lineTo(x - 2, y - 9);
  ctx.lineTo(x + 6, y - 9);
  ctx.lineTo(x + 9, y);
  ctx.moveTo(x - 2, y - 9);
  ctx.lineTo(x, y);
  ctx.lineTo(x + 6, y - 9);
  ctx.stroke();
}

/** Een geparkeerde fiets, van boven. */
function geparkeerd(ctx: CanvasRenderingContext2D, kleur: number): void {
  const kleuren = ['#1f2937', '#1e40af', '#991b1b', '#065f46', '#6b7280'];
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(-11, -1, 24, 4);
  ctx.fillStyle = '#222';
  rondRechthoek(ctx, -12, -1.5, 8, 3, 1.5);
  ctx.fill();
  rondRechthoek(ctx, 4, -1.5, 8, 3, 1.5);
  ctx.fill();
  ctx.strokeStyle = kleuren[kleur] ?? '#1f2937';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.moveTo(7, -5);
  ctx.lineTo(7, 5);
  ctx.stroke();
}

/** Het Hoofdstation: bakstenen gevel met torens en een klok. `y` is de onderkant. */
function station(ctx: CanvasRenderingContext2D, y: number): void {
  if (y < -10 || y - 110 > HOOGTE) return;
  // het plein voor het station
  ctx.fillStyle = '#cfc6b6';
  ctx.fillRect(0, y - 112, BREEDTE, 24);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  for (let x = 0; x < BREEDTE; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, y - 112);
    ctx.lineTo(x, y - 88);
    ctx.stroke();
  }
  // fietsenrekken op het plein
  for (let x = 8; x < WEG_LINKS - 6; x += 6) {
    ctx.save();
    ctx.translate(x, y - 100);
    ctx.rotate(Math.PI / 2);
    geparkeerd(ctx, x % 5);
    ctx.restore();
  }
  for (let x = WEG_RECHTS + 8; x < BREEDTE - 4; x += 6) {
    ctx.save();
    ctx.translate(x, y - 100);
    ctx.rotate(Math.PI / 2);
    geparkeerd(ctx, (x + 2) % 5);
    ctx.restore();
  }
  // het gebouw
  const baksteen = ctx.createLinearGradient(0, y - 88, 0, y);
  baksteen.addColorStop(0, '#a5523a');
  baksteen.addColorStop(1, '#7e3a28');
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, y - 90, BREEDTE, 6);
  ctx.fillStyle = baksteen;
  ctx.fillRect(0, y - 84, BREEDTE, 84);
  // natuurstenen banden
  ctx.fillStyle = '#e9dcc0';
  ctx.fillRect(0, y - 84, BREEDTE, 3);
  ctx.fillRect(0, y - 50, BREEDTE, 2.5);
  // ramen met bogen
  for (let x = 10; x < BREEDTE - 10; x += 22) {
    if (x > 140 && x < 220) continue;
    raam(ctx, x, y - 78, 12, 22);
    raam(ctx, x, y - 44, 12, 20);
  }
  // de middenhal, hoger, met een groot boograam en de klok
  ctx.fillStyle = '#4a5563';
  ctx.beginPath();
  ctx.moveTo(130, y - 84);
  ctx.lineTo(150, y - 112);
  ctx.lineTo(210, y - 112);
  ctx.lineTo(230, y - 84);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = baksteen;
  ctx.fillRect(140, y - 96, 80, 96);
  ctx.fillStyle = '#e9dcc0';
  ctx.fillRect(140, y - 96, 80, 3);
  raam(ctx, 154, y - 86, 52, 46);
  ctx.fillStyle = '#e9dcc0';
  rondRechthoek(ctx, 150, y - 34, 60, 9, 2);
  ctx.fill();
  ctx.fillStyle = '#5a2a1c';
  ctx.font = '800 7px Asap, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GRONINGEN', 180, y - 29.5);
  // deuren
  ctx.fillStyle = '#3b2a20';
  for (const dx of [156, 174, 192]) {
    rondRechthoek(ctx, dx, y - 20, 12, 20, 5);
    ctx.fill();
  }
  // de klok
  ctx.fillStyle = '#e9dcc0';
  ctx.beginPath();
  ctx.arc(180, y - 104, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fffbea';
  ctx.beginPath();
  ctx.arc(180, y - 104, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(180, y - 104);
  ctx.lineTo(180, y - 109);
  ctx.moveTo(180, y - 104);
  ctx.lineTo(183.5, y - 102.5);
  ctx.stroke();
  // torens op de hoeken van de middenhal
  for (const tx of [128, 222]) {
    ctx.fillStyle = baksteen;
    ctx.fillRect(tx - 7, y - 104, 14, 104);
    ctx.fillStyle = '#e9dcc0';
    ctx.fillRect(tx - 7, y - 104, 14, 2.5);
    ctx.fillStyle = '#3f4a57';
    ctx.beginPath();
    ctx.moveTo(tx - 9, y - 104);
    ctx.lineTo(tx, y - 128);
    ctx.lineTo(tx + 9, y - 104);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(tx, y - 129, 1.8, 0, Math.PI * 2);
    ctx.fill();
    raam(ctx, tx - 3, y - 96, 6, 12);
  }
  // hoekpaviljoens
  for (const px of [0, BREEDTE - 40]) {
    ctx.fillStyle = '#4a5563';
    ctx.beginPath();
    ctx.moveTo(px, y - 84);
    ctx.lineTo(px + 8, y - 98);
    ctx.lineTo(px + 32, y - 98);
    ctx.lineTo(px + 40, y - 84);
    ctx.closePath();
    ctx.fill();
  }
}

function raam(ctx: CanvasRenderingContext2D, x: number, y: number, b: number, h: number): void {
  ctx.fillStyle = '#e9dcc0';
  ctx.beginPath();
  ctx.moveTo(x - 1.5, y + h);
  ctx.lineTo(x - 1.5, y + b / 2);
  ctx.arc(x + b / 2, y + b / 2, b / 2 + 1.5, Math.PI, 0);
  ctx.lineTo(x + b + 1.5, y + h);
  ctx.closePath();
  ctx.fill();
  const glas = ctx.createLinearGradient(0, y, 0, y + h);
  glas.addColorStop(0, '#9cc4dd');
  glas.addColorStop(1, '#2f4f68');
  ctx.fillStyle = glas;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + b / 2);
  ctx.arc(x + b / 2, y + b / 2, b / 2, Math.PI, 0);
  ctx.lineTo(x + b, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(233,220,192,0.8)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x + b / 2, y + 1);
  ctx.lineTo(x + b / 2, y + h);
  ctx.moveTo(x, y + h * 0.55);
  ctx.lineTo(x + b, y + h * 0.55);
  ctx.stroke();
}

/** De finish bij de Grote Markt. */
function finish(ctx: CanvasRenderingContext2D, y: number): void {
  if (y < -60 || y > HOOGTE + 20) return;
  const b = WEG_RECHTS - WEG_LINKS;
  for (let i = 0; i < b / 8; i++)
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#111827' : '#ffffff';
      ctx.fillRect(WEG_LINKS + i * 8, y + j * 8 - 8, 8, 8);
    }
  for (const x of [WEG_LINKS - 4, WEG_RECHTS + 4]) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x - 1, y - 2, 6, 4);
    ctx.fillStyle = '#374151';
    ctx.fillRect(x - 2, y - 42, 4, 42);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rondRechthoek(ctx, WEG_LINKS - 2, y - 44, b + 8, 22, 4);
  ctx.fill();
  const doek = ctx.createLinearGradient(0, y - 48, 0, y - 26);
  doek.addColorStop(0, '#2563eb');
  doek.addColorStop(1, '#1233c4');
  ctx.fillStyle = doek;
  rondRechthoek(ctx, WEG_LINKS - 6, y - 48, b + 12, 22, 4);
  ctx.fill();
  ctx.fillStyle = '#ff7a00';
  ctx.fillRect(WEG_LINKS - 6, y - 30, b + 12, 4);
  ctx.fillStyle = '#fff';
  ctx.font = '800 13px Asap, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FINISH · GROTE MARKT', BREEDTE / 2, y - 39);
}

/** Borden (uitgaven en kerntaken) worden één keer getekend en dan hergebruikt. */
const bordBeelden = new Map<string, HTMLCanvasElement>();
const BORD_B = 68;
const BORD_H = 64;

function bordBeeld(
  sleutel: string,
  kop: string,
  naam: string,
  onder: [string, string],
  toon: 'rood' | 'oranje' | 'groen',
): HTMLCanvasElement {
  const groen = toon === 'groen';
  const oud = bordBeelden.get(sleutel);
  if (oud) return oud;
  const c = document.createElement('canvas');
  const r = 2;
  const b = BORD_B + 12;
  const h = BORD_H + 14;
  c.width = b * r;
  c.height = h * r;
  bordBeelden.set(sleutel, c);
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.scale(r, r);
  const x = 6;
  const y = 4;
  const kleur = groen ? '#15875a' : toon === 'oranje' ? '#e07000' : '#d63a24';
  const donker = groen ? '#0b5e3c' : toon === 'oranje' ? '#9a4a00' : '#9e2414';
  // schaduw op de grond
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x + BORD_B / 2 + 4, y + BORD_H + 3, BORD_B / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // poten
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(x + 12, y + BORD_H - 14, 3, 15);
  ctx.fillRect(x + BORD_B - 15, y + BORD_H - 14, 3, 15);
  // het bord
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  rondRechthoek(ctx, x, y, BORD_B, BORD_H - 8, 6);
  const vlak = ctx.createLinearGradient(0, y, 0, y + BORD_H);
  vlak.addColorStop(0, groen ? '#1f9d6b' : '#ffffff');
  vlak.addColorStop(1, groen ? '#127a51' : toon === 'oranje' ? '#fff0dc' : '#fde9e4');
  ctx.fillStyle = vlak;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = kleur;
  ctx.stroke();
  // kopje
  ctx.save();
  rondRechthoek(ctx, x, y, BORD_B, BORD_H - 8, 6);
  ctx.clip();
  ctx.fillStyle = groen ? donker : kleur;
  ctx.fillRect(x, y, BORD_B, 11);
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = '800 7.5px Asap, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kop, x + BORD_B / 2, y + 6);
  // naam: hooguit twee regels
  let maat = 9.5;
  let regels: string[] = [];
  for (; maat >= 7.5; maat -= 0.5) {
    ctx.font = `800 ${maat}px Asap, system-ui, sans-serif`;
    regels = breekTekst(ctx, naam, BORD_B - 6);
    if (regels.length <= 2 && regels.every((l) => ctx.measureText(l).width <= BORD_B - 4)) break;
  }
  if (regels.length > 2) {
    regels = regels.slice(0, 2);
    let l = regels[1] ?? '';
    while (l.length > 3 && ctx.measureText(`${l}…`).width > BORD_B - 6) l = l.slice(0, -1);
    regels[1] = `${l.trimEnd()}…`;
  }
  ctx.fillStyle = groen ? '#ffffff' : '#2b1a08';
  const midden = y + 25;
  regels.forEach((l, i) =>
    ctx.fillText(l, x + BORD_B / 2, midden + (i - (regels.length - 1) / 2) * (maat + 1)),
  );
  ctx.font = '800 9px Asap, system-ui, sans-serif';
  ctx.fillStyle = groen ? '#fff7c2' : donker;
  ctx.fillText(onder[0], x + BORD_B / 2, y + 40);
  ctx.font = '600 7.5px Asap, system-ui, sans-serif';
  ctx.fillStyle = groen ? 'rgba(255,255,255,0.9)' : '#6b4a3a';
  ctx.fillText(onder[1], x + BORD_B / 2, y + 49);
  // rood-wit lint onderaan (alleen bij uitgaven)
  if (!groen) {
    ctx.save();
    rondRechthoek(ctx, x + 4, y + BORD_H - 9, BORD_B - 8, 6, 2);
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y + BORD_H - 10, BORD_B, 8);
    ctx.fillStyle = kleur;
    for (let i = -10; i < BORD_B; i += 8) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + BORD_H - 3);
      ctx.lineTo(x + i + 4, y + BORD_H - 3);
      ctx.lineTo(x + i + 10, y + BORD_H - 10);
      ctx.lineTo(x + i + 6, y + BORD_H - 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  return c;
}

function tekenBord(
  ctx: CanvasRenderingContext2D,
  beeld: HTMLCanvasElement,
  cx: number,
  cy: number,
): void {
  const b = BORD_B + 12;
  const h = BORD_H + 14;
  ctx.drawImage(beeld, cx - b / 2, cy - h / 2 - 6, b, h);
}

function munt(ctx: CanvasRenderingContext2D, x: number, y: number, draai: number): void {
  const r = 11;
  const f = 0.3 + 0.7 * Math.abs(Math.cos(draai));
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 13, r * 0.9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(f, 1);
  ctx.fillStyle = '#a16d05';
  ctx.beginPath();
  ctx.arc(1.2, 1.2, r, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, r);
  g.addColorStop(0, '#fff6b0');
  g.addColorStop(0.45, '#f7cf3a');
  g.addColorStop(1, '#c48a07');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(130,85,5,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r - 2.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#8a5d05';
  ctx.font = '800 12px Asap, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('€', 0, 0.5);
  ctx.restore();
  if (f > 0.8) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(x - 4, y - 5, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function zak(ctx: CanvasRenderingContext2D, x: number, y: number, wieg: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 15, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(wieg) * 0.08);
  const g = ctx.createRadialGradient(-5, -2, 2, 0, 3, 16);
  g.addColorStop(0, '#e0a96d');
  g.addColorStop(0.6, '#b5772e');
  g.addColorStop(1, '#7a4a18');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-6, -9);
  ctx.quadraticCurveTo(-16, 0, -12, 10);
  ctx.quadraticCurveTo(0, 17, 12, 10);
  ctx.quadraticCurveTo(16, 0, 6, -9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6b4219';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#b5772e';
  ctx.beginPath();
  ctx.moveTo(-6, -9);
  ctx.lineTo(-9, -15);
  ctx.lineTo(0, -12);
  ctx.lineTo(9, -15);
  ctx.lineTo(6, -9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#ffcd3c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -9);
  ctx.lineTo(6, -9);
  ctx.stroke();
  ctx.fillStyle = '#ffd84d';
  ctx.font = '800 13px Asap, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('€', 0, 3);
  ctx.restore();
}

/** De fietser van boven, op weg naar boven. */
function fietser(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kantel: number,
  trappen: number,
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 6, 11, 26, kantel, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(kantel);
  // wielen
  ctx.fillStyle = '#1f2328';
  rondRechthoek(ctx, -2.5, 9, 5, 18, 2.5);
  ctx.fill();
  rondRechthoek(ctx, -2.5, -29, 5, 18, 2.5);
  ctx.fill();
  // frame
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(0, -19);
  ctx.stroke();
  // fietstassen
  ctx.fillStyle = '#ff7a00';
  rondRechthoek(ctx, -9, 10, 5, 12, 2);
  ctx.fill();
  rondRechthoek(ctx, 4, 10, 5, 12, 2);
  ctx.fill();
  // benen
  const p = Math.sin(trappen) * 5;
  ctx.strokeStyle = '#1c2c4c';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.lineTo(-5, -4 + p);
  ctx.moveTo(4, 4);
  ctx.lineTo(5, -4 - p);
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(-5, -4 + p, 2.2, 0, Math.PI * 2);
  ctx.arc(5, -4 - p, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // stuur
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-11, -17);
  ctx.quadraticCurveTo(0, -21, 11, -17);
  ctx.stroke();
  // lijf in een blauwe jas
  const jas = ctx.createRadialGradient(-3, 0, 1, 0, 3, 13);
  jas.addColorStop(0, '#3b5bff');
  jas.addColorStop(1, '#0f2aa8');
  ctx.fillStyle = jas;
  ctx.beginPath();
  ctx.ellipse(0, 4, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // armen naar het stuur
  ctx.strokeStyle = '#1838c8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-9, 1);
  ctx.lineTo(-10, -15);
  ctx.moveTo(9, 1);
  ctx.lineTo(10, -15);
  ctx.stroke();
  ctx.fillStyle = '#f2c29b';
  ctx.beginPath();
  ctx.arc(-10, -16, 2.2, 0, Math.PI * 2);
  ctx.arc(10, -16, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // sjaal en hoofd
  ctx.fillStyle = '#ff7a00';
  ctx.beginPath();
  ctx.ellipse(0, -1, 6.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const haar = ctx.createRadialGradient(-2, -6, 1, 0, -4, 7);
  haar.addColorStop(0, '#c99a5b');
  haar.addColorStop(1, '#7a5230');
  ctx.fillStyle = haar;
  ctx.beginPath();
  ctx.arc(0, -4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function voetganger(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kleur: string,
  stap: number,
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 3, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.ellipse(x - 2, y + stap * 3, 1.8, 2.6, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 2, y - stap * 3, 1.8, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = kleur;
  ctx.beginPath();
  ctx.ellipse(x, y, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5b3a1e';
  ctx.beginPath();
  ctx.arc(x, y - 0.5, 3, 0, Math.PI * 2);
  ctx.fill();
}

function teken(canvas: HTMLCanvasElement | null, b: Beeld): void {
  const ctx = maakScherp(canvas, BREEDTE, HOOGTE);
  if (!ctx) return;
  ctx.save();
  if (b.bots > 0.4)
    ctx.translate((Math.random() - 0.5) * 6 * b.bots, (Math.random() - 0.5) * 4 * b.bots);

  // de straat
  const t = tegel();
  const off = ((b.s % TEGEL) + TEGEL) % TEGEL;
  ctx.drawImage(t, 0, off - TEGEL, BREEDTE, TEGEL);
  ctx.drawImage(t, 0, off, BREEDTE, TEGEL);
  // glinstering op het water
  if (!b.stil) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 4; i++) {
      const y = (((b.anim * 30 + i * 137 + off) % HOOGTE) + HOOGTE) % HOOGTE;
      ctx.fillRect(6 + ((i * 11) % 24), y, 8, 1.5);
    }
  }
  for (const v of b.voetgangers)
    if (v.y > -10 && v.y < HOOGTE + 10) voetganger(ctx, v.x, v.y, v.kleur, v.stap);

  station(ctx, b.stationY);
  finish(ctx, b.finishY);

  // de rijen
  for (const { rij, y } of b.rijen) {
    rij.vakken.forEach((v, i) => {
      if (!v) return;
      const x = BANEN[i] ?? BANEN[1];
      // wat je pakte is weg; een bord dat je raakte, wordt vaag
      const gepakt = b.gepakt.has(`${rij.nr}:${i}`);
      if (gepakt && v.soort !== 'uitgave') return;
      if (v.soort === 'uitgave') {
        const u = v.uitgave;
        if (gepakt) ctx.globalAlpha = 0.4;
        tekenBord(
          ctx,
          bordBeeld(
            `u:${u.id}`,
            u.minder ? 'KAN MINDER' : 'ONNODIG',
            u.naam,
            [bedrag(u.bedragMln), hoeVaak(u)],
            u.minder ? 'oranje' : 'rood',
          ),
          x,
          y,
        );
        ctx.globalAlpha = 1;
      } else if (v.soort === 'kern') {
        const k = v.kern;
        tekenBord(
          ctx,
          bordBeeld(`k:${k.id}`, 'KERNTAAK', k.naam, ['+1 leven ♥', 'moet van de wet'], 'groen'),
          x,
          y,
        );
      } else if (v.soort === 'munt') munt(ctx, x, y, b.anim * 4 + i + rij.nr);
      else zak(ctx, x, y, b.anim * 3 + i);
    });
  }

  // de fietser
  if (!b.knipper) fietser(ctx, b.x, SPELER_Y, b.kantel, b.trappen);
  else {
    ctx.globalAlpha = 0.35;
    fietser(ctx, b.x, SPELER_Y, b.kantel, b.trappen);
    ctx.globalAlpha = 1;
  }

  // zwevende punten
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 15px Asap, system-ui, sans-serif';
  for (let i = b.zwevers.length - 1; i >= 0; i--) {
    const z = b.zwevers[i];
    if (!z) continue;
    const f = (b.nu - z.begin) / 1100;
    if (f >= 1 || f < 0) {
      if (f >= 1) b.zwevers.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = 1 - f * f;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(z.tekst, z.x, z.y - f * 34);
    ctx.fillStyle = z.kleur;
    ctx.fillText(z.tekst, z.x, z.y - f * 34);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // botsing: rode rand
  if (b.bots > 0) {
    const g = ctx.createRadialGradient(
      BREEDTE / 2,
      HOOGTE / 2,
      HOOGTE * 0.3,
      BREEDTE / 2,
      HOOGTE / 2,
      HOOGTE * 0.75,
    );
    g.addColorStop(0, 'rgba(214,58,36,0)');
    g.addColorStop(1, `rgba(214,58,36,${0.55 * b.bots})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, BREEDTE, HOOGTE);
  }
  // een nieuwe fase, aftellen, pauze
  const groot = (tekst: string, sterkte: number, maat: number) => {
    ctx.globalAlpha = sterkte;
    ctx.font = `800 ${maat}px Asap, system-ui, sans-serif`;
    const breed = ctx.measureText(tekst).width + 36;
    ctx.fillStyle = 'rgba(15,37,71,0.78)';
    rondRechthoek(ctx, BREEDTE / 2 - breed / 2, 150 - maat * 0.9, breed, maat * 1.8, 14);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tekst, BREEDTE / 2, 151);
    ctx.globalAlpha = 1;
  };
  if (b.aftel) groot(b.aftel, 1, b.aftel.length > 1 ? 30 : 40);
  else if (b.banner) groot(b.banner.tekst, b.banner.sterkte, 24);
  if (b.pauze) {
    ctx.fillStyle = 'rgba(15,37,71,0.35)';
    ctx.fillRect(0, 0, BREEDTE, HOOGTE);
    groot('Pauze', 1, 28);
  }
}

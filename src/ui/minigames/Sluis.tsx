/**
 * Oostersluis: "Sluiswachter". Het water in de sluiskolk is het saldo van de begroting (1 streep =
 * € 1 mln, een spelregel). Over het Winschoterdiep varen schepen aan: groene brengen geld in, rode
 * halen geld weg. Als een schip de sluis uit vaart, moet het peil binnen de veilige band liggen.
 * Daarvoor heb je de schuiven van de sluis: bezuinigen op een eigen keuze, de OZB een beetje omhoog
 * of omlaag, en geld uit de reserve.
 *
 * Bij minder beweging loopt er geen klok: elke beurt ligt er één schip in de kolk. Je past het peil
 * aan en laat het schip dan door. De regels en het rekenwerk staan in src/game/mgSluis.ts.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { formatMln } from '../../engine';
import { bekendePosten } from '../../game/minigames';
import {
  AANVAAR,
  algemeneReserve,
  beginStand,
  BEZUINIG_PCT,
  bezuinigOpties,
  BREEDTE,
  HOOGTE,
  isVeilig,
  LEVELS,
  levelDuur,
  levelGehaald,
  levelVoorbij,
  LEVENS,
  maakSchepen,
  OZB_KEER,
  OZB_PCT,
  ozbStap,
  RESERVE_KEER,
  RESERVE_MLN,
  schipFase,
  sluisScore,
  stap,
  VEILIG,
  vertrek,
  WACHT,
  WAND,
  type Actie,
  type Bezuiniging,
  type Gebeurd,
  type Schip,
  type Stand,
} from '../../game/mgSluis';
import { Hud, Meldingen, PauzeKnop, SpelKaart, type Melding } from './kader/kader';
import {
  maakScherp,
  metTeken,
  mln,
  rondRechthoek,
  useLus,
  useStil,
  useToetsen,
} from './kader/hulp';
import type { MinigameProps } from './types';
import './Sluis.css';

type Fase = 'start' | 'spelen' | 'klaar';

/** Wat je in een level deed, voor het overzicht aan het eind. */
type Verslag = {
  nr: number;
  veilig: number;
  schepen: number;
  gehaald: boolean;
  bezuinigd: Bezuiniging[];
  ozbPct: number;
  alarmen: number;
};

/** Toestand van het beeld buiten React: die verandert elk beeld. */
type Sim = {
  klok: number;
  aangekomen: number;
  gecontroleerd: number;
  toonPeil: number;
  deurL: number;
  deurR: number;
  zwevers: Zwever[];
  laatsteNr: number;
};
type Zwever = { tekst: string; x: number; y: number; begin: number; goed: boolean };

const nieuweSim = (): Sim => ({
  klok: 0,
  aangekomen: 0,
  gecontroleerd: 0,
  toonPeil: 0,
  deurL: 0,
  deurR: 0,
  zwevers: [],
  laatsteNr: 0,
});

/** Een getal met een komma en een echt minteken: "+3,2" of "−4,1". */
const kort = (x: number): string => {
  const s = Math.abs(x).toLocaleString('nl-NL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return x < -0.04 ? `−${s}` : x > 0.04 ? `+${s}` : s;
};
const pct = (x: number): string => `${x.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}%`;

export default function Sluis({ data, onKlaar }: MinigameProps) {
  const stil = useStil();
  const [fase, setFase] = useState<Fase>('start');
  const [levelNr, setLevelNr] = useState(1);
  const [schepen, setSchepen] = useState<Schip[]>(() => maakSchepen(data, 1));
  const [stand, dispatch] = useReducer(stap, undefined, () => beginStand());
  const [tijd, setTijd] = useState(0);
  const [pauze, setPauze] = useState(false);
  const [paneel, setPaneel] = useState(false);
  const [verslagen, setVerslagen] = useState<Verslag[]>([]);
  const doek = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim>(nieuweSim());

  const opties = useMemo(() => bezuinigOpties(data), [data]);
  const wetPosten = useMemo(
    () => bekendePosten(data).filter((p) => p.soort === 'wet' && p.wet),
    [data],
  );
  const ozb = useMemo(() => ozbStap(data), [data]);
  const jaar = data.begroting.begrotingsjaar;
  const level = LEVELS[levelNr - 1] ?? LEVELS[0];
  const duur = levelDuur(levelNr, schepen.length);

  const levelKlaar = fase === 'spelen' && levelVoorbij(stand, schepen.length);
  const spelen = fase === 'spelen' && !levelKlaar;
  const veilig = isVeilig(stand.peil);

  // ---------------------------------------------------------------------------------------------
  // Een level beginnen en eindigen
  // ---------------------------------------------------------------------------------------------

  const begin = (nr: number) => {
    const nieuw = maakSchepen(data, nr);
    setLevelNr(nr);
    setSchepen(nieuw);
    dispatch({ soort: 'nieuw', reserveOver: fase === 'start' ? RESERVE_KEER : stand.reserveOver });
    // Rustig: het eerste schip ligt meteen in de kolk.
    if (stil && nieuw[0]) dispatch({ soort: 'aankomst', schip: nieuw[0] });
    sim.current = nieuweSim();
    setTijd(Math.ceil(levelDuur(nr, nieuw.length)));
    setPauze(false);
    setPaneel(false);
    setFase('spelen');
  };

  /** Onthoudt hoe het level ging. */
  const boek = () =>
    setVerslagen((v) => [
      ...v,
      {
        nr: levelNr,
        veilig: stand.veilig,
        schepen: schepen.length,
        gehaald: levelGehaald(stand, schepen.length),
        bezuinigd: stand.bezuinigd,
        ozbPct: stand.ozbPct,
        alarmen: stand.alarmen,
      },
    ]);

  // ---------------------------------------------------------------------------------------------
  // Spelen
  // ---------------------------------------------------------------------------------------------

  const doe = (a: Actie) => {
    if (!spelen || pauze) return;
    dispatch(a);
  };

  /** Rustig: het schip in de kolk vaart uit, het volgende komt binnen. */
  const laatDoor = () => {
    if (!spelen || !stil) return;
    dispatch({ soort: 'controle' });
    const volgend = schepen[stand.klaar + 1];
    // Na het laatste schip, of als de levens op raken, komt er geen schip meer.
    const laatsteLeven = !veilig && stand.levens <= 1;
    if (volgend && !laatsteLeven) dispatch({ soort: 'aankomst', schip: volgend });
  };

  const ozbOp = () => doe({ soort: 'ozb', richting: 1, stapMln: ozb });
  const ozbAf = () => doe({ soort: 'ozb', richting: -1, stapMln: ozb });
  const reserve = () => doe({ soort: 'reserve' });
  const bezuinig = (o: Bezuiniging) => {
    doe({ soort: 'bezuinig', optie: o });
    setPaneel(false);
  };

  useToetsen(spelen, (e) => {
    const k = e.key.toLowerCase();
    if (k === 'p' && !stil) setPauze((p) => !p);
    else if (pauze) return;
    else if (k === 'o' || e.key === 'ArrowUp') ozbOp();
    else if (k === 'l' || e.key === 'ArrowDown') ozbAf();
    else if (k === 'r') reserve();
    else if (k === 'b') setPaneel((p) => !p);
    else if (stil && (e.key === ' ' || e.key === 'Enter')) laatDoor();
    else return;
    e.preventDefault();
  });

  // Elk beeld (niet bij minder beweging): de klok, de schepen, het water.
  useLus(spelen && !stil, (dt, nu) => {
    const s = sim.current;
    if (!pauze) {
      s.klok += dt;
      while (s.aangekomen < schepen.length && s.klok >= vertrek(levelNr, s.aangekomen) + AANVAAR) {
        const schip = schepen[s.aangekomen];
        if (schip) dispatch({ soort: 'aankomst', schip });
        s.aangekomen++;
      }
      while (
        s.gecontroleerd < s.aangekomen &&
        s.klok >= vertrek(levelNr, s.gecontroleerd) + AANVAAR + WACHT
      ) {
        dispatch({ soort: 'controle' });
        s.gecontroleerd++;
      }
      const rest = Math.max(0, Math.ceil(duur - s.klok));
      if (rest !== tijd) setTijd(rest);
      s.toonPeil += (stand.peil - s.toonPeil) * Math.min(1, dt * 5);
    }
    if (stand.nr !== s.laatsteNr) {
      s.laatsteNr = stand.nr;
      zweef(s, stand.gebeurd, nu);
    }
    const beeld = beeldVanSim(s, schepen, levelNr, dt, pauze);
    teken(doek.current, beeld, nu, pauze);
  });

  // Bij minder beweging: tekenen als de stand verandert (zonder golven of wolken die bewegen).
  useEffect(() => {
    if (stil && spelen) teken(doek.current, stilBeeld(stand, schepen), 0, false);
  }, [stil, spelen, stand, schepen]);

  // ---------------------------------------------------------------------------------------------
  // Teksten
  // ---------------------------------------------------------------------------------------------

  const melding: Melding | undefined = stand.gebeurd
    ? {
        tekst: meldTekst(stand.gebeurd, stand),
        toon: toonVan(stand.gebeurd),
        tijd: stand.nr,
      }
    : undefined;

  const levens = '♥'.repeat(stand.levens) + '♡'.repeat(Math.max(0, LEVENS - stand.levens));
  const hud = (
    <div data-peil={stand.peil}>
      <Hud
        testid="mg-sluis-stand"
        icoon="⚓"
        links={[
          {
            label: 'Peil',
            waarde: `${kort(stand.peil)} mln`,
            toon: veilig ? 'goed' : 'fout',
            testid: 'mg-sluis-peil',
          },
          { label: 'Levens', waarde: <span aria-label={`${stand.levens} levens`}>{levens}</span> },
        ]}
        rechts={[
          stil
            ? {
                label: 'Schip',
                waarde: `${Math.min(stand.klaar + 1, schepen.length)} van ${schepen.length}`,
              }
            : { label: 'Tijd', waarde: tijd, ...(tijd <= 10 ? { toon: 'fout' as const } : {}) },
          { label: 'Level', waarde: levelNr },
        ]}
      />
    </div>
  );

  // Posten die moeten van de wet: die van de schepen tot nu toe, anders de grootste twee.
  const wetGezien = wetPosten.filter((p) =>
    schepen.slice(0, stand.klaar + 1).some((s) => s.wet && s.naam === p.naam),
  );
  const wetLijst = (
    wetGezien.length ? wetGezien : [...wetPosten].sort((a, b) => b.bedragMln - a.bedragMln)
  ).slice(0, 3);

  // ---------------------------------------------------------------------------------------------
  // Scherm
  // ---------------------------------------------------------------------------------------------

  if (fase === 'start')
    return (
      <div className="mg-kader mg-sluis2">
        <SpelKaart
          titel="Sluiswachter van de Oostersluis"
          knop={{ tekst: 'Start level 1', onClick: () => begin(1) }}
        >
          <p>
            Het water in de sluis is het <strong>saldo</strong> van de begroting: wat er overblijft
            als je de uitgaven van de inkomsten aftrekt. Spelregel: 1 streep = € 1 mln. Houd het
            peil tussen <strong>−{VEILIG}</strong> en <strong>+{VEILIG}</strong>.
          </p>
          <ul className="klein">
            <li>
              🟩 <strong>Groene schepen</strong> brengen geld in, zoals meer geld van het Rijk.
            </li>
            <li>
              🟥 <strong>Rode schepen</strong> halen geld weg, zoals jeugdzorg die duurder wordt.
            </li>
            <li>
              Ligt het peil buiten de band als een schip de sluis uit vaart? Dan gaat het alarm en
              verlies je een leven. Je hebt er {LEVENS} per level.
            </li>
          </ul>
          <p className="klein">
            <strong>Jouw schuiven:</strong> ✂️ bezuinigen op een eigen keuze ({BEZUINIG_PCT}%
            minder), 🏠 de OZB {OZB_PCT}% omhoog (duurder voor inwoners; hooguit {OZB_KEER} keer per
            level), 🏦 {mln(RESERVE_MLN)} uit de reserve (hooguit {RESERVE_KEER} keer) en 💧 de OZB{' '}
            {OZB_PCT}% omlaag als er te veel geld is.
          </p>
          <p className="klein">
            {stil
              ? 'Er loopt geen klok. Pas het peil aan en laat het schip dan door (spatie).'
              : 'De schepen komen steeds sneller. Toetsen: O = OZB omhoog, L = OZB omlaag, R = reserve, B = bezuinigen, P = pauze.'}{' '}
            ⚠︎ Wat er met de schepen gebeurt, zijn voorbeelden. De bedragen komen uit de begroting{' '}
            {jaar}; de procenten zijn spelregels.
          </p>
        </SpelKaart>
      </div>
    );

  if (fase === 'klaar')
    return (
      <EindKaart
        data={data}
        verslagen={verslagen}
        reserveOver={stand.reserveOver}
        onKlaar={onKlaar}
      />
    );

  if (levelKlaar) {
    const gehaald = levelGehaald(stand, schepen.length);
    return (
      <div className="mg-kader mg-sluis2">
        {hud}
        <SpelKaart
          testid="mg-sluis-einde"
          status
          titel={
            gehaald
              ? `Level ${levelNr} gehaald: de sluis bleef op peil! ⚓`
              : `Level ${levelNr}: het alarm ging te vaak af`
          }
          knop={
            gehaald && levelNr < LEVELS.length
              ? {
                  tekst: `Level ${levelNr + 1}: ${LEVELS[levelNr]?.naam ?? ''}`,
                  onClick: () => {
                    boek();
                    begin(levelNr + 1);
                  },
                }
              : !gehaald
                ? {
                    tekst: 'Probeer opnieuw',
                    onClick: () => {
                      boek();
                      begin(levelNr);
                    },
                  }
                : {
                    tekst: 'Bekijk hoe het ging',
                    onClick: () => {
                      boek();
                      setFase('klaar');
                    },
                  }
          }
          extra={
            !(gehaald && levelNr >= LEVELS.length) && (
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
          <p>
            <strong>{stand.veilig}</strong> van de {schepen.length} schepen gingen veilig door de
            sluis.
          </p>
          <KeuzeLijst
            bezuinigd={stand.bezuinigd}
            ozbPct={stand.ozbPct}
            ozbMln={(stand.ozbPct / OZB_PCT) * ozb}
          />
          {stand.reserveOver < RESERVE_KEER && (
            <p className="klein">
              🏦 De reserve kun je nog {stand.reserveOver} keer gebruiken. Op is op.
            </p>
          )}
        </SpelKaart>
      </div>
    );
  }

  const inKolk = stand.inKolk;
  return (
    <div className="mg-kader mg-sluis2">
      {hud}
      <p className="mg-strook klein">
        <strong>
          Level {levelNr}: {level.naam}.
        </strong>{' '}
        {level.uitleg} Veilig tussen −{VEILIG} en +{VEILIG} (1 streep = € 1 mln).
      </p>
      <canvas
        ref={doek}
        className="mg-veld mg-sluis2-veld"
        width={BREEDTE}
        height={HOOGTE}
        role="img"
        aria-label={`De Oostersluis. Het peil staat op ${kort(stand.peil)}: ${
          veilig ? 'veilig' : stand.peil > 0 ? 'te hoog' : 'te laag'
        } (veilig tussen −${VEILIG} en +${VEILIG}).${
          inKolk
            ? ` In de sluis ligt een ${inKolk.kleur} schip: ${inKolk.tekst}, ${kort(inKolk.bedragMln)} mln.`
            : ''
        } Nog ${stand.levens} ${stand.levens === 1 ? 'leven' : 'levens'}.`}
      />
      <div className="mg-sluis2-acties">
        {stil && (
          <button
            type="button"
            className="knop-indienen mg-grote-knop mg-sluis2-door"
            onClick={laatDoor}
          >
            ⛴️ Laat het schip door
          </button>
        )}
        <button
          type="button"
          className={`knop mg-sluis2-actie${paneel ? ' mg-sluis2-aan' : ''}`}
          onClick={() => setPaneel((p) => !p)}
          aria-expanded={paneel}
          aria-controls="mg-sluis2-paneel"
          aria-keyshortcuts="B"
          disabled={pauze}
        >
          <span aria-hidden="true">✂️</span>
          <span>
            <strong>Bezuinigen</strong>
            <small>op een eigen keuze</small>
          </span>
        </button>
        <button
          type="button"
          className="knop mg-sluis2-actie"
          onClick={ozbOp}
          aria-keyshortcuts="O"
          disabled={pauze || stand.ozbOmhoog >= OZB_KEER}
        >
          <span aria-hidden="true">🏠</span>
          <span>
            <strong>OZB omhoog</strong>
            <small>
              {metTeken(ozb)} · nog {OZB_KEER - stand.ozbOmhoog}×
            </small>
          </span>
        </button>
        <button
          type="button"
          className="knop mg-sluis2-actie"
          onClick={reserve}
          aria-keyshortcuts="R"
          disabled={pauze || stand.reserveOver <= 0}
        >
          <span aria-hidden="true">🏦</span>
          <span>
            <strong>Uit de reserve</strong>
            <small>
              {metTeken(RESERVE_MLN)} · nog {stand.reserveOver}×
            </small>
          </span>
        </button>
        <button
          type="button"
          className="knop mg-sluis2-actie"
          onClick={ozbAf}
          aria-keyshortcuts="L"
          disabled={pauze}
        >
          <span aria-hidden="true">💧</span>
          <span>
            <strong>OZB omlaag</strong>
            <small>{metTeken(-ozb)} · lagere lasten</small>
          </span>
        </button>
        {!stil && <PauzeKnop pauze={pauze} onWissel={() => setPauze((p) => !p)} />}
      </div>
      {paneel && (
        <div id="mg-sluis2-paneel" className="mg-sluis2-paneel">
          <p className="klein">
            <strong>Bezuinig op een eigen keuze</strong>: {BEZUINIG_PCT}% minder uitgeven
            (spelregel). Elke post één keer per level.
          </p>
          <ul className="mg-sluis2-posten">
            {opties.map((o) => {
              const al = stand.bezuinigd.some((b) => b.post.id === o.post.id);
              return (
                <li key={o.post.id}>
                  <button
                    type="button"
                    className="mg-sluis2-post"
                    onClick={() => bezuinig(o)}
                    disabled={al || pauze}
                  >
                    <span className="mg-sluis2-post-naam">
                      {o.post.naam} {al && '✓'}
                    </span>
                    <span className="mg-sluis2-post-bedrag">{metTeken(o.bedragMln)}</span>
                    <span className="mg-sluis2-post-uitleg">
                      {o.post.uitleg} Nu {mln(o.post.bedragMln)} per jaar.
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="klein">
            <strong>🔒 Moet van de wet</strong>: hier kun je niet zomaar op bezuinigen.
          </p>
          <ul className="mg-sluis2-posten">
            {wetLijst.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="mg-sluis2-post mg-sluis2-wet"
                  onClick={() => doe({ soort: 'wet', post: p })}
                >
                  <span className="mg-sluis2-post-naam">🔒 {p.naam}</span>
                  <span className="mg-sluis2-post-uitleg">Moet van de wet: {p.wet}.</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="knop" onClick={() => setPaneel(false)}>
            Sluiten
          </button>
        </div>
      )}
      <Meldingen melding={melding}>
        {stil && inKolk && stand.gebeurd?.soort !== 'aankomst' && (
          <p className="klein mg-sluis2-inkolk">
            In de sluis: {inKolk.kleur === 'groen' ? '🟩' : '🟥'} {inKolk.tekst} (
            {metTeken(inKolk.bedragMln)}).
          </p>
        )}
      </Meldingen>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// Meldingen
// -------------------------------------------------------------------------------------------------

function meldTekst(g: Gebeurd, s: Stand): string {
  switch (g.soort) {
    case 'aankomst': {
      const sch = g.schip;
      return `${sch.kleur === 'groen' ? '🟩' : '🟥'} ${sch.tekst}: ${metTeken(sch.bedragMln)}. Dat is ${pct(
        sch.pct,
      )} van ${mln(sch.basisMln)} voor ${sch.naam} (het % is een spelregel).${
        sch.wet ? ` Moet van de wet (${sch.wet}).` : ''
      }`;
    }
    case 'veilig':
      return `✅ Veilig door de sluis. Het peil staat op ${kort(g.peil)}.`;
    case 'alarm':
      return g.richting === 'laag'
        ? `🚨 Droog! Het peil was ${kort(g.peil)}: er ging meer geld uit dan er binnenkwam. Bij een tekort kijkt de provincie mee. Je verliest een leven en het peil gaat terug naar 0.`
        : `🌊 Overstroming! Het peil was ${kort(g.peil)}: er kwam veel meer geld binnen dan nodig. Dat kan terug naar de inwoners, met een lagere OZB. Je verliest een leven en het peil gaat terug naar 0.`;
    case 'bezuinig':
      return `✂️ Bezuinigd op ${g.post.naam}: ${metTeken(g.bedragMln)} (${BEZUINIG_PCT}% minder, spelregel). Dat merk je: ${lagerEerste(g.post.uitleg)}`;
    case 'ozb':
      return g.bedragMln > 0
        ? `🏠 De OZB gaat ${OZB_PCT}% omhoog: ${metTeken(g.bedragMln)}. Dat is duurder voor inwoners en bedrijven met een huis of pand.`
        : `💧 De OZB gaat ${OZB_PCT}% omlaag: ${metTeken(g.bedragMln)}. Inwoners betalen minder.`;
    case 'reserve':
      return `🏦 ${mln(g.bedragMln)} uit de reserve. Nog ${s.reserveOver} keer. Een reserve is een spaarpot: op is op.`;
    case 'wet':
      return `🔒 ${g.post.naam} moet van de wet (${g.post.wet}). Daar kan de gemeente niet zomaar op bezuinigen.`;
    case 'kan-niet':
      return {
        ozb: `De OZB ging dit level al ${OZB_KEER} keer omhoog (spelregel).`,
        reserve: `De reserve is op: je gebruikte hem al ${RESERVE_KEER} keer (spelregel).`,
        'al-bezuinigd': 'Daar heb je dit level al op bezuinigd.',
        vol: 'De sluis is al helemaal vol.',
        leeg: 'De sluis is al helemaal leeg.',
      }[g.reden];
  }
}

const lagerEerste = (s: string): string => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

function toonVan(g: Gebeurd): Melding['toon'] {
  if (g.soort === 'veilig') return 'goed';
  if (g.soort === 'alarm' || g.soort === 'kan-niet' || g.soort === 'wet') return 'fout';
  return undefined;
}

// -------------------------------------------------------------------------------------------------
// Kaarten
// -------------------------------------------------------------------------------------------------

function KeuzeLijst({
  bezuinigd,
  ozbPct,
  ozbMln,
}: {
  bezuinigd: Bezuiniging[];
  ozbPct: number;
  ozbMln: number;
}) {
  return (
    <ul className="mg-lijst klein">
      <li>
        ✂️{' '}
        {bezuinigd.length
          ? `Bezuinigd op: ${bezuinigd.map((b) => `${b.post.naam} (${metTeken(b.bedragMln)})`).join(', ')}.`
          : 'Je bezuinigde nergens op.'}
      </li>
      <li>
        {ozbPct > 0
          ? `🏠 De OZB ging ${ozbPct}% omhoog (${metTeken(ozbMln)}). Inwoners en bedrijven betalen meer.`
          : ozbPct < 0
            ? `💧 De OZB ging ${-ozbPct}% omlaag (${metTeken(ozbMln)}). Inwoners en bedrijven betalen minder.`
            : '🏠 De OZB bleef gelijk.'}
      </li>
    </ul>
  );
}

function EindKaart({
  data,
  verslagen,
  reserveOver,
  onKlaar,
}: {
  data: MinigameProps['data'];
  verslagen: Verslag[];
  reserveOver: number;
  onKlaar: MinigameProps['onKlaar'];
}) {
  const jaar = data.begroting.begrotingsjaar;
  // per level de beste poging
  const beste = LEVELS.map((_, i) =>
    Math.max(0, ...verslagen.filter((v) => v.nr === i + 1).map((v) => v.veilig)),
  );
  const { score, max } = sluisScore(beste);
  const gehaald = new Set(verslagen.filter((v) => v.gehaald).map((v) => v.nr)).size;
  const schepen = verslagen.reduce((s, v) => s + v.schepen, 0);
  const veilig = verslagen.reduce((s, v) => s + v.veilig, 0);
  const alarmen = verslagen.reduce((s, v) => s + v.alarmen, 0);
  const bezuinigd = verslagen.flatMap((v) => v.bezuinigd);
  const ozbPct = verslagen.reduce((s, v) => s + v.ozbPct, 0);
  const ozbMln = (ozbPct / OZB_PCT) * ozbStap(data);
  const reserveKeer = RESERVE_KEER - reserveOver;
  const lasten = data.begroting.totalen.lasten_excl_reserves_x1000[String(jaar)];
  const baten = data.begroting.totalen.baten_excl_reserves_x1000[String(jaar)];
  return (
    <div className="mg-kader mg-sluis2" data-testid="mg-sluis-uitslag">
      <SpelKaart
        titel={`Je hield het peil ${veilig} van de ${schepen} keer veilig`}
        knop={{ tekst: 'Naar de uitslag', onClick: () => onKlaar(score, max) }}
      >
        <p>
          Je haalde {gehaald} van de {LEVELS.length} levels. Het alarm ging {alarmen} keer af.
        </p>
        <h4>Jouw keuzes</h4>
        <KeuzeLijst bezuinigd={bezuinigd} ozbPct={ozbPct} ozbMln={ozbMln} />
        <p className="klein">
          🏦{' '}
          {reserveKeer
            ? `Je haalde ${reserveKeer} keer ${mln(RESERVE_MLN)} uit de reserve: samen ${mln(reserveKeer * RESERVE_MLN)}.`
            : 'Je liet de reserve met rust.'}{' '}
          De algemene reserve van de gemeente is {mln(algemeneReserve(data))} (begroting {jaar}).
        </p>
        <h4>Wat leer je?</h4>
        <ul className="mg-lijst klein">
          <li>
            Een begroting moet in evenwicht zijn: de gemeente mag niet steeds meer uitgeven dan er
            binnenkomt.
          </li>
          <li>
            Kosten stijgen vaak vanzelf, bijvoorbeeld als meer mensen zorg nodig hebben. Op taken
            die moeten van de wet kun je niet zomaar bezuinigen. Op eigen keuzes wel.
          </li>
          <li>
            Meer belasting betalen de inwoners. Geld uit de reserve kan maar één keer: op is op.
          </li>
          {lasten !== undefined && baten !== undefined && (
            <li>
              In {jaar} geeft de gemeente {formatMln(lasten * 1000)} uit. Er komt{' '}
              {formatMln(baten * 1000)} binnen. Het verschil van{' '}
              {formatMln(Math.abs(lasten - baten) * 1000)}{' '}
              {lasten > baten ? 'haalt de gemeente uit de reserves.' : 'gaat naar de reserves.'}
            </li>
          )}
        </ul>
        <p className="klein">
          Bedragen uit de begroting {jaar} van de gemeente Groningen. De procenten, de band en de
          gebeurtenissen zijn spelregels (⚠︎ voorbeelden).
        </p>
      </SpelKaart>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// Tekenen
// -------------------------------------------------------------------------------------------------

const LETTER = 'Asap, system-ui, sans-serif';
/** De bovenkant van de kade. */
const KADE_Y = 158;
/** De bodem van het water. */
const BODEM_Y = 338;
/** Peil 0. */
const NUL_Y = 252;
/** Beeldpunten per streep (€ 1 mln). */
const STREEP = 7;
const KOLK_L = 150;
const KOLK_R = 330;
const KOLK_MID = (KOLK_L + KOLK_R) / 2;
/** Halve dikte van een deur. */
const DEUR = 7;
const peilY = (p: number): number => NUL_Y - p * STREEP;

/** Wat er op het scherm staat. */
type Beeld = {
  peil: number;
  schepen: { schip: Schip; x: number; wacht?: number }[];
  deurL: number;
  deurR: number;
  zwevers: Zwever[];
};

function schipX(fase: 'weg' | 'aan' | 'kolk' | 'uit', f: number): number {
  if (fase === 'aan') return -60 + (KOLK_MID + 60) * (1 - (1 - f) ** 2);
  if (fase === 'kolk') return KOLK_MID;
  if (fase === 'uit') return KOLK_MID + 330 * f * f;
  return -200;
}

function beeldVanSim(s: Sim, schepen: Schip[], nr: number, dt: number, pauze: boolean): Beeld {
  const lijst: Beeld['schepen'] = [];
  let openL = 0;
  let openR = 0;
  schepen.forEach((schip, i) => {
    const { fase, f } = schipFase(s.klok - vertrek(nr, i));
    if (fase === 'weg') return;
    const x = schipX(fase, f);
    lijst.push({ schip, x, ...(fase === 'kolk' ? { wacht: f } : {}) });
    if (fase === 'aan' && x + 52 > KOLK_L - 60 && x - 50 < KOLK_L + 14) openL = 1;
    if (fase === 'uit' && x + 52 > KOLK_R - 14 && x - 50 < KOLK_R + 60) openR = 1;
  });
  if (!pauze) {
    const v = dt * 4;
    s.deurL += Math.max(-v, Math.min(v, openL - s.deurL));
    s.deurR += Math.max(-v, Math.min(v, openR - s.deurR));
  }
  return { peil: s.toonPeil, schepen: lijst, deurL: s.deurL, deurR: s.deurR, zwevers: s.zwevers };
}

function stilBeeld(stand: Stand, schepen: Schip[]): Beeld {
  const lijst: Beeld['schepen'] = [];
  const volgend = schepen[stand.klaar + (stand.inKolk ? 1 : 0)];
  if (volgend && stand.levens > 0) lijst.push({ schip: volgend, x: 62 });
  if (stand.inKolk) lijst.push({ schip: stand.inKolk, x: KOLK_MID });
  return { peil: stand.peil, schepen: lijst, deurL: 0, deurR: 0, zwevers: [] };
}

/** Een zwevende tekst bij wat er net gebeurde. */
function zweef(s: Sim, g: Gebeurd | undefined, nu: number): void {
  if (!g) return;
  const y = peilY(s.toonPeil) - 60;
  if (g.soort === 'veilig')
    s.zwevers.push({ tekst: '✔ veilig', x: KOLK_MID, y, begin: nu, goed: true });
  else if (g.soort === 'alarm')
    s.zwevers.push({ tekst: '✖ alarm: −1 ♥', x: KOLK_MID, y, begin: nu, goed: false });
  else if (g.soort === 'ozb' || g.soort === 'reserve' || g.soort === 'bezuinig')
    s.zwevers.push({
      tekst: kort(g.bedragMln),
      x: KOLK_L + 40,
      y: peilY(s.toonPeil) - 14,
      begin: nu,
      goed: g.bedragMln > 0,
    });
}

/** Een vast getal per tekst en volgnummer (voor bakstenen, gevels en wolken). */
function hash(n: number): number {
  let h = (n * 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return ((h >>> 0) % 10000) / 10000;
}

let luchtBeeld: HTMLCanvasElement | undefined;
let landBeeld: HTMLCanvasElement | undefined;

/** Een canvas om één keer op te tekenen, twee keer zo scherp als het veld. */
function vooraf(teken: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = BREEDTE * 2;
  c.height = HOOGTE * 2;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.scale(2, 2);
    teken(ctx);
  }
  return c;
}

/** De lucht met de zon. */
function lucht(): HTMLCanvasElement {
  luchtBeeld ??= vooraf((ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, KADE_Y);
    g.addColorStop(0, '#4f9be0');
    g.addColorStop(0.55, '#9ccdf2');
    g.addColorStop(1, '#e6f3fb');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, BREEDTE, KADE_Y);
    const zon = ctx.createRadialGradient(410, 38, 4, 410, 38, 70);
    zon.addColorStop(0, 'rgba(255,250,215,1)');
    zon.addColorStop(0.18, 'rgba(255,240,170,0.9)');
    zon.addColorStop(0.45, 'rgba(255,230,160,0.25)');
    zon.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = zon;
    ctx.fillRect(320, 0, 160, 120);
  });
  return luchtBeeld;
}

/** De gemeente in de verte, de kade, de muren van bakstenen, de peilschaal en het huisje. */
function land(): HTMLCanvasElement {
  landBeeld ??= vooraf((ctx) => {
    // De gemeente in de verte: gevels en de Martinitoren
    ctx.fillStyle = '#b3c6db';
    let x = -6;
    let i = 0;
    while (x < BREEDTE) {
      const b = 16 + hash(i) * 16;
      const h = 14 + hash(i + 50) * 22;
      const top = 150 - h;
      ctx.beginPath();
      ctx.moveTo(x, 152);
      ctx.lineTo(x, top);
      if (hash(i + 99) > 0.5) {
        // trapgevel
        const t = b / 5;
        ctx.lineTo(x + t, top);
        ctx.lineTo(x + t, top - 4);
        ctx.lineTo(x + 2 * t, top - 4);
        ctx.lineTo(x + 2 * t, top - 8);
        ctx.lineTo(x + 3 * t, top - 8);
        ctx.lineTo(x + 3 * t, top - 4);
        ctx.lineTo(x + 4 * t, top - 4);
        ctx.lineTo(x + 4 * t, top);
      } else ctx.lineTo(x + b / 2, top - 9);
      ctx.lineTo(x + b, top);
      ctx.lineTo(x + b, 152);
      ctx.fill();
      x += b + 1;
      i++;
    }
    // de Martinitoren
    ctx.fillStyle = '#9fb4cc';
    const mx = 86;
    ctx.fillRect(mx - 9, 86, 18, 66);
    ctx.fillRect(mx - 7, 70, 14, 18);
    ctx.fillRect(mx - 5, 58, 10, 14);
    ctx.beginPath();
    ctx.moveTo(mx - 4, 58);
    ctx.quadraticCurveTo(mx, 44, mx, 34);
    ctx.quadraticCurveTo(mx, 44, mx + 4, 58);
    ctx.fill();
    ctx.fillRect(mx - 0.6, 26, 1.2, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const y of [92, 104, 116]) ctx.fillRect(mx - 3, y, 2, 6);
    ctx.fillRect(mx + 1, 92, 2, 6);
    // waas over de verte
    const waas = ctx.createLinearGradient(0, 110, 0, 152);
    waas.addColorStop(0, 'rgba(230,243,251,0)');
    waas.addColorStop(1, 'rgba(230,243,251,0.55)');
    ctx.fillStyle = waas;
    ctx.fillRect(0, 100, BREEDTE, 52);
    // bomen
    for (const [bx, r] of [
      [16, 13],
      [204, 10],
      [270, 12],
      [480, 10],
    ] as const) {
      ctx.fillStyle = '#5b4a35';
      ctx.fillRect(bx - 1.5, KADE_Y - 16, 3, 12);
      const g = ctx.createRadialGradient(
        bx - r * 0.3,
        KADE_Y - 24 - r * 0.3,
        2,
        bx,
        KADE_Y - 22,
        r,
      );
      g.addColorStop(0, '#8cc46a');
      g.addColorStop(1, '#3f7a35');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, KADE_Y - 22, r, 0, Math.PI * 2);
      ctx.arc(bx + r * 0.6, KADE_Y - 18, r * 0.7, 0, Math.PI * 2);
      ctx.arc(bx - r * 0.6, KADE_Y - 17, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    // gras en klinkers op de kade
    const gras = ctx.createLinearGradient(0, 146, 0, KADE_Y);
    gras.addColorStop(0, '#7dbb52');
    gras.addColorStop(1, '#5c9a3c');
    ctx.fillStyle = gras;
    ctx.fillRect(0, 148, BREEDTE, KADE_Y - 148);
    ctx.fillStyle = '#c9b9a3';
    ctx.fillRect(0, KADE_Y - 6, BREEDTE, 4);
    ctx.fillStyle = 'rgba(120,100,80,0.35)';
    for (let k = 0; k < BREEDTE; k += 5) ctx.fillRect(k, KADE_Y - 6, 1, 4);
    // de rand van natuursteen
    const rand = ctx.createLinearGradient(0, KADE_Y - 2, 0, KADE_Y + 5);
    rand.addColorStop(0, '#d9dde2');
    rand.addColorStop(1, '#8d939b');
    ctx.fillStyle = rand;
    ctx.fillRect(0, KADE_Y - 2, BREEDTE, 7);

    // muur van bakstenen
    const BH = 6;
    const BB = 15;
    for (let y = KADE_Y + 5, rij = 0; y < BODEM_Y; y += BH, rij++) {
      for (let bx = -(rij % 2) * (BB / 2); bx < BREEDTE; bx += BB) {
        const inKolk = bx > KOLK_L - 8 && bx < KOLK_R + 8;
        const t = hash(rij * 97 + Math.round(bx));
        const r = (inKolk ? 150 : 166) + Math.round(t * 30);
        const gr = (inKolk ? 66 : 76) + Math.round(t * 18);
        const bl = (inKolk ? 50 : 54) + Math.round(t * 12);
        ctx.fillStyle = `rgb(${r},${gr},${bl})`;
        ctx.fillRect(bx + 0.6, y + 0.6, BB - 1.2, BH - 1.2);
      }
    }
    // voegen
    ctx.fillStyle = 'rgba(214,196,175,0.55)';
    for (let y = KADE_Y + 5; y < BODEM_Y; y += BH) ctx.fillRect(0, y, BREEDTE, 0.6);
    // schaduw onder de rand
    const schaduw = ctx.createLinearGradient(0, KADE_Y + 5, 0, KADE_Y + 20);
    schaduw.addColorStop(0, 'rgba(0,0,0,0.35)');
    schaduw.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = schaduw;
    ctx.fillRect(0, KADE_Y + 5, BREEDTE, 15);
    // groene aanslag onder het gewone peil, buiten de kolk
    const aanslag = ctx.createLinearGradient(0, NUL_Y - 6, 0, NUL_Y + 30);
    aanslag.addColorStop(0, 'rgba(60,90,40,0)');
    aanslag.addColorStop(0.3, 'rgba(60,90,40,0.55)');
    aanslag.addColorStop(1, 'rgba(30,50,25,0.6)');
    ctx.fillStyle = aanslag;
    ctx.fillRect(0, NUL_Y - 6, KOLK_L - DEUR, BODEM_Y - NUL_Y + 6);
    ctx.fillRect(KOLK_R + DEUR, NUL_Y - 6, BREEDTE - KOLK_R, BODEM_Y - NUL_Y + 6);

    // in de kolk: de veilige band, en rood erbuiten
    const kx = KOLK_L + DEUR;
    const kb = KOLK_R - KOLK_L - 2 * DEUR;
    ctx.fillStyle = 'rgba(220,60,40,0.13)';
    ctx.fillRect(kx, peilY(WAND), kb, peilY(VEILIG) - peilY(WAND));
    ctx.fillRect(kx, peilY(-VEILIG), kb, peilY(-WAND) - peilY(-VEILIG));
    ctx.fillStyle = 'rgba(90,230,140,0.16)';
    ctx.fillRect(kx, peilY(VEILIG), kb, peilY(-VEILIG) - peilY(VEILIG));
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(150,255,190,0.9)';
    for (const p of [VEILIG, -VEILIG]) {
      ctx.beginPath();
      ctx.moveTo(kx, peilY(p));
      ctx.lineTo(kx + kb, peilY(p));
      ctx.stroke();
    }
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(kx, NUL_Y);
    ctx.lineTo(kx + kb, NUL_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `700 7px ${LETTER}`;
    ctx.fillStyle = 'rgba(210,255,225,0.95)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('VEILIG', kx + kb - 3, peilY(VEILIG) - 1);
    ctx.textBaseline = 'top';
    ctx.fillText('VEILIG', kx + kb - 3, peilY(-VEILIG) + 1);

    // de peilschaal
    const px = KOLK_L + DEUR + 4;
    const pb = 20;
    const boven = peilY(WAND) - 2;
    const onder = peilY(-WAND) + 2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(px + 1.5, boven + 1.5, pb, onder - boven);
    ctx.fillStyle = '#f7f7f2';
    ctx.fillRect(px, boven, pb, onder - boven);
    ctx.fillStyle = 'rgba(70,200,110,0.3)';
    ctx.fillRect(px, peilY(VEILIG), pb, peilY(-VEILIG) - peilY(VEILIG));
    ctx.fillStyle = 'rgba(220,60,40,0.22)';
    ctx.fillRect(px, boven, pb, peilY(VEILIG) - boven);
    ctx.fillRect(px, peilY(-VEILIG), pb, onder - peilY(-VEILIG));
    for (let p = -WAND; p <= WAND; p++) {
      const y = peilY(p);
      ctx.fillStyle = '#1d2230';
      ctx.fillRect(px, y - 0.5, p % 3 === 0 ? 8 : 5, 1);
      if (p % 3 === 0) {
        ctx.font = `${p === 0 ? 800 : 700} 6.5px ${LETTER}`;
        ctx.fillStyle = p === 0 ? '#1d2230' : Math.abs(p) > VEILIG ? '#a3271a' : '#0e6b45';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(p > 0 ? `+${p}` : p < 0 ? `−${-p}` : '0', px + pb - 1.5, y);
      }
    }
    ctx.strokeStyle = '#3a3f4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, boven, pb, onder - boven);

    // de bodem
    const bodem = ctx.createLinearGradient(0, BODEM_Y, 0, HOOGTE);
    bodem.addColorStop(0, '#4a3b2a');
    bodem.addColorStop(1, '#2a2118');
    ctx.fillStyle = bodem;
    ctx.fillRect(0, BODEM_Y, BREEDTE, HOOGTE - BODEM_Y);
    for (let k = 0; k < 70; k++) {
      ctx.fillStyle = k % 3 ? 'rgba(160,140,110,0.35)' : 'rgba(20,15,10,0.4)';
      ctx.beginPath();
      ctx.ellipse(
        hash(k) * BREEDTE,
        BODEM_Y + 3 + hash(k + 7) * (HOOGTE - BODEM_Y - 5),
        1.5 + hash(k + 3) * 2.5,
        1 + hash(k + 5),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // stenen hoofden bij de deuren
    for (const dx of [KOLK_L, KOLK_R]) {
      const hg = ctx.createLinearGradient(0, KADE_Y - 6, 0, KADE_Y + 8);
      hg.addColorStop(0, '#e2e4e7');
      hg.addColorStop(1, '#7d838c');
      ctx.fillStyle = hg;
      ctx.fillRect(dx - 18, KADE_Y - 6, 36, 13);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(dx - 18, KADE_Y + 7, 36, 2);
    }

    // bolders
    for (const bx of [30, 112, 186, 296]) {
      ctx.fillStyle = '#2b2f36';
      rondRechthoek(ctx, bx - 3, KADE_Y - 12, 6, 8, 2);
      ctx.fill();
      ctx.fillRect(bx - 4.5, KADE_Y - 13, 9, 2.5);
    }

    // bord "Winschoterdiep"
    ctx.fillStyle = '#5b4a35';
    ctx.fillRect(66, KADE_Y - 30, 2, 26);
    ctx.fillStyle = '#1b3e8a';
    rondRechthoek(ctx, 40, KADE_Y - 42, 54, 13, 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `700 7px ${LETTER}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Winschoterdiep', 67, KADE_Y - 35.5);

    huisje(ctx, 420, KADE_Y - 4);
  });
  return landBeeld;
}

/** Het huisje van de sluiswachter: bakstenen, rode pannen, wit kozijn. */
function huisje(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const b = 58;
  const h = 34;
  // schaduw
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x - b / 2 + 3, y - 2, b, 4);
  // muren
  const muur = ctx.createLinearGradient(x - b / 2, 0, x + b / 2, 0);
  muur.addColorStop(0, '#b4563c');
  muur.addColorStop(1, '#8e3e2a');
  ctx.fillStyle = muur;
  ctx.fillRect(x - b / 2, y - h, b, h);
  ctx.fillStyle = 'rgba(230,200,180,0.35)';
  for (let r = 0; r < h; r += 4) ctx.fillRect(x - b / 2, y - h + r, b, 0.6);
  // dak
  const dak = ctx.createLinearGradient(0, y - h - 26, 0, y - h);
  dak.addColorStop(0, '#d0452c');
  dak.addColorStop(1, '#8f2a18');
  ctx.fillStyle = dak;
  ctx.beginPath();
  ctx.moveTo(x - b / 2 - 6, y - h + 1);
  ctx.lineTo(x, y - h - 26);
  ctx.lineTo(x + b / 2 + 6, y - h + 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,20,10,0.45)';
  ctx.lineWidth = 0.7;
  for (let r = 4; r < 26; r += 4) {
    const w = ((b / 2 + 6) * r) / 26;
    ctx.beginPath();
    ctx.moveTo(x - w, y - h - 26 + r);
    ctx.lineTo(x + w, y - h - 26 + r);
    ctx.stroke();
  }
  // schoorsteen
  ctx.fillStyle = '#7a3524';
  ctx.fillRect(x + 12, y - h - 24, 7, 14);
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(x + 11, y - h - 25, 9, 2);
  // deur
  ctx.fillStyle = '#1f6b43';
  rondRechthoek(ctx, x - 20, y - 22, 11, 22, 2);
  ctx.fill();
  ctx.fillStyle = '#f5d76e';
  ctx.beginPath();
  ctx.arc(x - 11.5, y - 11, 1, 0, Math.PI * 2);
  ctx.fill();
  // raam met licht
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 2, y - 26, 18, 15);
  const raam = ctx.createLinearGradient(0, y - 25, 0, y - 12);
  raam.addColorStop(0, '#ffe9a8');
  raam.addColorStop(1, '#f4b860');
  ctx.fillStyle = raam;
  ctx.fillRect(x + 3.5, y - 24.5, 15, 12);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 10.4, y - 24.5, 1.2, 12);
  ctx.fillRect(x + 3.5, y - 19, 15, 1.2);
  ctx.fillStyle = '#1f6b43';
  ctx.fillRect(x - 1, y - 26, 3, 15);
  ctx.fillRect(x + 20, y - 26, 3, 15);
  // naambordje
  ctx.fillStyle = '#fbf6e9';
  rondRechthoek(ctx, x - 22, y - h - 2, 44, 8, 1.5);
  ctx.fill();
  ctx.fillStyle = '#1b3e8a';
  ctx.font = `800 5.6px ${LETTER}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OOSTERSLUIS', x, y - h + 2.2);
}

/** Wolken die langzaam voorbij drijven. */
function wolken(ctx: CanvasRenderingContext2D, nu: number): void {
  for (let i = 0; i < 4; i++) {
    const breed = 50 + hash(i + 11) * 40;
    const snel = 4 + hash(i + 21) * 5;
    const x = ((hash(i + 31) * (BREEDTE + 140) + (nu / 1000) * snel) % (BREEDTE + 140)) - 70;
    const y = 18 + hash(i + 41) * 46;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.ellipse(x, y, breed / 2, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(x - breed * 0.18, y - 6, breed * 0.2, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(x + breed * 0.12, y - 8, breed * 0.24, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(170,195,220,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, breed / 2.2, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // meeuwen
  ctx.strokeStyle = 'rgba(60,70,90,0.7)';
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 3; i++) {
    const x = (((nu / 1000) * (14 + i * 3) + i * 170) % (BREEDTE + 40)) - 20;
    const y = 52 + i * 14 + Math.sin(nu / 900 + i) * 4;
    const v = 2.5 + Math.sin(nu / 160 + i * 2) * 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - v);
    ctx.quadraticCurveTo(x - 2, y - v, x, y);
    ctx.quadraticCurveTo(x + 2, y - v, x + 5, y - v);
    ctx.stroke();
  }
}

/** Rook uit de schoorsteen van het huisje. */
function rook(ctx: CanvasRenderingContext2D, nu: number): void {
  for (let i = 0; i < 5; i++) {
    const f = (((nu / 2600 + i / 5) % 1) + 1) % 1;
    ctx.fillStyle = `rgba(235,235,240,${0.55 * (1 - f)})`;
    ctx.beginPath();
    ctx.arc(
      435.5 + f * 14 + Math.sin(f * 6 + i) * 2,
      KADE_Y - 66 - f * 30,
      2.5 + f * 6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/**
 * Een puntdeur van hout, van opzij gezien. Dicht staat hij dwars over het water; open draait hij
 * tegen de muur (dan zie je hem breed, in de schaduw). De balk bovenop draait mee.
 */
function deur(ctx: CanvasRenderingContext2D, x: number, open: number, kant: -1 | 1): void {
  const boven = KADE_Y - 10;
  const breed = 2 * DEUR + 44 * open;
  // open: de deur ligt in de kolk tegen de muur
  const links = kant < 0 ? x - DEUR : x + DEUR - breed;
  const hout = ctx.createLinearGradient(links, 0, links + breed, 0);
  const d = 1 - open * 0.35;
  hout.addColorStop(0, `rgb(${Math.round(92 * d)},${Math.round(60 * d)},${Math.round(32 * d)})`);
  hout.addColorStop(0.5, `rgb(${Math.round(140 * d)},${Math.round(96 * d)},${Math.round(54 * d)})`);
  hout.addColorStop(1, `rgb(${Math.round(84 * d)},${Math.round(54 * d)},${Math.round(28 * d)})`);
  ctx.fillStyle = hout;
  ctx.fillRect(links, boven, breed, BODEM_Y - boven);
  // planken en ijzeren banden
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let k = links + 4; k < links + breed - 1; k += 5)
    ctx.fillRect(k, boven, 0.6, BODEM_Y - boven);
  ctx.fillStyle = '#3b3f45';
  for (let y = boven + 14; y < BODEM_Y; y += 32) {
    ctx.fillRect(links, y, breed, 3);
    ctx.fillStyle = '#8a9099';
    for (let k = links + 2; k < links + breed; k += 6) ctx.fillRect(k, y + 1, 1, 1);
    ctx.fillStyle = '#3b3f45';
  }
  ctx.strokeStyle = 'rgba(30,20,10,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(links, boven, breed, BODEM_Y - boven);
  // loopbrug met leuning
  ctx.fillStyle = '#4a4f57';
  ctx.fillRect(links - 2, boven - 2, breed + 4, 3);
  ctx.strokeStyle = '#f2f2f2';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(links - 1, boven - 2);
  ctx.lineTo(links - 1, boven - 12);
  ctx.lineTo(links + breed + 1, boven - 12);
  ctx.lineTo(links + breed + 1, boven - 2);
  ctx.stroke();
  // de balans (balk): wit en zwart geschilderd, korter als de deur open staat
  const lang = 42 * (1 - open * 0.7);
  const bx = x + kant * DEUR;
  const by = boven - 7;
  ctx.fillStyle = '#20242b';
  ctx.fillRect(Math.min(bx, bx + kant * lang), by - 3, lang, 6);
  ctx.fillStyle = '#f4f4f0';
  ctx.fillRect(Math.min(bx + kant * lang * 0.55, bx + kant * lang), by - 3, lang * 0.45, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(Math.min(bx, bx + kant * lang), by - 3, lang, 1.5);
}

/** Een lamp op een paal: groen als het peil veilig is, rood knipperend als het niet zo is. */
function lamp(ctx: CanvasRenderingContext2D, x: number, alarm: boolean, nu: number): void {
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(x - 1.2, KADE_Y - 52, 2.4, 46);
  ctx.fillRect(x - 4, KADE_Y - 58, 8, 7);
  const aan = !alarm || Math.floor(nu / 300) % 2 === 0;
  const kleur = alarm ? '#ff3b2f' : '#38e07b';
  if (aan) {
    const gloed = ctx.createRadialGradient(x, KADE_Y - 54.5, 1, x, KADE_Y - 54.5, alarm ? 22 : 12);
    gloed.addColorStop(0, alarm ? 'rgba(255,70,50,0.75)' : 'rgba(80,240,140,0.55)');
    gloed.addColorStop(1, 'rgba(255,70,50,0)');
    ctx.fillStyle = gloed;
    ctx.fillRect(x - 24, KADE_Y - 78, 48, 48);
  }
  ctx.fillStyle = aan ? kleur : '#5a2420';
  ctx.beginPath();
  ctx.arc(x, KADE_Y - 54.5, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

/** De sluiswachter bij zijn huisje; bij alarm zwaait hij met zijn armen. */
function sluiswachter(ctx: CanvasRenderingContext2D, alarm: boolean, nu: number): void {
  const x = 460;
  const y = KADE_Y - 4;
  const arm = alarm ? Math.sin(nu / 120) * 0.9 : 0;
  ctx.lineCap = 'round';
  // benen
  ctx.strokeStyle = '#1d2a44';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(x - 2, y);
  ctx.lineTo(x - 2, y - 9);
  ctx.moveTo(x + 2, y);
  ctx.lineTo(x + 2, y - 9);
  ctx.stroke();
  // jas
  ctx.fillStyle = '#1233c4';
  rondRechthoek(ctx, x - 5, y - 21, 10, 13, 3);
  ctx.fill();
  ctx.fillStyle = '#ffcf33';
  ctx.fillRect(x - 5, y - 13, 10, 1.6);
  // armen
  ctx.strokeStyle = '#1233c4';
  ctx.lineWidth = 2.6;
  for (const k of [-1, 1]) {
    const a = alarm ? -Math.PI / 2 - k * (0.5 + arm * k * 0.4) : Math.PI / 2 - k * 0.25;
    ctx.beginPath();
    ctx.moveTo(x + k * 4.5, y - 19);
    ctx.lineTo(x + k * 4.5 + Math.cos(a) * 8 * (alarm ? -k : 1), y - 19 + Math.sin(a) * 8);
    ctx.stroke();
  }
  // hoofd en pet
  ctx.fillStyle = '#f2c29b';
  ctx.beginPath();
  ctx.arc(x, y - 25, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d2a44';
  ctx.beginPath();
  ctx.arc(x, y - 26.5, 4.2, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 1, y - 27.5, 7, 1.6);
  ctx.lineCap = 'butt';
}

/** Een binnenvaartschip van opzij, met een groene of rode boord en het bedrag op het ruim. */
function tekenSchip(
  ctx: CanvasRenderingContext2D,
  schip: Schip,
  x: number,
  y: number,
  nu: number,
): void {
  const groen = schip.kleur === 'groen';
  const hoofd = groen ? '#1f9d55' : '#d23c2c';
  const licht = groen ? '#5fd38f' : '#ff7a66';
  const donker = groen ? '#106a39' : '#8b1f15';
  ctx.save();
  ctx.translate(x, y + Math.sin(nu / 500 + x / 40) * 0.8);
  ctx.rotate(Math.sin(nu / 800 + x / 60) * 0.012);
  // romp
  ctx.beginPath();
  ctx.moveTo(-50, -13);
  ctx.lineTo(42, -13);
  ctx.quadraticCurveTo(50, -14, 53, -18);
  ctx.lineTo(49, -5);
  ctx.quadraticCurveTo(44, 9, 30, 10);
  ctx.lineTo(-44, 10);
  ctx.quadraticCurveTo(-50, 9, -50, -2);
  ctx.closePath();
  const romp = ctx.createLinearGradient(0, -14, 0, 10);
  romp.addColorStop(0, '#39414f');
  romp.addColorStop(0.5, '#222833');
  romp.addColorStop(1, '#12161d');
  ctx.fillStyle = romp;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // gekleurde boord
  ctx.fillStyle = hoofd;
  ctx.beginPath();
  ctx.moveTo(-50, -13);
  ctx.lineTo(42, -13);
  ctx.quadraticCurveTo(50, -14, 53, -18);
  ctx.lineTo(52, -14);
  ctx.quadraticCurveTo(48, -9, 42, -9);
  ctx.lineTo(-50, -9);
  ctx.closePath();
  ctx.fill();
  // rode onderkant (onder water)
  ctx.fillStyle = '#7d2a20';
  ctx.fillRect(-46, 4, 80, 5);
  // patrijspoorten
  ctx.fillStyle = 'rgba(200,220,240,0.7)';
  for (const k of [-40, -33]) {
    ctx.beginPath();
    ctx.arc(k, -3, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // het ruim met een zeil
  const zeil = ctx.createLinearGradient(0, -29, 0, -13);
  zeil.addColorStop(0, licht);
  zeil.addColorStop(0.45, hoofd);
  zeil.addColorStop(1, donker);
  ctx.fillStyle = zeil;
  rondRechthoek(ctx, -28, -30, 64, 17, 4);
  ctx.fill();
  ctx.strokeStyle = donker;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  for (let k = -22; k < 34; k += 8) ctx.fillRect(k, -29, 1.2, 15);
  ctx.font = `800 12px ${LETTER}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  const tekst = `${kort(schip.bedragMln)} mln`;
  ctx.strokeText(tekst, 4, -21);
  ctx.fillStyle = '#fff';
  ctx.fillText(tekst, 4, -21);
  // stuurhut
  const hut = ctx.createLinearGradient(-48, 0, -32, 0);
  hut.addColorStop(0, '#ffffff');
  hut.addColorStop(1, '#d7dde5');
  ctx.fillStyle = hut;
  ctx.fillRect(-48, -34, 16, 21);
  ctx.fillStyle = '#2f5f96';
  ctx.fillRect(-46, -31, 12, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(-45, -30, 3, 4);
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(-50, -36, 20, 3);
  ctx.fillRect(-41, -43, 4, 7);
  ctx.fillStyle = hoofd;
  ctx.fillRect(-41, -41, 4, 2);
  // mast met vlag
  ctx.strokeStyle = '#2b2f36';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(44, -14);
  ctx.lineTo(44, -40);
  ctx.stroke();
  ctx.fillStyle = hoofd;
  ctx.beginPath();
  ctx.moveTo(44, -40);
  const w = Math.sin(nu / 180 + x) * 1.5;
  ctx.quadraticCurveTo(50, -42 + w, 56, -38 + w);
  ctx.lineTo(56, -32 + w);
  ctx.quadraticCurveTo(50, -35 + w, 44, -33);
  ctx.closePath();
  ctx.fill();
  // naambord boven het schip
  ctx.font = `700 11px ${LETTER}`;
  const naamB = ctx.measureText(schip.kort).width + 16;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rondRechthoek(ctx, -naamB / 2 + 4 + 1, -63 + 1.5, naamB, 16, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  rondRechthoek(ctx, -naamB / 2 + 4, -63, naamB, 16, 8);
  ctx.fill();
  ctx.strokeStyle = hoofd;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -47);
  ctx.lineTo(4, -42);
  ctx.lineTo(8, -47);
  ctx.closePath();
  ctx.fillStyle = hoofd;
  ctx.fill();
  ctx.fillStyle = '#1d2230';
  ctx.textBaseline = 'middle';
  ctx.fillText(schip.kort, 4, -54.5);
  ctx.restore();
}

/** Golfjes op het water. */
const golf = (x: number, nu: number, sterk: number): number =>
  (Math.sin(x / 17 + nu / 600) * 1.1 + Math.sin(x / 6.5 - nu / 340) * 0.5) * sterk;

/** Een stuk water: van `x0` tot `x1`, met het oppervlak op `y`. Met golfjes en een spiegelbeeld. */
function water(
  ctx: CanvasRenderingContext2D,
  doek: HTMLCanvasElement,
  x0: number,
  x1: number,
  y: number,
  nu: number,
  alarm: boolean,
): void {
  if (x1 <= x0) return;
  const pad = new Path2D();
  pad.moveTo(x0, BODEM_Y);
  for (let x = x0; x <= x1; x += 3) pad.lineTo(x, y + golf(x, nu, 1));
  pad.lineTo(x1, y + golf(x1, nu, 1));
  pad.lineTo(x1, BODEM_Y);
  pad.closePath();
  const g = ctx.createLinearGradient(0, y - 2, 0, BODEM_Y);
  g.addColorStop(0, alarm ? 'rgba(92,140,170,0.84)' : 'rgba(58,150,196,0.82)');
  g.addColorStop(0.35, 'rgba(30,104,150,0.88)');
  g.addColorStop(1, 'rgba(12,52,84,0.95)');
  ctx.fillStyle = g;
  ctx.fill(pad);
  // spiegelbeeld: stroken van wat boven het water staat, omgekeerd en golvend
  const r = doek.width / BREEDTE;
  const diep = Math.min(44, BODEM_Y - y - 2);
  ctx.save();
  ctx.clip(pad);
  for (let k = 0; k < diep; k += 2) {
    const bron = y - k - 3;
    if (bron < 0) break;
    const dx = Math.sin((y + k) / 4.5 + nu / 260) * Math.min(2.5, 0.4 + k / 10);
    ctx.globalAlpha = 0.3 * (1 - k / diep);
    ctx.drawImage(doek, x0 * r, bron * r, (x1 - x0) * r, 2 * r, x0 + dx, y + k + 1, x1 - x0, 2);
  }
  ctx.globalAlpha = 1;
  // lichtstreepjes
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let k = 0; k < 9; k++) {
    const lx = x0 + ((((hash(k + 61) * (x1 - x0) + nu / 90) % (x1 - x0)) + (x1 - x0)) % (x1 - x0));
    const ly = y + 6 + hash(k + 71) * 34;
    ctx.fillRect(lx, ly, 6 + hash(k + 81) * 10, 1);
  }
  ctx.restore();
  // de kam van de golfjes
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 3) {
    const yy = y + golf(x, nu, 1);
    if (x === x0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.strokeStyle = 'rgba(235,250,255,0.75)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

/** Water dat door een open deur van hoog naar laag stroomt. */
function stroom(
  ctx: CanvasRenderingContext2D,
  x: number,
  yL: number,
  yR: number,
  open: number,
  nu: number,
): void {
  if (open < 0.05) return;
  const x0 = x - DEUR - 1;
  const x1 = x + DEUR + 1;
  ctx.save();
  ctx.globalAlpha = open;
  ctx.beginPath();
  ctx.moveTo(x0, BODEM_Y);
  ctx.lineTo(x0, yL);
  ctx.bezierCurveTo(x, yL, x, yR, x1, yR);
  ctx.lineTo(x1, BODEM_Y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(40,125,175,0.88)';
  ctx.fill();
  if (Math.abs(yL - yR) > 4) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const laag = Math.max(yL, yR);
    for (let k = 0; k < 6; k++) {
      const f = (((nu / 400 + k / 6) % 1) + 1) % 1;
      ctx.beginPath();
      ctx.arc(x + (k - 2.5) * 2.5, laag - 2 + f * 4, 1.2 + f * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function teken(canvas: HTMLCanvasElement | null, b: Beeld, nu: number, pauze: boolean): void {
  const ctx = maakScherp(canvas, BREEDTE, HOOGTE);
  if (!canvas || !ctx) return;
  const kolkY = peilY(Math.max(-WAND, Math.min(WAND, b.peil)));
  const alarm = !isVeilig(b.peil);

  ctx.drawImage(lucht(), 0, 0, BREEDTE, HOOGTE);
  wolken(ctx, nu);
  ctx.drawImage(land(), 0, 0, BREEDTE, HOOGTE);
  rook(ctx, nu);

  // rode gloed in de kolk bij alarm
  if (alarm) {
    const puls = 0.5 + 0.5 * Math.sin(nu / 160);
    ctx.fillStyle = `rgba(255,60,40,${0.1 + 0.12 * puls})`;
    ctx.fillRect(KOLK_L + DEUR, KADE_Y + 5, KOLK_R - KOLK_L - 2 * DEUR, BODEM_Y - KADE_Y - 5);
  }

  deur(ctx, KOLK_L, b.deurL, -1);
  deur(ctx, KOLK_R, b.deurR, 1);

  // de schepen: op het water van de kolk of van het diep (bij de deur geleidelijk)
  const yBij = (x: number): number => {
    const t = (rand: number, kant: number) =>
      Math.max(0, Math.min(1, (kant * (x - rand)) / 60 + 0.5));
    const inL = t(KOLK_L, 1);
    const inR = t(KOLK_R, -1);
    const f = Math.min(inL, inR);
    return NUL_Y + (kolkY - NUL_Y) * f;
  };
  for (const s of b.schepen) tekenSchip(ctx, s.schip, s.x, yBij(s.x), nu);

  // het water: het diep links, de kolk en het diep rechts
  water(ctx, canvas, 0, KOLK_L - DEUR, NUL_Y, nu, false);
  water(ctx, canvas, KOLK_L + DEUR, KOLK_R - DEUR, kolkY, nu, alarm);
  water(ctx, canvas, KOLK_R + DEUR, BREEDTE, NUL_Y, nu, false);
  stroom(ctx, KOLK_L, NUL_Y, kolkY, b.deurL, nu);
  stroom(ctx, KOLK_R, kolkY, NUL_Y, b.deurR, nu);

  // het peil op de schaal: een pijltje
  const px = KOLK_L + DEUR + 4 + 21;
  ctx.fillStyle = alarm ? '#ff3b2f' : '#ffd84d';
  ctx.strokeStyle = '#1d2230';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, kolkY);
  ctx.lineTo(px + 7, kolkY - 4.5);
  ctx.lineTo(px + 7, kolkY + 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  lamp(ctx, KOLK_L + 14, alarm, nu);
  lamp(ctx, KOLK_R - 14, alarm, nu);
  sluiswachter(ctx, alarm, nu);

  // hoe lang het schip nog in de kolk ligt
  for (const s of b.schepen) {
    if (s.wacht === undefined) continue;
    const cx = s.x + 40;
    const cy = yBij(s.x) - 78;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = alarm ? '#d23c2c' : '#1f9d55';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - s.wacht));
    ctx.stroke();
  }

  // zwevende teksten
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 16px ${LETTER}`;
  for (let i = b.zwevers.length - 1; i >= 0; i--) {
    const z = b.zwevers[i];
    if (!z) continue;
    const f = (nu - z.begin) / 1500;
    if (f >= 1) {
      b.zwevers.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = 1 - f * f;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(z.tekst, z.x, z.y - f * 28);
    ctx.fillStyle = z.goed ? '#0e6b45' : '#b02a17';
    ctx.fillText(z.tekst, z.x, z.y - f * 28);
    ctx.globalAlpha = 1;
  }

  if (pauze) {
    ctx.fillStyle = 'rgba(10,25,45,0.5)';
    ctx.fillRect(0, 0, BREEDTE, HOOGTE);
    ctx.fillStyle = '#fff';
    ctx.font = `800 30px ${LETTER}`;
    ctx.fillText('Pauze', BREEDTE / 2, HOOGTE / 2);
  }
}

/**
 * Academiegebouw: "Rondkomen met z'n tweeën". Een doorsnede van een Gronings rijtjeshuis met twee
 * jonge mensen die samen huren. Een maand van vier weken: elke week komen er keuzekaarten langs.
 * Elke keuze kost geld uit de spaarpot en doet iets met het plezier. Eén kaart is de aanslag van
 * de gemeente: de afvalstoffenheffing voor twee personen. Dan komt de vuilniswagen de kliko legen.
 *
 * Elke kaart heeft een timer: is de tijd op, dan kiezen ze het makkelijkste (en dat is vaak duur).
 * Bij minder beweging loopt er geen timer en beweegt er niets vanzelf: je kiest in je eigen tempo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  aandeelGemeente,
  afvalPost,
  BEGIN_SALDO,
  euro,
  gelukt,
  heffing,
  INKOMEN,
  maakMaand,
  MAX_SCORE,
  perMaand,
  PLEZIER_DOEL,
  score,
  SPAARDOEL,
  stand,
  sterren,
  VASTE_LASTEN,
  VASTE_LASTEN_TOTAAL,
  WEKEN,
  type Gekozen,
  type Kaart,
  type Soort,
} from '../../game/mgAcademie';
import { Hud, Meldingen, PauzeKnop, SpelKaart, type Melding } from './kader/kader';
import { maakScherp, mln, rondRechthoek, useLus, useStil, useToetsen } from './kader/hulp';
import type { MinigameProps } from './types';
import './Academie.css';

const BREEDTE = 480;
const HOOGTE = 360;

type Fase = 'start' | 'spelen';

/** Een bedrag of hartje dat even omhoog zweeft. */
type Zwever = { tekst: string; x: number; y: number; begin: number; kleur: string };

/** Alles wat beweegt, buiten React (elk beeld verandert het). */
type Beweging = {
  /** het getoonde bedrag in de spaarpot (loopt naar het echte saldo) */
  pot: number;
  /** de getoonde vulling van de kliko */
  kliko: number;
  wagen: { stand: 'weg' | 'komt' | 'leegt' | 'gaat'; x: number; t: number };
  zwevers: Zwever[];
  /** de poppetjes springen (blij) of zakken (balen) even na een keuze */
  sprong: { begin: number; blij: boolean };
};

/** Wat er te tekenen is: volgt uit de stand van het spel. */
type Beeld = {
  saldo: number;
  plezier: number;
  week: number;
  kaart?: Kaart;
  /** vulling van de kliko: loopt op, de vuilniswagen leegt hem */
  kliko: number;
  /** bij minder beweging: de vuilniswagen staat nog bij de kliko */
  wagenStaat: boolean;
};

const WAGEN_STOP = 246;

const nieuweBeweging = (): Beweging => ({
  pot: BEGIN_SALDO,
  kliko: 0.35,
  wagen: { stand: 'weg', x: 560, t: 0 },
  zwevers: [],
  sprong: { begin: -9999, blij: true },
});

/** Hoe vol de kliko is: elke kaart wat meer afval, de vuilniswagen leegt hem bij de aanslag. */
function klikoVulling(gekozen: readonly Gekozen[]): number {
  const leeg = gekozen.findIndex((g) => g.kaart.soort === 'aanslag');
  const sinds = leeg >= 0 ? gekozen.length - leeg - 1 : gekozen.length + 2;
  return Math.min(1, 0.05 + sinds * 0.17);
}

export default function Academie({ data, onKlaar }: MinigameProps) {
  const stil = useStil();
  const h = useMemo(() => heffing(data), [data]);
  const afval = useMemo(() => afvalPost(data), [data]);
  const [maand, setMaand] = useState<Kaart[]>(() => maakMaand(data));
  const [fase, setFase] = useState<Fase>('start');
  const [gekozen, setGekozen] = useState<Gekozen[]>([]);
  const [pauze, setPauze] = useState(false);
  const [melding, setMelding] = useState<Melding>();
  const [tijd, setTijd] = useState(0);

  const doek = useRef<HTMLCanvasElement>(null);
  const beweging = useRef<Beweging>(nieuweBeweging());
  /** milliseconden over voor de kaart van nu */
  const rest = useRef(0);

  const nr = gekozen.length;
  const kaart = maand[nr];
  const s = useMemo(() => stand(gekozen), [gekozen]);
  const klaar = fase === 'spelen' && !kaart;
  const speelt = fase === 'spelen' && !!kaart;
  const week = kaart?.week ?? WEKEN;
  const vorige = gekozen[nr - 1];
  const beeld: Beeld = {
    saldo: s.saldo,
    plezier: s.plezier,
    week,
    kaart,
    kliko: klikoVulling(gekozen),
    wagenStaat: stil && vorige?.kaart.soort === 'aanslag',
  };

  // ---------------------------------------------------------------------------------------------
  // Spelen
  // ---------------------------------------------------------------------------------------------

  const begin = () => {
    const m = fase === 'start' ? maand : maakMaand(data);
    setMaand(m);
    setGekozen([]);
    setPauze(false);
    setMelding(undefined);
    beweging.current = nieuweBeweging();
    rest.current = (m[0]?.tijd ?? 10) * 1000;
    setTijd(m[0]?.tijd ?? 10);
    setFase('spelen');
  };

  const kies = useCallback(
    (i: number, teLaat = false) => {
      const k = maand[nr];
      const keuze = k?.keuzes[i];
      if (!k || !keuze) return;
      setGekozen((g) => (g.length === nr ? [...g, { kaart: k, keuze, teLaat }] : g));
      const volgende = maand[nr + 1];
      rest.current = (volgende?.tijd ?? 10) * 1000;
      setTijd(volgende?.tijd ?? 10);
      const nu = performance.now();
      const b = beweging.current;
      if (keuze.euro > 0)
        b.zwevers.push({
          tekst: euro(-keuze.euro),
          x: 70,
          y: 200,
          begin: nu,
          kleur: k.gemeente ? '#1d4ed8' : '#c4321e',
        });
      if (keuze.plezier !== 0)
        b.zwevers.push({
          tekst: `${keuze.plezier > 0 ? '+' : '−'}${Math.abs(keuze.plezier)} ♥`,
          x: 190,
          y: 226,
          begin: nu + 150,
          kleur: keuze.plezier > 0 ? '#d6336c' : '#6b7280',
        });
      b.sprong = { begin: nu, blij: keuze.plezier >= 0 };
      if (k.soort === 'aanslag' && !stil) b.wagen = { stand: 'komt', x: 560, t: 0 };
      setMelding({
        tekst: (
          <>
            {teLaat && <strong>De tijd was op: jullie kozen het makkelijkste. </strong>}
            {k.gemeente ? '🏛️ ' : keuze.plezier > 0 ? '😊 ' : keuze.plezier < 0 ? '😕 ' : ''}
            <strong>{keuze.tekst}</strong> ({keuze.euro > 0 ? euro(-keuze.euro) : 'gratis'}).{' '}
            {keuze.gevolg}
            {volgende && volgende.week !== k.week && ` Week ${volgende.week} begint.`}
          </>
        ),
        toon: k.gemeente ? undefined : teLaat ? 'fout' : keuze.plezier >= 0 ? 'goed' : undefined,
        tijd: nu,
      });
    },
    [maand, nr, stil],
  );

  // Toetsen: 1, 2 of 3 kiest; P is pauze.
  useToetsen(speelt, (e) => {
    const i = Number(e.key) - 1;
    if (kaart && i >= 0 && i < kaart.keuzes.length && !pauze) {
      e.preventDefault();
      kies(i);
    } else if ((e.key === 'p' || e.key === 'P') && !stil) {
      e.preventDefault();
      setPauze((p) => !p);
    }
  });

  // Elk beeld: de timer, de beweging en tekenen
  useLus(fase === 'spelen' && !stil, (dt, nu) => {
    if (kaart && !pauze) {
      rest.current -= dt * 1000;
      const sec = Math.max(0, Math.ceil(rest.current / 1000));
      if (sec !== tijd) setTijd(sec);
      if (rest.current <= 0) {
        rest.current = Infinity;
        kies(kaart.standaard, true);
      }
    }
    beweeg(beweging.current, beeld, dt);
    teken(doek.current, beeld, beweging.current, nu, false);
  });

  // Bij minder beweging: alleen tekenen als er iets verandert
  useEffect(() => {
    if (!stil || !speelt) return;
    const b = beweging.current;
    b.pot = s.saldo;
    b.kliko = klikoVulling(gekozen);
    b.zwevers = [];
    teken(
      doek.current,
      {
        saldo: s.saldo,
        plezier: s.plezier,
        week: maand[gekozen.length]?.week ?? WEKEN,
        kaart: maand[gekozen.length],
        kliko: b.kliko,
        wagenStaat: gekozen[gekozen.length - 1]?.kaart.soort === 'aanslag',
      },
      b,
      0,
      true,
    );
  }, [stil, speelt, s, gekozen, maand]);

  // ---------------------------------------------------------------------------------------------
  // Scherm
  // ---------------------------------------------------------------------------------------------

  const hud = (
    <Hud
      testid="mg-academie-stand"
      icoon="🏠"
      links={[
        {
          label: 'Spaarpot',
          waarde: euro(s.saldo),
          toon: s.saldo >= SPAARDOEL ? 'goed' : s.saldo < 0 ? 'fout' : undefined,
          testid: 'mg-academie-saldo',
        },
        { label: 'Doel', waarde: `${euro(SPAARDOEL)} over` },
      ]}
      rechts={[
        stil || !kaart
          ? { label: 'Kaart', waarde: `${Math.min(nr + 1, maand.length)} van ${maand.length}` }
          : { label: 'Tijd', waarde: tijd, toon: tijd <= 3 ? 'fout' : undefined },
        {
          label: 'Plezier',
          waarde: `${s.plezier} ♥`,
          toon: s.plezier >= PLEZIER_DOEL ? 'goed' : s.plezier < 35 ? 'fout' : undefined,
        },
      ]}
    />
  );

  if (fase === 'start')
    return (
      <div className="mg-kader mg-academie">
        <SpelKaart
          titel="Rondkomen met z’n tweeën"
          knop={{ tekst: 'Begin de maand', onClick: begin }}
          testid="mg-academie-start"
        >
          <p>
            Twee jonge mensen huren samen een huis in de gemeente Groningen. Kom de maand rond,
            spaar <strong>{euro(SPAARDOEL)}</strong> en houd het ook een beetje leuk (plezier{' '}
            <strong>{PLEZIER_DOEL} ♥</strong>).
          </p>
          <ul className="klein">
            <li>
              💶 Samen verdienen ze <strong>{euro(INKOMEN)}</strong> per maand. De vaste lasten (
              {VASTE_LASTEN.map((v) => `${v.naam.toLowerCase()} ${euro(v.euro)}`).join(', ')}) gaan
              er meteen af. Er blijft <strong>{euro(BEGIN_SALDO)}</strong> over in de spaarpot.
            </li>
            <li>
              🗓️ Vier weken. Elke week komen er kaarten langs met keuzes: die kosten geld en doen
              iets met jullie plezier.
            </li>
            <li>
              🏛️ Ook de gemeente stuurt een aanslag: de <strong>afvalstoffenheffing</strong> voor
              twee personen.
            </li>
            {!stil && (
              <li>
                ⏱️ Elke kaart heeft een timer, en die wordt elke week korter. Te laat? Dan kiezen ze
                het makkelijkste, en dat is vaak duur.
              </li>
            )}
          </ul>
          <p className="klein">
            Kies met de knoppen of met de toetsen 1, 2 en 3.
            {!stil && ' Pauze met P.'}
          </p>
          <p className="klein mg-academie-let">
            ⚠︎ Inkomen, huur en de andere kosten zijn voorbeeldbedragen, geen cijfers van de
            gemeente. Het spaardoel, plezier en de punten zijn spelregels. De afvalstoffenheffing is
            het echte tarief {h ? h.jaar : ''}.
          </p>
        </SpelKaart>
      </div>
    );

  if (klaar) {
    const pct = aandeelGemeente(s);
    const punten = score(s);
    const aantal = sterren(s);
    const teLaat = gekozen.filter((g) => g.teLaat).length;
    return (
      <div className="mg-kader mg-academie" data-testid="mg-academie-uitslag">
        {hud}
        <SpelKaart
          titel={
            gelukt(s)
              ? 'Gelukt: rondgekomen, gespaard én plezier gehad! 🎉'
              : s.saldo < 0
                ? `Niet rondgekomen: een tekort van ${euro(-s.saldo)}`
                : s.saldo < SPAARDOEL
                  ? `Rondgekomen, maar maar ${euro(s.saldo)} gespaard`
                  : 'Wel gespaard, maar het was geen leuke maand'
          }
          status
          knop={{ tekst: 'Naar de uitslag', onClick: () => onKlaar(punten, MAX_SCORE) }}
          extra={
            <button type="button" className="knop" onClick={begin}>
              Nog een maand
            </button>
          }
        >
          <p className="mg-sterren" aria-label={`${aantal} van de 3 sterren`}>
            {'★'.repeat(aantal)}
            {'☆'.repeat(3 - aantal)}
          </p>
          <p>
            Over in de spaarpot: <strong>{euro(s.saldo)}</strong>. Plezier:{' '}
            <strong>{s.plezier} ♥</strong>. {punten} van de {MAX_SCORE} punten (spelregel).
            {teLaat > 0 && ` ${teLaat} keer was de tijd op.`}
          </p>
          <h4>Wat ging er naar de gemeente?</h4>
          <p data-testid="mg-academie-gemeente">
            Jullie gaven deze maand <strong>{euro(s.uitgaven)}</strong> uit (met de vaste lasten van{' '}
            {euro(VASTE_LASTEN_TOTAAL)}). Daarvan ging <strong>{euro(s.gemeente)}</strong> naar de
            gemeente: <strong>{pct.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}%</strong>.
            De rest ging naar de verhuurder, de winkel, de zorgverzekeraar en het energiebedrijf.
          </p>
          {h && (
            <>
              <ul className="klein">
                <li>
                  <strong>Afvalstoffenheffing {h.jaar}</strong> per huishouden: 1 persoon{' '}
                  {euro(h.eenPersoon)} per jaar ({euro(perMaand(h.eenPersoon))} per maand),{' '}
                  <strong>
                    2 personen {euro(h.perJaar)} ({euro(h.perMaand)} per maand)
                  </strong>
                  , 3 of meer {euro(h.drieOfMeer)} ({euro(perMaand(h.drieOfMeer))} per maand). Samen
                  wonen scheelt: met z’n tweeën is het {euro(h.perJaar / 2)} per persoon per jaar.
                </li>
                <li>
                  <strong>Huurders</strong> betalen geen OZB en geen rioolheffing voor eigenaren (
                  {euro(h.rioolEigenaar)} per jaar in {h.jaar}). Die betaalt de verhuurder.
                </li>
                {h.kwijtschelding && (
                  <li>
                    <strong>Kwijtschelding:</strong> {h.kwijtschelding}
                  </li>
                )}
              </ul>
            </>
          )}
          {afval && (
            <>
              <h4>Wat kost afval ophalen de gemeente?</h4>
              <p data-testid="mg-academie-afval">
                In {afval.jaar} kost afval ophalen en verwerken de gemeente{' '}
                <strong>{mln(afval.lastenMln)}</strong>. De afvalstoffenheffing van alle huishoudens
                brengt <strong>{mln(afval.batenMln)}</strong> op. De heffing betaalt dus de kosten;
                daarbij horen ook kosten die elders in de begroting staan. De gemeente mag aan de
                heffing niets verdienen.
              </p>
            </>
          )}
          <p className="klein">
            ⚠︎ Inkomen, huur en de andere kosten zijn voorbeeldbedragen. Bronnen: de begroting{' '}
            {data.begroting.begrotingsjaar} van de gemeente Groningen
            {h && (
              <>
                {' en '}
                <a href={h.bronUrl} target="_blank" rel="noopener noreferrer">
                  {h.bron}
                </a>
              </>
            )}
            .
          </p>
        </SpelKaart>
      </div>
    );
  }

  if (!kaart) return null;
  const deel = stil ? 1 : Math.max(0, Math.min(1, tijd / kaart.tijd));
  return (
    <div className="mg-kader mg-academie">
      {hud}
      <p className="mg-strook klein">
        <strong>
          Week {week} van {WEKEN}
        </strong>{' '}
        · {euro(INKOMEN)} inkomen, {euro(VASTE_LASTEN_TOTAAL)} vaste lasten (⚠︎ voorbeeld)
      </p>
      <canvas
        ref={doek}
        className="mg-veld mg-academie-veld"
        width={BREEDTE}
        height={HOOGTE}
        role="img"
        aria-label={`Het huis in week ${week}. In de spaarpot zit ${euro(s.saldo)}. Plezier ${s.plezier} van 100. De kliko is ${
          beeld.kliko > 0.7 ? 'bijna vol' : beeld.kliko < 0.25 ? 'net geleegd' : 'half vol'
        }. Nu: ${kaart.titel}.`}
      />
      <section
        className={`mg-academie-kaart${kaart.gemeente ? ' mg-academie-gemeente' : ''}`}
        data-testid="mg-academie-kaart"
        aria-labelledby="mg-academie-titel"
      >
        <div className="mg-academie-kop">
          <span className="mg-academie-icoon" aria-hidden="true">
            {ICOON[kaart.soort]}
          </span>
          <div>
            <p className="mg-academie-week klein">
              Week {kaart.week} · kaart {nr + 1} van {maand.length}
            </p>
            <h4 id="mg-academie-titel">{kaart.titel}</h4>
          </div>
        </div>
        <p className="mg-academie-tekst">{kaart.tekst}</p>
        {kaart.gemeente && h && (
          <p className="klein mg-academie-uitleg">
            Het jaarbedrag is {euro(h.perJaar)}. In dit spel betalen jullie het in twaalf gelijke
            delen: {euro(h.perMaand)} per maand (spelregel). Woon je alleen, dan is het{' '}
            {euro(h.eenPersoon)} per jaar; met drie of meer {euro(h.drieOfMeer)}.
          </p>
        )}
        {!stil && (
          <div className="mg-academie-timer" aria-hidden="true">
            <span
              style={{ width: `${deel * 100}%` }}
              className={tijd <= 3 ? 'mg-academie-kort' : ''}
            />
          </div>
        )}
        <div className="mg-academie-keuzes">
          {kaart.keuzes.map((k, i) => (
            <button
              key={i}
              type="button"
              className="knop mg-academie-keuze"
              disabled={pauze}
              onClick={() => kies(i)}
            >
              <span className="mg-academie-toets" aria-hidden="true">
                {i + 1}
              </span>
              <span className="mg-academie-keuzetekst">{k.tekst}</span>
              <span className="mg-academie-prijs">
                {k.euro > 0 ? euro(k.euro) : 'gratis'}
                <span
                  className={
                    k.plezier > 0 ? 'mg-academie-plus' : k.plezier < 0 ? 'mg-academie-min' : ''
                  }
                >
                  {' '}
                  {k.plezier === 0 ? '± 0' : `${k.plezier > 0 ? '+' : '−'}${Math.abs(k.plezier)}`} ♥
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
      {!stil && (
        <div className="mg-knoppen">
          <PauzeKnop pauze={pauze} onWissel={() => setPauze((p) => !p)} />
        </div>
      )}
      <Meldingen melding={melding} />
    </div>
  );
}

const ICOON: Record<Soort, string> = {
  boodschappen: '🛒',
  energie: '⚡',
  aanslag: '🏛️',
  uit: '🍽️',
  fiets: '🚲',
  wasmachine: '🫧',
  verjaardag: '🎁',
  weekend: '🌊',
};

// -------------------------------------------------------------------------------------------------
// Beweging
// -------------------------------------------------------------------------------------------------

function beweeg(b: Beweging, beeld: Beeld, dt: number): void {
  // de spaarpot loopt rustig naar het echte bedrag
  b.pot += (beeld.saldo - b.pot) * Math.min(1, dt * 5);
  if (Math.abs(beeld.saldo - b.pot) < 0.5) b.pot = beeld.saldo;
  const w = b.wagen;
  w.t += dt;
  if (w.stand === 'komt') {
    w.x -= Math.max(40, (w.x - WAGEN_STOP) * 2.6) * dt;
    if (w.x <= WAGEN_STOP + 0.5) {
      w.x = WAGEN_STOP;
      w.stand = 'leegt';
      w.t = 0;
    }
  } else if (w.stand === 'leegt') {
    if (w.t > 0.7) b.kliko = Math.max(0.05, b.kliko - dt * 2);
    if (w.t > 2) {
      w.stand = 'gaat';
      w.t = 0;
    }
  } else if (w.stand === 'gaat') {
    w.x -= (60 + w.t * 260) * dt;
    if (w.x < -180) w.stand = 'weg';
  }
  // zolang de wagen er niet is, vult de kliko zich gewoon
  if (w.stand === 'weg' || w.stand === 'gaat')
    b.kliko += (beeld.kliko - b.kliko) * Math.min(1, dt * 3);
}

// -------------------------------------------------------------------------------------------------
// Tekenen
// -------------------------------------------------------------------------------------------------

const FONT = 'Asap, system-ui, sans-serif';

/** Kleuren van de lucht per week: ochtend, middag, namiddag, avond. */
const LUCHT: [string, string][] = [
  ['#8ccbf5', '#fde7c8'],
  ['#5fb0ec', '#d8efff'],
  ['#78a9e0', '#fbe0b4'],
  ['#4b4f8f', '#f7a072'],
];

function lucht(ctx: CanvasRenderingContext2D, week: number, nu: number): void {
  const [boven, onder] = LUCHT[Math.max(0, Math.min(3, week - 1))] ?? LUCHT[0] ?? ['#8cf', '#fff'];
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, boven);
  g.addColorStop(1, onder);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BREEDTE, HOOGTE);
  // zon (zakt in de loop van de maand)
  const zx = 360 + week * 18;
  const zy = 40 + week * 26;
  const zon = ctx.createRadialGradient(zx, zy, 4, zx, zy, 46);
  zon.addColorStop(0, week === 4 ? 'rgba(255,190,120,0.95)' : 'rgba(255,250,210,0.95)');
  zon.addColorStop(0.35, week === 4 ? 'rgba(255,160,90,0.5)' : 'rgba(255,240,170,0.45)');
  zon.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = zon;
  ctx.beginPath();
  ctx.arc(zx, zy, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = week === 4 ? '#ffb27a' : '#fff6c8';
  ctx.beginPath();
  ctx.arc(zx, zy, 13, 0, Math.PI * 2);
  ctx.fill();
  // wolken
  for (let i = 0; i < 4; i++) {
    const x = ((i * 157 + nu * (0.004 + i * 0.0015)) % (BREEDTE + 140)) - 70;
    const y = 22 + ((i * 37) % 60);
    wolk(
      ctx,
      x,
      y,
      0.7 + (i % 3) * 0.25,
      week === 4 ? 'rgba(255,214,200,0.85)' : 'rgba(255,255,255,0.9)',
    );
  }
}

function wolk(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, kleur: string): void {
  ctx.fillStyle = kleur;
  ctx.beginPath();
  ctx.arc(x, y, 12 * s, 0, Math.PI * 2);
  ctx.arc(x + 14 * s, y - 6 * s, 15 * s, 0, Math.PI * 2);
  ctx.arc(x + 30 * s, y, 11 * s, 0, Math.PI * 2);
  ctx.rect(x, y, 30 * s, 10 * s);
  ctx.fill();
}

/** Bakstenen in een vlak. */
function bakstenen(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  b: number,
  h: number,
  kleur = '#a9472d',
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, b, h);
  ctx.clip();
  ctx.fillStyle = kleur;
  ctx.fillRect(x, y, b, h);
  for (let r = 0; r * 6 < h; r++) {
    for (let c = -1; c * 14 < b; c++) {
      const bx = x + c * 14 + (r % 2 ? 7 : 0);
      const by = y + r * 6;
      const tint = ((r * 7 + c * 13) % 5) / 5;
      ctx.fillStyle = `rgba(${tint > 0.5 ? '255,200,170' : '60,20,10'},${0.06 + tint * 0.08})`;
      ctx.fillRect(bx + 1, by + 1, 12, 4);
    }
    ctx.fillStyle = 'rgba(235,220,200,0.55)';
    ctx.fillRect(x, y + r * 6, b, 1);
  }
  ctx.restore();
}

/** Het vaste decor (huis, straat, skyline). Eén keer gemaakt per beeldscherm-scherpte. */
let decorBeeld: { c: HTMLCanvasElement; r: number } | undefined;
function decor(r: number): HTMLCanvasElement {
  if (decorBeeld && decorBeeld.r === r) return decorBeeld.c;
  const c = document.createElement('canvas');
  c.width = Math.round(BREEDTE * r);
  c.height = Math.round(HOOGTE * r);
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.scale(r, r);

  // skyline in de verte (rechts van het huis)
  ctx.fillStyle = 'rgba(120,140,175,0.45)';
  const daken = [
    [300, 236, 30],
    [328, 222, 26],
    [352, 244, 22],
    [372, 214, 30],
    [430, 228, 26],
    [454, 240, 30],
  ] as const;
  for (const [x, y, b] of daken) {
    ctx.beginPath();
    ctx.moveTo(x, 300);
    ctx.lineTo(x, y);
    ctx.lineTo(x + b / 2, y - 12);
    ctx.lineTo(x + b, y);
    ctx.lineTo(x + b, 300);
    ctx.fill();
  }
  // een hoge toren in de verte
  ctx.fillStyle = 'rgba(105,125,165,0.55)';
  ctx.fillRect(404, 150, 18, 150);
  ctx.fillRect(407, 128, 12, 24);
  ctx.fillRect(409, 110, 8, 20);
  ctx.beginPath();
  ctx.moveTo(409, 110);
  ctx.lineTo(413, 92);
  ctx.lineTo(417, 110);
  ctx.fill();

  // boom
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(452, 228, 9, 74);
  const kruin = ctx.createRadialGradient(448, 205, 6, 456, 215, 42);
  kruin.addColorStop(0, '#8fcf6a');
  kruin.addColorStop(1, '#3f7f3a');
  ctx.fillStyle = kruin;
  ctx.beginPath();
  ctx.arc(456, 214, 30, 0, Math.PI * 2);
  ctx.arc(436, 226, 20, 0, Math.PI * 2);
  ctx.arc(476, 226, 20, 0, Math.PI * 2);
  ctx.fill();

  // stoep en straat
  const stoep = ctx.createLinearGradient(0, 300, 0, 318);
  stoep.addColorStop(0, '#cfc9bf');
  stoep.addColorStop(1, '#b7b0a4');
  ctx.fillStyle = stoep;
  ctx.fillRect(0, 300, BREEDTE, 18);
  ctx.strokeStyle = 'rgba(90,80,70,0.25)';
  ctx.lineWidth = 1;
  for (let x = 0; x < BREEDTE; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 300);
    ctx.lineTo(x, 316);
    ctx.stroke();
  }
  ctx.fillStyle = '#8f887d';
  ctx.fillRect(0, 316, BREEDTE, 3);
  const straat = ctx.createLinearGradient(0, 319, 0, 360);
  straat.addColorStop(0, '#5b5f66');
  straat.addColorStop(1, '#43474d');
  ctx.fillStyle = straat;
  ctx.fillRect(0, 319, BREEDTE, 41);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let x = 6; x < BREEDTE; x += 40) ctx.fillRect(x, 339, 20, 2);

  // buren links en rechts (een stukje)
  bakstenen(ctx, 0, 118, 22, 182, '#8f3f2a');
  ctx.fillStyle = '#e8eef3';
  ctx.fillRect(4, 150, 12, 30);
  ctx.fillRect(4, 230, 12, 36);

  // het dak
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(8, 118);
  ctx.lineTo(164, 30);
  ctx.lineTo(320, 118);
  ctx.closePath();
  const dak = ctx.createLinearGradient(0, 30, 0, 118);
  dak.addColorStop(0, '#9c3a24');
  dak.addColorStop(1, '#7a2a18');
  ctx.fillStyle = dak;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(40,10,5,0.35)';
  for (let y = 36; y < 118; y += 7) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(BREEDTE, y);
    ctx.stroke();
  }
  ctx.restore();
  // zolder (doorsnede): binnen het dak
  ctx.beginPath();
  ctx.moveTo(30, 114);
  ctx.lineTo(164, 44);
  ctx.lineTo(298, 114);
  ctx.closePath();
  const zolder = ctx.createLinearGradient(0, 44, 0, 114);
  zolder.addColorStop(0, '#d4b48c');
  zolder.addColorStop(1, '#b8946a');
  ctx.fillStyle = zolder;
  ctx.fill();
  ctx.strokeStyle = '#8c6a44';
  ctx.lineWidth = 3;
  for (const x of [100, 164, 228]) {
    ctx.beginPath();
    ctx.moveTo(x, 114);
    ctx.lineTo(x, x === 164 ? 46 : x < 164 ? 80 : 80);
    ctx.stroke();
  }
  // dozen op zolder
  ctx.fillStyle = '#c8935a';
  ctx.fillRect(60, 96, 20, 16);
  ctx.fillRect(74, 102, 16, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(60, 103, 20, 2);
  // dakraam
  ctx.fillStyle = '#3d2a1c';
  ctx.fillRect(196, 70, 30, 22);
  ctx.fillStyle = '#9fd0ef';
  ctx.fillRect(199, 73, 24, 16);
  // schoorsteen
  bakstenen(ctx, 238, 40, 16, 34, '#8a3a26');
  ctx.fillStyle = '#5a2a1a';
  ctx.fillRect(235, 38, 22, 5);

  // binnenmuren: behang
  const boven = ctx.createLinearGradient(0, 118, 0, 196);
  boven.addColorStop(0, '#e6eef6');
  boven.addColorStop(1, '#d4e0ec');
  ctx.fillStyle = boven;
  ctx.fillRect(32, 118, 262, 80);
  ctx.fillStyle = 'rgba(120,150,190,0.18)';
  for (let x = 40; x < 290; x += 14)
    for (let y = 124; y < 194; y += 14) ctx.fillRect(x + ((y / 14) % 2) * 7, y, 2, 2);
  const beneden = ctx.createLinearGradient(0, 204, 0, 296);
  beneden.addColorStop(0, '#fbeedb');
  beneden.addColorStop(1, '#f1dcbf');
  ctx.fillStyle = beneden;
  ctx.fillRect(32, 204, 262, 94);
  ctx.fillStyle = 'rgba(200,150,90,0.14)';
  for (let x = 40; x < 290; x += 12) ctx.fillRect(x, 204, 5, 92);
  // plinten
  ctx.fillStyle = '#fff';
  ctx.fillRect(32, 190, 262, 4);
  ctx.fillRect(32, 290, 262, 4);

  // ramen in de achtergevel (doorzichtig: de lucht schijnt erdoor)
  const raam = (x: number, y: number, b: number, h: number) => {
    ctx.clearRect(x, y, b, h);
    ctx.strokeStyle = '#f7f7f2';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, b, h);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + b / 2, y);
    ctx.lineTo(x + b / 2, y + h);
    ctx.moveTo(x, y + h * 0.4);
    ctx.lineTo(x + b, y + h * 0.4);
    ctx.stroke();
    ctx.fillStyle = '#e9e2d5';
    ctx.fillRect(x - 4, y + h, b + 8, 4);
  };
  raam(150, 130, 50, 42);
  raam(166, 214, 46, 36);
  // gordijnen
  ctx.fillStyle = '#e07a5f';
  ctx.fillRect(142, 128, 8, 48);
  ctx.fillRect(200, 128, 8, 48);
  ctx.fillStyle = '#81b29a';
  ctx.fillRect(159, 212, 7, 42);
  ctx.fillRect(212, 212, 7, 42);

  // vloeren
  const hout = (y: number, h: number) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#9b6a3f');
    g.addColorStop(1, '#6e4626');
    ctx.fillStyle = g;
    ctx.fillRect(24, y, 280, h);
  };
  hout(196, 9);
  hout(294, 7);
  ctx.fillStyle = '#e8dcc6';
  ctx.fillRect(24, 114, 280, 5);

  // buitenmuren (doorgesneden)
  bakstenen(ctx, 22, 114, 10, 187);
  bakstenen(ctx, 294, 114, 10, 187);
  // voordeur in de rechtermuur
  ctx.fillStyle = '#1f5f4a';
  rondRechthoek(ctx, 294, 232, 10, 62, 2);
  ctx.fill();
  ctx.fillStyle = '#d9b44a';
  ctx.fillRect(296, 262, 6, 2);

  // bovenverdieping: bed
  ctx.fillStyle = '#7a5235';
  ctx.fillRect(38, 172, 92, 6);
  ctx.fillRect(38, 160, 6, 36);
  ctx.fillRect(124, 168, 6, 28);
  ctx.fillStyle = '#f4f1ea';
  rondRechthoek(ctx, 44, 162, 80, 12, 4);
  ctx.fill();
  ctx.fillStyle = '#4f7cac';
  rondRechthoek(ctx, 62, 160, 64, 14, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  rondRechthoek(ctx, 46, 156, 14, 8, 3);
  ctx.fill();
  rondRechthoek(ctx, 46, 164, 14, 6, 3);
  ctx.fill();
  // plant
  ctx.fillStyle = '#c0703f';
  ctx.fillRect(214, 178, 14, 14);
  ctx.fillStyle = '#3f8f4a';
  ctx.beginPath();
  ctx.ellipse(217, 170, 5, 10, -0.4, 0, Math.PI * 2);
  ctx.ellipse(225, 170, 5, 10, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // keuken: aanrecht met kastjes en koelkast
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(34, 266, 70, 28);
  ctx.strokeStyle = '#c9c2b5';
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 268, 32, 24);
  ctx.strokeRect(70, 268, 32, 24);
  ctx.fillStyle = '#6b6f76';
  ctx.fillRect(32, 262, 74, 5);
  ctx.fillStyle = '#9aa1a8';
  ctx.fillRect(50, 278, 6, 2);
  ctx.fillRect(84, 278, 6, 2);
  const koel = ctx.createLinearGradient(106, 0, 130, 0);
  koel.addColorStop(0, '#f2f4f6');
  koel.addColorStop(1, '#cfd5db');
  ctx.fillStyle = koel;
  rondRechthoek(ctx, 108, 222, 24, 72, 3);
  ctx.fill();
  ctx.strokeStyle = '#aab2ba';
  ctx.beginPath();
  ctx.moveTo(108, 248);
  ctx.lineTo(132, 248);
  ctx.stroke();
  ctx.fillStyle = '#8a929a';
  ctx.fillRect(127, 230, 2, 12);
  ctx.fillRect(127, 254, 2, 16);
  // magneetjes
  ctx.fillStyle = '#e63946';
  ctx.fillRect(113, 232, 4, 4);
  ctx.fillStyle = '#ffb703';
  ctx.fillRect(118, 258, 5, 4);

  // tafel
  ctx.fillStyle = '#8a5a35';
  ctx.fillRect(160, 262, 64, 5);
  ctx.fillRect(164, 267, 4, 27);
  ctx.fillRect(216, 267, 4, 27);
  // deurmat
  ctx.fillStyle = '#9a7b4f';
  rondRechthoek(ctx, 258, 290, 32, 5, 2);
  ctx.fill();

  // heg voor het huis
  ctx.fillStyle = '#3f7f3a';
  rondRechthoek(ctx, 306, 286, 16, 16, 5);
  ctx.fill();
  // lantaarnpaal
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(428, 196, 4, 106);
  ctx.fillRect(420, 192, 20, 5);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(423, 197, 14, 3);

  decorBeeld = { c, r };
  return c;
}

/** Een poppetje: x is het midden, y de voeten. */
function poppetje(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  stijl: { shirt: string; broek: string; haar: string; huid: string; lang: boolean },
  blij: number,
  kijk: number,
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y, 13, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // benen
  ctx.fillStyle = stijl.broek;
  rondRechthoek(ctx, x - 7, y - 24, 6, 24, 2);
  ctx.fill();
  rondRechthoek(ctx, x + 1, y - 24, 6, 24, 2);
  ctx.fill();
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(x - 8, y - 3, 8, 3);
  ctx.fillRect(x, y - 3, 8, 3);
  // lijf
  const shirt = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
  shirt.addColorStop(0, stijl.shirt);
  shirt.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = stijl.shirt;
  rondRechthoek(ctx, x - 10, y - 46, 20, 25, 6);
  ctx.fill();
  ctx.fillStyle = shirt;
  rondRechthoek(ctx, x - 10, y - 46, 20, 25, 6);
  ctx.fill();
  // armen
  ctx.strokeStyle = stijl.shirt;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const arm = blij > 0.3 ? -10 : 2;
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 42);
  ctx.lineTo(x - 14, y - 30 + arm);
  ctx.moveTo(x + 9, y - 42);
  ctx.lineTo(x + 14, y - 30 + arm);
  ctx.stroke();
  ctx.fillStyle = stijl.huid;
  ctx.beginPath();
  ctx.arc(x - 14, y - 29 + arm, 3, 0, Math.PI * 2);
  ctx.arc(x + 14, y - 29 + arm, 3, 0, Math.PI * 2);
  ctx.fill();
  // hoofd
  const hy = y - 56;
  ctx.fillStyle = stijl.huid;
  ctx.beginPath();
  ctx.arc(x, hy, 10, 0, Math.PI * 2);
  ctx.fill();
  // haar
  ctx.fillStyle = stijl.haar;
  ctx.beginPath();
  ctx.arc(x, hy - 2, 10.5, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  if (stijl.lang) {
    ctx.beginPath();
    ctx.ellipse(x - kijk * 9, hy + 4, 4, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - kijk * 3, hy - 12, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(x - 10, hy - 6, 20, 4);
  }
  // gezicht
  ctx.fillStyle = '#2b2118';
  ctx.beginPath();
  ctx.arc(x - 3.5 + kijk * 2, hy, 1.4, 0, Math.PI * 2);
  ctx.arc(x + 3.5 + kijk * 2, hy, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a2e1f';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const m = Math.max(-1, Math.min(1, blij));
  ctx.moveTo(x - 4 + kijk * 2, hy + 5 - m * 1);
  ctx.quadraticCurveTo(x + kijk * 2, hy + 5 + m * 3.5, x + 4 + kijk * 2, hy + 5 - m * 1);
  ctx.stroke();
  // blosjes
  if (m > 0.2) {
    ctx.fillStyle = 'rgba(230,90,90,0.25)';
    ctx.beginPath();
    ctx.arc(x - 6 + kijk * 2, hy + 3, 2.4, 0, Math.PI * 2);
    ctx.arc(x + 6 + kijk * 2, hy + 3, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** De glazen spaarpot op het aanrecht, met munten tot het saldo. */
function spaarpot(ctx: CanvasRenderingContext2D, bedrag: number, nu: number): void {
  const x = 40;
  const y = 204;
  const b = 58;
  const h = 58;
  const vol = Math.max(0, Math.min(1, bedrag / BEGIN_SALDO));
  // munten binnen in de pot
  ctx.save();
  rondRechthoek(ctx, x + 2, y + 8, b - 4, h - 10, 9);
  ctx.clip();
  const top = y + h - 2 - vol * (h - 12);
  const munt = ctx.createLinearGradient(0, top, 0, y + h);
  munt.addColorStop(0, '#ffe07a');
  munt.addColorStop(1, '#c99412');
  ctx.fillStyle = munt;
  ctx.fillRect(x, top, b, y + h - top);
  ctx.strokeStyle = 'rgba(140,95,0,0.45)';
  ctx.lineWidth = 1;
  for (let yy = top + 4; yy < y + h; yy += 5) {
    ctx.beginPath();
    for (let xx = x; xx < x + b; xx += 9)
      ctx.ellipse(xx + 4 + ((yy / 5) % 2) * 4, yy, 4, 1.6, 0, 0, Math.PI);
    ctx.stroke();
  }
  if (vol > 0.02) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(x + 8, top + 1, 14, 1.5);
  }
  ctx.restore();
  // glas
  ctx.fillStyle = 'rgba(200,230,245,0.28)';
  rondRechthoek(ctx, x, y + 6, b, h - 6, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,120,150,0.75)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  rondRechthoek(ctx, x + 5, y + 12, 5, h - 22, 3);
  ctx.fill();
  // deksel met gleuf
  ctx.fillStyle = '#d97706';
  rondRechthoek(ctx, x - 2, y, b + 4, 8, 3);
  ctx.fill();
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(x + b / 2 - 8, y + 3, 16, 2);
  // label met het bedrag
  ctx.font = `800 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tekst = euro(Math.round(bedrag));
  const lb = Math.max(b - 4, ctx.measureText(tekst).width + 10);
  ctx.fillStyle = bedrag < 0 ? '#fde2dc' : '#fffdf5';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 3;
  rondRechthoek(ctx, x + b / 2 - lb / 2, y + 26, lb, 17, 4);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = bedrag < 0 ? '#b02a17' : bedrag >= SPAARDOEL ? '#0e6b45' : '#4a2c0a';
  ctx.fillText(tekst, x + b / 2, y + 35);
  // een glinstering
  const g = (Math.sin(nu / 500) + 1) / 2;
  ctx.fillStyle = `rgba(255,255,255,${0.3 + g * 0.5})`;
  ctx.beginPath();
  ctx.arc(x + b - 12, y + 16, 1.5 + g, 0, Math.PI * 2);
  ctx.fill();
}

/** Een hartje. */
function hart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, vul: number): void {
  const pad = () => {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 0.5, y + s * 0.65, x, y + s * 0.8, x, y + s);
    ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.65, x + s * 0.5, y + s * 0.35);
    ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35);
  };
  pad();
  ctx.fillStyle = '#f3d6dc';
  ctx.fill();
  if (vul > 0) {
    ctx.save();
    pad();
    ctx.clip();
    ctx.fillStyle = '#e03a63';
    ctx.fillRect(x - s / 2, y + s * (1 - vul), s, s * vul);
    ctx.restore();
  }
  pad();
  ctx.strokeStyle = '#b4234a';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Lijstje aan de muur met vijf hartjes: het plezier. */
function plezierBord(ctx: CanvasRenderingContext2D, plezier: number): void {
  ctx.fillStyle = '#fffaf2';
  ctx.strokeStyle = '#a07850';
  ctx.lineWidth = 2;
  rondRechthoek(ctx, 40, 124, 92, 30, 4);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const vul = Math.max(0, Math.min(1, plezier / 20 - i));
    hart(ctx, 52 + i * 17, 131, 14, vul);
  }
}

/** De kalender aan de muur: vier weken, de voorbije weken doorgestreept. */
function kalender(ctx: CanvasRenderingContext2D, week: number): void {
  const x = 240;
  const y = 124;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 3;
  ctx.fillRect(x, y, 46, 50);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#d64545';
  ctx.fillRect(x, y, 46, 11);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 8px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MAAND', x + 23, y + 6);
  for (let w = 1; w <= 4; w++) {
    const wy = y + 13 + (w - 1) * 9;
    ctx.fillStyle = w === week ? '#ffe08a' : '#f1f1f1';
    ctx.fillRect(x + 3, wy, 40, 8);
    ctx.fillStyle = '#4a2c0a';
    ctx.font = `700 7px ${FONT}`;
    ctx.fillText(`week ${w}`, x + 23, wy + 4.5);
    if (w < week) {
      ctx.strokeStyle = '#d64545';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + 4, wy + 7);
      ctx.lineTo(x + 42, wy + 1);
      ctx.stroke();
    }
  }
}

/** De kliko: grijs met een groen deksel. `kantel` in radialen, `vol` van 0 tot 1. */
function kliko(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vol: number,
  kantel: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(kantel);
  // de kliko staat met (0,0) onderaan in het midden
  if (kantel === 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const g = ctx.createLinearGradient(-14, 0, 14, 0);
  g.addColorStop(0, '#6f767e');
  g.addColorStop(0.5, '#8d949c');
  g.addColorStop(1, '#5d636a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-13, -38);
  ctx.lineTo(13, -38);
  ctx.lineTo(11, -2);
  ctx.lineTo(-11, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(-9, -30, 18, 2);
  // wielen
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-9, -2, 3, 0, Math.PI * 2);
  ctx.arc(9, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  // afval steekt eruit als hij vol is
  if (vol > 0.75) {
    ctx.fillStyle = '#2f3237';
    ctx.beginPath();
    ctx.arc(-5, -40, 6, Math.PI, 0);
    ctx.arc(5, -41, 5, Math.PI, 0);
    ctx.fill();
  }
  // deksel (staat open als hij overvol is)
  ctx.fillStyle = '#2f8f4e';
  ctx.save();
  ctx.translate(13, -38);
  ctx.rotate(vol > 0.75 ? -0.35 : 0);
  rondRechthoek(ctx, -28, -4, 30, 5, 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** De vuilniswagen: cabine links, laadbak rechts. `x` is de linkerkant. */
function vuilniswagen(ctx: CanvasRenderingContext2D, x: number, nu: number, rijdt: boolean): void {
  const y = 352;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 62, y + 2, 66, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // laadbak
  const bak = ctx.createLinearGradient(0, y - 52, 0, y - 10);
  bak.addColorStop(0, '#43a066');
  bak.addColorStop(1, '#2c7349');
  ctx.fillStyle = bak;
  rondRechthoek(ctx, x + 34, y - 52, 88, 42, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(x + 40, y - 30, 76, 4);
  ctx.fillStyle = '#ffd43b';
  ctx.fillRect(x + 40, y - 24, 76, 3);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 9px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AFVAL', x + 78, y - 41);
  // achterklep
  ctx.fillStyle = '#236040';
  rondRechthoek(ctx, x + 118, y - 48, 8, 38, 3);
  ctx.fill();
  // cabine
  ctx.fillStyle = '#f4f4f0';
  rondRechthoek(ctx, x, y - 44, 36, 34, 6);
  ctx.fill();
  ctx.fillStyle = '#8ec9ee';
  rondRechthoek(ctx, x + 4, y - 40, 18, 13, 3);
  ctx.fill();
  ctx.fillStyle = '#2c7349';
  ctx.fillRect(x, y - 22, 36, 4);
  // zwaailicht
  const aan = Math.floor(nu / 300) % 2 === 0;
  ctx.fillStyle = aan ? '#ffb000' : '#c27c00';
  rondRechthoek(ctx, x + 12, y - 49, 10, 5, 2);
  ctx.fill();
  if (aan) {
    ctx.fillStyle = 'rgba(255,190,0,0.25)';
    ctx.beginPath();
    ctx.arc(x + 17, y - 47, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  // wielen
  const draai = rijdt ? nu / 80 : 0;
  for (const wx of [x + 20, x + 86, x + 106]) {
    ctx.fillStyle = '#1f1f1f';
    ctx.beginPath();
    ctx.arc(wx, y - 8, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9aa0a6';
    ctx.beginPath();
    ctx.arc(wx, y - 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5c6166';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(wx + Math.cos(draai) * 4, y - 8 + Math.sin(draai) * 4);
    ctx.lineTo(wx - Math.cos(draai) * 4, y - 8 - Math.sin(draai) * 4);
    ctx.stroke();
  }
  // uitlaatgas
  if (rijdt)
    for (let i = 0; i < 3; i++) {
      const f = (((nu / 600 + i / 3) % 1) + 1) % 1;
      ctx.fillStyle = `rgba(160,160,160,${0.4 * (1 - f)})`;
      ctx.beginPath();
      ctx.arc(x + 128 + f * 18, y - 12 - f * 8, 3 + f * 5, 0, Math.PI * 2);
      ctx.fill();
    }
}

/** Een fiets op de stoep; met een lekke band zakt het voorwiel in. */
function fiets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kleur: string,
  lek: boolean,
): void {
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 9, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  if (lek) ctx.ellipse(x + 26, y - 6, 10, 6, 0, 0, Math.PI * 2);
  else ctx.arc(x + 26, y - 9, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = kleur;
  ctx.lineWidth = 2.2;
  const vy = lek ? y - 6 : y - 9;
  ctx.beginPath();
  ctx.moveTo(x, y - 9);
  ctx.lineTo(x + 10, y - 9);
  ctx.lineTo(x + 20, y - 20);
  ctx.lineTo(x + 7, y - 20);
  ctx.closePath();
  ctx.moveTo(x + 10, y - 9);
  ctx.lineTo(x + 6, y - 23);
  ctx.moveTo(x + 20, y - 20);
  ctx.lineTo(x + 26, vy);
  ctx.moveTo(x + 20, y - 20);
  ctx.lineTo(x + 19, y - 25);
  ctx.stroke();
  ctx.fillStyle = '#222';
  ctx.fillRect(x + 2, y - 25, 9, 2.5);
  ctx.fillRect(x + 16, y - 27, 7, 2);
  if (lek) {
    ctx.fillStyle = '#c4321e';
    ctx.font = `800 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('!', x + 26, y - 20);
  }
}

/** Een envelop op de deurmat. */
function envelop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kleur: string,
  nu: number,
  stil: boolean,
): void {
  const wip = stil ? 0 : Math.sin(nu / 260) * 1.5;
  ctx.save();
  ctx.translate(x, y + wip);
  ctx.rotate(-0.12);
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = kleur;
  ctx.fillRect(-14, -9, 28, 18);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-14, -9);
  ctx.lineTo(0, 2);
  ctx.lineTo(14, -9);
  ctx.stroke();
  ctx.fillStyle = '#c4321e';
  ctx.fillRect(7, -7, 5, 5);
  ctx.restore();
}

/** Het denkwolkje met wat er deze week speelt. */
function denkwolk(ctx: CanvasRenderingContext2D, soort: Soort, nu: number, stil: boolean): void {
  const x = 186;
  const y = 158 + (stil ? 0 : Math.sin(nu / 700) * 2);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, 30, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 6, y + 34, 5, 0, Math.PI * 2);
  ctx.arc(x - 12, y + 46, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#d7dbe0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, 30, 24, 0, 0, Math.PI * 2);
  ctx.stroke();
  icoon(ctx, soort, x, y);
}

/** Kleine getekende iconen voor in het denkwolkje. */
function icoon(ctx: CanvasRenderingContext2D, soort: Soort, x: number, y: number): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (soort) {
    case 'boodschappen': {
      ctx.fillStyle = '#3f8f4a';
      ctx.beginPath();
      ctx.ellipse(x - 5, y - 10, 4, 9, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b04a';
      ctx.save();
      ctx.translate(x + 6, y - 10);
      ctx.rotate(0.35);
      rondRechthoek(ctx, -3, -10, 6, 20, 3);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#c8935a';
      ctx.beginPath();
      ctx.moveTo(x - 13, y - 4);
      ctx.lineTo(x + 13, y - 4);
      ctx.lineTo(x + 11, y + 15);
      ctx.lineTo(x - 11, y + 15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x - 12, y - 4, 24, 3);
      break;
    }
    case 'energie': {
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8590c';
      ctx.beginPath();
      ctx.moveTo(x + 3, y - 12);
      ctx.lineTo(x - 7, y + 2);
      ctx.lineTo(x, y + 2);
      ctx.lineTo(x - 3, y + 12);
      ctx.lineTo(x + 7, y - 2);
      ctx.lineTo(x, y - 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'aanslag': {
      ctx.fillStyle = '#dbe7ff';
      ctx.fillRect(x - 17, y - 11, 34, 22);
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 17, y - 11, 34, 22);
      ctx.beginPath();
      ctx.moveTo(x - 17, y - 11);
      ctx.lineTo(x, y + 2);
      ctx.lineTo(x + 17, y - 11);
      ctx.stroke();
      ctx.fillStyle = '#1d4ed8';
      ctx.font = `800 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('€', x, y + 6);
      break;
    }
    case 'uit': {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#9aa1a8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e8590c';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 19, y - 10);
      ctx.lineTo(x - 19, y + 12);
      ctx.moveTo(x + 19, y - 10);
      ctx.lineTo(x + 19, y + 12);
      ctx.stroke();
      break;
    }
    case 'fiets':
      fiets(ctx, x - 13, y + 12, '#1d4ed8', true);
      break;
    case 'wasmachine': {
      ctx.fillStyle = '#f2f4f6';
      ctx.strokeStyle = '#9aa1a8';
      ctx.lineWidth = 1.5;
      rondRechthoek(ctx, x - 13, y - 15, 26, 30, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#74c0fc';
      ctx.beginPath();
      ctx.arc(x, y + 3, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4dabf7';
      ctx.beginPath();
      ctx.ellipse(x + 14, y + 16, 8, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'verjaardag': {
      ctx.fillStyle = '#e03a63';
      ctx.fillRect(x - 12, y - 6, 24, 20);
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(x - 2, y - 6, 4, 20);
      ctx.fillRect(x - 12, y, 24, 4);
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x - 5, y - 10, 5, 3.5, 0.4, 0, Math.PI * 2);
      ctx.ellipse(x + 5, y - 10, 5, 3.5, -0.4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'weekend': {
      ctx.fillStyle = '#ffb000';
      ctx.beginPath();
      ctx.arc(x + 5, y - 5, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1c7ed6';
      ctx.lineWidth = 2.5;
      for (const dy of [6, 12]) {
        ctx.beginPath();
        for (let i = -18; i <= 18; i += 2) ctx.lineTo(x + i, y + dy + Math.sin(i / 3) * 1.8);
        ctx.stroke();
      }
      break;
    }
  }
}

const STIJL_A = {
  shirt: '#e8590c',
  broek: '#2f4b7c',
  haar: '#3b2618',
  huid: '#f1c7a1',
  lang: false,
};
const STIJL_B = {
  shirt: '#3b82c4',
  broek: '#3d3d46',
  haar: '#a5502a',
  huid: '#e6b48f',
  lang: true,
};

function teken(
  doek: HTMLCanvasElement | null,
  beeld: Beeld,
  b: Beweging,
  nu: number,
  stil: boolean,
): void {
  const ctx = maakScherp(doek, BREEDTE, HOOGTE);
  if (!ctx) return;
  const r = Math.min(2, window.devicePixelRatio || 1);
  lucht(ctx, beeld.week, stil ? 0 : nu);
  ctx.drawImage(decor(r), 0, 0, BREEDTE, HOOGTE);

  // rook uit de schoorsteen
  if (!stil)
    for (let i = 0; i < 4; i++) {
      const f = (nu / 2400 + i / 4) % 1;
      ctx.fillStyle = `rgba(235,235,240,${0.55 * (1 - f)})`;
      ctx.beginPath();
      ctx.arc(246 + f * 22 + Math.sin(f * 6 + i) * 3, 34 - f * 34, 4 + f * 8, 0, Math.PI * 2);
      ctx.fill();
    }

  // lamp boven de tafel: brandt 's avonds (week 4) en zacht overdag
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(192, 205);
  ctx.lineTo(192, 218);
  ctx.stroke();
  const licht = ctx.createRadialGradient(192, 224, 2, 192, 240, 70);
  licht.addColorStop(0, `rgba(255,230,150,${beeld.week === 4 ? 0.5 : 0.18})`);
  licht.addColorStop(1, 'rgba(255,230,150,0)');
  ctx.fillStyle = licht;
  ctx.fillRect(122, 214, 140, 82);
  ctx.fillStyle = '#2f6f4f';
  ctx.beginPath();
  ctx.moveTo(182, 226);
  ctx.lineTo(186, 216);
  ctx.lineTo(198, 216);
  ctx.lineTo(202, 226);
  ctx.closePath();
  ctx.fill();

  plezierBord(ctx, beeld.plezier);
  kalender(ctx, beeld.week);

  // wat er op tafel ligt of staat, bij de kaart van nu
  const soort = beeld.kaart?.soort;
  if (soort === 'boodschappen') {
    ctx.fillStyle = '#c8935a';
    rondRechthoek(ctx, 198, 246, 18, 16, 2);
    ctx.fill();
    ctx.fillStyle = '#3f8f4a';
    ctx.beginPath();
    ctx.ellipse(203, 244, 3, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (soort === 'verjaardag') {
    ctx.fillStyle = '#e03a63';
    ctx.fillRect(198, 250, 16, 12);
    ctx.fillStyle = '#ffd43b';
    ctx.fillRect(205, 250, 3, 12);
  } else if (soort === 'uit' || soort === 'weekend') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(206, 260, 9, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (soort === 'wasmachine') {
    ctx.fillStyle = 'rgba(77,171,247,0.6)';
    ctx.beginPath();
    ctx.ellipse(110, 294, 26, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // post op de deurmat
  if (soort === 'aanslag') envelop(ctx, 274, 286, '#dbe7ff', nu, stil);
  if (soort === 'energie') envelop(ctx, 274, 286, '#fff3bf', nu, stil);

  spaarpot(ctx, stil ? beeld.saldo : b.pot, nu);

  // de twee bewoners
  const sinds = nu - b.sprong.begin;
  const sprong = !stil && sinds < 600 ? Math.sin((sinds / 600) * Math.PI) : 0;
  const blij = (beeld.plezier - 45) / 30;
  for (const [i, x, stijl, kijk] of [
    [0, 148, STIJL_A, 1],
    [1, 236, STIJL_B, -1],
  ] as const) {
    const adem = stil ? 0 : Math.sin(nu / 480 + i * 1.7) * 0.8;
    const dy = b.sprong.blij ? -sprong * 9 : sprong * 2;
    poppetje(ctx, x, 294 + dy + adem * 0.3, stijl, blij, kijk);
  }

  if (beeld.kaart) denkwolk(ctx, beeld.kaart.soort, nu, stil);

  // buiten: fietsen, kliko en vuilniswagen
  fiets(ctx, 372, 304, '#1d4ed8', soort === 'fiets');
  fiets(ctx, 396, 306, '#c2255c', false);

  const w = b.wagen;
  const wagenX = beeld.wagenStaat ? WAGEN_STOP : w.x;
  const wagenErbij = beeld.wagenStaat || w.stand !== 'weg';
  // de kliko wordt opgetild en in de wagen geleegd
  let kx = 344;
  let ky = 300;
  let kantel = 0;
  if (!stil && w.stand === 'leegt') {
    const t = w.t;
    const op = t < 0.5 ? t / 0.5 : t < 1.4 ? 1 : Math.max(0, 1 - (t - 1.4) / 0.5);
    kx = 344 + op * 16;
    ky = 300 - op * 44;
    kantel = -op * 2.1;
    if (t > 0.5 && t < 1.4)
      for (let i = 0; i < 6; i++) {
        const f = ((t - 0.5) * 2 + i / 6) % 1;
        ctx.fillStyle = i % 2 ? '#3a3f46' : '#8d6e4a';
        ctx.fillRect(366 + (i % 3) * 3, 262 + f * 30, 4, 4);
      }
  }
  if (wagenErbij && wagenX < BREEDTE + 10)
    vuilniswagen(ctx, wagenX, nu, !stil && w.stand !== 'leegt');
  kliko(ctx, kx, ky, stil ? beeld.kliko : b.kliko, kantel);
  if (beeld.wagenStaat) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    rondRechthoek(ctx, 318, 238, 66, 16, 5);
    ctx.fill();
    ctx.fillStyle = '#0e6b45';
    ctx.font = `800 10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Geleegd ✓', 351, 246);
  }

  // zwevende bedragen en hartjes
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 16px ${FONT}`;
  for (let i = b.zwevers.length - 1; i >= 0; i--) {
    const z = b.zwevers[i];
    if (!z) continue;
    const f = (nu - z.begin) / 1600;
    if (f < 0) continue;
    if (f >= 1) {
      b.zwevers.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = Math.min(1, (1 - f) * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(z.tekst, z.x, z.y - f * 36);
    ctx.fillStyle = z.kleur;
    ctx.fillText(z.tekst, z.x, z.y - f * 36);
    ctx.globalAlpha = 1;
  }
}

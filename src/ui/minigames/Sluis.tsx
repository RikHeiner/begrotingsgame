/**
 * Oostersluis: "Sluiswachter". Het waterpeil is het saldo van de gemeente. Elke ronde komt er geld
 * bij of gaat er geld uit. Jij kiest wat de sluiswachter doet. Blijf binnen de veilige band.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMln } from '../../engine';
import {
  BEZUINIG_PCT,
  bezuinigPeil,
  bezuinigPosten,
  isVeilig,
  nieuwPeil,
  OZB_PCT,
  ozbPeil,
  sluisGebeurtenissen,
  sluisScore,
  VEILIG,
  WAND,
} from '../../game/mgSluis';
import type { MinigameProps } from './types';
import './Sluis.css';

const getal = (x: number, teken = false): string => {
  const s = Math.abs(x).toLocaleString('nl-NL', { maximumFractionDigits: 1 });
  if (x < 0) return `−${s}`;
  return teken && x > 0 ? `+${s}` : s;
};

type Actie = { soort: 'bezuinig' | 'ozb' | 'niets'; peil: number };

/** Hoogte van het water in procent van de sluis. */
const hoogte = (peil: number): number => ((peil + WAND) / (2 * WAND)) * 100;

function Kolk({ peil }: { peil: number }) {
  const veilig = isVeilig(peil);
  return (
    <div className="mg-sluis-beeld" aria-hidden="true">
      <div className="mg-sluis-deur links" />
      <div className="mg-sluis-kolk">
        <div
          className="mg-sluis-band"
          style={{ bottom: `${hoogte(-VEILIG)}%`, top: `${100 - hoogte(VEILIG)}%` }}
        />
        <div className="mg-sluis-nul" style={{ bottom: `${hoogte(0)}%` }} />
        <div
          className={`mg-sluis-water${veilig ? '' : ' gevaar'}`}
          style={{ height: `${hoogte(peil)}%` }}
        >
          <span className="mg-sluis-boot">🚢</span>
        </div>
      </div>
      <div className="mg-sluis-deur rechts" />
    </div>
  );
}

export default function Sluis({ data, onKlaar }: MinigameProps) {
  const gebeurtenissen = useMemo(() => sluisGebeurtenissen(data), [data]);
  const posten = useMemo(() => bezuinigPosten(data), [data]);
  const ozb = ozbPeil(data);
  const [i, setI] = useState(0);
  const [peil, setPeil] = useState(0);
  const [veiligeRondes, setVeiligeRondes] = useState(0);
  const [ozbKeer, setOzbKeer] = useState(0);
  const [actie, setActie] = useState<Actie>();
  const [einde, setEinde] = useState(false);
  const volgendeKnop = useRef<HTMLButtonElement>(null);
  const kop = useRef<HTMLHeadingElement>(null);

  // Toetsenbord: na een keuze naar de knop "Volgende", bij een nieuwe ronde naar de vraag.
  useEffect(() => {
    if (actie) volgendeKnop.current?.focus();
  }, [actie]);
  useEffect(() => {
    if (i > 0 || einde) kop.current?.focus();
  }, [i, einde]);

  const jaar = data.begroting.begrotingsjaar;
  const rondes = gebeurtenissen.length;
  const ev = gebeurtenissen[i];
  const post = posten.length > 0 ? posten[i % posten.length] : undefined;

  if (einde || !ev) {
    const lasten = data.begroting.totalen.lasten_excl_reserves_x1000[String(jaar)];
    const baten = data.begroting.totalen.baten_excl_reserves_x1000[String(jaar)];
    const score = sluisScore(veiligeRondes, rondes);
    return (
      <div className="mg-sluis">
        <Kolk peil={peil} />
        <div className="mg-sluis-tekst">
          <h3 ref={kop} tabIndex={-1}>
            De vaart is voorbij
          </h3>
          <p role="status">
            Het peil bleef {veiligeRondes} van de {rondes} rondes in de veilige band.
          </p>
          <p>
            Een begroting moet in evenwicht zijn. De gemeente mag niet elk jaar meer uitgeven dan er
            binnenkomt. Tekorten moet je oplossen: bezuinigen, meer belasting, of geld uit de
            reserve. Zo&apos;n reserve is als een spaarpot: één keer leeg is leeg.
          </p>
          {lasten !== undefined && baten !== undefined && (
            <p>
              In {jaar} geeft de gemeente {formatMln(lasten * 1000)} uit. Er komt{' '}
              {formatMln(baten * 1000)} binnen. Het verschil van{' '}
              {formatMln(Math.abs(lasten - baten) * 1000)}{' '}
              {lasten > baten ? 'komt uit de reserves.' : 'gaat naar de reserves.'} Zo is de
              begroting toch in evenwicht.
            </p>
          )}
          {ozbKeer > 0 && (
            <p className="klein">
              Je koos {ozbKeer} keer voor meer OZB. Dat betalen de inwoners en bedrijven.
            </p>
          )}
          <button type="button" className="knop-indienen" onClick={() => onKlaar(score, 100)}>
            Naar je score
          </button>
        </div>
      </div>
    );
  }

  const naGebeurtenis = nieuwPeil(peil, ev.peil);
  const toonPeil = actie ? nieuwPeil(naGebeurtenis, actie.peil) : naGebeurtenis;
  const veilig = isVeilig(toonPeil);

  const kies = (a: Actie) => {
    if (actie) return;
    setActie(a);
  };
  const volgende = () => {
    if (!actie) return;
    const eind = nieuwPeil(naGebeurtenis, actie.peil);
    if (isVeilig(eind)) setVeiligeRondes((v) => v + 1);
    if (actie.soort === 'ozb') setOzbKeer((n) => n + 1);
    setPeil(eind);
    setActie(undefined);
    if (i + 1 >= rondes) setEinde(true);
    else setI(i + 1);
  };

  const keuzes: { a: Actie; titel: string; uitleg: string }[] = [
    ...(post
      ? [
          {
            a: { soort: 'bezuinig' as const, peil: bezuinigPeil(post) },
            titel: `Sluis open: bezuinig op ${post.naam}`,
            uitleg: `${BEZUINIG_PCT}% minder uitgeven: ${getal(bezuinigPeil(post), true)}`,
          },
        ]
      : []),
    {
      a: { soort: 'ozb', peil: ozb },
      titel: 'Sluis dicht: hef meer OZB',
      uitleg: `${OZB_PCT}% meer OZB: ${getal(ozb, true)}`,
    },
    { a: { soort: 'niets', peil: 0 }, titel: 'Niets doen', uitleg: 'Het peil blijft zo' },
  ];

  return (
    <div className="mg-sluis">
      <Kolk peil={toonPeil} />
      <div className="mg-sluis-tekst">
        <p className="klein">
          Ronde {i + 1} van {rondes} · 1 streep = € 1 mln · veilig tussen −{VEILIG} en +{VEILIG}
        </p>
        <p className="mg-sluis-peil" data-testid="mg-sluis-peil">
          Peil: <strong>{getal(toonPeil, true)}</strong>{' '}
          <span className={veilig ? 'mg-sluis-ok' : 'mg-sluis-mis'}>
            {veilig ? '(veilig)' : toonPeil > 0 ? '(te hoog)' : '(te laag)'}
          </span>
        </p>
        <h3 ref={kop} tabIndex={-1}>
          {ev.tekst}
        </h3>
        <p>
          {ev.bron}: {formatMln(ev.basisMln * 1e6)} in de begroting. {getal(ev.pct, true)}% daarvan
          is <strong>{getal(ev.peil, true)}</strong> op het peil.{' '}
          <span className="klein">(De procenten zijn een spelregel.)</span>
        </p>
        <p className="klein">
          Het peil ging van {getal(peil, true)} naar {getal(naGebeurtenis, true)}. Wat doe je?
        </p>
        <div className="mg-keuzes">
          {keuzes.map(({ a, titel, uitleg }) => (
            <button
              key={a.soort}
              type="button"
              className={`mg-keuze${actie?.soort === a.soort ? ' goed' : ''}`}
              aria-pressed={actie?.soort === a.soort}
              disabled={!!actie}
              onClick={() => kies(a)}
            >
              <strong>{titel}</strong>
              <span>{uitleg}</span>
            </button>
          ))}
        </div>
        <div role="status" className="mg-uitslag">
          {actie && (
            <>
              <p>
                {veilig
                  ? `✅ Het peil is ${getal(toonPeil, true)}: veilig.`
                  : `❌ Het peil is ${getal(toonPeil, true)}: ${toonPeil > 0 ? 'te hoog. Er komt meer binnen dan nodig is.' : 'te laag. Er gaat meer uit dan er binnenkomt.'}`}
              </p>
              <button ref={volgendeKnop} type="button" className="knop-indienen" onClick={volgende}>
                {i + 1 >= rondes ? 'Bekijk de uitslag' : 'Volgende ronde'}
              </button>
            </>
          )}
        </div>
        <p className="klein">
          Bedragen uit de begroting {jaar}. De wanden van de sluis staan op −{WAND} en +{WAND}.
        </p>
      </div>
    </div>
  );
}

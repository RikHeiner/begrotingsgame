/**
 * Grote Markt: "Marktkoopman". Vul je kraam met posten uit de begroting, maar blijf binnen het
 * budget van € 50 mln (een spelregel). Je hebt 60 seconden. Daarna zie je wat je kocht, en wat de
 * gemeente echt aan al deze dingen samen uitgeeft.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { formatMln } from '../../engine';
import type { Onderdeel } from '../../engine/schema';
import {
  MARKT_BUDGET_MLN,
  MARKT_SECONDEN,
  marktPosten,
  marktScore,
  pastNog,
  somMln,
} from '../../game/mgGroteMarkt';
import type { MinigameProps } from './types';
import './GroteMarkt.css';

/** Versiering van de kraampjes: Groninger koek, Grunneger mosterd en meer. */
const WAREN = ['🍞', '🌭', '🧀', '🐟', '🌷', '🥕', '🍎', '🥨', '🧺', '🍯', '🥬', '🍐'];

const mln = (m: number) => formatMln(m * 1e6);

export default function GroteMarkt({ data, onKlaar }: MinigameProps) {
  const [posten] = useState(() => marktPosten(data));
  const [inKraam, setInKraam] = useState<string[]>([]);
  const [tijd, setTijd] = useState(MARKT_SECONDEN);
  const [gestopt, setGestopt] = useState(false);
  const [melding, setMelding] = useState('');
  const klaar = gestopt || tijd <= 0;

  useEffect(() => {
    if (klaar) return;
    const t = window.setInterval(() => setTijd((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [klaar]);

  const gekocht = posten.filter((o) => inKraam.includes(o.id));
  const totaal = somMln(gekocht);
  const over = Math.round((MARKT_BUDGET_MLN - totaal) * 1000) / 1000;

  const wissel = (o: Onderdeel) => {
    if (klaar) return;
    if (inKraam.includes(o.id)) {
      setInKraam(inKraam.filter((id) => id !== o.id));
      setMelding(`${o.naam} uit je kraam gehaald. Nog ${mln(over + o.lasten_mln)} over.`);
    } else if (pastNog(gekocht, o)) {
      setInKraam([...inKraam, o.id]);
      setMelding(`${o.naam} in je kraam gelegd. Nog ${mln(over - o.lasten_mln)} over.`);
    }
  };

  if (klaar) {
    const score = marktScore(gekocht);
    return (
      <div className="mg-markt" data-testid="mg-markt-overzicht">
        <h3>{tijd <= 0 ? '⏰ De tijd is om!' : '🧺 Je kraam is vol genoeg'}</h3>
        <div role="status">
          {gekocht.length === 0 ? (
            <p>Je hebt niets gekocht.</p>
          ) : (
            <>
              <p>
                Je kocht {gekocht.length} {gekocht.length === 1 ? 'ding' : 'dingen'} voor{' '}
                <strong>{mln(totaal)}</strong>. Dat is {score}% van je budget.
              </p>
              <ul className="mg-markt-lijst">
                {gekocht.map((o) => (
                  <li key={o.id}>
                    {o.naam}: {mln(o.lasten_mln)}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p>
            In het echt geeft de gemeente in {data.begroting.begrotingsjaar} aan alle{' '}
            {posten.length} dingen op de markt samen <strong>{mln(somMln(posten))}</strong> uit. Dat
            past nooit in {mln(MARKT_BUDGET_MLN)}. Ook de gemeente moet dus kiezen.
          </p>
        </div>
        <button
          type="button"
          className="knop-indienen"
          onClick={() => onKlaar(score, 100)}
          data-testid="mg-markt-score"
        >
          Naar je score
        </button>
      </div>
    );
  }

  return (
    <div className="mg-markt">
      <p className="klein">
        Spelregel: je hebt {mln(MARKT_BUDGET_MLN)} te besteden. Op de markt geen Groninger koek of
        Grunneger mosterd vandaag, maar echte bedragen uit de begroting van{' '}
        {data.begroting.begrotingsjaar}, per jaar.
      </p>
      <div className="mg-markt-balk">
        <p role="timer" aria-live="off" className={`mg-markt-tijd${tijd <= 10 ? ' bijna' : ''}`}>
          ⏱ Nog <strong>{tijd}</strong> {tijd === 1 ? 'seconde' : 'seconden'}
        </p>
        <p data-testid="mg-markt-totaal">
          In je kraam: <strong>{mln(totaal)}</strong> · Over: <strong>{mln(over)}</strong>
        </p>
      </div>
      <div
        className="mg-markt-meter"
        aria-hidden="true"
        style={{ '--vol': `${Math.min(100, (totaal / MARKT_BUDGET_MLN) * 100)}%` } as CSSProperties}
      />
      <ul className="mg-markt-kramen">
        {posten.map((o, i) => {
          const erin = inKraam.includes(o.id);
          const past = erin || pastNog(gekocht, o);
          return (
            <li key={o.id}>
              <button
                type="button"
                className={`mg-keuze mg-markt-kraam${erin ? ' goed' : ''}`}
                aria-pressed={erin}
                disabled={!past}
                onClick={() => wissel(o)}
              >
                <span className="mg-markt-waar" aria-hidden="true">
                  {WAREN[i % WAREN.length]}
                </span>
                <strong>{o.naam}</strong>
                <span>{mln(o.lasten_mln)}</span>
                <span className="klein">
                  {erin
                    ? 'In je kraam (tik om terug te leggen)'
                    : past
                      ? 'Leg in je kraam'
                      : 'Past niet meer'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p role="status" className="mg-markt-melding">
        {melding}
      </p>
      <p role="status" className="mg-markt-melding">
        {tijd <= 10 ? 'Let op: nog maar 10 seconden.' : ''}
      </p>
      <button
        type="button"
        className="knop-indienen"
        onClick={() => setGestopt(true)}
        data-testid="mg-markt-klaar"
      >
        Klaar
      </button>
    </div>
  );
}

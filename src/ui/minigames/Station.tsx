/**
 * Hoofdstation: "Op tijd vertrekken". Acht treinen, elk een programma of plan uit de begroting.
 * Zet elke trein op het goede spoor: geld voor elk jaar, of eenmalig geld?
 */
import { useEffect, useRef, useState } from 'react';
import { formatMln } from '../../engine';
import { SPOOR_NAAM, kiesTreinen, uitlegSpoor, type Soort } from '../../game/mgStation';
import type { MinigameProps } from './types';
import './Station.css';

const SPOREN: { soort: Soort; nummer: number; icoon: string }[] = [
  { soort: 'S', nummer: 1, icoon: '🔁' },
  { soort: 'I', nummer: 2, icoon: '1️⃣' },
];

export default function Station({ data, onKlaar }: MinigameProps) {
  const [treinen] = useState(() => kiesTreinen(data));
  const [i, setI] = useState(0);
  const [goed, setGoed] = useState(0);
  const [gekozen, setGekozen] = useState<Soort>();
  const volgendeKnop = useRef<HTMLButtonElement>(null);
  const eersteSpoor = useRef<HTMLButtonElement>(null);
  // Met het toetsenbord: na een keuze naar "Volgende", bij een nieuwe trein naar het eerste spoor.
  useEffect(() => {
    if (gekozen) volgendeKnop.current?.focus();
    else if (i > 0) eersteSpoor.current?.focus();
  }, [gekozen, i]);
  const trein = treinen[i];
  if (!trein) return null;
  const juist = gekozen === trein.soort;

  const kies = (soort: Soort) => {
    if (gekozen) return;
    setGekozen(soort);
    if (soort === trein.soort) setGoed((g) => g + 1);
  };
  const volgende = () => {
    if (i + 1 >= treinen.length) {
      onKlaar(goed, treinen.length);
      return;
    }
    setI(i + 1);
    setGekozen(undefined);
  };

  return (
    <div className="mg-station">
      <p className="klein" data-testid="mg-station-voortgang">
        Trein {i + 1} van {treinen.length} · {goed} op het goede spoor
      </p>
      <div className="mg-station-perron">
        <div
          key={trein.id}
          className={`mg-station-trein${gekozen ? ` weg-${gekozen === 'S' ? 'links' : 'rechts'}` : ''}`}
        >
          <span aria-hidden="true">🚆</span>
          <div>
            <h3>{trein.naam}</h3>
            <p className="klein">{formatMln(trein.bedrag_mln * 1e6, { decimalen: 2 })}</p>
          </div>
        </div>
      </div>
      <p>Is dit geld voor elk jaar, of is het eenmalig?</p>
      <div className="mg-keuzes">
        {SPOREN.map((s, n) => {
          const klasse = !gekozen
            ? ''
            : s.soort === trein.soort
              ? ' goed'
              : s.soort === gekozen
                ? ' fout'
                : '';
          return (
            <button
              key={s.soort}
              ref={n === 0 ? eersteSpoor : undefined}
              type="button"
              className={`mg-keuze mg-station-spoor${klasse}`}
              aria-pressed={gekozen === s.soort}
              disabled={!!gekozen}
              onClick={() => kies(s.soort)}
              data-spoor={s.soort}
            >
              <span className="klein">Spoor {s.nummer}</span>
              <strong>
                <span aria-hidden="true">{s.icoon} </span>
                {SPOOR_NAAM[s.soort]}
              </strong>
            </button>
          );
        })}
      </div>
      <div role="status" className="mg-uitslag">
        {gekozen && (
          <>
            <p>
              {juist ? '✅ Goed! De trein vertrekt op tijd.' : '❌ Helaas, verkeerd spoor.'} Het
              goede spoor is “{SPOOR_NAAM[trein.soort]}”. {uitlegSpoor(trein.soort)}
            </p>
            <button
              type="button"
              ref={volgendeKnop}
              className="knop-indienen"
              onClick={volgende}
              data-testid="mg-station-volgende"
            >
              {i + 1 >= treinen.length ? 'Naar je score' : 'Volgende trein'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

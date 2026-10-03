/**
 * Martinitoren: "Beklim d'Olle Grieze". Steeds twee posten: waar gaat meer geld naartoe? Elk goed
 * antwoord is een trede hoger, tot de top op 97 meter. Daarna zie je de echte bedragen.
 */
import { useMemo, useState } from 'react';
import { formatEuro, formatMln } from '../../engine';
import { parenVoorHogerLager, perInwoner } from '../../game/minigames';
import type { MinigameProps } from './types';

const TREDEN = 10;
const HOOGTE = 97;

export default function Martinitoren({ data, onKlaar }: MinigameProps) {
  const paren = useMemo(() => parenVoorHogerLager(data, TREDEN), [data]);
  const [i, setI] = useState(0);
  const [goed, setGoed] = useState(0);
  const [gekozen, setGekozen] = useState<string>();
  const paar = paren[i];
  if (!paar) return null;
  const [a, b] = paar;
  const juist = a.lasten_mln > b.lasten_mln ? a.id : b.id;
  const kies = (id: string) => {
    if (gekozen) return;
    setGekozen(id);
    if (id === juist) setGoed((g) => g + 1);
  };
  const volgende = () => {
    if (i + 1 >= paren.length) {
      onKlaar(goed, paren.length);
      return;
    }
    setI(i + 1);
    setGekozen(undefined);
  };
  const meter = Math.round((goed / paren.length) * HOOGTE);
  return (
    <div className="mg-toren">
      <div className="mg-toren-beeld" aria-hidden="true">
        <div className="mg-toren-schacht">
          <div className="mg-toren-klimmer" style={{ bottom: `${(goed / paren.length) * 100}%` }}>
            🧗
          </div>
        </div>
      </div>
      <div className="mg-toren-vraag">
        <p className="klein" data-testid="mg-hoogte">
          Vraag {i + 1} van {paren.length} · je bent op {meter} van de {HOOGTE} meter
        </p>
        <h3>Waar gaat in {data.begroting.begrotingsjaar} meer geld naartoe?</h3>
        <div className="mg-keuzes">
          {[a, b].map((o) => {
            const klasse = !gekozen
              ? ''
              : o.id === juist
                ? ' goed'
                : o.id === gekozen
                  ? ' fout'
                  : '';
            return (
              <button
                key={o.id}
                type="button"
                className={`mg-keuze${klasse}`}
                aria-pressed={gekozen === o.id}
                disabled={!!gekozen}
                onClick={() => kies(o.id)}
              >
                <strong>{o.naam}</strong>
                {gekozen && (
                  <span>
                    {formatMln(o.lasten_mln * 1e6)} · {formatEuro(Math.round(perInwoner(data, o)))}{' '}
                    per inwoner
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {gekozen && (
          <div role="status" className="mg-uitslag">
            <p>{gekozen === juist ? '✅ Goed! Een trede hoger.' : '❌ Helaas, je blijft staan.'}</p>
            <button type="button" className="knop-indienen" onClick={volgende}>
              {i + 1 >= paren.length ? 'Naar de top' : 'Volgende vraag'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * De Oosterpoort: "Wie betaalt de voorstelling?". Raad welk deel van de kosten bezoekers en
 * gebruikers zelf betalen (kaartjes, huur, horeca). De rest betaalt de gemeente.
 */
import { useId, useMemo, useState } from 'react';
import { formatMln } from '../../engine';
import {
  echtAandeel,
  MAX_PER_RONDE,
  oosterpoortPosten,
  punten,
  vanTien,
} from '../../game/mgOosterpoort';
import type { MinigameProps } from './types';
import './Oosterpoort.css';

const euro = (x: number): string =>
  x.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
const pct = (x: number): string => `${Math.round(x)}%`;

export default function Oosterpoort({ data, onKlaar }: MinigameProps) {
  const posten = useMemo(() => oosterpoortPosten(data), [data]);
  const [i, setI] = useState(0);
  const [gok, setGok] = useState(50);
  const [geraden, setGeraden] = useState(false);
  const [totaal, setTotaal] = useState(0);
  const id = useId();
  const o = posten[i];
  if (!o) return null;
  const echt = echtAandeel(o);
  const winst = punten(gok, echt);
  const tien = vanTien(o);
  const max = posten.length * MAX_PER_RONDE;
  const laatste = i + 1 >= posten.length;

  const zet = (w: number) => {
    if (!geraden) setGok(Math.max(0, Math.min(100, w)));
  };
  const raad = () => {
    if (geraden) return;
    setGeraden(true);
    setTotaal((t) => t + winst);
  };
  const volgende = () => {
    if (laatste) {
      onKlaar(totaal, max);
      return;
    }
    setI(i + 1);
    setGok(50);
    setGeraden(false);
  };

  return (
    <div className="mg-poort">
      <p className="klein">
        Ronde {i + 1} van {posten.length} · je punten: {totaal} van de {max}
      </p>
      <h3>{o.naam}</h3>
      <p>
        Dit kost {formatMln(o.lasten_mln * 1e6)} per jaar. Welk deel betalen de bezoekers en
        gebruikers zelf? Denk aan kaartjes, huur en horeca.
      </p>

      <label htmlFor={id}>
        <strong>Bezoekers en gebruikers betalen:</strong>{' '}
        <output htmlFor={id} className="mg-poort-gok">
          {pct(gok)}
        </output>
      </label>
      <div className="mg-poort-rij">
        <button
          type="button"
          className="knop"
          aria-label="5 procent minder"
          disabled={geraden || gok <= 0}
          onClick={() => zet(gok - 5)}
        >
          −
        </button>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={gok}
          disabled={geraden}
          aria-valuetext={`${pct(gok)} betalen bezoekers, ${pct(100 - gok)} de gemeente`}
          onChange={(e) => zet(Number(e.target.value))}
        />
        <button
          type="button"
          className="knop"
          aria-label="5 procent meer"
          disabled={geraden || gok >= 100}
          onClick={() => zet(gok + 5)}
        >
          +
        </button>
      </div>

      <div className="mg-poort-balk" aria-hidden="true">
        <div className="mg-poort-bezoekers" style={{ width: `${gok}%` }}>
          🎟️
        </div>
        <div className="mg-poort-gemeente">🏛️</div>
        {geraden && <div className="mg-poort-echt" style={{ left: `${Math.min(100, echt)}%` }} />}
      </div>
      <p className="klein mg-poort-legenda">
        <span>🎟️ bezoekers: {pct(gok)}</span>
        <span>🏛️ gemeente: {pct(100 - gok)}</span>
      </p>

      <div role="status" className="mg-poort-uitslag">
        {geraden && (
          <>
            <p>
              Echt: <strong>{pct(echt)}</strong> ({formatMln(o.gekoppelde_baten_mln * 1e6)}{' '}
              inkomsten). Jij zei {pct(gok)}. Je krijgt <strong>{winst}</strong> van de{' '}
              {MAX_PER_RONDE} punten.
            </p>
            <p>
              Van elke € 10 betalen bezoekers <strong>{euro(tien.bezoekers)}</strong> en de gemeente{' '}
              <strong>{euro(tien.gemeente)}</strong>.
            </p>
          </>
        )}
      </div>

      {geraden ? (
        <button type="button" className="knop-indienen" onClick={volgende}>
          {laatste ? 'Klaar' : 'Volgende voorstelling'}
        </button>
      ) : (
        <button type="button" className="knop-indienen" onClick={raad}>
          Dit is mijn gok
        </button>
      )}
      <p className="klein">
        Spelregel: {MAX_PER_RONDE} punten min het verschil in procent. Bedragen uit de begroting{' '}
        {data.begroting.begrotingsjaar}.
      </p>
    </div>
  );
}

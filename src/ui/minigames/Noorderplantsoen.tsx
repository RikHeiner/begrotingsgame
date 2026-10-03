/**
 * Noorderplantsoen: "Gaten en lantaarns". Er gaat steeds iets kapot in het park. Snel repareren
 * kost € 1; wie wacht, betaalt € 3. Die bedragen zijn een spelregel. Daarna het echte bedrag
 * uit de begroting voor onderhoud.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatEuro, formatMln } from '../../engine';
import {
  ERGER_NA_MS,
  PRIJS_ERGER,
  PRIJS_SNEL,
  SPEELTIJD_MS,
  nieuwPark,
  repareer,
  stap,
  uitslag,
  type Park,
  type Tegel,
} from '../../game/mgNoorderplantsoen';
import { perInwoner } from '../../game/minigames';
import type { MinigameProps } from './types';
import './Noorderplantsoen.css';

const TIK_MS = 200;
const ONDERHOUD = 'o1';

function beeld(t: Tegel): string {
  if (t.kapotSinds === undefined) return t.soort === 'gras' ? '🌿' : t.soort === 'lamp' ? '🏮' : '';
  if (t.soort === 'lamp') return t.erger ? '💡⚠️' : '💡';
  return t.erger ? '🕳️⚠️' : '🕳️';
}

function label(t: Tegel, i: number): string {
  const plek = `rij ${Math.floor(i / 4) + 1}, vak ${(i % 4) + 1}`;
  if (t.kapotSinds === undefined)
    return `${t.soort === 'gras' ? 'Gras' : t.soort === 'lamp' ? 'Lantaarn, heel' : 'Pad, heel'} (${plek})`;
  const wat = t.soort === 'lamp' ? 'Kapotte lantaarn' : 'Gat in het pad';
  return `${wat}${t.erger ? ', erger geworden' : ''} (${plek}). Repareren kost ${formatEuro(t.erger ? PRIJS_ERGER : PRIJS_SNEL)}.`;
}

export default function Noorderplantsoen({ data, onKlaar }: MinigameProps) {
  const [park, setPark] = useState<Park>(nieuwPark);
  const [nu, setNu] = useState(0);
  const [melding, setMelding] = useState('Het spel loopt. Tik op wat kapot is.');
  const start = useRef(0);
  const klaarKnop = useRef<HTMLButtonElement>(null);
  const onderhoud = useMemo(() => data.index.onderdelen.get(ONDERHOUD), [data]);

  useEffect(() => {
    if (park.klaar) return;
    if (!start.current) start.current = performance.now();
    const id = setInterval(() => {
      const t = performance.now() - start.current;
      setNu(t);
      setPark((p) => stap(p, t));
    }, TIK_MS);
    return () => clearInterval(id);
  }, [park.klaar]);

  useEffect(() => {
    if (park.klaar) klaarKnop.current?.focus();
  }, [park.klaar]);

  const tik = (i: number) => {
    const { kosten } = repareer(park, i);
    if (!kosten) return;
    setPark((p) => repareer(p, i).park);
    setMelding(
      kosten > PRIJS_SNEL
        ? `Gerepareerd voor ${formatEuro(kosten)}. Je was te laat: het was al erger.`
        : `Gerepareerd voor ${formatEuro(kosten)}. Op tijd!`,
    );
  };

  const stoppen = () => setPark((p) => ({ ...p, klaar: true }));

  const over = Math.max(0, Math.ceil((SPEELTIJD_MS - nu) / 1000));
  const jaar = data.begroting.begrotingsjaar;

  if (park.klaar) {
    const u = uitslag(park);
    return (
      <div className="mg-park">
        <div role="status" className="mg-park-uitslag">
          <h3>De rekening</h3>
          <ul>
            <li>
              Je hebt {u.gerepareerd} keer iets gerepareerd.
              {u.nogKapot > 0 &&
                ` Er ${u.nogKapot === 1 ? 'is' : 'zijn'} nog ${u.nogKapot} ${u.nogKapot === 1 ? 'ding' : 'dingen'} kapot. Dat wordt alleen maar erger: dat rekenen we tegen ${formatEuro(PRIJS_ERGER)}.`}
            </li>
            <li>
              Totaal: <strong>{formatEuro(u.totaal)}</strong>.
            </li>
            <li>
              Daarvan betaal je <strong>{formatEuro(u.extra)}</strong> extra, omdat je wachtte.
            </li>
          </ul>
          <p className="klein">
            Spelregel: snel repareren kost {formatEuro(PRIJS_SNEL)}, na {ERGER_NA_MS / 1000}{' '}
            seconden wordt het erger en kost het {formatEuro(PRIJS_ERGER)}. Dat zijn geen echte
            bedragen.
          </p>
          {onderhoud && (
            <p>
              <strong>Echt:</strong> in {jaar} geeft de gemeente{' '}
              {formatMln(onderhoud.lasten_mln * 1e6)} uit aan {onderhoud.naam.toLowerCase()}. Dat is{' '}
              {formatEuro(Math.round(perInwoner(data, onderhoud)))} per inwoner. Ook in het echt
              geldt vaak: wie onderhoud uitstelt, betaalt later meer.
            </p>
          )}
          <button
            ref={klaarKnop}
            type="button"
            className="knop-indienen"
            onClick={() => onKlaar(u.score, 100)}
          >
            Naar je score
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mg-park">
      <div className="mg-park-kop">
        <p role="timer" aria-live="off" className="mg-park-klok" data-testid="mg-park-tijd">
          ⏱️ Nog {over} seconden
        </p>
        <p className="mg-park-kas">
          Betaald: <strong>{formatEuro(park.betaald)}</strong>
        </p>
        <button type="button" className="knop" onClick={stoppen}>
          Stoppen
        </button>
      </div>
      <p className="klein">
        Spelregel: repareren kost {formatEuro(PRIJS_SNEL)}. Wacht je langer dan {ERGER_NA_MS / 1000}{' '}
        seconden, dan wordt het erger en kost het {formatEuro(PRIJS_ERGER)}.
      </p>
      <div className="mg-park-veld" role="group" aria-label="Het Noorderplantsoen">
        {park.tegels.map((t, i) => (
          <button
            key={i}
            type="button"
            className={`mg-park-tegel ${t.soort}${t.kapotSinds !== undefined ? ' kapot' : ''}${t.erger ? ' erger' : ''}`}
            aria-label={label(t, i)}
            disabled={t.kapotSinds === undefined}
            onClick={() => tik(i)}
          >
            <span aria-hidden="true">{beeld(t)}</span>
          </button>
        ))}
      </div>
      <p role="status" className="klein mg-park-melding">
        {melding}
      </p>
    </div>
  );
}

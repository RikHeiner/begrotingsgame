/**
 * Forum: "Schatten op het dakterras". Vijf rondes: raad hoeveel de gemeente per jaar aan een post
 * uitgeeft. Hoe dichterbij, hoe meer punten (hoogstens 20 per ronde).
 */
import { useEffect, useId, useRef, useState } from 'react';
import { formatEuro, formatMln } from '../../engine';
import {
  FORUM_MAX_MLN,
  FORUM_MAX_PUNTEN,
  FORUM_MIN_MLN,
  FORUM_STAPPEN,
  decimalenVoor,
  forumPosten,
  mlnNaarStap,
  puntenVoorGok,
  stapNaarMln,
} from '../../game/mgForum';
import { perInwoner } from '../../game/minigames';
import type { MinigameProps } from './types';
import './Forum.css';

const BEGIN_MLN = 5;
const toon = (mln: number) => formatMln(mln * 1e6, { decimalen: decimalenVoor(mln) });

export default function Forum({ data, onKlaar }: MinigameProps) {
  const [posten] = useState(() => forumPosten(data));
  const [i, setI] = useState(0);
  const [stap, setStap] = useState(() => mlnNaarStap(BEGIN_MLN));
  const [geraden, setGeraden] = useState<number>();
  const [totaal, setTotaal] = useState(0);
  const id = useId();
  const schuif = useRef<HTMLInputElement>(null);
  const volgendeKnop = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (geraden !== undefined) volgendeKnop.current?.focus();
    else if (i > 0) schuif.current?.focus();
  }, [geraden, i]);

  const post = posten[i];
  if (!post) return null;
  const gok = stapNaarMln(stap);
  const echt = post.lasten_mln;
  const max = posten.length * FORUM_MAX_PUNTEN;

  const raad = () => {
    if (geraden !== undefined) return;
    const p = puntenVoorGok(gok, echt);
    setGeraden(p);
    setTotaal((t) => t + p);
  };
  const volgende = () => {
    if (i + 1 >= posten.length) {
      onKlaar(totaal, max);
      return;
    }
    setI(i + 1);
    setGeraden(undefined);
    setStap(mlnNaarStap(BEGIN_MLN));
  };
  const keer = gok >= echt ? gok / echt : echt / gok;

  return (
    <div className="mg-forum">
      <p className="klein" data-testid="mg-forum-voortgang">
        Ronde {i + 1} van {posten.length} · {totaal} van de {max} punten
      </p>
      <h3>
        <span aria-hidden="true">🏢 </span>Hoeveel geeft de gemeente in{' '}
        {data.begroting.begrotingsjaar} per jaar uit aan: {post.naam}?
      </h3>
      <div className="mg-forum-gok">
        <label htmlFor={`${id}-schuif`}>
          Jouw gok: <output htmlFor={`${id}-schuif`}>{toon(gok)}</output> per jaar
        </label>
        <input
          ref={schuif}
          id={`${id}-schuif`}
          type="range"
          min={0}
          max={FORUM_STAPPEN}
          step={1}
          value={stap}
          disabled={geraden !== undefined}
          aria-valuetext={`${toon(gok)} per jaar`}
          onChange={(e) => setStap(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') raad();
          }}
        />
        <div className="mg-forum-schaal klein" aria-hidden="true">
          <span>{toon(FORUM_MIN_MLN)}</span>
          <span>{toon(FORUM_MAX_MLN)}</span>
        </div>
        <p className="klein">
          De schuif gaat met sprongen: elke streep verder is ongeveer 4% meer. Met de pijltjes kun
          je fijn schuiven.
        </p>
      </div>
      {geraden === undefined && (
        <button type="button" className="knop-indienen" onClick={raad} data-testid="mg-forum-raad">
          Raad
        </button>
      )}
      <div role="status" className="mg-uitslag">
        {geraden !== undefined && (
          <>
            <div>
              <p>
                Het echte bedrag: <strong>{toon(echt)}</strong> per jaar. Dat is{' '}
                {formatEuro(perInwoner(data, post))} per inwoner.
              </p>
              <p>
                {keer < 1.05
                  ? 'Je zat er bijna precies op!'
                  : `Jouw gok was ${keer.toFixed(1).replace('.', ',')} keer ${gok > echt ? 'te hoog' : 'te laag'}.`}{' '}
                Je krijgt <strong>{geraden}</strong> van de {FORUM_MAX_PUNTEN} punten.
              </p>
            </div>
            <button
              ref={volgendeKnop}
              type="button"
              className="knop-indienen"
              onClick={volgende}
              data-testid="mg-forum-volgende"
            >
              {i + 1 >= posten.length ? 'Naar je score' : 'Volgende ronde'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

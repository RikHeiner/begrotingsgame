/**
 * Euroborg: "Penalty's voor de pot". Acht penalty's; elke penalty is een post van de begroting.
 * Voorspel: gaat hij erin (je kunt de post helemaal schrappen), of houdt de keeper hem (de wet of
 * een vaste afspraak)? Daarna zie je waarom.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatEuro, formatMln } from '../../engine';
import {
  besparingMln,
  gaatErin,
  minimumMln,
  penaltyPosten,
  redenKeeper,
} from '../../game/mgEuroborg';
import { perInwoner } from '../../game/minigames';
import type { MinigameProps } from './types';
import './Euroborg.css';

const SCHOT_MS = 1300;

const minderBeweging = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Fase = 'kiezen' | 'schot' | 'uitleg';

export default function Euroborg({ data, onKlaar }: MinigameProps) {
  const posten = useMemo(() => penaltyPosten(data), [data]);
  const [i, setI] = useState(0);
  const [goed, setGoed] = useState(0);
  const [voorspeld, setVoorspeld] = useState<boolean>();
  const [fase, setFase] = useState<Fase>('kiezen');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const volgendeKnop = useRef<HTMLButtonElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (fase === 'uitleg') volgendeKnop.current?.focus();
  }, [fase]);

  const o = posten[i];
  if (!o) return null;
  const erin = gaatErin(o);
  const jaar = data.begroting.begrotingsjaar;
  // De bal gaat om en om links en rechts; de keeper duikt de goede of de verkeerde kant op.
  const kant = i % 2 === 0 ? 'links' : 'rechts';

  const schiet = (gok: boolean) => {
    if (fase !== 'kiezen') return;
    setVoorspeld(gok);
    if (gok === erin) setGoed((g) => g + 1);
    if (minderBeweging()) {
      setFase('uitleg');
      return;
    }
    setFase('schot');
    timer.current = setTimeout(() => setFase('uitleg'), SCHOT_MS);
  };

  const volgende = () => {
    if (i + 1 >= posten.length) {
      onKlaar(goed, posten.length);
      return;
    }
    setI(i + 1);
    setVoorspeld(undefined);
    setFase('kiezen');
  };

  const keuzes: { gok: boolean; tekst: string; uitleg: string }[] = [
    { gok: true, tekst: '⚽ Gaat erin', uitleg: 'Je kunt deze post helemaal schrappen.' },
    {
      gok: false,
      tekst: '🧤 De keeper houdt hem',
      uitleg: 'De wet of een vaste afspraak houdt het tegen.',
    },
  ];

  return (
    <div className="mg-euroborg">
      <p className="klein" data-testid="mg-penalty">
        Penalty {i + 1} van {posten.length} · goed voorspeld: {goed}
      </p>
      <div
        className={`mg-eb-veld${fase !== 'kiezen' ? ` geschoten ${erin ? 'erin' : 'gehouden'} ${kant}` : ''}`}
        aria-hidden="true"
      >
        <div className="mg-eb-doel">
          <span className="mg-eb-keeper">🧤</span>
        </div>
        <span className="mg-eb-bal">⚽</span>
        {fase === 'uitleg' && <span className="mg-eb-bord">{erin ? 'GOAL!' : 'GEHOUDEN!'}</span>}
      </div>

      <h3>{o.naam}</h3>
      <p className="klein">
        In {jaar}: {formatMln(o.lasten_mln * 1e6)} · {formatEuro(Math.round(perInwoner(data, o)))}{' '}
        per inwoner. Kun je deze post helemaal schrappen?
      </p>

      <div className="mg-keuzes">
        {keuzes.map((k) => {
          const klasse =
            fase !== 'uitleg' ? '' : k.gok === erin ? ' goed' : k.gok === voorspeld ? ' fout' : '';
          return (
            <button
              key={String(k.gok)}
              type="button"
              className={`mg-keuze${klasse}`}
              aria-pressed={voorspeld === k.gok}
              disabled={fase !== 'kiezen'}
              onClick={() => schiet(k.gok)}
            >
              <strong>{k.tekst}</strong>
              <span className="klein">{k.uitleg}</span>
            </button>
          );
        })}
      </div>

      <div role="status" className="mg-eb-status">
        {fase === 'schot' && <p>De bal is onderweg…</p>}
        {fase === 'uitleg' && (
          <div className="mg-eb-uitleg">
            <p>
              <strong>
                {voorspeld === erin ? '✅ Goed voorspeld!' : '❌ Helaas, verkeerd voorspeld.'}
              </strong>{' '}
              {erin ? 'De bal gaat erin.' : 'De keeper houdt de bal.'}
            </p>
            {erin ? (
              <p>
                De gemeente kiest dit zelf. Je kunt deze post helemaal schrappen. Dat scheelt{' '}
                {formatMln(besparingMln(o) * 1e6)} per jaar
                {o.gekoppelde_baten_mln > 0
                  ? ` (de ${formatMln(o.gekoppelde_baten_mln * 1e6)} aan inkomsten die erbij horen, vallen dan ook weg)`
                  : ''}
                .
              </p>
            ) : (
              <>
                <p>{redenKeeper(o)}</p>
                <p>
                  {o.vergrendeld || minimumMln(o) >= o.lasten_mln
                    ? `Deze post kun je niet verlagen: de hele ${formatMln(o.lasten_mln * 1e6)} blijft.`
                    : `Minstens ${formatMln(minimumMln(o) * 1e6)} moet blijven. Je kunt hooguit ${formatMln((o.lasten_mln - minimumMln(o)) * 1e6)} besparen.`}
                </p>
              </>
            )}
            <button ref={volgendeKnop} type="button" className="knop-indienen" onClick={volgende}>
              {i + 1 >= posten.length ? 'Naar de uitslag' : 'Volgende penalty'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

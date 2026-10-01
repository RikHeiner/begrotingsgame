import { useEffect, useRef } from 'react';
import { formatMln, type Data, type Resultaat } from '../../engine';
import { TOESTAND_NAAM, type GebouwStand } from '../../game/toestand';
import { useSpel } from '../../game/state/store';
import { GebouwPosten } from './GebouwPosten';

/** Paneel met de posten van het gekozen gebouw: een bottom sheet op mobiel, een zijpaneel op desktop. */
export function GebouwPaneel({
  data,
  resultaat,
  standen,
}: {
  data: Data;
  resultaat: Resultaat;
  standen: Record<string, GebouwStand>;
}) {
  const gekozen = useSpel((s) => s.gekozenGebouw);
  const kies = useSpel((s) => s.kiesGebouw);
  const kop = useRef<HTMLHeadingElement>(null);
  const gebouw = data.gebouwen.find((g) => g.id === gekozen);

  useEffect(() => {
    if (gebouw) kop.current?.focus();
  }, [gebouw]);

  useEffect(() => {
    const toets = (e: KeyboardEvent) => e.key === 'Escape' && kies(undefined);
    window.addEventListener('keydown', toets);
    return () => window.removeEventListener('keydown', toets);
  }, [kies]);

  if (!gebouw) return null;
  const stand = standen[gebouw.id];
  return (
    <section className="paneel" aria-labelledby="paneel-kop" data-testid="paneel">
      <header className="paneel-kop">
        <h2 id="paneel-kop" ref={kop} tabIndex={-1}>
          {gebouw.icoon} {gebouw.naam}
        </h2>
        <button
          type="button"
          className="knop-rond"
          aria-label="Paneel sluiten"
          onClick={() => kies(undefined)}
        >
          ✕
        </button>
      </header>
      <p className="paneel-sub">
        {gebouw.omschrijving}
        {stand && (
          <>
            {' · '}
            <span>{TOESTAND_NAAM[stand.toestand]}</span>
            {Math.abs(stand.bedrag) >= 50_000 && (
              <>
                {' · '}
                <span className={stand.bedrag > 0 ? 'positief' : 'negatief'}>
                  {formatMln(stand.bedrag, { teken: true })}
                </span>
              </>
            )}
          </>
        )}
      </p>
      <GebouwPosten gebouw={gebouw} data={data} resultaat={resultaat} />
    </section>
  );
}

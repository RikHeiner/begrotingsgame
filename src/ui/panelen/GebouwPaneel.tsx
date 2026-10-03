import { useEffect, useRef } from 'react';
import { formatMln, type Data, type Resultaat } from '../../engine';
import { TOESTAND_NAAM, type GebouwStand } from '../../game/toestand';
import { useSpel } from '../../game/state/store';
import { GebouwPosten } from './GebouwPosten';
import { UitgavenVergelijking } from './UitgavenVergelijking';

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
  const focus = useSpel((s) => s.focus);
  const kop = useRef<HTMLHeadingElement>(null);
  const paneel = useRef<HTMLElement>(null);
  const gebouw = data.gebouwen.find((g) => g.id === gekozen);

  // Open het gebouw met de focus op de kop, of (na een tik op een opmerking) op de post zelf:
  // het bedragvak als dat er is, anders de schuif of knop.
  useEffect(() => {
    if (!gebouw) return;
    const regel = focus
      ? paneel.current?.querySelector<HTMLElement>(`[data-post="${CSS.escape(focus.post)}"]`)
      : null;
    if (!regel) {
      kop.current?.focus();
      return;
    }
    const doel =
      regel.querySelector<HTMLElement>('.schuif-bedrag input') ??
      regel.querySelector<HTMLElement>('input, button');
    regel.classList.remove('gekozen-post');
    void regel.offsetWidth;
    regel.classList.add('gekozen-post');
    // Na de andere effecten: een dialoog die net sluit, zet de focus anders terug op zijn knop.
    const t = window.setTimeout(() => {
      regel.scrollIntoView({ block: 'center' });
      (doel ?? kop.current)?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [gebouw, focus]);

  useEffect(() => {
    const toets = (e: KeyboardEvent) => e.key === 'Escape' && kies(undefined);
    window.addEventListener('keydown', toets);
    return () => window.removeEventListener('keydown', toets);
  }, [kies]);

  if (!gebouw) return null;
  const stand = standen[gebouw.id];
  return (
    <section ref={paneel} className="paneel" aria-labelledby="paneel-kop" data-testid="paneel">
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
      {data.uitgaven && (
        <UitgavenVergelijking
          key={gebouw.id}
          uitgaven={data.uitgaven}
          gebouw={gebouw.id}
          begrotingsjaar={data.begroting.begrotingsjaar}
        />
      )}
    </section>
  );
}

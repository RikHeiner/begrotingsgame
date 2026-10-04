import { useEffect, useRef, useState } from 'react';
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
  const nul = useSpel((s) => s.beginpunt === 'nul');
  const volgendeStap = useSpel((s) => s.volgendeStap);
  const snel = useSpel((s) => s.modus === 'snel');
  // Bij snel spelen is de uitleg ingeklapt; per gebouw open je hem met één knop.
  const [uitleg, setUitleg] = useState(false);
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
      // Een nieuw gebouw begint bovenaan (ook na "Klaar, door naar …").
      paneel.current?.scrollTo?.({ top: 0 });
      kop.current?.focus();
      return;
    }
    // (bij snel spelen is het bedragvak ingeklapt: dan de schuif)
    const vak = regel.querySelector<HTMLElement>('.schuif-bedrag input');
    const doel =
      (vak && vak.offsetParent !== null ? vak : null) ??
      regel.querySelector<HTMLElement>('input[type="range"], input, button');
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
  const snelZonderUitleg = snel && !uitleg;
  // Bij nul: welke stap van de route dit gebouw is, en wat de volgende is.
  const stapNr = nul ? data.route.stappen.findIndex((s) => s.gebouw === gebouw.id) : -1;
  const stap = data.route.stappen[stapNr];
  const volgende = data.route.stappen[stapNr + 1];
  const volgendGebouw = volgende && data.gebouwen.find((g) => g.id === volgende.gebouw);
  return (
    <section
      ref={paneel}
      className={`paneel${snelZonderUitleg ? ' zonder-uitleg' : ''}`}
      aria-labelledby="paneel-kop"
      data-testid="paneel"
    >
      {stap && (
        <p className="route-stap paneel-stap">
          Stap {stapNr + 1} van {data.route.stappen.length} · {stap.thema}
        </p>
      )}
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
      {stap?.vvd && (
        <p className="route-vvd">
          <strong>VVD Groningen vindt:</strong> {stap.vvd}
        </p>
      )}
      {snel && (
        <button
          type="button"
          className="link-knop paneel-uitleg-knop"
          aria-expanded={uitleg}
          onClick={() => setUitleg((u) => !u)}
        >
          {uitleg ? 'Minder uitleg ▴' : 'Meer uitleg en cijfers ▾'}
        </button>
      )}
      <GebouwPosten gebouw={gebouw} data={data} resultaat={resultaat} />
      {data.uitgaven && (
        <UitgavenVergelijking
          key={gebouw.id}
          uitgaven={data.uitgaven}
          gebouw={gebouw.id}
          begrotingsjaar={data.begroting.begrotingsjaar}
        />
      )}
      {stap && (
        <button
          type="button"
          className="knop-indienen route-knop"
          data-testid="volgende-stap"
          onClick={() => volgendeStap(stapNr)}
        >
          {volgende && volgendGebouw
            ? `Klaar, door naar ${stapNr + 2}: ${volgende.thema}`
            : 'Klaar met de route'}
        </button>
      )}
    </section>
  );
}

/**
 * Het gedeelde kader van de minigames, in de stijl van de Geldzoeker: een balk met de stand en
 * kaarten voor het begin en het eind. De klok, de lus voor elk beeld, de rustige modus en de hulp
 * bij tekenen staan in hulp.ts.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import './kader.css';

export type HudVak = {
  label: string;
  waarde: ReactNode;
  /** kleur van de waarde */
  toon?: 'goed' | 'fout';
  testid?: string;
};

/** De balk met de stand: links en rechts een of twee vakken, in het midden een icoon. */
export function Hud({
  links,
  rechts,
  icoon,
  testid,
}: {
  links: HudVak[];
  rechts: HudVak[];
  icoon: string;
  testid?: string;
}) {
  const vak = (v: HudVak, i: number) => (
    <span key={v.label} data-testid={v.testid}>
      {i > 0 && <br />}
      <span className="mg-hud-label">{v.label}</span>{' '}
      <strong className={v.toon ? `mg-hud-${v.toon}` : undefined}>{v.waarde}</strong>
    </span>
  );
  return (
    <div className="mg-hud" data-testid={testid}>
      <div>{links.map(vak)}</div>
      <div className="mg-hud-icoon" aria-hidden="true">
        {icoon}
      </div>
      <div className="mg-hud-rechts">{rechts.map(vak)}</div>
    </div>
  );
}

/** Een kaart voor het begin of het eind, met een knop die meteen de focus krijgt. */
export function SpelKaart({
  titel,
  children,
  knop,
  extra,
  testid,
  status,
}: {
  titel: ReactNode;
  children?: ReactNode;
  knop?: { tekst: string; onClick: () => void };
  /** meer knoppen naast de hoofdknop */
  extra?: ReactNode;
  testid?: string;
  /** voorlezen als hij verschijnt (eind van een level) */
  status?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="mg-kaart" data-testid={testid} role={status ? 'status' : undefined}>
      <h3>{titel}</h3>
      {children}
      {(knop || extra) && (
        <div className="mg-knoppen">
          {knop && (
            <button ref={ref} type="button" className="knop-indienen" onClick={knop.onClick}>
              {knop.tekst}
            </button>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}

/** Een melding onder het veld, die steeds opnieuw verschijnt. */
export type Melding = { tekst: ReactNode; toon?: 'goed' | 'fout'; tijd: number };

export function Meldingen({ melding, children }: { melding?: Melding; children?: ReactNode }) {
  return (
    <div role="status" className="mg-status">
      {melding && (
        <p
          key={melding.tijd}
          className={`mg-melding${melding.toon ? ` mg-melding-${melding.toon}` : ''}`}
        >
          {melding.tekst}
        </p>
      )}
      {children}
    </div>
  );
}

/** Pauzeknop. */
export function PauzeKnop({ pauze, onWissel }: { pauze: boolean; onWissel: () => void }) {
  return (
    <button type="button" className="knop" onClick={onWissel} aria-pressed={pauze}>
      {pauze ? '▶ Verder' : 'Pauze'}
    </button>
  );
}

/**
 * Drie coachmarks bij het eerste bezoek (opdracht 8.8). Over te slaan; daarna niet meer tonen.
 * Stap 1: tik op een gebouw. Stap 2: schuif om te bezuinigen. Stap 3: het slot is eraf.
 */
import { useState } from 'react';
import type { Data, Resultaat } from '../../engine';
import { useSpel } from '../../game/state/store';

export const OPSLAG_TUTORIAL = 'begrotingsgame:tutorial';

function gezien(): boolean {
  try {
    return localStorage.getItem(OPSLAG_TUTORIAL) === 'klaar';
  } catch {
    return false;
  }
}
function markeer(): void {
  try {
    localStorage.setItem(OPSLAG_TUTORIAL, 'klaar');
  } catch {
    // geen opslag: dan zie je de tutorial een volgende keer opnieuw
  }
}

export function Tutorial({ data, resultaat }: { data: Data; resultaat: Resultaat }) {
  const [klaar, setKlaar] = useState(gezien);
  const ooitGekozen = useSpel((s) => s.ooitGekozen);
  const weergave = useSpel((s) => s.weergave);
  const vrij = Math.min(...data.jaren.map((j) => resultaat.perJaar[j]?.structureel ?? 0));
  if (klaar) return null;
  const stap = vrij > 0.5 ? 2 : ooitGekozen || weergave === 'lijst' ? 1 : 0;
  const tekst = data.teksten.tutorial[stap]?.tekst;
  if (!tekst) return null;
  const sluit = () => {
    markeer();
    setKlaar(true);
  };
  return (
    <div
      className={`coachmark stap-${stap}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="coach-tekst"
      data-testid="tutorial"
    >
      <p id="coach-tekst">
        <span className="coach-stap">
          {stap + 1}/{data.teksten.tutorial.length}
        </span>{' '}
        {tekst}
      </p>
      <div className="coach-knoppen">
        <button type="button" className="link-knop" onClick={sluit}>
          Overslaan
        </button>
        {stap === data.teksten.tutorial.length - 1 && (
          <button type="button" className="knop" onClick={sluit}>
            Begrepen
          </button>
        )}
      </div>
    </div>
  );
}

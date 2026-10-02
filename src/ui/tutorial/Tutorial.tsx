/**
 * Drie coachmarks bij het eerste bezoek (opdracht 8.8). Over te slaan; daarna niet meer tonen.
 * Bij nul (de standaard): tik op een gebouw, schuif naar rechts, verdeel de rest.
 * Met de begroting van het college: tik op een gebouw, schuif om te bezuinigen, het slot is eraf.
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
  const nul = useSpel((s) => s.beginpunt === 'nul');
  const basis = useSpel((s) => s.basis);
  if (klaar) return null;
  const stappen = nul ? data.teksten.tutorial_nul : data.teksten.tutorial;
  // Bij nul is er meteen geld: stap 3 komt zodra de speler iets verandert. Bij het college komt
  // stap 3 zodra er geld vrij is (het slot is eraf).
  const verder = nul
    ? JSON.stringify(resultaat.keuzes) !== JSON.stringify(basis)
    : Math.min(...data.jaren.map((j) => resultaat.perJaar[j]?.structureel ?? 0)) > 0.5;
  const stap = verder ? 2 : ooitGekozen || weergave === 'lijst' ? 1 : 0;
  const tekst = stappen[stap]?.tekst;
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
          {stap + 1}/{stappen.length}
        </span>{' '}
        {tekst}
      </p>
      <div className="coach-knoppen">
        <button type="button" className="link-knop" onClick={sluit}>
          Overslaan
        </button>
        {stap === stappen.length - 1 && (
          <button type="button" className="knop" onClick={sluit}>
            Begrepen
          </button>
        )}
      </div>
    </div>
  );
}

import type { Data } from '../../engine';
import { useSpel } from '../../game/state/store';
import { Dialoog } from '../algemeen/Dialoog';

/** De campagne starten of stoppen: vier jaar besturen, met elke ronde een gebeurtenis. */
export function CampagneDialoog({
  open,
  onSluit,
  data,
}: {
  open: boolean;
  onSluit: () => void;
  data: Data;
}) {
  const campagne = useSpel((s) => s.campagne);
  const startCampagne = useSpel((s) => s.startCampagne);
  const stopCampagne = useSpel((s) => s.stopCampagne);
  return (
    <Dialoog open={open} onSluit={onSluit} titel="Campagne: vier jaar besturen">
      <section className="campagne-keuze">
        <p>
          Speel {data.jaren[0]} tot en met {data.jaren.at(-1)}, één jaar per ronde. Elke ronde
          gebeurt er iets onverwachts en stuur je bij. Je begint opnieuw met de begroting van het
          college.
        </p>
        {campagne ? (
          <button
            type="button"
            className="knop"
            onClick={() => {
              stopCampagne();
              onSluit();
            }}
          >
            Stop de campagne
          </button>
        ) : (
          <button
            type="button"
            className="knop-indienen"
            data-testid="start-campagne"
            onClick={() => {
              onSluit();
              startCampagne();
            }}
          >
            Start de campagne
          </button>
        )}
      </section>
    </Dialoog>
  );
}

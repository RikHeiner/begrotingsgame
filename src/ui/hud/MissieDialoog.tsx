import type { Data, Resultaat } from '../../engine';
import { useSpel } from '../../game/state/store';
import { lezerVoor, missieStand } from '../../game/score';
import { Dialoog } from '../algemeen/Dialoog';

/** Kies een missie, of speel vrij (opdracht 8.6). */
export function MissieDialoog({
  open,
  onSluit,
  data,
  resultaat,
}: {
  open: boolean;
  onSluit: () => void;
  data: Data;
  resultaat: Resultaat;
}) {
  const missie = useSpel((s) => s.missie);
  const kies = useSpel((s) => s.kiesMissie);
  const campagne = useSpel((s) => s.campagne);
  const startCampagne = useSpel((s) => s.startCampagne);
  const stopCampagne = useSpel((s) => s.stopCampagne);
  const lees = lezerVoor(data, resultaat);
  const kiezen = (id?: string) => {
    kies(id);
    onSluit();
  };
  return (
    <Dialoog open={open} onSluit={onSluit} titel="Kies een missie">
      <section className="campagne-keuze" aria-labelledby="campagne-kop">
        <h3 id="campagne-kop">🗓️ Campagne: vier jaar besturen</h3>
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
      <ul className="missies">
        <li>
          <button
            type="button"
            className={`missie-kaart${!missie ? ' aan' : ''}`}
            aria-pressed={!missie}
            onClick={() => kiezen(undefined)}
          >
            <strong>🎲 Vrij spel</strong>
            <span>Geen opdracht. Maak de begroting zoals jij hem wilt.</span>
          </button>
        </li>
        {data.missies.missies.map((m) => {
          const stand = missieStand(m, lees);
          return (
            <li key={m.id}>
              <button
                type="button"
                className={`missie-kaart${missie === m.id ? ' aan' : ''}`}
                aria-pressed={missie === m.id}
                onClick={() => kiezen(m.id)}
              >
                <strong>
                  {m.icoon} {m.naam}
                  {stand.gehaald && <span className="positief"> ✓ gehaald</span>}
                </strong>
                <span>{m.uitleg}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Dialoog>
  );
}

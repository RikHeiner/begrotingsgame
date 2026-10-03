/**
 * Na een paar stappen van de route: even pauze, met een minigame die je nog niet speelde.
 * Je kunt hem spelen of gewoon verder gaan met je begroting.
 */
import { useMemo } from 'react';
import type { Data } from '../../engine';
import { useSpel } from '../../game/state/store';
import { Dialoog } from '../algemeen/Dialoog';
import { leesBeste } from './scores';

export function TussendoorAanbod({ data }: { data: Data }) {
  const aan = useSpel((s) => s.tussendoor);
  const zet = useSpel((s) => s.zetTussendoor);
  const open = useSpel((s) => s.openMinigame);
  const routeStap = useSpel((s) => s.routeStap);
  const m = useMemo(() => {
    if (!aan) return undefined;
    const gespeeld = leesBeste();
    const nieuw = data.minigames.filter((x) => gespeeld[x.id] === undefined);
    const lijst = nieuw.length ? nieuw : data.minigames;
    return lijst[Math.floor(routeStap / 3) % lijst.length];
  }, [aan, data.minigames, routeStap]);
  if (!aan || !m) return null;
  return (
    <Dialoog open titel="Even pauze?" onSluit={() => zet(false)}>
      <div data-testid="tussendoor">
        <p>
          Je bent goed op weg met je begroting. Zin in een minigame tussendoor?{' '}
          <strong>
            {m.icoon} {m.naam}: {m.spel}
          </strong>
          . {m.kort}
        </p>
        <p className="knoppen-rij">
          <button
            type="button"
            className="knop-indienen"
            onClick={() => {
              zet(false);
              open(m.id);
            }}
          >
            Speel {m.spel}
          </button>
          <button type="button" className="knop" onClick={() => zet(false)}>
            Nee, verder met mijn begroting
          </button>
        </p>
      </div>
    </Dialoog>
  );
}

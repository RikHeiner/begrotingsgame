/** Nog te bouwen: zie data/spel/minigames.json. */
import type { MinigameProps } from './types';

export default function Euroborg({ onKlaar }: MinigameProps) {
  return (
    <p>
      Dit spel komt eraan.{' '}
      <button type="button" className="knop" onClick={() => onKlaar(0, 0)}>
        Terug
      </button>
    </p>
  );
}

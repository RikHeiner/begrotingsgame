/**
 * Linksboven op de kaart, klein: een knop voor de minigames (met hoeveel je al speelde). De game
 * kiest er een die je nog niet speelde (of, als je alles al speelde, een willekeurige) en opent
 * hem meteen.
 */
import type { Data } from '../../engine';
import { useSpel } from '../../game/state/store';

export function MinigameKnop({ data }: { data: Data }) {
  const open = useSpel((s) => s.openMinigame);
  const gespeeld = useSpel((s) => s.gespeeld);
  const totaal = data.minigames.length;
  if (!totaal) return null;
  const aantal = data.minigames.filter((m) => gespeeld.includes(m.id)).length;
  const kies = () => {
    const nieuw = data.minigames.filter((m) => !gespeeld.includes(m.id));
    const lijst = nieuw.length ? nieuw : data.minigames;
    const m = lijst[Math.floor(Math.random() * lijst.length)];
    if (m) open(m.id);
  };
  return (
    <button
      type="button"
      className="minigame-knop"
      data-testid="minigame-knop"
      aria-label={`Speel een minigame (${aantal} van ${totaal} gespeeld)`}
      title="Speel een minigame"
      onClick={kies}
    >
      <span aria-hidden="true">🎮</span>
      <span className="minigame-knop-teller" aria-hidden="true">
        {aantal}/{totaal}
      </span>
    </button>
  );
}

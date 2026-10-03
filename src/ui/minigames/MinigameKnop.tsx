/**
 * Linksonder op de kaart: "Speel een minigame". De game kiest er een die je nog niet speelde (of,
 * als je alles al speelde, een willekeurige) en opent hem meteen.
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
    <button type="button" className="minigame-knop" data-testid="minigame-knop" onClick={kies}>
      <span aria-hidden="true">🎮</span> Speel een minigame
      <span className="minigame-knop-teller">
        {aantal} van {totaal} gespeeld
      </span>
    </button>
  );
}

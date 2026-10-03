import type { Data } from '../../engine';

/** Wat elke minigame krijgt: de data van de begroting, en een functie voor als het spel klaar is. */
export type MinigameProps = {
  data: Data;
  /** het spel is klaar: de score en de hoogst mogelijke score */
  onKlaar: (score: number, max: number) => void;
};

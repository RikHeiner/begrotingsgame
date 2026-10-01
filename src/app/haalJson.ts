import type { HaalJson } from '../engine';

/** Haalt een bestand uit de map data/ (in dev en in de build geserveerd als /data/). */
export const haalJson: HaalJson = async (pad) => {
  const antwoord = await fetch(`${import.meta.env.BASE_URL}data/${pad}`);
  if (!antwoord.ok) throw new Error(`Kon ${pad} niet laden (${antwoord.status}).`);
  return antwoord.json();
};

import type { HaalJson } from '../engine/config';

/** Haalt een bestand uit de map data/ (in dev en in de build geserveerd als /data/). */
export const haalJson: HaalJson = async (bestand) => {
  const antwoord = await fetch(`${import.meta.env.BASE_URL}data/${bestand}`);
  if (!antwoord.ok) throw new Error(`Kon ${bestand} niet laden (${antwoord.status}).`);
  return antwoord.json();
};

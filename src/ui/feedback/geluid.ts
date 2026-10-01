/**
 * Korte geluiden via Howler.js (opdracht 8.7). Standaard uit; Howler wordt pas geladen als de speler
 * het geluid aanzet.
 */
import type { Howl } from 'howler';

export type Geluid = 'munt' | 'slot' | 'fout' | 'hamer' | 'bouw';
const cache = new Map<Geluid, Howl>();
let laden: Promise<typeof import('howler')> | undefined;

export async function speel(naam: Geluid): Promise<void> {
  try {
    laden ??= import('howler');
    const { Howl } = await laden;
    let h = cache.get(naam);
    if (!h) {
      h = new Howl({ src: [`${import.meta.env.BASE_URL}geluid/${naam}.wav`], volume: 0.5 });
      cache.set(naam, h);
    }
    h.play();
  } catch {
    // Geen geluid mogelijk: de game werkt gewoon door.
  }
}

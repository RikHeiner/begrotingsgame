/**
 * Welke component bij welke minigame hoort (spel/minigames.json). Elk spel laadt pas als je het
 * opent, zodat de game zelf snel blijft.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { MinigameProps } from './types';

export const MINIGAMES: Record<string, LazyExoticComponent<ComponentType<MinigameProps>>> = {
  martinitoren: lazy(() => import('./Martinitoren')),
  grotemarkt: lazy(() => import('./GroteMarkt')),
  station: lazy(() => import('./Station')),
  forum: lazy(() => import('./Forum')),
  euroborg: lazy(() => import('./Euroborg')),
  noorderplantsoen: lazy(() => import('./Noorderplantsoen')),
  museum: lazy(() => import('./Museum')),
  academie: lazy(() => import('./Academie')),
  sluis: lazy(() => import('./Sluis')),
  goudkantoor: lazy(() => import('./Goudkantoor')),
  // nog niet op de kaart: eerst testen (staat niet in spel/minigames.json)
  ergerjeniet: lazy(() => import('./ErgerJeNiet')),
};

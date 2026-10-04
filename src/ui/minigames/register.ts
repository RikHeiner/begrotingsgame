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
  sluis: lazy(() => import('./Sluis')),
  goudkantoor: lazy(() => import('./Goudkantoor')),
  ergerjeniet: lazy(() => import('./ErgerJeNiet')),
};

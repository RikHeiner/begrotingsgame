/** Hulp voor de browsertests. */
import { codeer } from '../../src/game/deellink';

/**
 * De game begint altijd bij nul. Tests die rekenen met de bedragen van het college openen een
 * gedeelde link met de begroting van het college, zonder keuzes (zoals oude links nog werken).
 */
export const collegeLink = (): string =>
  `/?b=${codeer({ onderdelen: {}, belastingen: {}, kaarten: [], scenario: 'midden' }, 2027)}`;

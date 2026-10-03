import { describe, expect, it } from 'vitest';
import { actieveData } from '../../engine/__tests__/hulp';
import { alleTreinen, kiesTreinen, uitlegSpoor } from '../mgStation';

describe('Station', () => {
  it('maakt treinen van programma’s en actiekaarten, met een positief bedrag', async () => {
    const data = await actieveData();
    const alle = alleTreinen(data);
    expect(alle.length).toBeGreaterThanOrEqual(8);
    for (const t of alle) {
      expect(t.bedrag_mln).toBeGreaterThanOrEqual(0);
      expect(['S', 'I']).toContain(t.soort);
    }
  });

  it('kiest 8 treinen, half elk jaar en half eenmalig', async () => {
    const data = await actieveData();
    for (const k of [0.1, 0.5, 0.9]) {
      const treinen = kiesTreinen(data, 8, () => k);
      expect(treinen).toHaveLength(8);
      expect(new Set(treinen.map((t) => t.id)).size).toBe(8);
      expect(treinen.filter((t) => t.soort === 'S')).toHaveLength(4);
    }
  });

  it('legt elk spoor uit in één zin', () => {
    expect(uitlegSpoor('S')).toMatch(/elk jaar/);
    expect(uitlegSpoor('I')).toMatch(/één keer/);
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import { bekendePosten } from '../minigames';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

describe('minigames: posten met een begrijpelijke naam', () => {
  it('elke post bestaat in de begroting van het actieve jaar, met het bedrag van de begroting', () => {
    const posten = bekendePosten(data);
    expect(posten).toHaveLength(data.spelPosten.length);
    for (const p of posten) {
      const o = data.index.onderdelen.get(p.id);
      expect(p.bedragMln).toBe(o?.lasten_mln);
      expect(p.uitleg.length).toBeGreaterThan(10);
    }
  });

  it('genoeg posten die moeten van de wet en genoeg eigen keuzes, en een wet bij elke wettelijke taak', () => {
    const posten = bekendePosten(data);
    expect(posten.filter((p) => p.soort === 'wet').length).toBeGreaterThanOrEqual(12);
    expect(posten.filter((p) => p.soort === 'keuze').length).toBeGreaterThanOrEqual(10);
    for (const p of posten) if (p.soort === 'wet') expect(p.wet, p.id).toBeTruthy();
    // een wettelijke taak volgens de spellen is nooit een post die je helemaal mag schrappen
    for (const p of posten.filter((x) => x.soort === 'wet')) {
      const o = data.index.onderdelen.get(p.id);
      expect(o?.min_pct === null || (o?.min_pct ?? 0) > -100 || o?.vergrendeld, p.id).toBe(true);
    }
  });
});

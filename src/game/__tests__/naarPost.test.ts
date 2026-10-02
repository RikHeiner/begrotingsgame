import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { echteData } from '../../engine/__tests__/hulp';
import { doelVanId, doelVanVoorwaarde } from '../naarPost';

let data: Data;
beforeAll(async () => {
  data = await echteData();
});

describe('van een opmerking naar de post', () => {
  it('een post, belasting, kaart of programma', () => {
    expect(doelVanId(data, 'o1')).toMatchObject({
      gebouw: data.index.onderdelen.get('o1')?.gebouw,
      post: 'o1',
    });
    expect(doelVanId(data, 't1')).toMatchObject({ gebouw: 'loket', post: 't1' });
    expect(doelVanId(data, 't5')).toMatchObject({ post: 'parkeren' });
    expect(doelVanId(data, 'k_bouw')).toMatchObject({ gebouw: 'veiling', post: 'k_bouw' });
    expect(doelVanId(data, 'p_vitamine_g')).toMatchObject({ gebouw: 'beleid' });
    expect(doelVanId(data, 'bestaat_niet')).toBeUndefined();
  });

  it('uit de voorwaarde van een tekstballon', () => {
    expect(doelVanVoorwaarde(data, 'pct.o1 <= -20')?.post).toBe('o1');
    expect(doelVanVoorwaarde(data, 'tax.t1 >= 5')?.post).toBe('t1');
    expect(doelVanVoorwaarde(data, 'true')).toBeUndefined();
    expect(doelVanVoorwaarde(data, 'persona.kees > 65')).toBeUndefined();
  });

  it('elke tekstballon met een post in de voorwaarde heeft een doel', () => {
    for (const r of data.reacties) {
      if (/\b(pct|tax|kaart)\./.test(r.voorwaarde))
        expect(doelVanVoorwaarde(data, r.voorwaarde), r.id).toBeDefined();
    }
  });
});

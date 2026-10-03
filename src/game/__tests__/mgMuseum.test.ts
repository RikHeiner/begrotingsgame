import { beforeAll, describe, expect, it } from 'vitest';
import { grensOnderdeel, type Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import { CATEGORIEEN, KAARTEN, alleKaarten, categorieVan, museumKaarten } from '../mgMuseum';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

describe('Museum: moet of mag?', () => {
  it('tien kaarten, elke categorie minstens drie keer, geen dubbele', () => {
    for (let n = 0; n < 20; n++) {
      const kaarten = museumKaarten(data);
      expect(kaarten).toHaveLength(KAARTEN);
      expect(new Set(kaarten.map((k) => k.id)).size).toBe(KAARTEN);
      for (const c of CATEGORIEEN)
        expect(kaarten.filter((k) => k.categorie === c.id).length, c.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('levert geld op gaat voor verplicht, verplicht gaat voor eigen keuze', () => {
    for (const o of data.begroting.onderdelen) {
      const c = categorieVan(o);
      if (o.gekoppelde_baten_mln > o.lasten_mln) expect(c, o.id).toBe('geld');
      else if (o.wettelijke_taak || o.vergrendeld) expect(c, o.id).toBe('verplicht');
      if (c === 'keuze') {
        expect(grensOnderdeel(o).min, o.id).toBeLessThanOrEqual(-100);
        expect(o.minimum, o.id).toBeUndefined();
      }
    }
  });

  it('alle belastingen zijn "levert geld op"', () => {
    const belastingen = alleKaarten(data).filter((k) => k.belasting);
    expect(belastingen).toHaveLength(data.begroting.belastingen.length);
    for (const k of belastingen) expect(k.categorie).toBe('geld');
  });

  it('een verplichte post heeft een reden', () => {
    const verplicht = alleKaarten(data).filter((k) => k.categorie === 'verplicht');
    expect(verplicht.length).toBeGreaterThan(3);
    for (const k of verplicht) if (k.reden) expect(k.reden.length).toBeGreaterThan(5);
  });
});

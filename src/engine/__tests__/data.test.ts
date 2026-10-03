import { describe, expect, it } from 'vitest';
import { DataFout, laadData, valideer } from '../laadData';
import { configSchema } from '../schema';
import { echteData, haalUitData } from './hulp';

describe('data laden en valideren', () => {
  it('alle data voor het actieve jaar is geldig', async () => {
    const data = await echteData();
    expect(data.config.actiefJaar).toBe(data.begroting.begrotingsjaar);
    expect(data.jaren[0]).toBe(data.config.actiefJaar);
    expect(data.begroting.onderdelen.length).toBeGreaterThan(0);
    expect(data.dwarsverbanden.dwarsverbanden.length).toBeGreaterThan(0);
    expect(data.vergelijking).toHaveLength(data.config.vergelijking.length);
  });

  it('weigert een horizon die niet bij het actieve jaar begint', () => {
    expect(() =>
      valideer(
        configSchema,
        {
          actiefJaar: 2027,
          begroting: 'begroting-2027.json',
          vergelijking: [],
          meerjarenHorizon: [2026, 2027],
        },
        'config.json',
      ),
    ).toThrow(/meerjarenHorizon/);
  });

  it('weigert een bestandsnaam met een pad erin', () => {
    expect(() =>
      valideer(
        configSchema,
        {
          actiefJaar: 2026,
          begroting: '../geheim.json',
          vergelijking: [],
          meerjarenHorizon: [2026],
        },
        'config.json',
      ),
    ).toThrow(DataFout);
  });

  it('weigert een begroting van een ander jaar dan in de config', async () => {
    const haal = async (pad: string): Promise<unknown> =>
      pad === 'config.json'
        ? {
            actiefJaar: 2027,
            begroting: 'begroting-2026.json',
            vergelijking: [],
            meerjarenHorizon: [2027],
          }
        : haalUitData(pad);
    await expect(laadData(haal)).rejects.toThrow(/verwacht 2027/);
  });

  it('geeft een leesbare fout met het pad in het bestand', async () => {
    const haal = async (pad: string): Promise<unknown> => {
      const inhoud = await haalUitData(pad);
      if (pad !== 'begroting-2027.json') return inhoud;
      const b = structuredClone(inhoud) as { onderdelen: { lasten_mln: unknown }[] };
      const eerste = b.onderdelen[0];
      if (eerste) eerste.lasten_mln = 'veel';
      return b;
    };
    await expect(laadData(haal)).rejects.toThrow(/onderdelen\.0\.lasten_mln/);
  });
});

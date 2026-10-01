import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { laadActieveBegroting, leesConfig } from '../config';

const dataMap = resolve(__dirname, '../../../data');
const haalUitData = async (bestand: string): Promise<unknown> =>
  JSON.parse(readFileSync(resolve(dataMap, bestand), 'utf8'));

describe('config', () => {
  it('laadt het actieve begrotingsjaar uit data/config.json', async () => {
    const { config, kop } = await laadActieveBegroting(haalUitData);
    expect(config.actiefJaar).toBe(kop.begrotingsjaar);
    expect(config.meerjarenHorizon[0]).toBe(config.actiefJaar);
  });

  it('weigert een horizon die niet bij het actieve jaar begint', () => {
    expect(() =>
      leesConfig({
        actiefJaar: 2027,
        begroting: 'begroting-2027.json',
        vergelijking: [],
        meerjarenHorizon: [2026, 2027],
      }),
    ).toThrow(/meerjarenHorizon/);
  });

  it('weigert een bestandsnaam met een pad erin', () => {
    expect(() =>
      leesConfig({
        actiefJaar: 2026,
        begroting: '../geheim.json',
        vergelijking: [],
        meerjarenHorizon: [2026],
      }),
    ).toThrow(/begroting/);
  });

  it('weigert een begroting van een ander jaar dan in de config', async () => {
    const haal = async (bestand: string): Promise<unknown> =>
      bestand === 'config.json'
        ? {
            actiefJaar: 2027,
            begroting: 'begroting-2026.json',
            vergelijking: [],
            meerjarenHorizon: [2027],
          }
        : haalUitData(bestand);
    await expect(laadActieveBegroting(haal)).rejects.toThrow(/verwacht 2027/);
  });
});

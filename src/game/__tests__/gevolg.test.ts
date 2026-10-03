import { describe, expect, it } from 'vitest';
import { actieveData } from '../../engine/__tests__/hulp';
import { gevolgVan } from '../gevolg';

describe('wat merk je ervan, ten opzichte van nu', () => {
  it("boa's: veiliger of onveiliger dan nu, met het aantal", async () => {
    const data = await actieveData();
    expect(gevolgVan(data, 'v2', 0)?.tekst).toBe('Even veilig als nu');
    expect(gevolgVan(data, 'v2', 20)?.tekst).toBe('Veiliger dan nu');
    const nul = gevolgVan(data, 'v2', -90);
    expect(nul?.tekst).toBe('Veel onveiliger dan nu');
    expect(nul?.eenheid).toMatchObject({ naam: "boa's", nu: 49, straks: 5, aanname: true });
  });

  it('elke post en belasting heeft een gevolg', async () => {
    const data = await actieveData();
    for (const o of data.begroting.onderdelen)
      expect(gevolgVan(data, o.id, -10), o.id).toBeDefined();
    for (const b of data.begroting.belastingen)
      expect(gevolgVan(data, b.id, 10), b.id).toBeDefined();
  });

  it('bij vaste lasten geen "veel"', async () => {
    const data = await actieveData();
    expect(gevolgVan(data, 'm10', -100)?.tekst).toBe(
      'Vaste lasten: op straat merk je hier niets van',
    );
  });

  it('belasting: inwoners betalen meer of minder dan nu', async () => {
    const data = await actieveData();
    expect(gevolgVan(data, 't1', -100)?.tekst).toBe(
      'Inwoners en ondernemers betalen veel minder dan nu',
    );
  });
});

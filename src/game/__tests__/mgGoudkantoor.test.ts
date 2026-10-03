import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import { MAX_HOEK, grootte, maakVeld, raak, raakMarge, vondsten } from '../mgGoudkantoor';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

describe('Goudkantoor: geldzoeker', () => {
  it('goud zijn eenmalige uitgaven uit de begroting, stenen zijn posten', () => {
    const v = vondsten(data);
    const goud = v.filter((x) => x.soort === 'goud');
    expect(goud.length).toBe(5);
    for (const g of goud) {
      const k = data.begroting.actiekaarten.find((x) => x.id === g.id);
      expect(k?.structureel_of_incidenteel).toBe('I');
      expect(g.bedragMln).toBe(k?.bedrag_mln);
      expect(g.vvd.length).toBeGreaterThan(10);
    }
    // Opvang ongedocumenteerden: € 5,6 mln, de grootste klomp.
    const ongedoc = goud.find((x) => x.id === 'k_ongedoc');
    expect(ongedoc?.bedragMln).toBe(5.6);
    expect(Math.max(...goud.map(grootte))).toBe(ongedoc && grootte(ongedoc));
    expect(v.filter((x) => x.soort === 'steen').map((x) => x.id)).toEqual(
      expect.arrayContaining(['v2', 'o1', 'w8', 'k1']),
    );
  });

  it('elke vondst is apart te raken, binnen het bereik van de grijper', () => {
    for (let n = 0; n < 10; n++) {
      const veld = maakVeld(data);
      for (const p of veld) {
        expect(Math.abs(p.hoek)).toBeLessThanOrEqual(MAX_HOEK);
        expect(raak(veld, p.hoek, new Set())?.id).toBe(p.id);
      }
      // Wat al is opgehaald, raak je niet nog een keer.
      const p = veld[0];
      if (p) expect(raak(veld, p.hoek, new Set([p.id]))?.id).not.toBe(p.id);
      // Tussen twee vondsten in raak je niets... of de dichtstbijzijnde binnen de marge.
      for (const q of veld) expect(raakMarge(q)).toBeLessThan(15);
    }
  });
});

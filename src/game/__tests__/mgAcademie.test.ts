import { beforeAll, describe, expect, it } from 'vitest';
import type { Data } from '../../engine';
import { actieveData } from '../../engine/__tests__/hulp';
import {
  aandeelGemeente,
  BEGIN,
  gemeentePerMaand,
  saldo,
  studentScore,
  VOORBEELD,
} from '../mgAcademie';

let data: Data;
beforeAll(async () => {
  data = await actieveData();
});

describe('Academiegebouw: rondkomen als student', () => {
  it('de gemeente rekent de afvalstoffenheffing voor één persoon, per maand', () => {
    const perJaar = data.tarieven?.afvalstoffenheffing.een_persoon;
    expect(perJaar).toBeGreaterThan(0);
    expect(gemeentePerMaand(data)).toBeCloseTo((perJaar ?? 0) / 12, 6);
  });

  it('het saldo is inkomen min alle kosten', () => {
    const g = gemeentePerMaand(data);
    const k = { boodschappen: 200, uitgaan: 50, sparen: 30 };
    expect(saldo(k, g)).toBeCloseTo(
      VOORBEELD.inkomen -
        VOORBEELD.huur -
        VOORBEELD.zorgverzekering -
        VOORBEELD.telefoon -
        g -
        200 -
        50 -
        30,
      6,
    );
  });

  it('de beginstand komt rond, maar spaart nog niet', () => {
    const g = gemeentePerMaand(data);
    expect(saldo(BEGIN, g)).toBeGreaterThanOrEqual(0);
    expect(studentScore(BEGIN, g)).toBe(70);
  });

  it('score: 100 met sparen, 70 zonder, 30 bij een tekort', () => {
    const g = 25;
    expect(studentScore({ boodschappen: 200, uitgaan: 100, sparen: 50 }, g)).toBe(100);
    expect(studentScore({ boodschappen: 200, uitgaan: 100, sparen: 0 }, g)).toBe(70);
    expect(studentScore({ boodschappen: 400, uitgaan: 400, sparen: 50 }, g)).toBe(30);
    // precies nul over telt als rondkomen
    expect(studentScore({ boodschappen: 300, uitgaan: 50, sparen: 50 }, 25)).toBe(100);
  });

  it('het deel voor de gemeente is een klein percentage van het inkomen', () => {
    const a = aandeelGemeente(gemeentePerMaand(data));
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(10);
  });
});

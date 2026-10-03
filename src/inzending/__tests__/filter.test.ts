import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FILTER_WOORDEN, ideeVerdacht } from '../filter';

const MAP = resolve(import.meta.dirname, '../../../supabase/migrations');
const gevallen = JSON.parse(
  readFileSync(resolve(MAP, '../tests/filter-gevallen.json'), 'utf8'),
) as [string, boolean][];
const sql = readdirSync(MAP)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(resolve(MAP, f), 'utf8'))
  .join('\n');

describe('filter op ideeën', () => {
  it('gebruikt dezelfde woorden als de database', () => {
    const blok = sql.match(/insert into prive\.filter_woorden \(woord\) values([^;]+);/)?.[1] ?? '';
    const inDb = [...blok.matchAll(/\('([^']+)'\)/g)].map((m) => m[1]);
    expect(inDb).toEqual([...FILTER_WOORDEN]);
  });

  it.each(gevallen)('%s → %s', (tekst, verwacht) => {
    expect(ideeVerdacht(tekst)).toBe(verwacht);
  });
});

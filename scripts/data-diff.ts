/**
 * npm run data:diff 2026 2027
 * Schrijft een overzicht in Markdown van de verschillen tussen twee begrotingsjaren naar stdout.
 * Gebruikt data/mappings/id-mapping-OUD-NIEUW.json als die bestaat.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { valideer } from '../src/engine/laadData';
import { begrotingSchema, idMappingSchema } from '../src/engine/schema';
import { alsMarkdown } from '../src/engine/verschil';
import { DATA_MAP, leesJson } from './lees';

const [oud, nieuw] = process.argv.slice(2);
if (!oud || !nieuw || !/^\d{4}$/.test(oud) || !/^\d{4}$/.test(nieuw)) {
  console.error(
    'Gebruik: npm run data:diff OUD NIEUW   (bijvoorbeeld: npm run data:diff 2026 2027)',
  );
  process.exit(2);
}
const lees = (jaar: string) => {
  const bestand = `begroting-${jaar}.json`;
  if (!existsSync(resolve(DATA_MAP, bestand))) {
    console.error(`data/${bestand} bestaat niet.`);
    process.exit(2);
  }
  return valideer(begrotingSchema, leesJson(bestand), bestand);
};
const mappingBestand = `mappings/id-mapping-${oud}-${nieuw}.json`;
const mapping = existsSync(resolve(DATA_MAP, mappingBestand))
  ? valideer(idMappingSchema, leesJson(mappingBestand), mappingBestand)
  : undefined;
if (!mapping && oud !== nieuw)
  console.error(`Let op: ${mappingBestand} ontbreekt; ids worden 1-op-1 vergeleken.`);
console.log(alsMarkdown(lees(oud), lees(nieuw), mapping));

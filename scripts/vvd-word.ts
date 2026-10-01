/**
 * npm run vvd:word -- [bestand.docx]
 * Maakt de VVD-tegenbegroting uit config.json na in de game en schrijft hem als Word-bestand weg,
 * om naast het origineel te leggen.
 */
import { writeFileSync } from 'node:fs';
import { Packer } from 'docx';
import { bereken, GEEN_KEUZES, metExtraKaarten } from '../src/engine';
import { alsKaarten } from '../src/engine/tegenbegroting';
import { maakTegenbegroting } from '../src/game/tegenbegroting/document';
import { maakWord } from '../src/game/tegenbegroting/word';
import { laadDataNode } from './lees';

const data = laadDataNode();
const tb = data.vergelijking[0]?.tegenbegroting;
if (!tb) {
  console.log('Er staat geen tegenbegroting in config.json (vergelijking).');
  process.exit(1);
}
const kaarten = alsKaarten(tb);
const metVvd = metExtraKaarten(data, kaarten);
const r = bereken(metVvd, { ...GEEN_KEUZES, kaarten: kaarten.map((k) => k.id) });
const doc = maakTegenbegroting(metVvd, r, {
  titel: tb.titel.split('.')[0] ?? tb.titel,
  naam: 'VVD Groningen',
  idee: '',
});
const uit = process.argv[2] ?? 'vvd-tegenbegroting.docx';
writeFileSync(uit, await Packer.toBuffer(maakWord(doc)));
console.log(`Geschreven: ${uit}`);

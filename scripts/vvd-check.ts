/**
 * npm run vvd:check
 * Rekent de tegenbegroting(en) uit config.json na met de schuiven en kaarten van de game.
 */
import { alsMarkdown } from '../src/engine/vvd';
import { laadDataNode } from './lees';

const data = laadDataNode();
if (!data.vergelijking.length) {
  console.log('Er staat geen tegenbegroting in config.json (vergelijking).');
}
for (const { tegenbegroting } of data.vergelijking)
  console.log(alsMarkdown(data, tegenbegroting), '\n');

/**
 * npm run data:check [bestand]
 * Valideert de data met Zod en controleert de samenhang (opdracht hoofdstuk 14).
 * Zonder bestand: de begroting uit config.json. Stopt met code 1 bij fouten.
 */
import { alsTekst, controleer, heeftFouten } from '../src/engine/controle';
import { DataFout } from '../src/engine/laadData';
import { laadDataNode, leesMappings, leesWijkcodes } from './lees';

const bestand = process.argv.slice(2).find((a) => !a.startsWith('--'));
try {
  const data = laadDataNode(bestand);
  console.log(
    `Controle van de begroting ${data.begroting.begrotingsjaar} (${data.config.begroting})\n`,
  );
  const bevindingen = controleer({
    data,
    wijkcodes: leesWijkcodes(),
    mappings: leesMappings(data.begroting.begrotingsjaar),
  });
  const toonInfo = process.argv.includes('--alles');
  console.log(alsTekst(toonInfo ? bevindingen : bevindingen.filter((b) => b.niveau !== 'info')));
  if (!toonInfo) console.log('Gebruik --alles om ook de meldingen (ℹ︎) te zien.');
  process.exit(heeftFouten(bevindingen) ? 1 : 0);
} catch (fout) {
  if (fout instanceof DataFout) {
    console.error(`✖ ${fout.message}`);
    process.exit(1);
  }
  throw fout;
}

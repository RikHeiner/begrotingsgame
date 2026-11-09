import { bereken } from '/home/user/begrotingsgame/src/engine/rekenen';
import { maakTegenbegroting } from '/home/user/begrotingsgame/src/game/tegenbegroting/document';
import { data, keuzes } from './keuzes_def1';
import { writeFileSync } from 'node:fs';
const m = (x: number) => (x / 1e6).toFixed(3);
for (const v of ['document', 'model', 'regels'] as const) {
  const r = bereken(data, keuzes(v));
  console.log('=== variant', v, 'correcties', r.correcties);
  for (const j of data.jaren) console.log(j, 'S', m(r.perJaar[j]!.structureel), 'I', m(r.perJaar[j]!.incidenteel), 'tot', m(r.perJaar[j]!.structureel + r.perJaar[j]!.incidenteel));
  const doc = maakTegenbegroting(data, r, { titel: 'x', naam: 'VVD', idee: '' } as never);
  const regels = [...doc.besparingen.flatMap((g) => g.regels), ...doc.investeringen.flatMap((g) => g.regels), ...doc.kettingeffecten];
  writeFileSync(new URL(`./regels_${v}.json`, import.meta.url), JSON.stringify(regels.map((x) => ({ id: x.id, naam: x.naam, soort: x.soort, ketting: x.kettingeffect, perJaar: x.perJaar.map((y) => +(y / 1e6).toFixed(4)) })), null, 1));
}

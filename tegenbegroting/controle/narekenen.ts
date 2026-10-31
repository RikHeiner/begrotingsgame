/**
 * Rekent de fractielijn (keuzes.ts) na met de rekenmotor van de game.
 * Gebruik: npx tsx tegenbegroting/controle/narekenen.ts
 */
import { bereken } from '../../src/engine/rekenen';
import { maakTegenbegroting } from '../../src/game/tegenbegroting/document';
import { data, keuzes } from './keuzes';

const r = bereken(data, keuzes);
const mln = (x: number) => (x / 1e6).toFixed(3);
for (const j of data.jaren)
  console.log(
    j,
    'S',
    mln(r.perJaar[j]?.structureel ?? 0),
    'I',
    mln(r.perJaar[j]?.incidenteel ?? 0),
  );
const doc = maakTegenbegroting(data, r, { titel: '', naam: 'VVD Groningen', idee: '' });
const regels = [
  ...doc.besparingen.flatMap((g) => g.regels),
  ...doc.investeringen.flatMap((g) => g.regels),
  ...doc.kettingeffecten,
];
for (const x of regels)
  console.log(
    [
      x.kettingeffect ? 'ketting' : '',
      x.id,
      x.naam,
      x.wijziging,
      x.soort,
      ...x.perJaar.map(mln),
    ].join(' | '),
  );

/**
 * npm run personas:overzicht
 * Schrijft docs/INWONERS-AFSTEMMEN.md: de inwoners en wat ze belangrijk vinden, zodat de fractie
 * ze kan nalopen voordat de game live gaat. Bron: data/spel/personas.json.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { naamVan, parkeerPostVan } from '../src/engine';
import { laadDataNode, leesJson } from './lees';

const data = laadDataNode();
const buurten = new Map(
  (
    leesJson('gemeente-groningen-buurten.geojson') as {
      features: { properties: { code: string; naam: string } }[];
    }
  ).features.map((f) => [f.properties.code, f.properties.naam]),
);
const gebied = new Map(data.gebieden.gebieden.map((g) => [g.id, g.naam]));
const meterNaam = new Map(data.meters.meters.map((m) => [m.id, `${m.icoon} ${m.naam}`]));
const sterkte = (w: number) =>
  w >= 0.9 ? 'heel belangrijk' : w >= 0.5 ? 'belangrijk' : 'een beetje';
const postNaam = (id: string) => naamVan(data, id) ?? id;
const isBelasting = (id: string) =>
  data.index.belastingen.has(id) || parkeerPostVan(data, id) !== undefined;
const isKaart = (id: string) => data.index.kaarten.has(id);

const r: string[] = [
  '# Inwoners in de game: ter afstemming met de fractie',
  '',
  `${data.personas.personas.length} inwoners lopen als poppetjes over de kaart. Hun tevredenheid telt mee in de score. Hieronder staat per inwoner waar hij of zij op let. Dit is een voorstel: graag per inwoner aangeven of het klopt of wat anders moet.`,
  '',
  'Zo werkt het (spelregel, geen voorspelling): de tevredenheid begint op 50. Hij gaat omhoog of omlaag met de meters die de inwoner belangrijk vindt, en met de posten die hij of zij merkt.',
  '',
  `_Gemaakt uit \`data/spel/personas.json\` met \`npm run personas:overzicht\`._`,
  '',
];
for (const p of data.personas.personas) {
  r.push(`## ${p.naam}${p.leeftijd ? `, ${p.leeftijd}` : ''}`, '');
  r.push(
    `- **Woont in:** ${buurten.get(p.buurt) ?? p.buurt} (gebied ${gebied.get(p.gebied) ?? p.gebied})`,
  );
  r.push(`- **Situatie:** ${p.situatie}`);
  r.push('- **Let op deze meters:**');
  for (const [m, w] of Object.entries(p.meters).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))) {
    r.push(`  - ${meterNaam.get(m as never) ?? m}: ${sterkte(w ?? 0)}`);
  }
  r.push('- **Merkt deze posten:**');
  for (const [id, w] of Object.entries(p.posten).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))) {
    const richting = isBelasting(id)
      ? w < 0
        ? 'blij als de belasting omlaag gaat'
        : 'blij als de belasting omhoog gaat'
      : isKaart(id)
        ? w < 0
          ? 'niet blij als deze kaart wordt gespeeld'
          : 'blij als deze kaart wordt gespeeld'
        : w < 0
          ? 'blij met minder geld hiervoor'
          : 'blij met meer geld hiervoor';
    r.push(`  - ${postNaam(id)}: ${richting} (${sterkte(Math.abs(w))})`);
  }
  r.push('', '- [ ] Klopt zo', '- [ ] Aanpassen: …', '');
}
const pad = resolve(import.meta.dirname, '../docs/INWONERS-AFSTEMMEN.md');
writeFileSync(pad, r.join('\n'));
console.log(`Geschreven: ${pad}`);

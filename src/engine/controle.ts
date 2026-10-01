/**
 * Controles op de data (npm run data:check, opdracht hoofdstuk 14). Pure functies: het script in
 * scripts/data-check.ts leest de bestanden en drukt de bevindingen af.
 */
import { bepaalVolgorde, IMPLEMENTATIES } from './dwarsverbanden';
import type { Data } from './laadData';
import { METER_IDS, type IdMapping } from './schema';

export type Niveau = 'fout' | 'waarschuwing' | 'info';
export type Bevinding = { niveau: Niveau; onderwerp: string; tekst: string };

export type ControleInvoer = {
  data: Data;
  /** wijkcodes uit gemeente-groningen-wijken.geojson */
  wijkcodes: string[];
  /** mappings waarin dit jaar het "naar"-jaar is (voor vervallen ids) */
  mappings?: IdMapping[];
};

const VASTE_VOORVOEGSELS = new Set([
  'groep:',
  'grootheid:',
  'set:',
  'regel:',
  'gebeurtenis:',
  'saldo:',
  'heffing:',
]);
const SALDO = new Set(['saldo:structureel', 'saldo:incidenteel', 'saldo:meerjarig']);
const HEFFING = new Set(['heffing:afval', 'heffing:riool']);

export function controleer({ data, wijkcodes, mappings = [] }: ControleInvoer): Bevinding[] {
  const uit: Bevinding[] = [];
  const fout = (onderwerp: string, tekst: string) => uit.push({ niveau: 'fout', onderwerp, tekst });
  const waarschuw = (onderwerp: string, tekst: string) =>
    uit.push({ niveau: 'waarschuwing', onderwerp, tekst });
  const info = (onderwerp: string, tekst: string) => uit.push({ niveau: 'info', onderwerp, tekst });

  const b = data.begroting;
  const jaar = String(b.begrotingsjaar);
  const vervallen = new Set(
    mappings.flatMap((m) => m.posten.filter((p) => p.vervallen).map((p) => p.oud)),
  );
  const postIds = new Set([
    ...b.onderdelen.map((o) => o.id),
    ...b.belastingen.map((x) => x.id),
    ...b.actiekaarten.map((k) => k.id),
  ]);
  const bestaat = (id: string) => postIds.has(id);
  const bestaatOfVervallen = (onderwerp: string, id: string, waar: string) => {
    if (bestaat(id)) return;
    if (vervallen.has(id))
      waarschuw(onderwerp, `${waar}: "${id}" is vervallen volgens de mapping.`);
    else fout(onderwerp, `${waar}: "${id}" bestaat niet in de begroting.`);
  };

  // ---- Ids ----
  const gezien = new Map<string, number>();
  for (const id of [
    ...b.onderdelen.map((o) => o.id),
    ...b.belastingen.map((x) => x.id),
    ...b.actiekaarten.map((k) => k.id),
  ]) {
    gezien.set(id, (gezien.get(id) ?? 0) + 1);
  }
  for (const [id, n] of gezien) if (n > 1) fout('ids', `Het id "${id}" komt ${n} keer voor.`);

  // ---- Jaren ----
  for (const j of data.jaren.map(String)) {
    for (const [veld, rij] of Object.entries({
      'totalen.lasten_excl_reserves_x1000': b.totalen.lasten_excl_reserves_x1000,
      'totalen.baten_excl_reserves_x1000': b.totalen.baten_excl_reserves_x1000,
    })) {
      if (rij[j] === undefined) fout('meerjarenraming', `${veld} heeft geen waarde voor ${j}.`);
    }
    for (const d of b.deelprogrammas) {
      if (d.lasten_x1000[j] === undefined || d.baten_x1000[j] === undefined) {
        fout('meerjarenraming', `Deelprogramma ${d.code} heeft geen lasten of baten voor ${j}.`);
      }
    }
  }

  // ---- Deelprogramma's en onderdelen ----
  const afwijkingen = new Set(
    (b.bekende_afwijkingen ?? [])
      .filter((a) => a.controle === 'onderdelen_binnen_deelprogramma')
      .map((a) => a.deelprogramma),
  );
  for (const d of b.deelprogrammas) {
    const onderdelen = b.onderdelen.filter((o) => o.deelprogramma === d.code);
    const lasten = onderdelen.reduce((s, o) => s + o.lasten_mln, 0);
    const baten = onderdelen.reduce((s, o) => s + o.gekoppelde_baten_mln, 0);
    const dpLasten = (d.lasten_x1000[jaar] ?? 0) / 1000;
    const dpBaten = (d.baten_x1000[jaar] ?? 0) / 1000;
    if (lasten > dpLasten + 1e-9) {
      const tekst = `De onderdelen van ${d.code} (${d.naam}) tellen op tot ${lasten.toFixed(3)} mln; het deelprogramma heeft ${dpLasten.toFixed(3)} mln lasten in ${jaar}.`;
      if (afwijkingen.has(d.code)) waarschuw('deelprogramma', `${tekst} (bekende afwijking)`);
      else fout('deelprogramma', tekst);
    }
    if (baten > dpBaten + 1e-9) {
      waarschuw(
        'deelprogramma',
        `De gekoppelde baten van ${d.code} tellen op tot ${baten.toFixed(3)} mln; het deelprogramma heeft ${dpBaten.toFixed(3)} mln baten.`,
      );
    }
  }
  const codes = new Set(b.deelprogrammas.map((d) => d.code));
  for (const o of b.onderdelen) {
    if (!codes.has(o.deelprogramma))
      fout('onderdelen', `${o.id}: deelprogramma ${o.deelprogramma} bestaat niet.`);
    if (!o.vergrendeld && (o.min_pct === null || o.max_pct === null)) {
      fout('onderdelen', `${o.id}: niet vergrendeld, maar min_pct of max_pct ontbreekt.`);
    }
    if (o.vergrendeld && !o.reden_vergrendeld) {
      waarschuw('onderdelen', `${o.id}: vergrendeld zonder reden voor de speler.`);
    }
    for (const kort of Object.keys(o.meters)) {
      if (!data.index.meterPerKort.has(kort)) fout('meters', `${o.id}: onbekende meter "${kort}".`);
    }
    if (o.voorstel)
      info('onderdelen', `${o.id}: spelontwerp is een voorstel, laat de fractie het controleren.`);
    if (o.controleren) waarschuw('onderdelen', `${o.id}: staat op "controleren".`);
  }
  for (const x of b.belastingen) {
    if (!codes.has(x.deelprogramma))
      fout('belastingen', `${x.id}: deelprogramma ${x.deelprogramma} bestaat niet.`);
  }
  for (const k of b.actiekaarten) {
    for (const kort of Object.keys(k.meter_effect_punten)) {
      if (!data.index.meterPerKort.has(kort)) fout('meters', `${k.id}: onbekende meter "${kort}".`);
    }
  }

  // ---- Totalen (tolerantie € 1.000; afronding van de deelprogramma's als waarschuwing) ----
  const afronding = 0.5 * b.deelprogrammas.length;
  for (const j of data.jaren.map(String)) {
    const somLasten = b.deelprogrammas.reduce((s, d) => s + (d.lasten_x1000[j] ?? 0), 0);
    const somBaten = b.deelprogrammas.reduce((s, d) => s + (d.baten_x1000[j] ?? 0), 0);
    const lasten =
      (b.totalen.lasten_excl_reserves_x1000[j] ?? 0) +
      (b.totalen.toevoegingen_reserves_x1000[j] ?? 0);
    const baten =
      (b.totalen.baten_excl_reserves_x1000[j] ?? 0) +
      (b.totalen.onttrekkingen_reserves_x1000[j] ?? 0);
    for (const [wat, som, totaal] of [
      ['lasten', somLasten, lasten],
      ['baten', somBaten, baten],
    ] as const) {
      const verschil = Math.abs(som - totaal);
      if (verschil <= 1) continue;
      const tekst = `${j}: de ${wat} van de deelprogramma's (${som}) wijken ${verschil} (x € 1.000) af van de totalen inclusief reservemutaties (${totaal}).`;
      if (verschil <= afronding) waarschuw('totalen', `${tekst} Dat past bij afronding.`);
      else fout('totalen', tekst);
    }
    const saldo = baten - lasten;
    const opgegeven = b.totalen.saldo_x1000[j];
    if (opgegeven !== undefined && Math.abs(saldo - opgegeven) > 1) {
      waarschuw(
        'totalen',
        `${j}: saldo volgens de totalen is ${saldo}, opgegeven is ${opgegeven} (x € 1.000).`,
      );
    }
    if (opgegeven !== undefined && opgegeven !== 0) {
      info(
        'totalen',
        `${j}: de begroting zelf heeft een saldo van ${opgegeven} (x € 1.000). De game rekent het saldo ten opzichte van de begroting.`,
      );
    }
  }

  // ---- Gebouwen ----
  const gebouwIds = new Set(data.gebouwen.map((g) => g.id));
  const wijken = new Set(wijkcodes);
  for (const o of b.onderdelen) {
    if (!gebouwIds.has(o.gebouw)) fout('gebouwen', `${o.id}: gebouw "${o.gebouw}" bestaat niet.`);
  }
  for (const g of data.gebouwen) {
    if (!wijken.has(g.wijk)) fout('gebouwen', `${g.id}: wijk ${g.wijk} staat niet in de kaart.`);
    for (const id of g.onderdelen) {
      const o = data.index.onderdelen.get(id);
      if (!o) bestaatOfVervallen('gebouwen', id, `gebouw ${g.id}`);
      else if (o.gebouw !== g.id) {
        fout('gebouwen', `${id} staat bij gebouw ${g.id}, maar de begroting zegt ${o.gebouw}.`);
      }
    }
  }
  for (const o of b.onderdelen) {
    if (!data.gebouwen.some((g) => g.onderdelen.includes(o.id))) {
      fout('gebouwen', `${o.id} (${o.naam}) hangt aan geen enkel gebouw in gebouwen.json.`);
    }
  }

  // ---- Persona's ----
  for (const p of data.personas.personas) {
    if (!wijken.has(p.wijk)) fout('personas', `${p.id}: wijk ${p.wijk} staat niet in de kaart.`);
    for (const id of Object.keys(p.posten)) bestaatOfVervallen('personas', id, `persona ${p.id}`);
  }

  // ---- Dwarsverbanden ----
  const voc = data.dwarsverbanden.vocabulaire;
  const verbandIds = new Set(data.dwarsverbanden.dwarsverbanden.map((v) => v.id));
  const controleerId = (verband: string, id: string) => {
    const waar = `${verband}`;
    if (bestaat(id)) return;
    if (id.startsWith('meter:')) {
      if (!(METER_IDS as readonly string[]).includes(id.slice(6)))
        fout('dwarsverbanden', `${waar}: onbekende meter "${id}".`);
    } else if (id.startsWith('baten:')) {
      bestaatOfVervallen('dwarsverbanden', id.slice(6), waar);
    } else if (id.startsWith('verband:')) {
      if (!verbandIds.has(id.slice(8)))
        fout('dwarsverbanden', `${waar}: verband "${id}" bestaat niet.`);
    } else if (id.startsWith('nieuw:')) {
      if (!(id in voc.nieuw))
        fout('dwarsverbanden', `${waar}: "${id}" staat niet in vocabulaire.nieuw.`);
    } else if (id.startsWith('saldo:')) {
      if (!SALDO.has(id)) fout('dwarsverbanden', `${waar}: onbekend saldo "${id}".`);
    } else if (id.startsWith('heffing:')) {
      if (!HEFFING.has(id)) fout('dwarsverbanden', `${waar}: onbekende heffing "${id}".`);
    } else if ([...VASTE_VOORVOEGSELS].some((v) => id.startsWith(v))) {
      // afgeleide naam: geldig
    } else {
      bestaatOfVervallen('dwarsverbanden', id, waar);
    }
  };
  for (const v of data.dwarsverbanden.dwarsverbanden) {
    for (const id of [...v.van, ...v.naar]) controleerId(v.id, id);
    for (const m of Object.keys(v.meters)) {
      if (!(METER_IDS as readonly string[]).includes(m))
        fout('dwarsverbanden', `${v.id}: onbekende meter "${m}".`);
    }
    if (!IMPLEMENTATIES[v.id]) {
      waarschuw(
        'dwarsverbanden',
        `${v.id}: staat in de JSON, maar heeft geen implementatie. Het doet niets in de game.`,
      );
    }
    for (const [naam, p] of Object.entries(v.parameters)) {
      if (p.waarde === null && p.status !== 'te onderzoeken') {
        waarschuw('parameters', `${v.id}.${naam}: geen waarde, maar status "${p.status}".`);
      }
      if (p.waarde === null)
        info(
          'parameters',
          `${v.id}.${naam}: nog te onderzoeken. Dit deel wordt "nog niet doorgerekend".`,
        );
      if (p.status === 'feit' && (p.laag !== undefined || p.hoog !== undefined)) {
        waarschuw('parameters', `${v.id}.${naam}: een feit heeft geen bandbreedte.`);
      }
    }
    for (const id of v.van.filter((x) => x.startsWith('nieuw:'))) {
      info('nieuwe posten', `${v.id} wacht (deels) op de nieuwe post ${id}.`);
    }
  }
  for (const id of Object.keys(IMPLEMENTATIES)) {
    if (!verbandIds.has(id))
      waarschuw('dwarsverbanden', `Implementatie ${id} heeft geen verband in de JSON.`);
  }
  const { kringen, zelfverwijzingen } = bepaalVolgorde(data.dwarsverbanden.dwarsverbanden);
  for (const k of kringen) {
    waarschuw(
      'kringen',
      `Kring in de dwarsverbanden: ${k.join(' → ')}. Deze wordt één keer doorgerekend.`,
    );
  }
  for (const id of zelfverwijzingen) {
    info(
      'kringen',
      `${id} verwijst naar zichzelf (een post staat in "van" én "naar"). Dat heeft geen invloed op de volgorde.`,
    );
  }

  // ---- Tegenbegrotingen ----
  for (const { bestand, tegenbegroting } of data.vergelijking) {
    for (const post of [...tegenbegroting.ombuigingen_en_opbrengsten, ...tegenbegroting.uitgaven]) {
      if (post.game_koppeling) bestaatOfVervallen('tegenbegroting', post.game_koppeling, bestand);
    }
  }

  return uit;
}

export function heeftFouten(bevindingen: Bevinding[]): boolean {
  return bevindingen.some((b) => b.niveau === 'fout');
}

export function alsTekst(bevindingen: Bevinding[]): string {
  const teken: Record<Niveau, string> = { fout: '✖', waarschuwing: '⚠︎', info: 'ℹ︎' };
  const regels = bevindingen.map((b) => `${teken[b.niveau]} [${b.onderwerp}] ${b.tekst}`);
  const tel = (n: Niveau) => bevindingen.filter((b) => b.niveau === n).length;
  regels.push(
    '',
    `${tel('fout')} fouten, ${tel('waarschuwing')} waarschuwingen, ${tel('info')} meldingen.`,
  );
  return regels.join('\n');
}

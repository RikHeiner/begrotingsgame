/**
 * Verschillen tussen twee begrotingsjaren (npm run data:diff 2026 2027). Levert een leesbaar
 * overzicht in Markdown: nieuwe, vervallen en gewijzigde posten, en de grootste stijgers en dalers.
 */
import type { Begroting, IdMapping } from './schema';

type Post = { id: string; naam: string; lasten: number; baten: number; soort: string };

const nl = (x: number, d = 3) =>
  x.toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
const metTeken = (x: number, d = 3) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${nl(Math.abs(x), d)}`;

function posten(b: Begroting): Map<string, Post> {
  const uit = new Map<string, Post>();
  for (const o of b.onderdelen) {
    uit.set(o.id, {
      id: o.id,
      naam: o.naam,
      lasten: o.lasten_mln,
      baten: o.gekoppelde_baten_mln,
      soort: 'onderdeel',
    });
  }
  for (const x of b.belastingen) {
    uit.set(x.id, {
      id: x.id,
      naam: x.naam,
      lasten: 0,
      baten: x.opbrengst_mln,
      soort: 'belasting',
    });
  }
  for (const k of b.actiekaarten) {
    uit.set(k.id, { id: k.id, naam: k.naam, lasten: 0, baten: k.bedrag_mln, soort: 'actiekaart' });
  }
  return uit;
}

export type Verschil = {
  nieuw: Post[];
  vervallen: Post[];
  hernoemd: { oud: Post; nieuw: Post }[];
  gewijzigd: { oud: Post; nieuw: Post; verschilLasten: number; verschilBaten: number }[];
};

export function vergelijk(oud: Begroting, nieuw: Begroting, mapping?: IdMapping): Verschil {
  const a = posten(oud);
  const b = posten(nieuw);
  const naarNieuw = new Map<string, string | null>();
  for (const p of mapping?.posten ?? []) naarNieuw.set(p.oud, p.vervallen ? null : p.nieuw);

  const gekoppeld = new Set<string>();
  const uit: Verschil = { nieuw: [], vervallen: [], hernoemd: [], gewijzigd: [] };
  for (const [id, post] of a) {
    const nieuwId = naarNieuw.has(id) ? naarNieuw.get(id) : id;
    const tegenhanger = nieuwId ? b.get(nieuwId) : undefined;
    if (!tegenhanger) {
      uit.vervallen.push(post);
      continue;
    }
    gekoppeld.add(tegenhanger.id);
    if (tegenhanger.naam !== post.naam) uit.hernoemd.push({ oud: post, nieuw: tegenhanger });
    const verschilLasten = tegenhanger.lasten - post.lasten;
    const verschilBaten = tegenhanger.baten - post.baten;
    if (Math.abs(verschilLasten) > 1e-9 || Math.abs(verschilBaten) > 1e-9) {
      uit.gewijzigd.push({ oud: post, nieuw: tegenhanger, verschilLasten, verschilBaten });
    }
  }
  for (const [id, post] of b) if (!gekoppeld.has(id)) uit.nieuw.push(post);
  return uit;
}

export function alsMarkdown(
  oud: Begroting,
  nieuw: Begroting,
  mapping?: IdMapping,
  top = 10,
): string {
  const v = vergelijk(oud, nieuw, mapping);
  const j0 = oud.begrotingsjaar;
  const j1 = nieuw.begrotingsjaar;
  const r: string[] = [`# Verschillen begroting ${j0} → ${j1}`, ''];
  r.push(`Bronnen: ${oud.document} en ${nieuw.document}. Bedragen in miljoenen euro's.`, '');

  r.push(
    '## Totalen',
    '',
    `| Raming voor ${j1} | Begroting ${j0} | Begroting ${j1} | Verschil |`,
    '|---|---:|---:|---:|',
  );
  for (const [label, veld] of [
    ['Lasten excl. reserves', 'lasten_excl_reserves_x1000'],
    ['Baten excl. reserves', 'baten_excl_reserves_x1000'],
  ] as const) {
    const x = (oud.totalen[veld][String(j1)] ?? NaN) / 1000;
    const y = (nieuw.totalen[veld][String(j1)] ?? NaN) / 1000;
    r.push(`| ${label} | ${nl(x, 1)} | ${nl(y, 1)} | ${metTeken(y - x, 1)} |`);
  }
  r.push('');

  r.push(`## Nieuwe posten (${v.nieuw.length})`, '');
  r.push(
    ...(v.nieuw.length
      ? v.nieuw.map(
          (p) =>
            `- \`${p.id}\` ${p.naam} (${p.soort}, lasten ${nl(p.lasten)}, baten ${nl(p.baten)})`,
        )
      : ['Geen.']),
    '',
  );
  r.push(`## Vervallen posten (${v.vervallen.length})`, '');
  r.push(
    ...(v.vervallen.length
      ? v.vervallen.map((p) => `- \`${p.id}\` ${p.naam} (${p.soort})`)
      : ['Geen.']),
    '',
  );
  r.push(`## Andere naam (${v.hernoemd.length})`, '');
  r.push(
    ...(v.hernoemd.length
      ? v.hernoemd.map((h) => `- \`${h.oud.id}\` ${h.oud.naam} → \`${h.nieuw.id}\` ${h.nieuw.naam}`)
      : ['Geen.']),
    '',
  );

  const tabel = (rijen: Verschil['gewijzigd']) => [
    '| Post | Naam | Lasten oud | Lasten nieuw | Verschil | % |',
    '|---|---|---:|---:|---:|---:|',
    ...rijen.map(
      (g) =>
        `| \`${g.nieuw.id}\` | ${g.nieuw.naam} | ${nl(g.oud.lasten)} | ${nl(g.nieuw.lasten)} | ${metTeken(g.verschilLasten)} | ${g.oud.lasten ? metTeken((g.verschilLasten / g.oud.lasten) * 100, 1) : '–'} |`,
    ),
  ];
  const lasten = v.gewijzigd.filter((g) => Math.abs(g.verschilLasten) > 1e-9);
  const stijgers = [...lasten]
    .filter((g) => g.verschilLasten > 0)
    .sort((a, b) => b.verschilLasten - a.verschilLasten)
    .slice(0, top);
  const dalers = [...lasten]
    .filter((g) => g.verschilLasten < 0)
    .sort((a, b) => a.verschilLasten - b.verschilLasten)
    .slice(0, top);
  r.push(
    `## Grootste stijgers (lasten)`,
    '',
    ...(stijgers.length ? tabel(stijgers) : ['Geen.']),
    '',
  );
  r.push(`## Grootste dalers (lasten)`, '', ...(dalers.length ? tabel(dalers) : ['Geen.']), '');

  const baten = v.gewijzigd.filter((g) => Math.abs(g.verschilBaten) > 1e-9);
  r.push(`## Gewijzigde baten, opbrengsten en kaartbedragen (${baten.length})`, '');
  r.push(
    ...(baten.length
      ? [
          '| Post | Naam | Oud | Nieuw | Verschil |',
          '|---|---|---:|---:|---:|',
          ...baten.map(
            (g) =>
              `| \`${g.nieuw.id}\` | ${g.nieuw.naam} | ${nl(g.oud.baten)} | ${nl(g.nieuw.baten)} | ${metTeken(g.verschilBaten)} |`,
          ),
        ]
      : ['Geen.']),
    '',
  );
  r.push(
    `## Alle gewijzigde lasten (${lasten.length})`,
    '',
    ...(lasten.length ? tabel(lasten) : ['Geen.']),
    '',
  );
  return r.join('\n');
}

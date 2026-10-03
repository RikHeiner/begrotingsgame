/**
 * Narekenen van een tegenbegroting met de schuiven en kaarten van de game (npm run vvd:check).
 * Per post: welk percentage of welke kaart in de game hoort bij het bedrag, of dat binnen de
 * grenzen valt, en wat de rekenmotor er dan van maakt (direct en met kettingeffecten).
 */
import { MLN } from './eenheden';
import type { Data } from './laadData';
import { bereken } from './rekenen';
import { grensBelasting, grensOnderdeel } from './regels';
import type { Tegenbegroting, TegenbegrotingPost } from './schema';
import { GEEN_KEUZES, type Keuzes } from './types';

export type VvdRegel = {
  omschrijving: string;
  tabel: 'ombuiging' | 'uitgave';
  soort: 'S' | 'I';
  bedrag: number;
  koppeling: string | null;
  type: 'onderdeel' | 'belasting' | 'kaart' | 'geen';
  /** percentage op de schuif dat bij het bedrag hoort */
  pct?: number;
  binnenGrenzen?: boolean;
  /** wat de game in het eerste jaar oplevert (+ = gunstig), alleen de directe effecten, mln */
  gameDirect?: number;
  /** idem, inclusief kettingeffecten */
  gameTotaal?: number;
  opmerking?: string;
};

function teken(post: TegenbegrotingPost, tabel: VvdRegel['tabel']): number {
  return tabel === 'ombuiging' ? post.bedrag_mln : -post.bedrag_mln;
}

/** Zet één post om naar keuzes in de game (of niets als dat niet kan). */
export function postAlsKeuzes(
  data: Data,
  post: TegenbegrotingPost,
  tabel: VvdRegel['tabel'],
): { keuzes?: Keuzes; regel: Omit<VvdRegel, 'gameDirect' | 'gameTotaal'> } {
  const bedrag = teken(post, tabel);
  const basis = {
    omschrijving: post.omschrijving,
    tabel,
    soort: post.S_of_I,
    bedrag,
    koppeling: post.game_koppeling,
    ...(post.opmerking ? { opmerking: post.opmerking } : {}),
  };
  const id = post.game_koppeling;
  if (!id) return { regel: { ...basis, type: 'geen' } };
  const o = data.index.onderdelen.get(id);
  if (o) {
    const netto = o.lasten_mln - o.gekoppelde_baten_mln;
    if (Math.abs(netto) < 1e-9) {
      return {
        regel: {
          ...basis,
          type: 'onderdeel',
          binnenGrenzen: false,
          opmerking: `${o.naam} heeft geen netto lasten; een bedrag is niet te vertalen naar een percentage.`,
        },
      };
    }
    const pct = (-bedrag / netto) * 100;
    const g = grensOnderdeel(o);
    return {
      keuzes: { ...GEEN_KEUZES, onderdelen: { [id]: pct } },
      regel: { ...basis, type: 'onderdeel', pct, binnenGrenzen: pct >= g.min && pct <= g.max },
    };
  }
  const b = data.index.belastingen.get(id);
  if (b) {
    const pct = (bedrag / b.opbrengst_mln) * 100;
    const g = grensBelasting(b);
    return {
      keuzes: { ...GEEN_KEUZES, belastingen: { [id]: pct } },
      regel: { ...basis, type: 'belasting', pct, binnenGrenzen: pct >= g.min && pct <= g.max },
    };
  }
  if (data.index.kaarten.has(id)) {
    return {
      keuzes: { ...GEEN_KEUZES, kaarten: [id] },
      regel: { ...basis, type: 'kaart', binnenGrenzen: true },
    };
  }
  return { regel: { ...basis, type: 'geen', opmerking: `Koppeling "${id}" bestaat niet.` } };
}

function eersteJaar(data: Data, keuzes: Keuzes): { direct: number; totaal: number } {
  const r = bereken(data, keuzes);
  const jaar = data.jaren[0] ?? 0;
  const som = (stap?: 'direct') =>
    r.effecten
      .filter((e) => e.jaar === jaar && (!stap || e.stap === stap))
      .reduce((s, e) => s + e.bedrag, 0) / MLN;
  return { direct: som('direct'), totaal: som() };
}

export function narekenen(data: Data, tb: Tegenbegroting): VvdRegel[] {
  const regels: VvdRegel[] = [];
  const posten = [
    ...tb.ombuigingen_en_opbrengsten.map((p) => [p, 'ombuiging'] as const),
    ...tb.uitgaven.map((p) => [p, 'uitgave'] as const),
  ];
  for (const [post, tabel] of posten) {
    const { keuzes, regel } = postAlsKeuzes(data, post, tabel);
    if (!keuzes) {
      regels.push(regel);
      continue;
    }
    const { direct, totaal } = eersteJaar(data, keuzes);
    regels.push({ ...regel, gameDirect: direct, gameTotaal: totaal });
  }
  return regels;
}

/** Alle gekoppelde posten tegelijk als keuzes (posten op dezelfde schuif worden opgeteld). */
export function alsGezamenlijkeKeuzes(data: Data, tb: Tegenbegroting): Keuzes {
  const k: Keuzes = { ...GEEN_KEUZES, onderdelen: {}, belastingen: {}, kaarten: [] };
  const posten = [
    ...tb.ombuigingen_en_opbrengsten.map((p) => [p, 'ombuiging'] as const),
    ...tb.uitgaven.map((p) => [p, 'uitgave'] as const),
  ];
  for (const [post, tabel] of posten) {
    const { keuzes } = postAlsKeuzes(data, post, tabel);
    if (!keuzes) continue;
    for (const [id, pct] of Object.entries(keuzes.onderdelen))
      k.onderdelen[id] = (k.onderdelen[id] ?? 0) + pct;
    for (const [id, pct] of Object.entries(keuzes.belastingen))
      k.belastingen[id] = (k.belastingen[id] ?? 0) + pct;
    for (const id of keuzes.kaarten) if (!k.kaarten.includes(id)) k.kaarten.push(id);
  }
  return k;
}

export function alsMarkdown(data: Data, tb: Tegenbegroting): string {
  const nl = (x: number | undefined, d = 3) =>
    x === undefined
      ? '–'
      : x.toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
  const regels = narekenen(data, tb);
  const r: string[] = [`# Narekenen: ${tb.titel}`, '', `Bron: ${tb.bron_url}`, ''];
  r.push(
    'Per post: het bedrag van de tegenbegroting (+ = levert op, − = kost geld), de koppeling in de game, het bijbehorende percentage, en wat de rekenmotor in het eerste jaar oplevert. "Direct" is zonder kettingeffecten; "Totaal" is inclusief kettingeffecten (aannames).',
    '',
    '| Post | S/I | Bedrag | Koppeling | % | Binnen grenzen | Direct | Totaal | Opmerking |',
    '|---|---|---:|---|---:|---|---:|---:|---|',
  );
  for (const x of regels) {
    const verschil =
      x.gameDirect !== undefined && Math.abs(x.gameDirect - x.bedrag) > 0.0005
        ? `Direct wijkt ${nl(x.gameDirect - x.bedrag)} af. `
        : '';
    r.push(
      `| ${x.omschrijving} | ${x.soort} | ${nl(x.bedrag)} | ${x.koppeling ?? 'geen'} | ${x.pct === undefined ? '–' : nl(x.pct, 1)} | ${x.binnenGrenzen === undefined ? '–' : x.binnenGrenzen ? 'ja' : '**nee**'} | ${nl(x.gameDirect)} | ${nl(x.gameTotaal)} | ${verschil}${(x.opmerking ?? '').replace(/\|/g, '/')} |`,
    );
  }
  const zonder = regels.filter((x) => x.type === 'geen');
  r.push('', `## Posten zonder schuif of kaart in de game (${zonder.length})`, '');
  for (const x of zonder) r.push(`- ${x.omschrijving} (${x.soort}, ${nl(x.bedrag)})`);
  const buiten = regels.filter((x) => x.binnenGrenzen === false);
  r.push('', `## Posten buiten de grenzen van de game (${buiten.length})`, '');
  for (const x of buiten)
    r.push(
      `- ${x.omschrijving}: ${x.pct === undefined ? '' : `${nl(x.pct, 1)}% op ${x.koppeling}`} ${x.opmerking ?? ''}`.trim(),
    );

  const k = alsGezamenlijkeKeuzes(data, tb);
  const res = bereken(data, k);
  r.push('', '## Alle gekoppelde posten samen in de game', '');
  r.push('Posten op dezelfde schuif zijn opgeteld; de grenzen van de game zijn toegepast.', '');
  r.push('| Jaar | Structureel | Eenmalig |', '|---|---:|---:|');
  for (const jaar of data.jaren) {
    const j = res.perJaar[jaar];
    r.push(`| ${jaar} | ${nl((j?.structureel ?? 0) / MLN)} | ${nl((j?.incidenteel ?? 0) / MLN)} |`);
  }
  if (res.correcties.length)
    r.push('', 'Aangepast aan de grenzen:', ...res.correcties.map((c) => `- ${c}`));
  return r.join('\n');
}

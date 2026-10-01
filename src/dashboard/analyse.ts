/**
 * Wat het dashboard uit de inzendingen haalt. Elke inzending wordt opnieuw doorgerekend met de
 * rekenmotor: de bedragen komen dus uit de begroting, niet uit wat een browser instuurt.
 * Alles hier is los van de schermen te testen.
 */
import { bereken, GEEN_KEUZES, type Data, type Keuzes } from '../engine';
import { themaVan } from '../game/score';
import type { Inzending } from '../inzending/types';

export type Berekend = {
  inzending: Inzending;
  saldoS: number;
  saldoI: number;
  sluitend: boolean;
  /** direct effect per post in het eerste jaar, in euro's (+ = gunstig voor de gemeente) */
  perBron: Map<string, number>;
};

/** Alleen de velden die de rekenmotor kent, met veilige standaardwaarden. */
export function schoneKeuzes(k: Partial<Keuzes> | null | undefined): Keuzes {
  const getallen = (x: unknown) =>
    Object.fromEntries(
      Object.entries(typeof x === 'object' && x !== null ? x : {}).filter(
        (e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]),
      ),
    );
  const scenario =
    k?.scenario === 'voorzichtig' || k?.scenario === 'optimistisch' ? k.scenario : 'midden';
  return {
    ...GEEN_KEUZES,
    onderdelen: getallen(k?.onderdelen),
    belastingen: getallen(k?.belastingen),
    kaarten: Array.isArray(k?.kaarten) ? k.kaarten.filter((x) => typeof x === 'string') : [],
    scenario,
    ...(k?.reserve ? { reserve: k.reserve } : {}),
  };
}

function rekenUit(data: Data, keuzes: Keuzes): Omit<Berekend, 'inzending'> {
  const r = bereken(data, keuzes);
  const eerste = data.jaren[0] ?? data.config.actiefJaar;
  const perBron = new Map<string, number>();
  for (const e of r.effecten) {
    if (e.stap !== 'direct' || e.jaar !== eerste) continue;
    perBron.set(e.bron, (perBron.get(e.bron) ?? 0) + e.bedrag);
  }
  return {
    saldoS: r.perJaar[eerste]?.structureel ?? 0,
    saldoI: r.perJaar[eerste]?.incidenteel ?? 0,
    sluitend: r.regels.sluitend,
    perBron,
  };
}

/** Rekent alle inzendingen door. Dezelfde keuzes worden maar één keer gerekend. */
export function rekenDoor(data: Data, inzendingen: Inzending[]): Berekend[] {
  const cache = new Map<string, Omit<Berekend, 'inzending'>>();
  return inzendingen.map((inzending) => {
    const keuzes = schoneKeuzes(inzending.keuzes);
    const sleutel = JSON.stringify(keuzes);
    let uit = cache.get(sleutel);
    if (!uit) {
      uit = rekenUit(data, keuzes);
      cache.set(sleutel, uit);
    }
    return { inzending, ...uit };
  });
}

/** Zelfde als rekenDoor, maar in stukjes, zodat de pagina blijft reageren. */
export async function rekenDoorInStukjes(
  data: Data,
  inzendingen: Inzending[],
  voortgang?: (klaar: number) => void,
  stuk = 200,
): Promise<Berekend[]> {
  const uit: Berekend[] = [];
  for (let i = 0; i < inzendingen.length; i += stuk) {
    uit.push(...rekenDoor(data, inzendingen.slice(i, i + stuk)));
    voortgang?.(uit.length);
    await new Promise((r) => setTimeout(r, 0));
  }
  return uit;
}

// ---------------------------------------------------------------------------------------------

export type Kerncijfers = {
  aantal: number;
  sluitend: number;
  gemiddeldSaldo: number;
  ideeen: number;
  teBeoordelen: number;
  verdacht: number;
};

export function kerncijfers(b: Berekend[]): Kerncijfers {
  const ideeen = b.filter((x) => x.inzending.idee_status !== 'geen');
  return {
    aantal: b.length,
    sluitend: b.filter((x) => x.sluitend).length,
    gemiddeldSaldo: b.length ? b.reduce((s, x) => s + x.saldoS, 0) / b.length : 0,
    ideeen: ideeen.length,
    teBeoordelen: ideeen.filter((x) => ['nieuw', 'verdacht'].includes(x.inzending.idee_status))
      .length,
    verdacht: ideeen.filter((x) => x.inzending.idee_status === 'verdacht').length,
  };
}

export type PostRij = {
  id: string;
  naam: string;
  thema: string;
  soort: 'onderdeel' | 'belasting' | 'kaart';
  /** hoe vaak deze post is gewijzigd (of de kaart gekozen) */
  gekozen: number;
  omlaag: number;
  omhoog: number;
  /** gemiddelde wijziging in procenten, bij wie hem wijzigde */
  gemiddeldPct?: number;
  /** gemiddeld bedrag in het eerste jaar, bij wie hem wijzigde (+ = levert op) */
  gemiddeldBedrag: number;
};

export function perPost(data: Data, b: Berekend[]): PostRij[] {
  const rijen: PostRij[] = [];
  const voeg = (
    id: string,
    naam: string,
    soort: PostRij['soort'],
    pct: (k: Keuzes) => number | undefined,
  ) => {
    const met = b
      .map((x) => ({ x, p: pct(schoneKeuzes(x.inzending.keuzes)) }))
      .filter((y) => y.p !== undefined && y.p !== 0);
    if (!met.length) return;
    rijen.push({
      id,
      naam,
      thema: themaVan(data, id),
      soort,
      gekozen: met.length,
      omlaag: met.filter((y) => (y.p ?? 0) < 0).length,
      omhoog: met.filter((y) => (y.p ?? 0) > 0).length,
      ...(soort !== 'kaart'
        ? { gemiddeldPct: met.reduce((s, y) => s + (y.p ?? 0), 0) / met.length }
        : {}),
      gemiddeldBedrag: met.reduce((s, y) => s + (y.x.perBron.get(id) ?? 0), 0) / met.length,
    });
  };
  for (const o of data.index.onderdelen.values())
    voeg(o.id, o.naam, 'onderdeel', (k) => k.onderdelen[o.id]);
  for (const t of data.index.belastingen.values())
    voeg(t.id, t.naam, 'belasting', (k) => k.belastingen[t.id]);
  for (const k of data.index.kaarten.values())
    voeg(k.id, k.naam, 'kaart', (x) => (x.kaarten.includes(k.id) ? 1 : undefined));
  return rijen.sort((a, z) => z.gekozen - a.gekozen || a.naam.localeCompare(z.naam, 'nl'));
}

export const ONBEKEND_GEBIED = 'onbekend';

export function perGebied(
  data: Data,
  inzendingen: Inzending[],
): { id: string; naam: string; aantal: number }[] {
  const tel = new Map<string, number>();
  for (const i of inzendingen) {
    const g =
      i.gebied && data.gebieden.gebieden.some((x) => x.id === i.gebied)
        ? i.gebied
        : ONBEKEND_GEBIED;
    tel.set(g, (tel.get(g) ?? 0) + 1);
  }
  return [
    ...data.gebieden.gebieden.map((g) => ({ id: g.id, naam: g.naam, aantal: tel.get(g.id) ?? 0 })),
    { id: ONBEKEND_GEBIED, naam: 'Niet ingevuld', aantal: tel.get(ONBEKEND_GEBIED) ?? 0 },
  ];
}

/** De keuzes van een inzending als korte labels, voor de combinaties. */
export function keuzeLabels(data: Data, k: Keuzes): string[] {
  const uit: string[] = [];
  for (const [id, p] of Object.entries(k.onderdelen)) {
    const o = data.index.onderdelen.get(id);
    if (o && p) uit.push(`${o.naam} ${p < 0 ? 'omlaag' : 'omhoog'}`);
  }
  for (const [id, p] of Object.entries(k.belastingen)) {
    const t = data.index.belastingen.get(id);
    if (t && p) uit.push(`${t.naam} ${p < 0 ? 'omlaag' : 'omhoog'}`);
  }
  for (const id of k.kaarten) {
    const kaart = data.index.kaarten.get(id);
    if (kaart) uit.push(kaart.naam);
  }
  return [...new Set(uit)].sort((a, b) => a.localeCompare(b, 'nl'));
}

/** De paren van keuzes die het vaakst samen voorkomen. */
export function combinaties(
  data: Data,
  inzendingen: Inzending[],
  max = 10,
): { a: string; b: string; aantal: number }[] {
  const tel = new Map<string, number>();
  for (const i of inzendingen) {
    const l = keuzeLabels(data, schoneKeuzes(i.keuzes));
    for (let x = 0; x < l.length; x++)
      for (let y = x + 1; y < l.length; y++) {
        const sleutel = `${l[x]}\u0000${l[y]}`;
        tel.set(sleutel, (tel.get(sleutel) ?? 0) + 1);
      }
  }
  return [...tel]
    .filter(([, n]) => n >= 2)
    .sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0], 'nl'))
    .slice(0, max)
    .map(([s, aantal]) => {
      const [a = '', b = ''] = s.split('\u0000');
      return { a, b, aantal };
    });
}

/** Ideeën zoeken: op woorden in het idee, hoofdletters maken niet uit. */
export function zoekIdeeen(inzendingen: Inzending[], zoek: string): Inzending[] {
  const woorden = zoek.toLowerCase().split(/\s+/).filter(Boolean);
  return inzendingen
    .filter((i) => {
      const idee = i.idee?.toLowerCase();
      return idee !== undefined && woorden.every((w) => idee.includes(w));
    })
    .sort((a, b) => b.aangemaakt.localeCompare(a.aangemaakt));
}

// ---------------------------------------------------------------------------------------------
// CSV, voor Excel in het Nederlands: puntkomma als scheidingsteken en een decimale komma.
// ---------------------------------------------------------------------------------------------

const getal = (x: number, decimalen: number) => x.toFixed(decimalen).replace('.', ',');

/** Vrije tekst van een speler; die kan in Excel een formule worden. */
class Tekst {
  constructor(public tekst: string) {}
}

function cel(x: string | number | Tekst): string {
  let s = x instanceof Tekst ? x.tekst : String(x);
  // Tegen formules in Excel: vrije tekst die begint met = + - @ krijgt een apostrof ervoor.
  if (x instanceof Tekst && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function maakCsv(data: Data, b: Berekend[]): string {
  const onderdelen = [...data.index.onderdelen.values()];
  const belastingen = [...data.index.belastingen.values()];
  const gebied = new Map(data.gebieden.gebieden.map((g) => [g.id, g.naam]));
  const kop = [
    'id',
    'datum',
    'begrotingsjaar',
    'gebied',
    'missie',
    'scenario',
    'saldo structureel (mln)',
    'saldo eenmalig (mln)',
    'sluitend',
    'idee',
    'status idee',
    ...onderdelen.map((o) => `${o.id} ${o.naam} (%)`),
    ...belastingen.map((t) => `${t.id} ${t.naam} (%)`),
    'reserve elk jaar (mln)',
    'reserve eenmalig (mln)',
    'kaarten',
  ];
  const rijen = b.map(({ inzending: i, saldoS, saldoI, sluitend }) => {
    const k = schoneKeuzes(i.keuzes);
    return [
      i.id,
      i.aangemaakt,
      i.begrotingsjaar,
      new Tekst(i.gebied ? (gebied.get(i.gebied) ?? i.gebied) : ''),
      new Tekst(i.missie ?? ''),
      k.scenario,
      getal(saldoS / 1e6, 3),
      getal(saldoI / 1e6, 3),
      sluitend ? 'ja' : 'nee',
      new Tekst(i.idee ?? ''),
      i.idee_status,
      ...onderdelen.map((o) => getal(k.onderdelen[o.id] ?? 0, 0)),
      ...belastingen.map((t) => getal(k.belastingen[t.id] ?? 0, 0)),
      getal((k.reserve?.structureel ?? 0) / 1e6, 3),
      getal((k.reserve?.eenmalig ?? 0) / 1e6, 3),
      k.kaarten.map((id) => data.index.kaarten.get(id)?.naam ?? id).join(' | '),
    ];
  });
  return '﻿' + [kop, ...rijen].map((r) => r.map(cel).join(';')).join('\r\n') + '\r\n';
}

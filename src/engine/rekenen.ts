/**
 * De rekenmotor: bereken() en magWijzigen(). Puur en deterministisch: dezelfde data en keuzes geven
 * altijd dezelfde uitkomst. Rekent intern in euro's; afronden gebeurt alleen bij de weergave.
 *
 * Volgorde per jaar (opdracht 6.2): directe effecten, grenzen, dwarsverbanden, meters en persona's,
 * regels, uitleg (elk bedrag is een lijst Effect-regels).
 */
import { rekenDwarsverbanden } from './dwarsverbanden';
import { EPSILON, vanDuizend, vanMln } from './eenheden';
import { formatMln, formatPct } from './format';
import type { Data } from './laadData';
import { basisMeters, eindMeters, kaartPunten, legeMeters, personaTevredenheid } from './meters';
import { ingroei, perJaar } from './meerjarig';
import {
  buitenGrens,
  controleerSluitend,
  grensBelasting,
  grensOnderdeel,
  normaliseer,
  stortingenInReserve,
  weerstandBasis,
  weerstandPerJaar,
} from './regels';
import type { Zekerheid } from './schema';
import type { Effect, JaarResultaat, Keuzes, Melding, Resultaat } from './types';

export const OVERIG = 'overig';

// ---------------------------------------------------------------------------------------------
// Stap 1 en 2: directe effecten (na het toepassen van de grenzen)
// ---------------------------------------------------------------------------------------------

function directeEffecten(data: Data, keuzes: Keuzes): Effect[] {
  const effecten: Effect[] = [];
  const jaren = data.jaren;
  const voegToe = (
    e: Omit<Effect, 'jaar' | 'stap' | 'zekerheid' | 'bedrag'>,
    bedragen: number[],
  ) => {
    bedragen.forEach((bedrag, j) => {
      if (Math.abs(bedrag) < 0.005) return;
      effecten.push({ ...e, bedrag, jaar: jaren[j] ?? 0, stap: 'direct', zekerheid: 'feit' });
    });
  };

  for (const o of data.begroting.onderdelen) {
    const pct = keuzes.onderdelen[o.id] ?? 0;
    // Vergrendelde posten en doorgeefluiken (afval, riool) veranderen het saldo niet.
    if (!pct || o.vergrendeld || o.doorgeefluik_heffing) continue;
    const p = pct / 100;
    const lasten = (j: number) => vanMln(o.lasten_per_jaar_mln?.[String(jaren[j])] ?? o.lasten_mln);
    const actie = p < 0 ? 'bezuinigt' : 'investeert';
    voegToe(
      {
        bron: o.id,
        doel: o.id,
        soort: 'S',
        kant: 'lasten',
        uitleg: `Je ${actie} ${formatPct(pct)} op ${o.naam}: de gemeente geeft ${p < 0 ? 'minder' : 'meer'} uit.`,
      },
      perJaar(jaren.length, (j) => -p * lasten(j) * ingroei(o.ingroeipad, j)),
    );
    if (o.gekoppelde_baten_mln > 0) {
      voegToe(
        {
          bron: o.id,
          doel: `baten:${o.id}`,
          soort: 'S',
          kant: 'baten',
          uitleg: `${o.naam} heeft inkomsten die meebewegen (rijksgeld, leges of kaartverkoop). Die ${p < 0 ? 'vallen deels weg' : 'groeien mee'}.`,
        },
        perJaar(jaren.length, (j) => p * vanMln(o.gekoppelde_baten_mln) * ingroei(o.ingroeipad, j)),
      );
    }
  }

  for (const b of data.begroting.belastingen) {
    const pct = keuzes.belastingen[b.id] ?? 0;
    if (!pct) continue;
    voegToe(
      {
        bron: b.id,
        doel: b.id,
        soort: 'S',
        kant: 'baten',
        uitleg: `${b.naam} ${formatPct(pct)}: de gemeente krijgt ${pct > 0 ? 'meer' : 'minder'} binnen.`,
      },
      perJaar(jaren.length, () => (pct / 100) * vanMln(b.opbrengst_mln)),
    );
  }

  if (keuzes.reserve) {
    const { structureel, eenmalig } = keuzes.reserve;
    const stort = (bedrag: number, soort: 'S' | 'I') =>
      voegToe(
        {
          bron: 'reserve',
          doel: 'grootheid:algemene_reserve',
          soort,
          kant: 'lasten',
          uitleg: `Je stort ${soort === 'S' ? 'elk jaar' : 'eenmalig'} ${formatMln(bedrag)} in de algemene reserve. Dat geld kun je niet ook uitgeven, maar de buffer wordt groter.`,
        },
        perJaar(jaren.length, (j) => (soort === 'S' || j === 0 ? -bedrag : 0)),
      );
    if (structureel > 0) stort(structureel, 'S');
    if (eenmalig > 0) stort(eenmalig, 'I');
  }

  const rente = renteVoorInvesteringen(data);
  for (const id of keuzes.kaarten) {
    const k = data.index.kaarten.get(id);
    if (!k) continue;
    const bedrag = vanMln(k.bedrag_mln);
    const kant = k.soort === 'opbrengst' ? 'baten' : 'lasten';
    if (k.investering && !k.investering.eenmalige_bijdrage) {
      const totaal = vanMln(k.investering.bedrag_mln);
      const levensduur = k.investering.levensduur_jaar;
      voegToe(
        {
          bron: id,
          doel: id,
          soort: 'S',
          kant: 'lasten',
          uitleg: `${k.naam} is een investering van ${formatMln(totaal)}. Je betaalt elk jaar afschrijving (${levensduur} jaar) en rente.`,
        },
        perJaar(jaren.length, (j) => {
          const boekwaarde = Math.max(0, totaal * (1 - j / levensduur));
          return -(totaal / levensduur + rente * boekwaarde);
        }),
      );
      continue;
    }
    const structureel = k.structureel_of_incidenteel === 'S';
    voegToe(
      {
        bron: id,
        doel: id,
        soort: k.structureel_of_incidenteel,
        kant,
        uitleg: `${k.naam}: ${structureel ? 'elk jaar' : 'eenmalig'} ${formatMln(Math.abs(bedrag))} ${k.soort === 'opbrengst' ? 'erbij' : 'eraf'}.`,
      },
      perJaar(jaren.length, (j) =>
        structureel ? bedrag * ingroei(k.ingroeipad, j) : j === 0 ? bedrag : 0,
      ),
    );
  }
  return effecten;
}

/**
 * Gebeurteniskaarten (campagnemodus): een percentage van een bedrag uit de begroting. Het bedrag is
 * een feit, het percentage een scenario. S geldt elk jaar van de horizon, I alleen in het eerste.
 * In de campagne begint de horizon in het jaar waarin de kaart is getrokken (zie campagne.ts).
 */
const procent = (fractie: number) =>
  `${(fractie * 100).toLocaleString('nl-NL', { maximumFractionDigits: 2 })}%`;

export function gebeurtenisEffecten(data: Data, keuzes: Keuzes): Effect[] {
  const effecten: Effect[] = [];
  const jaren = data.jaren;
  for (const id of keuzes.gebeurtenissen ?? []) {
    const g = data.index.gebeurtenissen.get(id);
    if (!g) continue;
    for (const e of g.effecten) {
      const kosten = e.richting === 'kosten';
      // Voorzichtig: de ongunstige kant van de band; optimistisch: de gunstige kant.
      const pct =
        keuzes.scenario === 'midden'
          ? e.pct.waarde
          : (keuzes.scenario === 'voorzichtig') === kosten
            ? e.pct.hoog
            : e.pct.laag;
      const teken = kosten ? -1 : 1;
      const posten: {
        doel: string;
        kant: 'lasten' | 'baten';
        naam: string;
        bedrag: (j: number) => number;
      }[] =
        e.basis.soort === 'lasten'
          ? e.basis.posten.flatMap((pid) => {
              const o = data.index.onderdelen.get(pid);
              return o
                ? [
                    {
                      doel: pid,
                      kant: kosten ? ('lasten' as const) : ('baten' as const),
                      naam: `de lasten van ${o.naam}`,
                      bedrag: (j: number) =>
                        vanMln(o.lasten_per_jaar_mln?.[String(jaren[j])] ?? o.lasten_mln),
                    },
                  ]
                : [];
            })
          : e.basis.soort === 'belasting'
            ? (() => {
                const b = data.index.belastingen.get(e.basis.id);
                return b
                  ? [
                      {
                        doel: b.id,
                        kant: 'baten' as const,
                        naam: `de opbrengst van de ${b.naam}`,
                        bedrag: () => vanMln(b.opbrengst_mln),
                      },
                    ]
                  : [];
              })()
            : [
                {
                  doel: 'grootheid:gemeentefonds',
                  kant: 'baten' as const,
                  naam: 'het gemeentefonds',
                  bedrag: () => vanDuizend(data.kengetallen.gemeentefonds_x1000),
                },
              ];
      for (const p of posten) {
        jaren.forEach((jaar, j) => {
          if (g.soort === 'I' && j > 0) return;
          const bedrag = teken * pct * p.bedrag(j);
          if (Math.abs(bedrag) < 0.005) return;
          effecten.push({
            bron: g.id,
            doel: p.doel,
            bedrag,
            jaar,
            soort: g.soort,
            zekerheid: 'aanname',
            stap: 'direct',
            kant: p.kant,
            uitleg: `${g.naam}: ${procent(pct)} van ${p.naam} ${kosten ? 'extra kosten' : 'extra inkomsten'}. Dit is een scenario, geen voorspelling.`,
          });
        });
      }
    }
  }
  return effecten;
}

function renteVoorInvesteringen(data: Data): number {
  const w = data.index.verbanden.get('fin_kapitaallasten')?.parameters.rente?.waarde;
  return typeof w === 'number' ? w : 0;
}

/** Saldo-effect per bron per jaar (+ = gunstig). */
function perBron(data: Data, effecten: Effect[]): Map<string, number[]> {
  const uit = new Map<string, number[]>();
  for (const e of effecten) {
    const rij = uit.get(e.bron) ?? perJaar(data.jaren.length, () => 0);
    const j = data.jaren.indexOf(e.jaar);
    if (j >= 0) rij[j] = (rij[j] ?? 0) + e.bedrag;
    uit.set(e.bron, rij);
  }
  return uit;
}

// ---------------------------------------------------------------------------------------------
// Deelprogramma's
// ---------------------------------------------------------------------------------------------

/** Het deelprogramma waar een effect landt, of OVERIG. */
export function deelprogrammaVan(data: Data, e: Effect): string {
  const id = e.doel.startsWith('baten:') ? e.doel.slice('baten:'.length) : e.doel;
  return (
    data.index.onderdelen.get(id)?.deelprogramma ??
    data.index.belastingen.get(id)?.deelprogramma ??
    OVERIG
  );
}

export function perJaarResultaat(
  data: Data,
  effecten: Effect[],
  weerstand: Record<number, number>,
): Record<number, JaarResultaat> {
  const uit: Record<number, JaarResultaat> = {};
  for (const jaar of data.jaren) {
    const sleutel = String(jaar);
    const perDeelprogramma: Record<string, { lasten: number; baten: number }> = {};
    for (const d of data.begroting.deelprogrammas) {
      perDeelprogramma[d.code] = {
        lasten: vanDuizend(d.lasten_x1000[sleutel] ?? 0),
        baten: vanDuizend(d.baten_x1000[sleutel] ?? 0),
      };
    }
    perDeelprogramma[OVERIG] = { lasten: 0, baten: 0 };
    let structureel = 0;
    let incidenteel = 0;
    for (const e of effecten) {
      if (e.jaar !== jaar) continue;
      if (e.soort === 'S') structureel += e.bedrag;
      else incidenteel += e.bedrag;
      const dp = perDeelprogramma[deelprogrammaVan(data, e)] ?? perDeelprogramma[OVERIG];
      if (!dp) continue;
      if (e.kant === 'lasten') dp.lasten -= e.bedrag;
      else dp.baten += e.bedrag;
    }
    const totaal = Object.values(perDeelprogramma);
    uit[jaar] = {
      structureel,
      incidenteel,
      lasten: totaal.reduce((s, d) => s + d.lasten, 0),
      baten: totaal.reduce((s, d) => s + d.baten, 0),
      perDeelprogramma,
      weerstandsvermogen: weerstand[jaar] ?? weerstandBasis(data).ratio,
    };
  }
  return uit;
}

// ---------------------------------------------------------------------------------------------
// bereken()
// ---------------------------------------------------------------------------------------------

const ZEKERHEID_ORDE: Record<Zekerheid, number> = { feit: 0, aanname: 1, 'te onderzoeken': 2 };

export function bereken(data: Data, invoer: Keuzes): Resultaat {
  const { keuzes, correcties } = normaliseer(data, invoer);

  // 1-2. Directe effecten, na grenzen
  const direct = directeEffecten(data, keuzes);

  // 3. Dwarsverbanden
  const basis = basisMeters(data, keuzes);
  const verbanden = rekenDwarsverbanden(
    { data, keuzes, direct: perBron(data, direct), basisMeters: basis },
    legeMeters(0),
  );
  const effecten = [...direct, ...gebeurtenisEffecten(data, keuzes), ...verbanden.effecten];

  // 4. Meters en persona's
  const meters = eindMeters(basis, kaartPunten(data, keuzes), verbanden.meters);
  const personas = personaTevredenheid(data, keuzes, meters);

  // 5. Regels
  const saldo: Record<number, { structureel: number; incidenteel: number }> = {};
  for (const jaar of data.jaren) saldo[jaar] = { structureel: 0, incidenteel: 0 };
  for (const e of effecten) {
    const s = saldo[e.jaar];
    if (!s) continue;
    if (e.soort === 'S') s.structureel += e.bedrag;
    else s.incidenteel += e.bedrag;
  }
  const stortingen = stortingenInReserve(data, keuzes);
  const weerstand = weerstandPerJaar(data, data.jaren, saldo, stortingen);
  const regels = controleerSluitend(data.jaren, saldo);
  const { ondergrens } = weerstandBasis(data);
  for (const jaar of data.jaren) {
    const ratio = weerstand[jaar] ?? 0;
    if (ratio < ondergrens) {
      regels.overtredingen.push(
        `${jaar}: het weerstandsvermogen zakt onder ${Math.round(ondergrens * 100)}% (${Math.round(ratio * 100)}%).`,
      );
    }
  }

  // 6. Meldingen bij actieve verbanden
  const meldingen: Melding[] = [];
  for (const [id, uitkomst] of Object.entries(verbanden.uitkomsten)) {
    if (uitkomst.status === 'niet actief' || uitkomst.status === 'wacht op nieuwe post') continue;
    const tekst = data.index.verbanden.get(id)?.melding ?? '';
    if (!tekst) continue;
    const eigen = verbanden.effecten.filter((e) => e.verband === id).map((e) => e.zekerheid);
    const zekerheid = eigen.reduce<Zekerheid>(
      (a, b) => (ZEKERHEID_ORDE[b] > ZEKERHEID_ORDE[a] ? b : a),
      'aanname',
    );
    meldingen.push({ verband: id, tekst, zekerheid, status: uitkomst.status });
  }

  const laatste = data.jaren[data.jaren.length - 1] ?? data.config.actiefJaar;
  return {
    perJaar: perJaarResultaat(data, effecten, weerstand),
    meters,
    personas,
    effecten,
    meldingen,
    regels,
    weerstandsvermogen: weerstand[laatste] ?? weerstandBasis(data).ratio,
    verbanden: verbanden.uitkomsten,
    grootheden: verbanden.grootheden,
    keuzes,
    correcties,
  };
}

// ---------------------------------------------------------------------------------------------
// magWijzigen(): het slot op de pot
// ---------------------------------------------------------------------------------------------

export type Toestemming = { ok: boolean; reden?: string };

/**
 * Een wijziging mag als het structurele saldo daarna in elk jaar ≥ 0 is, of als de wijziging het
 * saldo niet verslechtert. Hetzelfde geldt voor het totaal van structureel en eenmalig: eenmalige
 * uitgaven mogen met structureel en eenmalig geld samen worden gedekt.
 */
export function magWijzigen(
  data: Data,
  huidig: Keuzes,
  nieuw: Keuzes,
  /** in de campagne: het resultaat over alle rondes */
  reken: (k: Keuzes) => Resultaat = (k) => bereken(data, k),
): Toestemming {
  for (const [id, pct] of Object.entries(nieuw.onderdelen)) {
    if ((huidig.onderdelen[id] ?? 0) === pct) continue;
    const o = data.index.onderdelen.get(id);
    if (!o) return { ok: false, reden: `De post "${id}" bestaat niet.` };
    const reden = buitenGrens(o.naam, pct, grensOnderdeel(o), o.wettelijke_taak);
    if (reden) return { ok: false, reden };
  }
  for (const [id, pct] of Object.entries(nieuw.belastingen)) {
    if ((huidig.belastingen[id] ?? 0) === pct) continue;
    const b = data.index.belastingen.get(id);
    if (!b) return { ok: false, reden: `De belasting "${id}" bestaat niet.` };
    const reden = buitenGrens(b.naam, pct, grensBelasting(b), false);
    if (reden) return { ok: false, reden };
  }
  for (const id of nieuw.kaarten) {
    if (!data.index.kaarten.has(id))
      return { ok: false, reden: `De actiekaart "${id}" bestaat niet.` };
  }

  const voor = reken(huidig);
  const na = reken(nieuw);
  let tekortStructureel = 0;
  let tekortTotaal = 0;
  let jaarStructureel: number | undefined;
  let jaarTotaal: number | undefined;
  for (const jaar of data.jaren) {
    const a = voor.perJaar[jaar];
    const b = na.perJaar[jaar];
    if (!a || !b) continue;
    if (b.structureel < -EPSILON && b.structureel < a.structureel - EPSILON) {
      if (-b.structureel > tekortStructureel) {
        tekortStructureel = -b.structureel;
        jaarStructureel = jaar;
      }
    }
    const totaalA = a.structureel + a.incidenteel;
    const totaalB = b.structureel + b.incidenteel;
    if (totaalB < -EPSILON && totaalB < totaalA - EPSILON) {
      if (-totaalB > tekortTotaal) {
        tekortTotaal = -totaalB;
        jaarTotaal = jaar;
      }
    }
  }
  const inJaar = (jaar: number | undefined) =>
    jaar !== undefined && jaar !== data.jaren[0] ? ` (in ${jaar})` : '';
  if (tekortStructureel > 0) {
    return {
      ok: false,
      reden: `Hiervoor heb je nog ${formatMln(tekortStructureel)} structurele dekking nodig${inJaar(jaarStructureel)}.`,
    };
  }
  if (tekortTotaal > 0) {
    return {
      ok: false,
      reden: `Hiervoor heb je nog ${formatMln(tekortTotaal)} dekking nodig${inJaar(jaarTotaal)}.`,
    };
  }
  return { ok: true };
}

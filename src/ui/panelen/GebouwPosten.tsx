/**
 * De posten van één gebouw: schuiven voor de onderdelen, het belastingloket of de actiekaarten van
 * het veilinghuis. Gebruikt in het gebouwpaneel én in de lijstweergave.
 */
import {
  formatMln,
  formatPct,
  grensBelasting,
  grensOnderdeel,
  verkoopPerJaarMln,
  type Data,
  type Resultaat,
} from '../../engine';
import { PARKEER_PREFIX, parkeerPosten, type ParkeerPost } from '../../engine/parkeren';
import type { Actiekaart, Gebouw, Minimum, Programma } from '../../engine/schema';
import { isGestopt, stilDoorMinimum } from '../../game/beleidshuis';
import { gevolgVan } from '../../game/gevolg';
import { huidigJaar, useSpel } from '../../game/state/store';
import { Apparaat } from './Apparaat';
import { EigenVoorstellen } from './EigenVoorstellen';
import { Schuif } from './Schuif';

function directBedrag(r: Resultaat, bron: string, jaar: number): number {
  return r.effecten
    .filter((e) => e.jaar === jaar && e.stap === 'direct' && e.bron === bron)
    .reduce((s, e) => s + e.bedrag, 0);
}

/**
 * "Dit heeft ook effect op…": de kettingeffecten die bij deze post horen, met het bedrag in het
 * laatste jaar en ⚠︎ bij aannames. Verbanden die nog niet zijn doorgerekend staan erbij met de reden.
 */
function OokEffect({ data, resultaat, id }: { data: Data; resultaat: Resultaat; id: string }) {
  const laatste = data.jaren.at(-1);
  const regels = data.dwarsverbanden.dwarsverbanden
    .filter((v) => v.van.includes(id))
    .map((v) => ({ v, u: resultaat.verbanden[v.id] }))
    .filter(({ u }) => u && u.status !== 'niet actief' && u.status !== 'wacht op nieuwe post');
  if (!regels.length) return null;
  return (
    <div className="ook-effect">
      <p className="ook-kop">Dit heeft ook effect op…</p>
      <ul>
        {regels.map(({ v, u }) => {
          const effecten = resultaat.effecten.filter(
            (e) => e.verband === v.id && e.jaar === laatste,
          );
          const som = effecten.reduce((x, e) => x + e.bedrag, 0);
          const aanname =
            effecten.some((e) => e.zekerheid !== 'feit') || u?.status !== 'doorgerekend';
          return (
            <li key={v.id}>
              <span>
                {aanname && (
                  <abbr title="Aanname of spelregel, geen getal uit de begroting">⚠︎ </abbr>
                )}
                {v.naam}
              </span>
              {u?.status === 'doorgerekend' && Math.abs(som) >= 5_000 ? (
                <span className={som > 0 ? 'positief' : 'negatief'}>
                  {formatMln(som, { decimalen: 2, teken: true })} in {laatste}
                </span>
              ) : u?.status === 'nog niet doorgerekend' ? (
                <span className="klein">nog niet doorgerekend</span>
              ) : (
                <span className="klein">zit al in het bedrag</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const SOORT_MINIMUM: Record<Minimum['soort'], string> = {
  wet: 'Wettelijke taak',
  gr: 'Samen met andere gemeenten',
  vast: 'Vaste lasten',
  nodig: 'Nodig voor andere taken',
};

function Bedrag({ euro }: { euro: number }) {
  if (Math.abs(euro) < 50_000) return null;
  return (
    <span className={`bedrag ${euro > 0 ? 'positief' : 'negatief'}`}>
      {formatMln(euro, { teken: true })} per jaar
    </span>
  );
}

/**
 * Wat merk je ervan, ten opzichte van nu? Bijvoorbeeld "🛡️ Onveiliger dan nu", en bij de boa's
 * het aantal nu en met jouw keuze.
 */
function GevolgRegel({ data, id, pct }: { data: Data; id: string; pct: number }) {
  const g = gevolgVan(data, id, pct);
  if (!g) return null;
  return (
    <p className={`gevolg gevolg-${g.richting}`} data-testid={`gevolg-${id}`}>
      <span aria-hidden="true">{g.icoon}</span>{' '}
      <strong>
        <abbr title="Nu: de begroting van de gemeente als er niets verandert">{g.tekst}</abbr>
      </strong>
      {g.eenheid && (
        <>
          {' · '}
          Nu {g.eenheid.aanname ? 'ongeveer ' : ''}
          {g.eenheid.nu} {g.eenheid.naam}
          {g.eenheid.aanname && <abbr title={g.eenheid.uitleg}> ⚠︎</abbr>}, met jouw keuze{' '}
          {g.eenheid.aanname ? 'ongeveer ' : ''}
          <strong>
            {g.eenheid.straks} {g.eenheid.naam}
          </strong>
          .
        </>
      )}
    </p>
  );
}

/**
 * Wat een verkoop oplevert: de opbrengst, de boekwinst (eenmalig vrij geld) en wat het elk jaar
 * scheelt of kost (minder rente min de inkomsten die wegvallen).
 */
function VerkoopBedragen({ data, kaart }: { data: Data; kaart: Actiekaart }) {
  const v = kaart.verkoop;
  if (!v) return null;
  const jaarlijks = verkoopPerJaarMln(data, v);
  const mln = (x: number, teken = false) => formatMln(x * 1e6, { decimalen: 2, teken });
  return (
    <span className="verkoop-bedragen">
      <span>
        Verkoop: ongeveer {mln(v.opbrengst_mln)} (boekwaarde {mln(v.boekwaarde_mln)})
      </span>
      <span className={kaart.bedrag_mln > 0 ? 'positief' : undefined}>
        Eenmalig vrij geld (boekwinst): {mln(kaart.bedrag_mln, kaart.bedrag_mln > 0)}
      </span>
      <span
        className={jaarlijks > 0.005 ? 'positief' : jaarlijks < -0.005 ? 'negatief' : undefined}
      >
        Elk jaar daarna: {mln(jaarlijks, true)}
        {v.derving_mln
          ? ` (minder rente, maar ${mln(v.derving_mln)} minder inkomsten)`
          : ' (minder rente)'}
      </span>
    </span>
  );
}

/** "Wat is dit?": wat de post is en doet (spel/gevolgen.json). */
function PostInfo({ data, id }: { data: Data; id: string }) {
  const info = data.gevolgen.posten[id]?.info;
  if (!info) return null;
  return (
    <details className="post-info" data-testid={`info-${id}`}>
      <summary>
        <span aria-hidden="true">ⓘ</span> Wat is dit?
      </summary>
      <p>{info}</p>
    </details>
  );
}

/** Bij nul: bedragen in plaats van percentages (die zijn ten opzichte van het college). */
const mlnTekst = (x: number) => formatMln(x * 1e6, { decimalen: 2 });

/** Een belastingopbrengst (in miljoenen) per inwoner, als de inwoners bekend zijn. Het bedrag in
 * miljoenen staat al in het vak "Opbrengst" onder de schuif. */
function perInwonerTekst(data: Data, mln: number): string {
  const inwoners = data.belastingenNederland?.inwoners;
  if (!inwoners) return mlnTekst(mln);
  const pp = Math.round((mln * 1e6) / inwoners);
  return `€ ${pp.toLocaleString('nl-NL')} per inwoner`;
}

/**
 * Bij nul, bij een belasting: wat gemeenten gemiddeld per inwoner vragen (een eerder jaar, CBS),
 * met een knop om de belasting op dat gemiddelde te zetten.
 */
function GemiddeldeNederland({
  data,
  id,
  opbrengstMln,
  max,
  onZet,
  metNu,
}: {
  data: Data;
  id: string;
  opbrengstMln: number;
  max: number;
  onZet?: (pct: number) => void;
  /** ook tonen wat de gemeente Groningen nu per inwoner ophaalt (met deze opbrengst) */
  metNu?: boolean;
}) {
  const nl = data.belastingenNederland;
  const g = nl?.belastingen[id];
  if (!nl || !g) return null;
  const doelMln = (g.nederland * nl.inwoners) / 1e6;
  const pct = Math.min(max, Math.round((doelMln / opbrengstMln - 1) * 10000) / 100);
  return (
    <div className="gemiddelde-nl" data-testid={`gemiddelde-${id}`}>
      <p>
        <strong>Gemiddeld in Nederland: € {g.nederland.toLocaleString('nl-NL')} per inwoner</strong>{' '}
        <span className="uitgaven-jaar">{nl.jaar}</span>
        {g.grootteklasse !== undefined && (
          <>
            <br />
            In {nl.grootteklasse}: € {g.grootteklasse.toLocaleString('nl-NL')} per inwoner.
          </>
        )}
        {metNu && (
          <>
            <br />
            Gemeente Groningen in {data.begroting.begrotingsjaar}: €{' '}
            {Math.round((opbrengstMln * 1e6) / nl.inwoners).toLocaleString('nl-NL')} per inwoner.
          </>
        )}
      </p>
      <p className="klein">
        Uit de begrotingen {nl.jaar} van alle gemeenten, niet uit de begroting{' '}
        {data.begroting.begrotingsjaar} van deze game.{g.let_op ? ` ${g.let_op}` : ''} Wat het
        college kiest, zie je aan het eind.
      </p>
      {onZet && (
        <button type="button" className="knop" onClick={() => onZet(pct)}>
          Zet op het gemiddelde van Nederland ({formatMln(doelMln * 1e6)})
        </button>
      )}
    </div>
  );
}

const euro = (x: number) =>
  `€ ${x.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PARKEER_GROEPEN: { titel: string; filter: (p: ParkeerPost) => boolean }[] = [
  { titel: 'Bewonersvergunningen', filter: (p) => p.vergunning?.startsWith('bewoners') === true },
  {
    titel: 'Andere vergunningen',
    filter: (p) => p.groep === 'vergunning' && !p.vergunning?.startsWith('bewoners'),
  },
  { titel: 'Kortparkeren en garages', filter: (p) => p.groep !== 'vergunning' },
];

/**
 * De parkeertarieven per vergunning en tariefgebied (zie engine/parkeren.ts). Bij elk tarief staat
 * het jaar; ⚠︎ betekent dat iets niet zeker is (oud jaartal, aanname of afgeleid bedrag).
 */
function ParkeerSchuiven({
  gebouw,
  data,
  resultaat,
  jaar,
}: {
  gebouw: Gebouw;
  data: Data;
  resultaat: Resultaat;
  jaar: number;
}) {
  const zet = useSpel((s) => s.zetParkeerpost);
  const nul = useSpel((s) => s.beginpunt === 'nul');
  const posten = parkeerPosten(data);
  const keuzes = resultaat.keuzes.parkeren ?? {};
  const id = data.parkeren?.opbrengst.belasting ?? '';
  // Kortparkeren: het uurtarief op straat per zone (de opbrengst schuift mee met het tarief).
  const zones = (data.parkeren?.parkeerzones ?? []).flatMap((z) =>
    z.uurtarief ? [{ naam: z.naam, ...z.uurtarief }] : [],
  );
  const uurBinnenstad = zones[0];
  const uurNu = zones
    .map((z) => `${z.naam.replace(/ \(.*\)$/, '')}: ${euro(z.bedrag)} (${z.prijspeil})`)
    .join(', ');
  return (
    <section className="parkeren" aria-labelledby={`${gebouw.id}-parkeren`} data-post="parkeren">
      <h3 id={`${gebouw.id}-parkeren`}>Parkeertarieven</h3>
      <p className="klein">
        {nul
          ? 'Bij nul vraagt de gemeente niets voor parkeren. Je kiest per vergunning en per zone het tarief.'
          : `Samen ${formatMln(posten.reduce((s, p) => s + p.basis, 0))} per jaar. Je kiest per vergunning en per zone of het tarief omhoog of omlaag gaat.`}
      </p>
      {nul && <GemiddeldeNederland data={data} id={id} opbrengstMln={1} max={0} />}
      {PARKEER_GROEPEN.map((groep) => {
        const lijst = posten.filter(groep.filter);
        if (!lijst.length) return null;
        return (
          <div key={groep.titel}>
            <h4>{groep.titel}</h4>
            <ul className="posten">
              {lijst.map((p) => {
                const pct = keuzes[p.id] ?? 0;
                const waarschuwing = p.zekerheid !== 'feit' ? '⚠︎ ' : '';
                const label = nul
                  ? `${waarschuwing}${p.naam}${p.aantal !== undefined ? ` (${p.aantal.toLocaleString('nl-NL')} vergunningen)` : ''}`
                  : p.tarief !== undefined && p.aantal !== undefined
                    ? `${waarschuwing}${p.naam} (${euro(p.tarief)} per jaar · ${p.aantal.toLocaleString('nl-NL')} vergunningen)`
                    : `${waarschuwing}${p.naam} (${formatMln(p.basis)})`;
                const nieuw =
                  p.tarief !== undefined && pct
                    ? `Nieuw tarief: ${euro(p.tarief * (1 + pct / 100))} per jaar.`
                    : null;
                // Het tarief van nu, ook bij nul: zo weet de speler wat een vergunning nu kost.
                const uur = p.groep === 'kortparkeren' ? uurBinnenstad : undefined;
                const nu =
                  p.tarief !== undefined
                    ? `Nu: ${euro(p.tarief)} per jaar.`
                    : uur
                      ? `Nu per uur op straat: ${uurNu}.`
                      : null;
                return (
                  <li key={p.id} data-post={`parkeren:${p.id}`}>
                    <Schuif
                      id={`${gebouw.id}-parkeren-${p.id.replace(':', '-')}`}
                      label={label}
                      min={p.min}
                      max={p.max}
                      waarde={pct}
                      bedrag={
                        p.tarief !== undefined
                          ? { basis: p.tarief, eenheid: 'euro', soort: 'Tarief' }
                          : uur
                            ? {
                                basis: uur.bedrag,
                                eenheid: 'euro',
                                soort: 'Uurtarief binnenstad',
                                per: 'per uur',
                              }
                            : { basis: p.basis / 1e6, eenheid: 'mln', soort: 'Opbrengst' }
                      }
                      beschrijving={[p.uitleg, nu, nul ? null : nieuw].filter(Boolean).join(' ')}
                      collegeKnop={!nul}
                      {...(nul
                        ? {
                            toonBedrag: (x: number) =>
                              p.tarief !== undefined
                                ? `${euro(x)} per jaar`
                                : uur
                                  ? `${euro(x)} per uur`
                                  : mlnTekst(x),
                          }
                        : {})}
                      onChange={(v) => zet(p.id, v)}
                    />
                    {!nul && (
                      <Bedrag euro={directBedrag(resultaat, `${PARKEER_PREFIX}${p.id}`, jaar)} />
                    )}
                    {p.opmerkingen.length > 0 && (
                      <details className="parkeer-waarom">
                        <summary>Waarom ⚠︎ of welk jaar?</summary>
                        <ul>
                          {p.opmerkingen.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <OokEffect data={data} resultaat={resultaat} id={id} />
    </section>
  );
}

/**
 * De programma's van het Beleidshuis, per post. Stopzetten haalt het bedrag van de post af,
 * aanzetten zet het er weer bij (zie game/beleidshuis.ts).
 */
function Programmas({ data, resultaat }: { data: Data; resultaat: Resultaat }) {
  const wissel = useSpel((s) => s.wisselProgramma);
  const basis = useSpel((s) => s.basis);
  const jaar = huidigJaar(data);
  const perPost = new Map<string, Programma[]>();
  for (const p of data.index.programmas.values())
    perPost.set(p.post, [...(perPost.get(p.post) ?? []), p]);
  return (
    <section aria-labelledby="programmas-kop">
      <h3 id="programmas-kop">Programma's van de gemeente</h3>
      <p className="klein beleid-legenda">
        Dit doet de gemeente nu al. <strong>✅ Loopt</strong>: het gebeurt en het kost geld.{' '}
        <strong>⏸ Gestopt</strong> of <strong>staat stil</strong>: het gebeurt niet. Tik op een
        kaart om te wisselen. Bij elke kaart staat waarom hij zo staat.
      </p>
      {[...perPost].map(([post, lijst]) => {
        const o = data.index.onderdelen.get(post);
        return (
          <div key={post}>
            <h4>{o?.naam ?? post}</h4>
            <ul className="posten kaarten">
              {lijst.map((p) => {
                const minimum = stilDoorMinimum(data, resultaat.keuzes, p);
                const loopt = !isGestopt(resultaat.keuzes, p.id) && !minimum;
                const eenmalig = p.structureel_of_incidenteel === 'I';
                const bedrag = `${formatMln(p.bedrag_mln * 1e6, { decimalen: 2 })}${eenmalig ? ` in ${jaar}` : ' per jaar'}`;
                // Zo stond het aan het begin; anders heeft de speler het zelf veranderd.
                const standaardLoopt = !isGestopt(basis, p.id);
                const zelf = loopt !== standaardLoopt;
                const waarom = minimum
                  ? 'Staat stil: de schuif van deze post staat op zijn minimum. Zet die schuif hoger om dit programma te laten lopen.'
                  : loopt
                    ? zelf
                      ? `Je hebt dit aangezet. Dat kost ${bedrag}.`
                      : `Zo doet de gemeente het nu. Stopzetten scheelt ${bedrag}.`
                    : zelf
                      ? `Je hebt dit stopgezet. Dat scheelt ${bedrag}.`
                      : eenmalig
                        ? `Dit eenmalige programma staat bij nul stil, zodat je zelf kiest. Aanzetten kost ${bedrag}.`
                        : `Dit gebeurt nu niet. Aanzetten kost ${bedrag}.`;
                return (
                  <li key={p.id} data-post={p.id}>
                    <button
                      type="button"
                      className={`actiekaart programma${loopt ? ' aan' : ''}`}
                      aria-pressed={loopt}
                      disabled={minimum}
                      data-testid={`programma-${p.id}`}
                      onClick={() => wissel(p.id)}
                    >
                      <span className={`actiekaart-stand${loopt ? ' loopt' : ''}`}>
                        {loopt
                          ? '✅ Loopt'
                          : minimum
                            ? '⏸ Staat stil'
                            : zelf
                              ? '⏸ Gestopt'
                              : '⏸ Staat stil'}
                        <span className="actiekaart-soort">
                          {' · '}
                          {eenmalig ? `eenmalig, ${jaar}` : 'elk jaar'}
                        </span>
                      </span>
                      <strong>
                        {p.zekerheid !== 'feit' ? '⚠︎ ' : ''}
                        {p.programma ?? p.naam}
                      </strong>
                      {p.wat && <span className="actiekaart-uitleg">{p.wat}</span>}
                      <span className="klein actiekaart-uitleg">
                        <em>Zonder dit programma:</em> {p.uitleg}
                      </span>
                      <span className="actiekaart-waarom" data-testid={`waarom-${p.id}`}>
                        {waarom}
                      </span>
                      {!minimum && (
                        <span className="actiekaart-actie" aria-hidden="true">
                          {loopt ? '⏹ Tik om stop te zetten' : '▶ Tik om aan te zetten'}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

export function GebouwPosten({
  gebouw,
  data,
  resultaat,
}: {
  gebouw: Gebouw;
  data: Data;
  resultaat: Resultaat;
}) {
  const zetOnderdeel = useSpel((s) => s.zetOnderdeel);
  const nul = useSpel((s) => s.beginpunt === 'nul');
  const jaar = huidigJaar(data);
  const zetBelasting = useSpel((s) => s.zetBelasting);
  const wisselKaart = useSpel((s) => s.wisselKaart);
  const k = resultaat.keuzes;

  if (gebouw.soort === 'loket') {
    return (
      <ul className="posten">
        {data.begroting.belastingen.map((b) => {
          if (data.parkeren && b.id === data.parkeren.opbrengst.belasting) {
            const garage = data.gebouwen.find((x) => x.id === data.parkeren?.opbrengst.gebouw);
            return (
              <li key={b.id} data-post={b.id}>
                <p className="schuif-uitleg">
                  {nul ? b.naam : `${b.naam} (${formatMln(b.opbrengst_mln * 1e6)})`}: die stel je
                  per vergunning en zone in bij de {garage?.naam ?? 'parkeergarage'}.
                  {!nul && k.belastingen[b.id]
                    ? ` Gemiddeld nu ${formatPct(k.belastingen[b.id] ?? 0)}.`
                    : ''}
                </p>
              </li>
            );
          }
          const g = grensBelasting(b);
          // Toeristenbelasting betalen toeristen, per nacht: niet per inwoner tonen.
          const toerist =
            data.tarieven?.toeristenbelasting?.belasting === b.id
              ? data.tarieven.toeristenbelasting
              : undefined;
          const perNacht = (x: number) =>
            toerist
              ? `€ ${((toerist.per_overnachting * x) / b.opbrengst_mln).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per nacht`
              : mlnTekst(x);
          return (
            <li key={b.id} data-post={b.id}>
              <Schuif
                id={`${gebouw.id}-${b.id}`}
                label={nul ? b.naam : `${b.naam} (${formatMln(b.opbrengst_mln * 1e6)})`}
                min={g.min}
                max={g.max}
                waarde={k.belastingen[b.id] ?? 0}
                bedrag={{ basis: b.opbrengst_mln, eenheid: 'mln', soort: 'Opbrengst' }}
                collegeKnop={!nul}
                {...(toerist
                  ? { toonBedrag: perNacht }
                  : nul
                    ? { toonBedrag: (x: number) => perInwonerTekst(data, x) }
                    : {})}
                beschrijving={b.uitleg}
                onChange={(v) => zetBelasting(b.id, v)}
              />
              <GevolgRegel data={data} id={b.id} pct={k.belastingen[b.id] ?? 0} />
              {toerist && (
                <p className="klein" data-testid="toerist-tarief">
                  Nu €{' '}
                  {toerist.per_overnachting.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}{' '}
                  per persoon per nacht in een hotel (€{' '}
                  {toerist.kamperen_hostel.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} op
                  een camping of in een hostel, €{' '}
                  {toerist.haren_ten_boer.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} in
                  Haren en Ten Boer). Tarief {toerist.jaar}.
                </p>
              )}
              {toerist?.gemiddeld_nederland ? (
                <div className="gemiddelde-nl" data-testid="gemiddelde-toerist">
                  <p>
                    <strong>
                      Gemiddeld in Nederland: €{' '}
                      {toerist.gemiddeld_nederland.per_overnachting.toLocaleString('nl-NL', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      per persoon per nacht
                    </strong>{' '}
                    <span className="uitgaven-jaar">{toerist.gemiddeld_nederland.jaar}</span>
                  </p>
                  <p className="klein">
                    Gemiddelde van alle gemeenten in {toerist.gemiddeld_nederland.jaar}.{' '}
                    <a
                      href={toerist.gemiddeld_nederland.bron_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Bron
                    </a>
                    .
                  </p>
                  <button
                    type="button"
                    className="knop"
                    onClick={() =>
                      zetBelasting(
                        b.id,
                        Math.round(
                          ((toerist.gemiddeld_nederland?.per_overnachting ?? 0) /
                            toerist.per_overnachting -
                            1) *
                            10000,
                        ) / 100,
                      )
                    }
                  >
                    Zet op het gemiddelde van Nederland (€{' '}
                    {toerist.gemiddeld_nederland.per_overnachting.toLocaleString('nl-NL', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    per nacht)
                  </button>
                </div>
              ) : nul || toerist ? (
                <GemiddeldeNederland
                  data={data}
                  id={b.id}
                  opbrengstMln={b.opbrengst_mln}
                  metNu={!!toerist}
                  max={Number.isFinite(g.max) ? g.max : 1000}
                  onZet={(v) => zetBelasting(b.id, v)}
                />
              ) : (
                <Bedrag euro={directBedrag(resultaat, b.id, jaar)} />
              )}
              <OokEffect data={data} resultaat={resultaat} id={b.id} />
            </li>
          );
        })}
      </ul>
    );
  }

  if (gebouw.soort === 'veilinghuis' || gebouw.soort === 'beleidshuis') {
    // Elke kaart hoort bij één gebouw: met `gebouw` bij dat gebouw, anders bij het Veilinghuis.
    const kaarten = data.begroting.actiekaarten.filter((kaart) =>
      gebouw.soort === 'beleidshuis'
        ? kaart.gebouw === gebouw.id
        : !kaart.gebouw || kaart.gebouw === gebouw.id,
    );
    const lijst = (
      <ul className="posten kaarten">
        {kaarten.map((kaart) => {
          const aan = k.kaarten.includes(kaart.id);
          return (
            <li key={kaart.id} data-post={kaart.id}>
              <button
                type="button"
                className={`actiekaart${aan ? ' aan' : ''}`}
                aria-pressed={aan}
                onClick={() => wisselKaart(kaart.id)}
              >
                <span className={`actiekaart-stand${aan ? ' loopt' : ''}`}>
                  {aan
                    ? kaart.verkoop
                      ? '✅ Je verkoopt dit'
                      : '✅ Je voert dit plan uit'
                    : kaart.verkoop
                      ? 'Nu van de gemeente'
                      : 'Nieuw plan · staat uit'}
                  <span className="actiekaart-soort">
                    {' · '}
                    {kaart.verkoop
                      ? 'verkoop'
                      : kaart.structureel_of_incidenteel === 'S'
                        ? 'elk jaar'
                        : 'eenmalig'}
                  </span>
                </span>
                <strong>
                  {kaart.zekerheid && kaart.zekerheid !== 'feit' ? '⚠︎ ' : ''}
                  {kaart.naam}
                </strong>
                <span className="actiekaart-uitleg">{kaart.uitleg}</span>
                {kaart.verkoop ? (
                  <VerkoopBedragen data={data} kaart={kaart} />
                ) : (
                  <span className={kaart.bedrag_mln >= 0 ? 'positief' : 'negatief'}>
                    {kaart.bedrag_mln === 0
                      ? 'Kost niets'
                      : formatMln(kaart.bedrag_mln * 1e6, { decimalen: 2, teken: true })}
                  </span>
                )}
                <span className="actiekaart-actie" aria-hidden="true">
                  {aan
                    ? kaart.verkoop
                      ? '⏹ Tik om toch niet te verkopen'
                      : '⏹ Tik om het plan uit te zetten'
                    : kaart.verkoop
                      ? '▶ Tik om te verkopen'
                      : '▶ Tik om het plan uit te voeren'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
    if (gebouw.soort === 'veilinghuis')
      return (
        <>
          <p className="klein beleid-legenda">
            Hier verkoop je bezit van de gemeente, en staan losse maatregelen. Tik op een kaart om
            hem aan te zetten. Let op bij verkopen: alleen wat boven de boekwaarde wordt verdiend
            (boekwinst) is eenmalig vrij geld. De rest gaat naar minder lenen; dat scheelt elk jaar
            rente.
          </p>
          {lijst}
          <EigenVoorstellen plek="veiling" resultaat={resultaat} />
        </>
      );
    return (
      <>
        <Apparaat data={data} />
        {kaarten.length > 0 && (
          <section aria-labelledby={`${gebouw.id}-plannen`}>
            <h3 id={`${gebouw.id}-plannen`}>Keuzes</h3>
            <p className="klein beleid-legenda">
              Bovenaan de keuzes die VVD Groningen belangrijk vindt: minder ambtenaren en minder
              regels. Alles staat uit; zet aan wat je wilt doen. Van de ambtenaren kies je één: 5,
              10 of 15%.
            </p>
            {lijst}
          </section>
        )}
        <Programmas data={data} resultaat={resultaat} />
        <EigenVoorstellen plek="beleid" resultaat={resultaat} />
      </>
    );
  }

  return (
    <>
      <ul className="posten">
        {gebouw.onderdelen.map((id) => {
          const o = data.index.onderdelen.get(id);
          if (!o) return null;
          const g = grensOnderdeel(o);
          const pct = k.onderdelen[id] ?? 0;
          const vergrendeld = g.min === 0 && g.max === 0;
          const tekst = vergrendeld
            ? o.reden_vergrendeld
            : pct < 0
              ? o.tekst_bezuinigen
              : pct > 0
                ? o.tekst_investeren
                : null;
          const teken = vergrendeld ? '🔒 ' : o.wettelijke_taak ? '⚖️ ' : '';
          // Bij nul niet het bedrag van het college in de naam: dat zie je pas aan het eind.
          const label = nul
            ? `${teken}${o.naam}${vergrendeld ? ` (${formatMln(o.lasten_mln * 1e6)})` : ''}`
            : `${teken}${o.naam} (${o.gekoppelde_baten_mln > 0 ? `uitgaven ${formatMln(o.lasten_mln * 1e6)} · inkomsten ${formatMln(o.gekoppelde_baten_mln * 1e6)}` : formatMln(o.lasten_mln * 1e6)})`;
          const grens = (pct: number) =>
            nul ? mlnTekst(o.lasten_mln * (1 + pct / 100)) : formatPct(pct);
          // Waarom de post niet lager kan (bij nul staat hij op dit minimum).
          const minimum =
            !vergrendeld && o.minimum && g.minReden
              ? `${o.minimum.zekerheid === 'aanname' ? '⚠︎ ' : ''}${SOORT_MINIMUM[o.minimum.soort]}: niet lager dan ${grens(g.min)}. ${g.minReden}`
              : o.wettelijke_taak && !vergrendeld
                ? `Wettelijke taak: niet lager dan ${grens(g.min)}.`
                : null;
          return (
            <li key={id} data-post={id}>
              <Schuif
                id={`${gebouw.id}-${id}`}
                label={label}
                min={g.min}
                max={g.max}
                waarde={pct}
                vergrendeld={vergrendeld}
                bedrag={{ basis: o.lasten_mln, eenheid: 'mln', soort: 'Budget' }}
                collegeKnop={!nul}
                {...(nul ? { toonBedrag: mlnTekst } : {})}
                beschrijving={[tekst, minimum].filter(Boolean).join(' ') || undefined}
                onChange={(v) => zetOnderdeel(id, v)}
              />
              {!vergrendeld && <GevolgRegel data={data} id={id} pct={pct} />}
              <PostInfo data={data} id={id} />
              {!nul && <Bedrag euro={directBedrag(resultaat, id, jaar)} />}
              <OokEffect data={data} resultaat={resultaat} id={id} />
            </li>
          );
        })}
      </ul>
      {data.parkeren?.opbrengst.gebouw === gebouw.id && (
        <ParkeerSchuiven gebouw={gebouw} data={data} resultaat={resultaat} jaar={jaar} />
      )}
    </>
  );
}

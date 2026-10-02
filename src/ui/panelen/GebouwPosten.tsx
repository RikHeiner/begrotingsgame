/**
 * De posten van één gebouw: schuiven voor de onderdelen, het belastingloket of de actiekaarten van
 * het veilinghuis. Gebruikt in het gebouwpaneel én in de lijstweergave.
 */
import {
  formatMln,
  formatPct,
  grensBelasting,
  grensOnderdeel,
  type Data,
  type Resultaat,
} from '../../engine';
import { PARKEER_PREFIX, parkeerPosten, type ParkeerPost } from '../../engine/parkeren';
import type { Gebouw, Minimum, Programma } from '../../engine/schema';
import { isGestopt, stilDoorMinimum } from '../../game/beleidshuis';
import { huidigJaar, useSpel } from '../../game/state/store';
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
  const posten = parkeerPosten(data);
  const keuzes = resultaat.keuzes.parkeren ?? {};
  const id = data.parkeren?.opbrengst.belasting ?? '';
  return (
    <section className="parkeren" aria-labelledby={`${gebouw.id}-parkeren`} data-post="parkeren">
      <h3 id={`${gebouw.id}-parkeren`}>Parkeertarieven</h3>
      <p className="klein">
        Samen {formatMln(posten.reduce((s, p) => s + p.basis, 0))} per jaar. Je kiest per vergunning
        en per zone of het tarief omhoog of omlaag gaat.
      </p>
      {PARKEER_GROEPEN.map((groep) => {
        const lijst = posten.filter(groep.filter);
        if (!lijst.length) return null;
        return (
          <div key={groep.titel}>
            <h4>{groep.titel}</h4>
            <ul className="posten">
              {lijst.map((p) => {
                const pct = keuzes[p.id] ?? 0;
                const label =
                  p.tarief !== undefined && p.aantal !== undefined
                    ? `${p.zekerheid !== 'feit' ? '⚠︎ ' : ''}${p.naam} (${euro(p.tarief)} per jaar · ${p.aantal.toLocaleString('nl-NL')} vergunningen)`
                    : `${p.zekerheid !== 'feit' ? '⚠︎ ' : ''}${p.naam} (${formatMln(p.basis)})`;
                const nieuw =
                  p.tarief !== undefined && pct
                    ? `Nieuw tarief: ${euro(p.tarief * (1 + pct / 100))} per jaar.`
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
                          : { basis: p.basis / 1e6, eenheid: 'mln', soort: 'Opbrengst' }
                      }
                      beschrijving={[p.uitleg, nieuw].filter(Boolean).join(' ')}
                      collegeKnop
                      onChange={(v) => zet(p.id, v)}
                    />
                    <Bedrag euro={directBedrag(resultaat, `${PARKEER_PREFIX}${p.id}`, jaar)} />
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
  const jaar = huidigJaar(data);
  const perPost = new Map<string, Programma[]>();
  for (const p of data.index.programmas.values())
    perPost.set(p.post, [...(perPost.get(p.post) ?? []), p]);
  return (
    <section aria-labelledby="programmas-kop">
      <h3 id="programmas-kop">Programma's van de gemeente</h3>
      <p className="klein">
        Zet een programma stop, of zet het weer aan. Het geld gaat van de post af of komt erbij; dat
        zie je ook bij de schuif van die post.
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
                      <span className="actiekaart-soort">
                        {loopt ? 'Loopt' : 'Staat stil'} ·{' '}
                        {eenmalig ? `alleen ${jaar}` : 'elk jaar'}
                      </span>
                      <strong>
                        {p.zekerheid !== 'feit' ? '⚠︎ ' : ''}
                        {p.naam}
                      </strong>
                      <span>{p.uitleg}</span>
                      <span>
                        {formatMln(p.bedrag_mln * 1e6, { decimalen: 2 })}
                        {eenmalig ? ` in ${jaar}` : ' per jaar'} ·{' '}
                        {minimum
                          ? 'staat stil: de post staat op zijn minimum'
                          : loopt
                            ? 'tik om stop te zetten'
                            : 'tik om weer aan te zetten'}
                      </span>
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
                  {b.naam} ({formatMln(b.opbrengst_mln * 1e6)}): die stel je per vergunning en zone
                  in bij de {garage?.naam ?? 'parkeergarage'}.
                  {k.belastingen[b.id]
                    ? ` Gemiddeld nu ${formatPct(k.belastingen[b.id] ?? 0)}.`
                    : ''}
                </p>
              </li>
            );
          }
          const g = grensBelasting(b);
          return (
            <li key={b.id} data-post={b.id}>
              <Schuif
                id={`${gebouw.id}-${b.id}`}
                label={`${b.naam} (${formatMln(b.opbrengst_mln * 1e6)})`}
                min={g.min}
                max={g.max}
                waarde={k.belastingen[b.id] ?? 0}
                bedrag={{ basis: b.opbrengst_mln, eenheid: 'mln', soort: 'Opbrengst' }}
                collegeKnop
                beschrijving={b.uitleg}
                onChange={(v) => zetBelasting(b.id, v)}
              />
              <Bedrag euro={directBedrag(resultaat, b.id, jaar)} />
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
                <span className="actiekaart-soort">
                  {kaart.structureel_of_incidenteel === 'S' ? 'Elk jaar' : 'Eenmalig'}
                </span>
                <strong>
                  {kaart.zekerheid && kaart.zekerheid !== 'feit' ? '⚠︎ ' : ''}
                  {kaart.naam}
                </strong>
                <span>{kaart.uitleg}</span>
                <span className={kaart.bedrag_mln >= 0 ? 'positief' : 'negatief'}>
                  {formatMln(kaart.bedrag_mln * 1e6, { decimalen: 2, teken: true })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
    if (gebouw.soort === 'veilinghuis') return lijst;
    return (
      <>
        <Programmas data={data} resultaat={resultaat} />
        {kaarten.length > 0 && (
          <section aria-labelledby={`${gebouw.id}-plannen`}>
            <h3 id={`${gebouw.id}-plannen`}>Nieuwe plannen</h3>
            {lijst}
          </section>
        )}
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
          const label = `${vergrendeld ? '🔒 ' : o.wettelijke_taak ? '⚖️ ' : ''}${o.naam} (${o.gekoppelde_baten_mln > 0 ? `uitgaven ${formatMln(o.lasten_mln * 1e6)} · inkomsten ${formatMln(o.gekoppelde_baten_mln * 1e6)}` : formatMln(o.lasten_mln * 1e6)})`;
          // Waarom de post niet lager kan (bij nul staat hij op dit minimum).
          const minimum =
            !vergrendeld && o.minimum && g.minReden
              ? `${o.minimum.zekerheid === 'aanname' ? '⚠︎ ' : ''}${SOORT_MINIMUM[o.minimum.soort]}: niet lager dan ${formatPct(g.min)}. ${g.minReden}`
              : o.wettelijke_taak && !vergrendeld
                ? `Wettelijke taak: niet lager dan ${formatPct(g.min)}.`
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
                collegeKnop
                beschrijving={[tekst, minimum].filter(Boolean).join(' ') || undefined}
                onChange={(v) => zetOnderdeel(id, v)}
              />
              <Bedrag euro={directBedrag(resultaat, id, jaar)} />
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

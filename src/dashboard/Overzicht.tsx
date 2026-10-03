/** Het overzicht van alle inzendingen voor de fractie. */
import { useEffect, useMemo, useState } from 'react';
import { formatMln, formatPct, type Data } from '../engine';
import type { Opslag } from '../inzending/opslag';
import type { IdeeStatus, Inzending } from '../inzending/types';
import {
  combinaties,
  kerncijfers,
  maakCsv,
  perGebied,
  perPost,
  rekenDoorInStukjes,
  zoekIdeeen,
  type Berekend,
} from './analyse';
import { GebiedenKaart } from './GebiedenKaart';

type Laden =
  | { s: 'laden'; klaar: number; totaal?: number }
  | { s: 'fout'; melding: string }
  | { s: 'klaar'; berekend: Berekend[]; anderJaar: number };

const STATUS_LABEL: Record<IdeeStatus, string> = {
  geen: 'Geen idee',
  nieuw: '● Nieuw',
  verdacht: '⚠︎ Verdacht (filter)',
  goedgekeurd: '✓ Goedgekeurd',
  verborgen: '✕ Verborgen',
};

function downloadTekst(tekst: string, naam: string, type: string) {
  const url = URL.createObjectURL(new Blob([tekst], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = naam;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function Overzicht({ data, opslag }: { data: Data; opslag: Opslag }) {
  const [laden, setLaden] = useState<Laden>({ s: 'laden', klaar: 0 });
  const [statussen, setStatussen] = useState<Record<string, IdeeStatus>>({});
  const [opnieuw, setOpnieuw] = useState(0);

  useEffect(() => {
    let weg = false;
    opslag
      .inzendingen()
      .then(async (alle) => {
        const ditJaar = alle.filter((i) => i.begrotingsjaar === data.config.actiefJaar);
        if (!weg) setLaden({ s: 'laden', klaar: 0, totaal: ditJaar.length });
        const berekend = await rekenDoorInStukjes(data, ditJaar, (klaar) => {
          if (!weg) setLaden({ s: 'laden', klaar, totaal: ditJaar.length });
        });
        if (!weg) setLaden({ s: 'klaar', berekend, anderJaar: alle.length - ditJaar.length });
      })
      .catch((e: unknown) => {
        if (!weg)
          setLaden({ s: 'fout', melding: e instanceof Error ? e.message : 'Laden mislukt.' });
      });
    return () => {
      weg = true;
    };
  }, [data, opslag, opnieuw]);

  // Moderatie werkt meteen op het scherm; de database is de bron bij opnieuw laden.
  const berekend = useMemo(
    () =>
      laden.s === 'klaar'
        ? laden.berekend.map((b) => {
            const status = statussen[b.inzending.id];
            return status ? { ...b, inzending: { ...b.inzending, idee_status: status } } : b;
          })
        : [],
    [laden, statussen],
  );
  const inzendingen = useMemo(() => berekend.map((b) => b.inzending), [berekend]);

  if (laden.s === 'fout')
    return (
      <p role="alert" className="melding-blok">
        {laden.melding}
      </p>
    );
  if (laden.s === 'laden')
    return (
      <p aria-live="polite">
        Inzendingen worden geladen en doorgerekend…
        {laden.totaal ? ` ${laden.klaar} van ${laden.totaal}` : ''}
      </p>
    );

  const k = kerncijfers(berekend);
  const modereer = async (id: string, status: IdeeStatus) => {
    setStatussen((s) => ({ ...s, [id]: status }));
    try {
      await opslag.zetStatus(id, status);
    } catch {
      setStatussen((s) => Object.fromEntries(Object.entries(s).filter(([x]) => x !== id)));
      window.alert('Opslaan lukte niet. Probeer het opnieuw.');
    }
  };
  const csv = () =>
    downloadTekst(
      maakCsv(data, berekend),
      `inzendingen-${data.config.actiefJaar}-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8',
    );
  const emails = async () => {
    const a = await opslag.aanmeldingen();
    downloadTekst(
      '﻿e-mailadres;aangemeld\r\n' + a.map((x) => `${x.email};${x.aangemaakt}`).join('\r\n'),
      'aanmeldingen.csv',
      'text/csv;charset=utf-8',
    );
  };

  return (
    <>
      <div className="dash-acties">
        <button type="button" className="knop-indienen" onClick={csv} data-testid="csv">
          Download CSV
        </button>
        <button type="button" className="knop" onClick={() => void emails()}>
          E-mailadressen (aanmeldingen)
        </button>
        <button type="button" className="knop" onClick={() => setOpnieuw((x) => x + 1)}>
          Vernieuwen
        </button>
      </div>
      {opslag.soort === 'lokaal' && (
        <p className="melding-blok">
          Demo: dit zijn de inzendingen uit deze browser, niet uit de database.
        </p>
      )}

      <section className="dash-blok" aria-labelledby="kern">
        <h2 id="kern">Kerncijfers {data.config.actiefJaar}</h2>
        <dl className="dash-tegels">
          <div>
            <dt>Inzendingen</dt>
            <dd data-testid="aantal">{k.aantal}</dd>
          </div>
          <div>
            <dt>Sluitend</dt>
            <dd>{k.aantal ? Math.round((k.sluitend / k.aantal) * 100) : 0}%</dd>
          </div>
          <div>
            <dt>Gemiddeld saldo per jaar</dt>
            <dd>{formatMln(k.gemiddeldSaldo, { teken: true })}</dd>
          </div>
          <div>
            <dt>Ideeën te beoordelen</dt>
            <dd>
              {k.teBeoordelen}
              {k.verdacht ? <span className="klein"> ({k.verdacht} verdacht)</span> : null}
            </dd>
          </div>
        </dl>
        {laden.anderJaar > 0 && (
          <p className="klein">
            {laden.anderJaar} inzendingen van een ander begrotingsjaar tellen hier niet mee (wel in
            de database).
          </p>
        )}
      </section>

      <PerPost data={data} berekend={berekend} />

      <section className="dash-blok" aria-labelledby="gebieden">
        <h2 id="gebieden">Waar wonen de inzenders?</h2>
        <GebiedenKaart data={data} rijen={perGebied(data, inzendingen)} />
      </section>

      <Combinaties data={data} inzendingen={inzendingen} />

      <Ideeen inzendingen={inzendingen} data={data} modereer={modereer} />
    </>
  );
}

function PerPost({ data, berekend }: { data: Data; berekend: Berekend[] }) {
  const rijen = useMemo(() => perPost(data, berekend), [data, berekend]);
  const [alles, setAlles] = useState(false);
  const zichtbaar = alles ? rijen : rijen.slice(0, 15);
  return (
    <section className="dash-blok" aria-labelledby="posten">
      <h2 id="posten">Per post: hoe vaak en hoeveel</h2>
      <p className="klein">
        Gemiddelden gaan over de inzendingen die de post wijzigden. Bedragen in het eerste jaar; +
        levert geld op, − kost geld.
      </p>
      {rijen.length === 0 ? (
        <p>Nog geen wijzigingen.</p>
      ) : (
        <div className="tabel-scroll">
          <table className="tabel" data-testid="per-post">
            <thead>
              <tr>
                <th scope="col">Post</th>
                <th scope="col">Gewijzigd</th>
                <th scope="col">Omlaag</th>
                <th scope="col">Omhoog</th>
                <th scope="col">Gem. wijziging</th>
                <th scope="col">Gem. bedrag</th>
              </tr>
            </thead>
            <tbody>
              {zichtbaar.map((r) => (
                <tr key={r.id}>
                  <th scope="row">
                    {r.naam}
                    <span className="klein"> · {r.thema}</span>
                  </th>
                  <td>{r.gekozen}</td>
                  <td>{r.soort === 'kaart' ? '' : r.omlaag}</td>
                  <td>{r.soort === 'kaart' ? '' : r.omhoog}</td>
                  <td>{r.gemiddeldPct === undefined ? 'kaart' : formatPct(r.gemiddeldPct)}</td>
                  <td>{formatMln(r.gemiddeldBedrag, { teken: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rijen.length > 15 && (
        <button type="button" className="knop" onClick={() => setAlles((x) => !x)}>
          {alles ? 'Toon de top 15' : `Toon alle ${rijen.length} posten`}
        </button>
      )}
    </section>
  );
}

function Combinaties({ data, inzendingen }: { data: Data; inzendingen: Inzending[] }) {
  const c = useMemo(() => combinaties(data, inzendingen), [data, inzendingen]);
  return (
    <section className="dash-blok" aria-labelledby="combinaties">
      <h2 id="combinaties">Populairste combinaties</h2>
      {c.length === 0 ? (
        <p>Nog geen combinaties die vaker dan één keer voorkomen.</p>
      ) : (
        <ol className="dash-combinaties">
          {c.map((x) => (
            <li key={`${x.a}|${x.b}`}>
              <span>
                {x.a} <strong>+</strong> {x.b}
              </span>
              <span className="klein">{x.aantal}×</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

type Filter = 'te_beoordelen' | 'alle' | IdeeStatus;

function Ideeen({
  inzendingen,
  data,
  modereer,
}: {
  inzendingen: Inzending[];
  data: Data;
  modereer: (id: string, s: IdeeStatus) => Promise<void>;
}) {
  const [zoek, setZoek] = useState('');
  const [filter, setFilter] = useState<Filter>('te_beoordelen');
  const [aantal, setAantal] = useState(20);
  const gebied = new Map(data.gebieden.gebieden.map((g) => [g.id, g.naam]));
  const lijst = zoekIdeeen(inzendingen, zoek).filter((i) =>
    filter === 'alle'
      ? true
      : filter === 'te_beoordelen'
        ? i.idee_status === 'nieuw' || i.idee_status === 'verdacht'
        : i.idee_status === filter,
  );
  return (
    <section className="dash-blok" aria-labelledby="ideeen">
      <h2 id="ideeen">Eigen ideeën</h2>
      <p className="klein">
        Lees elk idee voordat je het gebruikt. Het filter markeert ideeën met mogelijke
        persoonsgegevens of scheldwoorden als verdacht.
      </p>
      <div className="dash-filters">
        <label className="veld">
          Zoeken
          <input type="search" value={zoek} onChange={(e) => setZoek(e.target.value)} />
        </label>
        <label className="veld">
          Toon
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="te_beoordelen">Te beoordelen</option>
            <option value="alle">Alle ideeën</option>
            <option value="verdacht">Verdacht</option>
            <option value="goedgekeurd">Goedgekeurd</option>
            <option value="verborgen">Verborgen</option>
          </select>
        </label>
      </div>
      <p className="klein" aria-live="polite">
        {lijst.length} {lijst.length === 1 ? 'idee' : 'ideeën'}
      </p>
      <ul className="dash-ideeen" data-testid="ideeen">
        {lijst.slice(0, aantal).map((i) => (
          <li key={i.id} className={`idee status-${i.idee_status}`}>
            <p className="idee-tekst">{i.idee}</p>
            <p className="klein">
              <span className="idee-status">{STATUS_LABEL[i.idee_status]}</span> ·{' '}
              {new Date(i.aangemaakt).toLocaleDateString('nl-NL')}
              {i.gebied ? ` · ${gebied.get(i.gebied) ?? i.gebied}` : ''}
            </p>
            <div className="idee-knoppen">
              <button
                type="button"
                className="knop"
                aria-pressed={i.idee_status === 'goedgekeurd'}
                onClick={() => void modereer(i.id, 'goedgekeurd')}
              >
                Goedkeuren
              </button>
              <button
                type="button"
                className="knop"
                aria-pressed={i.idee_status === 'verborgen'}
                onClick={() => void modereer(i.id, 'verborgen')}
              >
                Verbergen
              </button>
            </div>
          </li>
        ))}
      </ul>
      {lijst.length > aantal && (
        <button type="button" className="knop" onClick={() => setAantal((x) => x + 20)}>
          Toon {Math.min(20, lijst.length - aantal)} meer
        </button>
      )}
    </section>
  );
}

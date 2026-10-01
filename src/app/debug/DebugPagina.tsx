/**
 * Eenvoudige debugpagina (fase 1): schuiven voor alle posten, belastingen en kaarten, en tabellen met
 * de uitkomsten van de rekenmotor. Geen game, alleen om de rekenmotor te bekijken en te controleren.
 */
import { useMemo, useState } from 'react';
import {
  AANNAME_LABEL,
  bereken,
  beschrijf,
  blijeInwoners,
  formatMln,
  formatPct,
  grensBelasting,
  grensOnderdeel,
  GEEN_KEUZES,
  magWijzigen,
  type Data,
  type Keuzes,
} from '../../engine';
import type { Scenario } from '../../engine/schema';
import './debug.css';

const STAP = 5;

export function DebugPagina({ data }: { data: Data }) {
  const [keuzes, setKeuzes] = useState<Keuzes>(GEEN_KEUZES);
  const [slot, setSlot] = useState(true);
  const [melding, setMelding] = useState<string>();
  const [jaarFilter, setJaarFilter] = useState<number>(data.jaren[0] ?? 0);
  const resultaat = useMemo(() => bereken(data, keuzes), [data, keuzes]);

  const probeer = (nieuw: Keuzes) => {
    if (slot) {
      const m = magWijzigen(data, keuzes, nieuw);
      if (!m.ok) {
        setMelding(`🔒 ${m.reden ?? 'Dit kan niet.'}`);
        return;
      }
    }
    setMelding(undefined);
    setKeuzes(nieuw);
  };
  const zetOnderdeel = (id: string, pct: number) =>
    probeer({ ...keuzes, onderdelen: { ...keuzes.onderdelen, [id]: pct } });
  const zetBelasting = (id: string, pct: number) =>
    probeer({ ...keuzes, belastingen: { ...keuzes.belastingen, [id]: pct } });
  const wisselKaart = (id: string) =>
    probeer({
      ...keuzes,
      kaarten: keuzes.kaarten.includes(id)
        ? keuzes.kaarten.filter((k) => k !== id)
        : [...keuzes.kaarten, id],
    });

  const actieveVerbanden = Object.entries(resultaat.verbanden).filter(
    ([, u]) => u.status !== 'niet actief' && u.status !== 'wacht op nieuwe post',
  );

  return (
    <div className="debug">
      <p className="debug-uitleg">
        Debugpagina van de rekenmotor. Bedragen ten opzichte van de begroting; + is gunstig voor de
        gemeente. {AANNAME_LABEL} = aanname.
      </p>

      <section className="debug-balk" aria-label="Instellingen">
        <label>
          Scenario{' '}
          <select
            value={keuzes.scenario}
            onChange={(e) => setKeuzes({ ...keuzes, scenario: e.target.value as Scenario })}
          >
            <option value="voorzichtig">Voorzichtig</option>
            <option value="midden">Midden</option>
            <option value="optimistisch">Optimistisch</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={slot} onChange={(e) => setSlot(e.target.checked)} /> Slot
          op de pot
        </label>
        <button
          type="button"
          onClick={() => setKeuzes({ ...GEEN_KEUZES, scenario: keuzes.scenario })}
        >
          Alles terug naar 0
        </button>
        {(['structureel', 'eenmalig'] as const).map((soort) => (
          <label key={soort}>
            Naar de reserve ({soort === 'structureel' ? 'elk jaar' : 'eenmalig'}, mln){' '}
            <input
              type="number"
              min={0}
              step={0.5}
              inputMode="decimal"
              className="debug-getal"
              value={(keuzes.reserve?.[soort] ?? 0) / 1e6}
              onChange={(e) => {
                const huidig = keuzes.reserve ?? { structureel: 0, eenmalig: 0 };
                probeer({
                  ...keuzes,
                  reserve: { ...huidig, [soort]: Math.max(0, Number(e.target.value) || 0) * 1e6 },
                });
              }}
            />
          </label>
        ))}
      </section>
      <p role="status" aria-live="polite" className="debug-melding" data-testid="melding">
        {melding}
      </p>

      <section aria-labelledby="kop-saldo">
        <h2 id="kop-saldo">Saldo per jaar</h2>
        <div className="debug-scroll">
          <table className="debug-tabel" data-testid="saldo-tabel">
            <thead>
              <tr>
                <th scope="col">Jaar</th>
                <th scope="col">Structureel</th>
                <th scope="col">Eenmalig</th>
                <th scope="col">Sluitend</th>
                <th scope="col">Weerstandsvermogen</th>
              </tr>
            </thead>
            <tbody>
              {data.jaren.map((jaar) => {
                const j = resultaat.perJaar[jaar];
                return (
                  <tr key={jaar}>
                    <th scope="row">{jaar}</th>
                    <td className={getalKlasse(j?.structureel)}>
                      {formatMln(j?.structureel ?? 0, { decimalen: 3, teken: true })}
                    </td>
                    <td className={getalKlasse(j?.incidenteel)}>
                      {formatMln(j?.incidenteel ?? 0, { decimalen: 3, teken: true })}
                    </td>
                    <td>{resultaat.regels.perJaarSluitend[jaar] ? 'ja' : 'nee'}</td>
                    <td>{Math.round((j?.weerstandsvermogen ?? 0) * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {resultaat.regels.overtredingen.length > 0 && (
          <ul className="debug-overtredingen">
            {resultaat.regels.overtredingen.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="debug-kolommen">
        <section aria-labelledby="kop-meters">
          <h2 id="kop-meters">Meters (spelregel)</h2>
          <table className="debug-tabel">
            <tbody>
              {data.meters.meters.map((m) => (
                <tr key={m.id}>
                  <th scope="row">
                    {m.icoon} {m.naam}
                  </th>
                  <td>{resultaat.meters[m.id].toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section aria-labelledby="kop-personas">
          <h2 id="kop-personas">Inwoners (blij: {blijeInwoners(resultaat.personas).toFixed(1)})</h2>
          <table className="debug-tabel">
            <tbody>
              {data.personas.personas.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.naam}</th>
                  <td>{(resultaat.personas[p.id] ?? 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section aria-labelledby="kop-schuiven">
        <h2 id="kop-schuiven">Posten per gebouw</h2>
        {data.gebouwen
          .filter((g) => g.onderdelen.length > 0)
          .map((g) => (
            <details key={g.id} className="debug-gebouw">
              <summary>
                {g.icoon} {g.naam}
              </summary>
              {g.onderdelen.map((id) => {
                const o = data.index.onderdelen.get(id);
                if (!o) return null;
                const grens = grensOnderdeel(o);
                const pct = resultaat.keuzes.onderdelen[id] ?? 0;
                return (
                  <Schuif
                    key={id}
                    id={`s-${id}`}
                    label={`${o.naam} (${formatMln((o.lasten_mln - o.gekoppelde_baten_mln) * 1e6)} netto)`}
                    min={grens.min}
                    max={grens.max}
                    waarde={pct}
                    vergrendeld={grens.min === 0 && grens.max === 0}
                    wettelijk={o.wettelijke_taak}
                    onChange={(v) => zetOnderdeel(id, v)}
                  />
                );
              })}
            </details>
          ))}
        <details className="debug-gebouw">
          <summary>💶 Belastingloket</summary>
          {data.begroting.belastingen.map((b) => {
            const grens = grensBelasting(b);
            return (
              <Schuif
                key={b.id}
                id={`b-${b.id}`}
                label={`${b.naam} (${formatMln(b.opbrengst_mln * 1e6)})`}
                min={grens.min}
                max={grens.max}
                waarde={resultaat.keuzes.belastingen[b.id] ?? 0}
                onChange={(v) => zetBelasting(b.id, v)}
              />
            );
          })}
        </details>
        <details className="debug-gebouw">
          <summary>🔨 Veilinghuis</summary>
          <ul className="debug-kaarten">
            {data.begroting.actiekaarten.map((k) => (
              <li key={k.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={keuzes.kaarten.includes(k.id)}
                    onChange={() => wisselKaart(k.id)}
                  />{' '}
                  {k.naam} ({k.structureel_of_incidenteel},{' '}
                  {formatMln(k.bedrag_mln * 1e6, { decimalen: 2, teken: true })})
                </label>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section aria-labelledby="kop-verbanden">
        <h2 id="kop-verbanden">Actieve dwarsverbanden ({actieveVerbanden.length})</h2>
        <ul className="debug-verbanden">
          {actieveVerbanden.map(([id, u]) => (
            <li key={id}>
              <strong>{data.index.verbanden.get(id)?.naam ?? id}</strong>{' '}
              <span className="debug-status">
                {u.status}
                {u.eind !== 'midden' ? ` (${u.eind})` : ''}
              </span>
              {u.reden && <p>{u.reden}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="kop-waarom">
        <h2 id="kop-waarom">Waarom? Alle effecten</h2>
        <label>
          Jaar{' '}
          <select value={jaarFilter} onChange={(e) => setJaarFilter(Number(e.target.value))}>
            {data.jaren.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </label>
        <ul className="debug-effecten" data-testid="effecten">
          {resultaat.effecten
            .filter((e) => e.jaar === jaarFilter)
            .map((e, i) => (
              <li
                key={`${e.bron}-${e.doel}-${i}`}
                className={e.zekerheid !== 'feit' ? 'aanname' : ''}
              >
                {beschrijf(data, e)}
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function getalKlasse(x: number | undefined): string {
  if (!x || Math.abs(x) < 0.5) return '';
  return x > 0 ? 'positief' : 'negatief';
}

type SchuifProps = {
  id: string;
  label: string;
  min: number;
  max: number;
  waarde: number;
  vergrendeld?: boolean;
  wettelijk?: boolean;
  onChange: (waarde: number) => void;
};

function Schuif({ id, label, min, max, waarde, vergrendeld, wettelijk, onChange }: SchuifProps) {
  return (
    <div className="debug-schuif">
      <label htmlFor={id}>
        {vergrendeld ? '🔒 ' : wettelijk ? '⚖️ ' : ''}
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={STAP}
        value={waarde}
        disabled={vergrendeld}
        aria-valuetext={formatPct(waarde)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output htmlFor={id}>{formatPct(waarde)}</output>
    </div>
  );
}

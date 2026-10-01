/**
 * "Waarom?": elk bedrag in de HUD terug naar de effecten die het maken (opdracht 6.2, stap 6).
 * Directe effecten zijn feiten uit de begroting; kettingeffecten zijn aannames (⚠︎).
 */
import { useState } from 'react';
import {
  AANNAME_LABEL,
  beschrijf,
  formatMln,
  grootsteBronnen,
  type Data,
  type Resultaat,
} from '../../engine';
import { Dialoog } from '../algemeen/Dialoog';

export function WaaromDialoog({
  open,
  onSluit,
  data,
  resultaat,
}: {
  open: boolean;
  onSluit: () => void;
  data: Data;
  resultaat: Resultaat;
}) {
  const [jaar, setJaar] = useState(data.jaren[0] ?? 0);
  const naam = (bron: string) =>
    data.index.onderdelen.get(bron)?.naam ??
    data.index.belastingen.get(bron)?.naam ??
    data.index.kaarten.get(bron)?.naam ??
    (bron === 'reserve' ? 'Storting in de reserve' : undefined) ??
    `⚠︎ ${data.index.verbanden.get(bron)?.naam ?? bron}`;
  const bronnen = grootsteBronnen(resultaat, jaar);
  const effecten = resultaat.effecten.filter((e) => e.jaar === jaar);
  return (
    <Dialoog open={open} onSluit={onSluit} titel="Waarom dit bedrag?" breed>
      <p>
        <strong>Elk jaar</strong> (structureel) is geld dat elk jaar terugkomt.{' '}
        <strong>Eenmalig</strong> is geld dat je één keer hebt of uitgeeft. Vaste lasten moet je met
        structureel geld betalen.
      </p>
      <div className="tabel-scroll">
        <table className="tabel">
          <caption>Saldo per jaar, ten opzichte van de begroting</caption>
          <thead>
            <tr>
              <th scope="col">Jaar</th>
              <th scope="col">Elk jaar</th>
              <th scope="col">Eenmalig</th>
            </tr>
          </thead>
          <tbody>
            {data.jaren.map((j) => (
              <tr key={j}>
                <th scope="row">{j}</th>
                <td>{formatMln(resultaat.perJaar[j]?.structureel ?? 0, { teken: true })}</td>
                <td>{formatMln(resultaat.perJaar[j]?.incidenteel ?? 0, { teken: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="veld-inline">
        Toon jaar{' '}
        <select value={jaar} onChange={(e) => setJaar(Number(e.target.value))}>
          {data.jaren.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
      </label>
      {bronnen.length === 0 ? (
        <p>Je hebt nog niets veranderd. Het saldo is daarom € 0.</p>
      ) : (
        <>
          <h3>Waar het geld vandaan komt en naartoe gaat in {jaar}</h3>
          <ul className="bronnen">
            {bronnen.map((b) => (
              <li key={b.bron}>
                <span>{naam(b.bron)}</span>
                <span className={b.bedrag >= 0 ? 'positief' : 'negatief'}>
                  {formatMln(b.bedrag, { decimalen: 2, teken: true })}
                </span>
              </li>
            ))}
          </ul>
          <details>
            <summary>Alle berekeningen ({effecten.length})</summary>
            <ul className="effecten">
              {effecten.map((e, i) => (
                <li key={`${e.bron}-${e.doel}-${i}`}>{beschrijf(data, e)}</li>
              ))}
            </ul>
          </details>
          <p className="klein">{data.teksten.aanname_uitleg.replace('⚠︎', AANNAME_LABEL)}</p>
        </>
      )}
    </Dialoog>
  );
}

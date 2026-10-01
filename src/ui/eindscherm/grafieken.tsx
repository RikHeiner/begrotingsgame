/**
 * Kleine grafieken voor het eindscherm, in SVG. Kleuren als tokens (licht en donker apart
 * gevalideerd). Plus en min staan boven en onder de nullijn en hebben een teken in het label, dus
 * nooit alleen kleur. Elke grafiek heeft een tabel als alternatief.
 */
import { formatMln, type Data, type Resultaat } from '../../engine';
import type { ThemaRij } from '../../game/score';

const kort = (euro: number) => formatMln(euro, { teken: true }).replace(' mln', '');

export function SaldoGrafiek({ data, resultaat }: { data: Data; resultaat: Resultaat }) {
  const jaren = data.jaren;
  const waarden = jaren.map((j) => resultaat.perJaar[j]?.structureel ?? 0);
  const eenmalig = jaren.map((j) => resultaat.perJaar[j]?.incidenteel ?? 0);
  const max = Math.max(1e6, ...waarden.map(Math.abs));
  const B = 320;
  const H = 150;
  const midden = H / 2;
  const kolom = B / jaren.length;
  const balk = Math.min(36, kolom * 0.45);
  const schaal = (midden - 26) / max;
  return (
    <figure className="grafiek">
      <svg viewBox={`0 0 ${B} ${H}`} role="img" aria-labelledby="saldo-titel">
        <title id="saldo-titel">Structureel saldo per jaar ten opzichte van de begroting</title>
        <line x1="0" x2={B} y1={midden} y2={midden} className="as" />
        {waarden.map((w, i) => {
          const x = i * kolom + kolom / 2;
          const h = Math.max(1, Math.abs(w) * schaal);
          const y = w >= 0 ? midden - h : midden;
          const plus = w >= 0;
          return (
            <g key={jaren[i]}>
              <path
                className={plus ? 'balk-plus' : 'balk-min'}
                d={
                  plus
                    ? `M${x - balk / 2} ${midden} V${y + 4} q0 -4 4 -4 H${x + balk / 2 - 4} q4 0 4 4 V${midden} Z`
                    : `M${x - balk / 2} ${midden} V${y + h - 4} q0 4 4 4 H${x + balk / 2 - 4} q4 0 4 -4 V${midden} Z`
                }
              >
                <title>
                  {jaren[i]}: {formatMln(w, { teken: true })} per jaar
                  {eenmalig[i] ? `, eenmalig ${formatMln(eenmalig[i] ?? 0, { teken: true })}` : ''}
                </title>
              </path>
              <text x={x} y={plus ? y - 6 : y + h + 14} className="waarde" textAnchor="middle">
                {kort(w)}
              </text>
              <text x={x} y={H - 2} className="jaar" textAnchor="middle">
                {jaren[i]}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="klein">
        In miljoenen euro's per jaar. Boven de lijn houd je geld over, eronder kom je tekort.
      </figcaption>
      <details>
        <summary>Als tabel</summary>
        <table className="tabel">
          <thead>
            <tr>
              <th scope="col">Jaar</th>
              <th scope="col">Elk jaar</th>
              <th scope="col">Eenmalig</th>
            </tr>
          </thead>
          <tbody>
            {jaren.map((j, i) => (
              <tr key={j}>
                <th scope="row">{j}</th>
                <td>{formatMln(waarden[i] ?? 0, { teken: true })}</td>
                <td>{formatMln(eenmalig[i] ?? 0, { teken: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function VergelijkGrafiek({
  rijen,
  naamVergelijking,
}: {
  rijen: ThemaRij[];
  naamVergelijking: string;
}) {
  const max = Math.max(1e6, ...rijen.flatMap((r) => [Math.abs(r.jij), Math.abs(r.vergelijking)]));
  const B = 340;
  const labelB = 0;
  const rijH = 46;
  const H = rijen.length * rijH + 8;
  const nul = B / 2;
  const schaal = (B / 2 - 44) / max;
  const balk = (y: number, w: number, klasse: string, titel: string) => {
    if (Math.abs(w) < 50_000) return null;
    const l = Math.max(1, Math.abs(w) * schaal);
    const x = w >= 0 ? nul : nul - l;
    return (
      <g>
        <rect x={x} y={y} width={l} height={10} rx={3} className={klasse}>
          <title>{titel}</title>
        </rect>
        <text
          x={w >= 0 ? x + l + 4 : x - 4}
          y={y + 9}
          className="waarde"
          textAnchor={w >= 0 ? 'start' : 'end'}
        >
          {kort(w)}
        </text>
      </g>
    );
  };
  return (
    <figure className="grafiek">
      <p className="legenda" aria-hidden="true">
        <span className="legenda-item">
          <span className="stip reeks-jij" /> Jij
        </span>
        <span className="legenda-item">
          <span className="stip reeks-vergelijking" /> {naamVergelijking}
        </span>
      </p>
      <svg viewBox={`0 0 ${B + labelB} ${H}`} role="img" aria-labelledby="vergelijk-titel">
        <title id="vergelijk-titel">Jouw keuzes per thema naast de {naamVergelijking}</title>
        <line x1={nul} x2={nul} y1="0" y2={H} className="as" />
        {rijen.map((r, i) => {
          const y = i * rijH + 4;
          return (
            <g key={r.thema}>
              <text x="0" y={y + 9} className="thema">
                {r.thema}
              </text>
              {balk(
                y + 14,
                r.jij,
                'reeks-jij',
                `${r.thema}, jij: ${formatMln(r.jij, { teken: true })}`,
              )}
              {balk(
                y + 27,
                r.vergelijking,
                'reeks-vergelijking',
                `${r.thema}, ${naamVergelijking}: ${formatMln(r.vergelijking, { teken: true })}`,
              )}
            </g>
          );
        })}
      </svg>
      <details>
        <summary>Als tabel</summary>
        <div className="tabel-scroll">
          <table className="tabel">
            <thead>
              <tr>
                <th scope="col">Thema</th>
                <th scope="col">Jij</th>
                <th scope="col">College</th>
                <th scope="col">{naamVergelijking}</th>
              </tr>
            </thead>
            <tbody>
              {rijen.map((r) => (
                <tr key={r.thema}>
                  <th scope="row">{r.thema}</th>
                  <td>{formatMln(r.jij, { teken: true })}</td>
                  <td>€ 0,0 mln</td>
                  <td>{formatMln(r.vergelijking, { teken: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

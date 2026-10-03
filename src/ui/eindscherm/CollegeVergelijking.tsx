/** Jouw begroting naast die van het college: uitgaven per thema en de inkomsten uit belastingen. */
import { useMemo } from 'react';
import { formatMln, type Data, type Resultaat } from '../../engine';
import { vergelijkMetCollege } from '../../game/nulbasis';
import { THEMA_BELASTINGEN, THEMA_KAARTEN } from '../../game/score';

const mln = (euro: number) => formatMln(euro, { decimalen: 1 });

export function CollegeVergelijking({ data, resultaat }: { data: Data; resultaat: Resultaat }) {
  const rijen = useMemo(() => vergelijkMetCollege(data, resultaat), [data, resultaat]);
  const uitgaven = rijen.filter((r) => r.thema !== THEMA_BELASTINGEN);
  const inkomsten = rijen.find((r) => r.thema === THEMA_BELASTINGEN);
  const som = (k: 'college' | 'jij') => uitgaven.reduce((s, r) => s + r[k], 0);
  const verschil = (r: { college: number; jij: number }) => {
    const v = r.jij - r.college;
    return Math.abs(v) < 5e4 ? 'gelijk' : formatMln(v, { teken: true, decimalen: 1 });
  };
  return (
    <section className="eind-blok" data-testid="college-vergelijking">
      <h2>Jouw begroting naast die van het college</h2>
      <p className="klein">
        In {data.jaren[0]}, per thema. Zonder kettingeffecten: die staan bij het saldo.
      </p>
      <div className="tabel-scroll">
        <table className="tabel college-tabel">
          <thead>
            <tr>
              <th scope="col" className="links">
                Uitgaven
              </th>
              <th scope="col">College</th>
              <th scope="col">Jij</th>
              <th scope="col">Verschil</th>
            </tr>
          </thead>
          <tbody>
            {uitgaven.map((r) => (
              <tr key={r.thema}>
                <th scope="row" className="links">
                  {r.thema === THEMA_KAARTEN ? `${r.thema} (netto)` : r.thema}
                </th>
                <td>{mln(r.college)}</td>
                <td>{mln(r.jij)}</td>
                <td>{verschil(r)}</td>
              </tr>
            ))}
            <tr className="totaal">
              <th scope="row" className="links">
                Totaal uitgaven
              </th>
              <td>{mln(som('college'))}</td>
              <td>{mln(som('jij'))}</td>
              <td>{verschil({ college: som('college'), jij: som('jij') })}</td>
            </tr>
            {inkomsten && (
              <tr className="totaal">
                <th scope="row" className="links">
                  Inkomsten uit belastingen
                </th>
                <td>{mln(inkomsten.college)}</td>
                <td>{mln(inkomsten.jij)}</td>
                <td>{verschil(inkomsten)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

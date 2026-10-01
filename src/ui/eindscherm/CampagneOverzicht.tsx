/** Eindscherm in de campagne: wat er per ronde gebeurde en hoe het saldo er toen voor stond. */
import { formatMln, type Data, type Resultaat } from '../../engine';
import { jaarVanRonde, kaartBedrag } from '../../game/campagne';
import { useSpel } from '../../game/state/store';

export function CampagneOverzicht({ data, resultaat }: { data: Data; resultaat: Resultaat }) {
  const campagne = useSpel((s) => s.campagne);
  if (!campagne) return null;
  const rondes = data.jaren.slice(0, campagne.ronde);
  const goed = rondes.filter((j) => resultaat.regels.perJaarSluitend[j]).length;
  return (
    <section className="eind-blok" data-testid="campagne-overzicht">
      <h2>Je campagne</h2>
      <p>
        Je bestuurde de gemeente {rondes.length} jaar. In {goed} van de {rondes.length} jaren sloot
        de begroting.
      </p>
      <div className="tabel-scroll">
        <table className="tabel">
          <thead>
            <tr>
              <th scope="col">Jaar</th>
              <th scope="col" className="links">
                Wat er gebeurde
              </th>
              <th scope="col">Elk jaar</th>
              <th scope="col">Eenmalig</th>
              <th scope="col">Sluitend</th>
            </tr>
          </thead>
          <tbody>
            {rondes.map((jaar, i) => (
              <tr key={jaar}>
                <th scope="row">{jaar}</th>
                <td className="links">
                  {(campagne.getrokken[i] ?? []).map((id) => {
                    const g = data.index.gebeurtenissen.get(id);
                    const { bedrag } = kaartBedrag(resultaat, id, jaarVanRonde(data, i + 1));
                    return (
                      <span key={id} className="campagne-kaart">
                        {bedrag >= 0 ? '🎉' : '⚡'} {g?.naam ?? id} (
                        {formatMln(bedrag, { teken: true })})
                      </span>
                    );
                  })}
                </td>
                <td>{formatMln(resultaat.perJaar[jaar]?.structureel ?? 0, { teken: true })}</td>
                <td>{formatMln(resultaat.perJaar[jaar]?.incidenteel ?? 0, { teken: true })}</td>
                <td>{resultaat.regels.perJaarSluitend[jaar] ? '✓ ja' : '✗ nee'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="klein">
        ⚠︎ De bedragen van de gebeurtenissen zijn scenario’s, geen voorspellingen.
      </p>
    </section>
  );
}

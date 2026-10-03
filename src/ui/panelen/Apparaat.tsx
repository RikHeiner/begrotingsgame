/**
 * Het ambtenarenapparaat in het Beleidshuis: hoeveel ambtenaren de gemeente heeft, hoe dat
 * groeide, en hoe dat zich verhoudt tot andere grote gemeenten (data/apparaat-JJJJ.json). Bij elk
 * getal staat het jaar, want de cijfers van andere gemeenten komen uit hun eigen begroting.
 */
import { formatMln, type Data } from '../../engine';

const getal = (x: number, decimalen = 1) =>
  x.toLocaleString('nl-NL', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen });

export function Apparaat({ data }: { data: Data }) {
  const a = data.apparaat;
  if (!a) return null;
  const g = a.groningen;
  const behaald = g.formatie_per_1000.filter((x) => x.soort === 'behaald');
  const eerste = behaald[0];
  const laatste = behaald.at(-1);
  const beoogd = g.formatie_per_1000.find((x) => x.soort === 'beoogd');
  const andere = a.andere
    .filter((x) => x.formatie_per_1000 !== null)
    .sort((x, y) => (x.formatie_per_1000 ?? 0) - (y.formatie_per_1000 ?? 0));
  const groei =
    eerste && laatste ? Math.round((laatste.waarde / eerste.waarde - 1) * 100) : undefined;
  return (
    <section className="apparaat" aria-labelledby="apparaat-kop" data-testid="apparaat">
      <h3 id="apparaat-kop">Het ambtenarenapparaat</h3>
      <p>
        In de begroting {a.begrotingsjaar} heeft de gemeente{' '}
        <strong>{g.fte.toLocaleString('nl-NL')} fte</strong> aan ambtenaren. Samen kosten ze{' '}
        <strong>{formatMln(g.loonsom_x1000 * 1000)}</strong> per jaar, plus{' '}
        {formatMln(g.externe_inhuur_x1000 * 1000)} voor ingehuurde krachten.
      </p>
      {eerste && laatste && (
        <p>
          Ambtenaren per 1.000 inwoners: {getal(eerste.waarde)} in {eerste.jaar}, en{' '}
          <strong>
            {getal(laatste.waarde)} in {laatste.jaar}
          </strong>
          {groei !== undefined && groei > 0 ? ` (${groei}% meer)` : ''}.
          {beoogd ? ` Het college wil in ${beoogd.jaar} naar ${getal(beoogd.waarde)}.` : ''}
        </p>
      )}
      {andere.length > 0 && (
        <>
          <h4>Andere grote gemeenten</h4>
          <p className="klein">
            Fte per 1.000 inwoners, uit de eigen begroting van elke gemeente. Bij elk getal staat
            het jaar, en of het een plan uit de begroting is of wat er echt was. Gemeenten regelen
            niet alles op dezelfde manier: sommige laten werk doen door een samenwerkingsverband,
            dan tellen die mensen niet mee.
          </p>
          <ul className="apparaat-lijst">
            {[
              ...(beoogd
                ? [{ naam: 'Groningen', jaar: beoogd.jaar, soort: 'beoogd', waarde: beoogd.waarde }]
                : []),
              ...(laatste
                ? [
                    {
                      naam: 'Groningen',
                      jaar: laatste.jaar,
                      soort: 'behaald',
                      waarde: laatste.waarde,
                    },
                  ]
                : []),
              ...andere.map((x) => ({
                naam: x.naam,
                jaar: x.jaar,
                soort: x.soort,
                waarde: x.formatie_per_1000 ?? 0,
                url: x.url,
              })),
            ]
              .sort((x, y) => x.waarde - y.waarde)
              .map(
                (x: {
                  naam: string;
                  jaar: number;
                  soort: string;
                  waarde: number;
                  url?: string;
                }) => (
                  <li
                    key={`${x.naam}-${x.jaar}`}
                    className={x.naam === 'Groningen' ? 'eigen' : undefined}
                  >
                    <span>
                      {x.url ? (
                        <a href={x.url} target="_blank" rel="noopener noreferrer">
                          {x.naam}
                        </a>
                      ) : (
                        <strong>{x.naam}</strong>
                      )}{' '}
                      <span className="klein">
                        ({x.soort === 'beoogd' ? `begroting ${x.jaar}` : `echt in ${x.jaar}`})
                      </span>
                    </span>
                    <span>{getal(x.waarde)}</span>
                  </li>
                ),
              )}
          </ul>
        </>
      )}
      <p className="klein">Bron: {a.bron.titel}.</p>
    </section>
  );
}

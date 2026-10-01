import { blijeInwoners, type Data, type Resultaat } from '../../engine';
import { personaInvloeden, personaZinnen } from '../../game/score';
import { Dialoog } from '../algemeen/Dialoog';
import { gezicht } from './gezicht';

function Balk({ waarde }: { waarde: number }) {
  return (
    <span className="meterbalk" aria-hidden="true">
      <span
        style={{ width: `${Math.round(waarde)}%` }}
        className={waarde < 40 ? 'laag' : waarde > 60 ? 'hoog' : ''}
      />
      <span className="meterbalk-midden" />
    </span>
  );
}

/** De meters en de inwoners. Uitdrukkelijk een spelregel, geen voorspelling. */
export function InwonersDialoog({
  open,
  onSluit,
  data,
  resultaat,
  onVoorMij,
}: {
  open: boolean;
  onSluit: () => void;
  data: Data;
  resultaat: Resultaat;
  /** opent "Wat betekent het voor mij?" (alleen als de tarieven bekend zijn) */
  onVoorMij?: () => void;
}) {
  const gebied = new Map(data.gebieden.gebieden.map((g) => [g.id, g.naam]));
  const zinnen = new Map(personaZinnen(data, resultaat).map((z) => [z.id, z.zin]));
  return (
    <Dialoog
      open={open}
      onSluit={onSluit}
      titel={`Blije inwoners: ${Math.round(blijeInwoners(resultaat.personas))}`}
      breed
    >
      <p className="klein">{data.teksten.meters_uitleg}</p>
      <h3>Meters</h3>
      <ul className="meters">
        {data.meters.meters.map((m) => (
          <li key={m.id}>
            <span>
              {m.icoon} {m.naam}
            </span>
            <Balk waarde={resultaat.meters[m.id]} />
            <span className="getal">{Math.round(resultaat.meters[m.id])}</span>
          </li>
        ))}
      </ul>
      {onVoorMij && data.tarieven && (
        <button
          type="button"
          className="knop voormij-knop"
          onClick={onVoorMij}
          data-testid="open-voor-mij"
        >
          👤 Wat betekent het voor mij?
        </button>
      )}
      <h3>Inwoners</h3>
      <p className="klein">
        Bedachte inwoners, om te laten zien wie wat merkt. Tik op een naam voor meer.
      </p>
      <ul className="personas" data-testid="personas">
        {data.personas.personas.map((p) => {
          const t = resultaat.personas[p.id] ?? 50;
          const invloeden = personaInvloeden(data, resultaat, p).slice(0, 3);
          return (
            <li key={p.id}>
              <details>
                <summary>
                  <span className="persona-naam">
                    {gezicht(t)} {p.naam}
                    {p.leeftijd ? `, ${p.leeftijd}` : ''}{' '}
                    <span className="klein">({gebied.get(p.gebied)})</span>
                  </span>
                  <Balk waarde={t} />
                  <span className="getal">{Math.round(t)}</span>
                </summary>
                <div className="persona-meer">
                  <p>{p.situatie}</p>
                  {invloeden.length === 0 && <p>{zinnen.get(p.id)}</p>}
                  {invloeden.length > 0 && (
                    <ul className="invloeden">
                      {invloeden.map((x) => (
                        <li key={x.tekst} className={x.waarde > 0 ? 'positief' : 'negatief'}>
                          {x.waarde > 0 ? '▲ blij met' : '▼ last van'} {x.tekst}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </Dialoog>
  );
}

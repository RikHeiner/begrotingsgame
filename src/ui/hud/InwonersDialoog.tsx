import type { Data, Resultaat } from '../../engine';
import { personaInvloeden, personaZinnen } from '../../game/score';
import { Dialoog } from '../algemeen/Dialoog';

/**
 * De inwoners: wie merkt wat van jouw keuzes. Zonder score of meters: die namen de huidige
 * begroting als nulpunt, en dat zegt niets over hoe tevreden mensen nu zijn (besluit 1 oktober 2026).
 */
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
    <Dialoog open={open} onSluit={onSluit} titel="Inwoners" breed>
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
      <p className="klein">{data.teksten.inwoners_uitleg} Tik op een naam voor meer.</p>
      <ul className="personas" data-testid="personas">
        {data.personas.personas.map((p) => {
          const invloeden = personaInvloeden(data, resultaat, p).slice(0, 3);
          return (
            <li key={p.id}>
              <details>
                <summary>
                  <span className="persona-naam">
                    {p.naam}
                    {p.leeftijd ? `, ${p.leeftijd}` : ''}{' '}
                    <span className="klein">({gebied.get(p.gebied)})</span>
                  </span>
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

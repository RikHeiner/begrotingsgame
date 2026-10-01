import { blijeInwoners, type Data, type Resultaat } from '../../engine';
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
}: {
  open: boolean;
  onSluit: () => void;
  data: Data;
  resultaat: Resultaat;
}) {
  const gebied = new Map(data.gebieden.gebieden.map((g) => [g.id, g.naam]));
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
      <h3>Inwoners</h3>
      <ul className="meters">
        {data.personas.personas.map((p) => {
          const t = resultaat.personas[p.id] ?? 50;
          return (
            <li key={p.id}>
              <span>
                {gezicht(t)} {p.naam} <span className="klein">({gebied.get(p.gebied)})</span>
              </span>
              <Balk waarde={t} />
              <span className="getal">{Math.round(t)}</span>
            </li>
          );
        })}
      </ul>
    </Dialoog>
  );
}

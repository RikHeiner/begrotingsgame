/**
 * Toegankelijk alternatief voor de kaart (opdracht 8.2): alle gebouwen en posten als lijst, met
 * dezelfde schuiven en kaarten. Werkt met alleen het toetsenbord en met een schermlezer.
 */
import { formatMln, type Data, type Resultaat } from '../../engine';
import { useSpel } from '../../game/state/store';
import { TOESTAND_NAAM, type GebouwStand } from '../../game/toestand';
import { GebouwPosten } from '../panelen/GebouwPosten';

export function Lijstweergave({
  data,
  resultaat,
  standen,
}: {
  data: Data;
  resultaat: Resultaat;
  standen: Record<string, GebouwStand>;
}) {
  const gebied = new Map(data.gebieden.gebieden.map((g) => [g.id, g.naam]));
  const openMinigame = useSpel((s) => s.openMinigame);
  const gespeeld = useSpel((s) => s.gespeeld);
  return (
    <section aria-labelledby="lijst-kop" className="lijst" data-testid="lijstweergave">
      <h2 id="lijst-kop">Alle gebouwen en posten</h2>
      {data.gebouwen.map((g) => {
        const s = standen[g.id];
        return (
          <details key={g.id} className="lijst-gebouw">
            <summary>
              <span className="lijst-naam">
                {g.icoon} {g.naam}
              </span>
              <span className="lijst-info">
                {gebied.get(g.gebied)}
                {s ? ` · ${TOESTAND_NAAM[s.toestand]}` : ''}
                {s && Math.abs(s.bedrag) >= 50_000
                  ? ` · ${formatMln(s.bedrag, { teken: true })}`
                  : ''}
              </span>
            </summary>
            <p className="paneel-sub">{g.omschrijving}</p>
            <GebouwPosten gebouw={g} data={data} resultaat={resultaat} />
          </details>
        );
      })}
      <h3 className="lijst-minigames-kop">Minigames in bekende gebouwen</h3>
      <ul className="lijst-minigames">
        {data.minigames.map((m) => (
          <li key={m.id}>
            <button type="button" className="knop" onClick={() => openMinigame(m.id)}>
              {m.icoon} {m.naam}: {m.spel}
              {gespeeld.includes(m.id) && <span className="klein"> · ✓ al gespeeld</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

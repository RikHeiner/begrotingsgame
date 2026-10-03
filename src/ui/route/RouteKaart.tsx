/**
 * De route bij nul (spel/route.json): onderin beeld staat welke stap aan de beurt is, met een knop
 * naar dat gebouw. Eerst de uitleg "de gemeente heeft geld nodig", dan de belasting, dan de rest
 * in de volgorde van VVD Groningen. De speler mag ook zelf andere gebouwen openen.
 */
import { useState } from 'react';
import { formatMln, type Data, type Resultaat } from '../../engine';
import { useSpel } from '../../game/state/store';

export function RouteKaart({ data, resultaat }: { data: Data; resultaat: Resultaat }) {
  const routeStap = useSpel((s) => s.routeStap);
  const naarPost = useSpel((s) => s.naarPost);
  const [klein, setKlein] = useState(false);
  const { route } = data;
  const stap = route.stappen[routeStap];
  const gebouw = stap && data.gebouwen.find((g) => g.id === stap.gebouw);
  const vrij = formatMln(
    Math.min(...data.jaren.map((j) => resultaat.perJaar[j]?.structureel ?? 0)),
  );
  const open = () => gebouw && naarPost({ gebouw: gebouw.id, naam: gebouw.naam });

  if (klein) {
    return (
      <div className="route-kaart klein" data-testid="route">
        <button type="button" className="route-pil" onClick={() => setKlein(false)}>
          {stap ? `Stap ${routeStap + 1}: ${stap.thema}` : route.klaar.kop} ›
        </button>
      </div>
    );
  }

  return (
    <section className="route-kaart" aria-labelledby="route-kop" data-testid="route">
      <button
        type="button"
        className="knop-rond route-verberg"
        aria-label="Route kleiner maken"
        onClick={() => setKlein(true)}
      >
        ▾
      </button>
      {routeStap === 0 && stap && (
        <>
          <h2 id="route-kop">{route.intro.kop}</h2>
          <p data-testid="nul-melding">{route.intro.tekst.replace('{vrij}', vrij)}</p>
        </>
      )}
      {routeStap > 0 && stap && (
        <>
          <p className="route-stap">
            Stap {routeStap + 1} van {route.stappen.length}
          </p>
          <h2 id="route-kop">{stap.thema}</h2>
          <p>{stap.vraag}</p>
          {stap.vvd && (
            <p className="route-vvd">
              <strong>VVD Groningen vindt:</strong> {stap.vvd}
            </p>
          )}
        </>
      )}
      {!stap && (
        <>
          <h2 id="route-kop">{route.klaar.kop}</h2>
          <p>{route.klaar.tekst}</p>
        </>
      )}
      {gebouw && (
        <button type="button" className="knop-indienen route-knop" onClick={open}>
          {routeStap === 0 ? route.intro.knop : `Naar ${gebouw.naam}`}
        </button>
      )}
    </section>
  );
}

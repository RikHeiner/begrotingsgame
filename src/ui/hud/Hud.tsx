/**
 * De HUD bovenaan, altijd zichtbaar (opdracht 9): geldpotje met slot, saldo elk jaar en eenmalig,
 * blije inwoners, de missiebalk en de knop Indienen. Elk bedrag heeft een "Waarom?".
 */
import { useState } from 'react';
import { blijeInwoners, formatMln, type Data, type Resultaat } from '../../engine';
import { useSpel } from '../../game/state/store';
import { lezerVoor, missieStand } from '../../game/score';
import { Geldpotje } from './Geldpotje';
import { gezicht } from './gezicht';
import { InstellingenDialoog } from './InstellingenDialoog';
import { InwonersDialoog } from './InwonersDialoog';
import { MissieDialoog } from './MissieDialoog';
import { WaaromDialoog } from './WaaromDialoog';

type Open = 'waarom' | 'inwoners' | 'instellingen' | 'missie' | undefined;

export function Hud({ data, resultaat }: { data: Data; resultaat: Resultaat }) {
  const [open, setOpen] = useState<Open>();
  const weergave = useSpel((s) => s.weergave);
  const zetWeergave = useSpel((s) => s.zetWeergave);
  const missieId = useSpel((s) => s.missie);
  const indienen = useSpel((s) => s.indienen);
  const jaar = data.jaren[0] ?? 0;
  const s = resultaat.perJaar[jaar]?.structureel ?? 0;
  const i = resultaat.perJaar[jaar]?.incidenteel ?? 0;
  const blij = blijeInwoners(resultaat.personas);
  const missie = data.missies.missies.find((m) => m.id === missieId);
  const stand = missie ? missieStand(missie, lezerVoor(data, resultaat)) : undefined;
  const klasse = (x: number) => (x < -0.5 ? 'negatief' : x > 0.5 ? 'positief' : '');
  const minimum = Math.min(...data.jaren.map((j) => resultaat.perJaar[j]?.structureel ?? 0));

  return (
    <header className="hud">
      <div className="hud-rij">
        <Geldpotje vrij={minimum} />
        <button
          type="button"
          className="hud-getal"
          data-testid="saldo"
          onClick={() => setOpen('waarom')}
        >
          <span className="hud-label">Elk jaar</span>
          <strong className={klasse(s)}>{formatMln(s, { teken: true })}</strong>
          <span className="hud-waarom">Waarom?</span>
        </button>
        <button
          type="button"
          className="hud-getal"
          data-testid="eenmalig"
          onClick={() => setOpen('waarom')}
        >
          <span className="hud-label">Eenmalig</span>
          <strong className={klasse(i)}>{formatMln(i, { teken: true })}</strong>
          <span className="hud-waarom">Waarom?</span>
        </button>
        <button
          type="button"
          className="hud-getal hud-blij"
          data-testid="blij"
          onClick={() => setOpen('inwoners')}
          aria-label={`Blije inwoners: ${Math.round(blij)} van 100. Bekijk de inwoners en de meters.`}
        >
          <span className="hud-gezicht" aria-hidden="true">
            {gezicht(blij)}
          </span>
          <strong aria-hidden="true">{Math.round(blij)}</strong>
        </button>
      </div>
      <div className="hud-rij hud-onder">
        <button
          type="button"
          className="hud-missie"
          data-testid="missie"
          onClick={() => setOpen('missie')}
        >
          {missie ? (
            <>
              <span aria-hidden="true">{missie.icoon}</span> {missie.naam}
              {stand && (
                <span className="voortgang" aria-hidden="true">
                  <span
                    style={{ width: `${Math.round(stand.fractie * 100)}%` }}
                    className={stand.gehaald ? 'klaar' : ''}
                  />
                </span>
              )}
              {stand?.gehaald && <span className="positief"> ✓</span>}
            </>
          ) : (
            <>🎲 Vrij spel · kies een missie</>
          )}
        </button>
        <div className="wissel" role="group" aria-label="Weergave">
          <button
            type="button"
            aria-pressed={weergave === 'kaart'}
            aria-label="Kaart"
            onClick={() => zetWeergave('kaart')}
          >
            🗺️<span className="wissel-tekst"> Kaart</span>
          </button>
          <button
            type="button"
            aria-pressed={weergave === 'lijst'}
            aria-label="Lijst"
            onClick={() => zetWeergave('lijst')}
          >
            ☰<span className="wissel-tekst"> Lijst</span>
          </button>
        </div>
        <button
          type="button"
          className="knop-rond"
          aria-label="Instellingen"
          onClick={() => setOpen('instellingen')}
        >
          ⚙︎
        </button>
        <button type="button" className="knop-indienen" data-testid="indienen" onClick={indienen}>
          Indienen
        </button>
      </div>
      <WaaromDialoog
        open={open === 'waarom'}
        onSluit={() => setOpen(undefined)}
        data={data}
        resultaat={resultaat}
      />
      <InwonersDialoog
        open={open === 'inwoners'}
        onSluit={() => setOpen(undefined)}
        data={data}
        resultaat={resultaat}
      />
      <InstellingenDialoog
        open={open === 'instellingen'}
        onSluit={() => setOpen(undefined)}
        data={data}
        resultaat={resultaat}
      />
      <MissieDialoog
        open={open === 'missie'}
        onSluit={() => setOpen(undefined)}
        data={data}
        resultaat={resultaat}
      />
    </header>
  );
}

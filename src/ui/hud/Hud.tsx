/**
 * De HUD bovenaan, altijd zichtbaar (opdracht 9): geldpotje met slot, saldo elk jaar en eenmalig,
 * de inwoners en de knop Indienen. Elk bedrag heeft een "Waarom?".
 */
import { useState } from 'react';
import { formatMln, type Data, type Resultaat } from '../../engine';
import { useSpel } from '../../game/state/store';
import { Geldpotje } from './Geldpotje';
import { InstellingenDialoog } from './InstellingenDialoog';
import { InwonersDialoog } from './InwonersDialoog';
import { OpslaanDialoog } from './OpslaanDialoog';
import { VoorMijDialoog } from './VoorMijDialoog';
import { WaaromDialoog } from './WaaromDialoog';

type Open = 'waarom' | 'inwoners' | 'instellingen' | 'voormij' | 'opslaan' | undefined;

export function Hud({ data, resultaat }: { data: Data; resultaat: Resultaat }) {
  const [open, setOpen] = useState<Open>();
  const weergave = useSpel((s) => s.weergave);
  const zetWeergave = useSpel((s) => s.zetWeergave);
  const indienen = useSpel((s) => s.indienen);
  const jaar = data.jaren[0] ?? data.config.actiefJaar;
  const s = resultaat.perJaar[jaar]?.structureel ?? 0;
  const i = resultaat.perJaar[jaar]?.incidenteel ?? 0;
  const klasse = (x: number) => (x < -0.5 ? 'negatief' : x > 0.5 ? 'positief' : '');
  // Het slot kijkt naar het slechtste jaar van de meerjarenraming.
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
          data-testid="inwoners"
          onClick={() => setOpen('inwoners')}
          aria-label="Inwoners: wie merkt wat van jouw keuzes?"
        >
          <span className="hud-gezicht" aria-hidden="true">
            👥
          </span>
          <span className="hud-label hud-inwoners-tekst">Inwoners</span>
        </button>
      </div>
      <div className="hud-rij hud-onder">
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
        <button
          type="button"
          className="knop hud-opslaan"
          aria-label="Opslaan en later verder"
          data-testid="opslaan"
          onClick={() => setOpen('opslaan')}
        >
          💾<span className="wissel-tekst"> Opslaan</span>
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
        // Het close-event komt ook als we doorgaan naar "Wat betekent het voor mij?".
        onSluit={() => setOpen((o) => (o === 'inwoners' ? undefined : o))}
        data={data}
        resultaat={resultaat}
        onVoorMij={() => setOpen('voormij')}
      />
      <VoorMijDialoog
        open={open === 'voormij'}
        onSluit={() => setOpen(undefined)}
        data={data}
        resultaat={resultaat}
      />
      <OpslaanDialoog
        open={open === 'opslaan'}
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
    </header>
  );
}

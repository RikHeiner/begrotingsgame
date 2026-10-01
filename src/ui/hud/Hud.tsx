/**
 * De HUD bovenaan, altijd zichtbaar (opdracht 9): geldpotje met slot, saldo elk jaar en eenmalig,
 * de inwoners, de campagne en de knop Indienen. Elk bedrag heeft een "Waarom?".
 */
import { useState } from 'react';
import { formatMln, type Data, type Resultaat } from '../../engine';
import { huidigJaar, useSpel } from '../../game/state/store';
import { CampagneDialoog } from './CampagneDialoog';
import { GebeurtenisDialoog } from './GebeurtenisDialoog';
import { Geldpotje } from './Geldpotje';
import { InstellingenDialoog } from './InstellingenDialoog';
import { InwonersDialoog } from './InwonersDialoog';
import { VoorMijDialoog } from './VoorMijDialoog';
import { WaaromDialoog } from './WaaromDialoog';

type Open = 'waarom' | 'inwoners' | 'instellingen' | 'campagne' | 'voormij' | undefined;

export function Hud({ data, resultaat }: { data: Data; resultaat: Resultaat }) {
  const [open, setOpen] = useState<Open>();
  const weergave = useSpel((s) => s.weergave);
  const zetWeergave = useSpel((s) => s.zetWeergave);
  const indienen = useSpel((s) => s.indienen);
  const campagne = useSpel((s) => s.campagne);
  const volgendeRonde = useSpel((s) => s.volgendeRonde);
  const zetKaartenOpen = useSpel((s) => s.zetKaartenOpen);
  const jaar = huidigJaar(data, campagne);
  const laatsteRonde = campagne?.ronde === data.jaren.length;
  const s = resultaat.perJaar[jaar]?.structureel ?? 0;
  const i = resultaat.perJaar[jaar]?.incidenteel ?? 0;
  const klasse = (x: number) => (x < -0.5 ? 'negatief' : x > 0.5 ? 'positief' : '');
  // In de campagne liggen eerdere jaren vast: het slot kijkt naar dit jaar en later.
  const minimum = Math.min(
    ...data.jaren.filter((j) => j >= jaar).map((j) => resultaat.perJaar[j]?.structureel ?? 0),
  );

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
          <span className="hud-label">{campagne ? `Elk jaar (${jaar})` : 'Elk jaar'}</span>
          <strong className={klasse(s)}>{formatMln(s, { teken: true })}</strong>
          <span className="hud-waarom">Waarom?</span>
        </button>
        <button
          type="button"
          className="hud-getal"
          data-testid="eenmalig"
          onClick={() => setOpen('waarom')}
        >
          <span className="hud-label">{campagne ? `Eenmalig (${jaar})` : 'Eenmalig'}</span>
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
        {campagne && (
          <button
            type="button"
            className="hud-ronde"
            data-testid="ronde"
            onClick={() => zetKaartenOpen(true)}
          >
            Ronde {campagne.ronde}/{data.jaren.length} · {jaar}
          </button>
        )}
        <button
          type="button"
          className="hud-missie"
          data-testid="campagne"
          onClick={() => setOpen('campagne')}
        >
          {campagne ? <>🗓️ Campagne</> : <>🗓️ Speel vier jaar (campagne)</>}
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
        {campagne && !laatsteRonde ? (
          <button
            type="button"
            className="knop-indienen"
            data-testid="volgende-ronde"
            onClick={volgendeRonde}
          >
            Naar {jaar + 1} →
          </button>
        ) : (
          <button type="button" className="knop-indienen" data-testid="indienen" onClick={indienen}>
            Indienen
          </button>
        )}
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
      <InstellingenDialoog
        open={open === 'instellingen'}
        onSluit={() => setOpen(undefined)}
        data={data}
        resultaat={resultaat}
      />
      <GebeurtenisDialoog data={data} resultaat={resultaat} />
      <CampagneDialoog open={open === 'campagne'} onSluit={() => setOpen(undefined)} data={data} />
    </header>
  );
}

import { useState } from 'react';
import { formatMln, type Data, type Resultaat } from '../../engine';
import type { Scenario } from '../../engine/schema';
import { SCENARIO_NAMEN } from '../../engine/scenario';
import { useSpel } from '../../game/state/store';
import { Dialoog } from '../algemeen/Dialoog';
import { FoutMelden } from '../algemeen/FoutMelden';

/** Scenario voor aannames, storting in de reserve, geluid en het colofon. */
export function InstellingenDialoog({
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
  const zetScenario = useSpel((s) => s.zetScenario);
  const zetReserve = useSpel((s) => s.zetReserve);
  const geluid = useSpel((s) => s.geluid);
  const zetGeluid = useSpel((s) => s.zetGeluid);
  const zetStartscherm = useSpel((s) => s.zetStartscherm);
  const begin = useSpel((s) => s.begin);
  const beginpunt = useSpel((s) => s.beginpunt);
  const modus = useSpel((s) => s.modus);
  const zetModus = useSpel((s) => s.zetModus);
  const k = resultaat.keuzes;
  const [reserve, setReserve] = useState({
    structureel: (k.reserve?.structureel ?? 0) / 1e6,
    eenmalig: (k.reserve?.eenmalig ?? 0) / 1e6,
  });
  const laatste = data.jaren.at(-1) ?? 0;
  return (
    <Dialoog open={open} onSluit={onSluit} titel="Instellingen">
      <p>
        <button
          type="button"
          className="knop"
          data-testid="uitleg"
          onClick={() => {
            onSluit();
            zetStartscherm('uitleg');
          }}
        >
          Uitleg van de game
        </button>
      </p>
      <fieldset className="veldgroep">
        <legend>Hoe speel je?</legend>
        {(
          [
            ['snel', 'Snel spelen: weinig tekst en knoppen'],
            ['uitgebreid', 'Uitgebreid: met alle cijfers en uitleg'],
          ] as const
        ).map(([m, tekst]) => (
          <label key={m} className="keuze">
            <input type="radio" name="modus" checked={modus === m} onChange={() => zetModus(m)} />{' '}
            {tekst}
          </label>
        ))}
      </fieldset>
      <fieldset className="veldgroep">
        <legend>Opnieuw beginnen</legend>
        <p className="klein">
          {beginpunt === 'nul'
            ? 'Opnieuw beginnen wist je keuzes. Je begint weer bij nul.'
            : 'Je bekijkt een begroting die begon bij die van het college. Opnieuw beginnen wist je keuzes; je begint dan bij nul.'}
        </p>
        <p className="knoppen-rij">
          <button
            type="button"
            className="knop"
            data-testid="opnieuw-nul"
            onClick={() => {
              begin('nul');
              onSluit();
            }}
          >
            Opnieuw bij nul
          </button>
        </p>
      </fieldset>
      <fieldset className="veldgroep">
        <legend>Aannames</legend>
        <p className="klein">
          Kettingeffecten zijn aannames. Kies hoe voorzichtig de game daarmee rekent. Bedragen uit
          de begroting veranderen niet.
        </p>
        {(['voorzichtig', 'midden', 'optimistisch'] as Scenario[]).map((s) => (
          <label key={s} className="keuze">
            <input
              type="radio"
              name="scenario"
              checked={k.scenario === s}
              onChange={() => zetScenario(s)}
            />{' '}
            {SCENARIO_NAMEN[s]}
          </label>
        ))}
      </fieldset>
      <fieldset className="veldgroep">
        <legend>Geld opzij zetten</legend>
        <p className="klein">
          Een overschot kun je uitgeven of in de reserve storten. Een grotere reserve verlaagt de
          risico's en scheelt rente (⚠︎ aanname). Weerstandsvermogen in {laatste}:{' '}
          {Math.round(resultaat.weerstandsvermogen * 100)}%.
        </p>
        <label className="veld">
          Elk jaar naar de reserve (mln)
          <input
            type="number"
            min={0}
            step={0.5}
            inputMode="decimal"
            value={reserve.structureel}
            onChange={(e) =>
              setReserve({ ...reserve, structureel: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </label>
        <label className="veld">
          Eenmalig naar de reserve (mln)
          <input
            type="number"
            min={0}
            step={0.5}
            inputMode="decimal"
            value={reserve.eenmalig}
            onChange={(e) =>
              setReserve({ ...reserve, eenmalig: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </label>
        <button
          type="button"
          className="knop"
          onClick={() =>
            zetReserve({ structureel: reserve.structureel * 1e6, eenmalig: reserve.eenmalig * 1e6 })
          }
        >
          Storten
        </button>
        {k.reserve && (
          <p className="klein">
            Nu: {formatMln(k.reserve.structureel)} per jaar en {formatMln(k.reserve.eenmalig)}{' '}
            eenmalig.
          </p>
        )}
      </fieldset>
      <fieldset className="veldgroep">
        <legend>Geluid</legend>
        <label className="keuze">
          <input type="checkbox" checked={geluid} onChange={(e) => zetGeluid(e.target.checked)} />{' '}
          Geluiden aan
        </label>
      </fieldset>
      <FoutMelden data={data} />
      <p className="klein">
        {data.teksten.colofon} Bron:{' '}
        <a href={data.begroting.bron_url} rel="noopener noreferrer">
          {data.begroting.document}
        </a>
        . <a href="#debug">Rekenmotor bekijken</a>.
      </p>
      <p className="klein">
        <a href="/privacy.html">Privacyverklaring</a> ·{' '}
        <a href="/toegankelijkheid.html">Toegankelijkheid</a>
      </p>
    </Dialoog>
  );
}

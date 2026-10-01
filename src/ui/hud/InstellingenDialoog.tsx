import { useState } from 'react';
import { formatMln, type Data, type Resultaat } from '../../engine';
import type { Scenario } from '../../engine/schema';
import { SCENARIO_NAMEN } from '../../engine/scenario';
import { useSpel } from '../../game/state/store';
import { Dialoog } from '../algemeen/Dialoog';

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
            zetStartscherm(true);
          }}
        >
          Uitleg van de game
        </button>
      </p>
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

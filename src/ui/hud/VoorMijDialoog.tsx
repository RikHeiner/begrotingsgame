/**
 * "Wat betekent het voor mij?" (opdracht 8.11). De antwoorden blijven in dit scherm: er wordt
 * niets opgeslagen of verstuurd.
 */
import { useState } from 'react';
import { formatEuro, type Data, type Resultaat } from '../../engine';
import { berekenImpact, standaardHuishouden, totaal, type Huishouden } from '../../game/impact';
import { Dialoog } from '../algemeen/Dialoog';

const euro = (x: number | undefined) => (x === undefined ? 'onbekend' : formatEuro(x));

function Verschil({ nu, straks }: { nu?: number; straks?: number }) {
  if (nu === undefined || straks === undefined) return <>–</>;
  const v = straks - nu;
  if (Math.abs(v) < 0.005) return <>gelijk</>;
  return (
    <span className={v < 0 ? 'positief' : 'negatief'}>
      {v < 0 ? '−' : '+'} {formatEuro(Math.abs(v))}
    </span>
  );
}

export function VoorMijDialoog({
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
  const [h, setH] = useState<Huishouden>(() => standaardHuishouden(data));
  const zet = (deel: Partial<Huishouden>) => setH((x) => ({ ...x, ...deel }));
  const t = data.tarieven;
  if (!t) return null;
  const rijen = berekenImpact(t, resultaat.keuzes, h);
  const som = totaal(rijen);
  const zone = t.parkeervergunning_bewoners.find((z) => z.id === h.vergunning);

  return (
    <Dialoog open={open} onSluit={onSluit} titel="Wat betekent het voor mij?" breed>
      <p>
        Vul een paar dingen in. Je ziet wat jouw begroting betekent voor de gemeentelijke
        belastingen van jouw huishouden. <strong>We slaan niets op.</strong>
      </p>
      <form className="voormij" onSubmit={(e) => e.preventDefault()} data-testid="voor-mij">
        <fieldset className="veldgroep">
          <legend>Woon je in een koophuis of een huurhuis?</legend>
          <label className="keuze">
            <input
              type="radio"
              name="woning"
              checked={h.woning === 'koop'}
              onChange={() => zet({ woning: 'koop' })}
            />
            Koophuis
          </label>
          <label className="keuze">
            <input
              type="radio"
              name="woning"
              checked={h.woning === 'huur'}
              onChange={() => zet({ woning: 'huur' })}
            />
            Huurhuis
          </label>
        </fieldset>
        {h.woning === 'koop' && (
          <label className="veld">
            WOZ-waarde van je huis (in euro’s)
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={5000}
              value={h.woz}
              onChange={(e) => zet({ woz: Math.max(0, Number(e.target.value) || 0) })}
            />
            <span className="klein">
              Gemiddeld in de gemeente: {formatEuro(data.kengetallen.gemiddelde_woz)}.
            </span>
          </label>
        )}
        <div className="voormij-rij">
          <label className="veld">
            Volwassenen
            <select
              value={h.volwassenen}
              onChange={(e) => zet({ volwassenen: Number(e.target.value) === 1 ? 1 : 2 })}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </label>
          <label className="veld">
            Kinderen
            <select value={h.kinderen} onChange={(e) => zet({ kinderen: Number(e.target.value) })}>
              <option value={0}>Geen</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3 of meer</option>
            </select>
          </label>
        </div>
        <label className="veld">
          Auto met een parkeervergunning voor bewoners
          <select
            value={h.vergunning ?? ''}
            onChange={(e) => zet({ vergunning: e.target.value || undefined })}
          >
            <option value="">Geen vergunning</option>
            {t.parkeervergunning_bewoners.map((z) => (
              <option key={z.id} value={z.id}>
                {z.kort}
              </option>
            ))}
          </select>
          {zone && <span className="klein">{zone.naam}.</span>}
        </label>
        {zone && (
          <label className="veld">
            Aantal vergunningen
            <select
              value={h.vergunningen}
              onChange={(e) => zet({ vergunningen: Number(e.target.value) === 2 ? 2 : 1 })}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </label>
        )}
        <label className="keuze">
          <input
            type="checkbox"
            checked={h.minimum}
            onChange={(e) => zet({ minimum: e.target.checked })}
          />
          Mijn inkomen ligt rond het sociaal minimum
        </label>
        {h.minimum && <p className="klein">{t.kwijtschelding.toelichting}</p>}
      </form>

      <h3>Per jaar, in {t.begrotingsjaar}</h3>
      <ul className="voormij-uitkomst" data-testid="voor-mij-tabel">
        {rijen.map((r) => (
          <li key={r.naam} data-heffing={r.naam}>
            <p className="voormij-kop">
              <strong>{r.naam}</strong>
              <span>
                <Verschil nu={r.nu} straks={r.straks} />
              </span>
            </p>
            <p className="voormij-bedragen">
              Nu {euro(r.nu)} · met jouw keuzes {euro(r.straks)}
            </p>
            <p className="klein">{r.uitleg}</p>
          </li>
        ))}
        <li className="voormij-totaal" data-heffing="Totaal">
          <p className="voormij-kop">
            <strong>Totaal</strong>
            <span data-testid="voor-mij-verschil">
              <Verschil nu={som.nu} straks={som.straks} />
            </span>
          </p>
          <p className="voormij-bedragen">
            Nu {formatEuro(som.nu)} · met jouw keuzes {formatEuro(som.straks)}
          </p>
        </li>
      </ul>
      <p className="klein">
        Alleen heffingen waarvan het tarief bekend is. Bron: {t.bron}
        {t.status !== 'feit' ? ` (⚠︎ ${t.status})` : ''}.
      </p>
    </Dialoog>
  );
}

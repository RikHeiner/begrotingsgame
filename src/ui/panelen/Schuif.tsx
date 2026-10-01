import { useState } from 'react';
import { formatPct } from '../../engine';
import { leesBedrag, pctVoorBedrag } from './bedrag';

/** Een bedrag naast de schuif: de speler typt het nieuwe bedrag, de game rekent het percentage uit. */
export type SchuifBedrag = {
  /** het huidige bedrag (bij 0%), in de eenheid hieronder */
  basis: number;
  eenheid: 'mln' | 'euro';
  /** bijvoorbeeld "Budget", "Opbrengst" of "Tarief" */
  soort: string;
};

export type SchuifProps = {
  id: string;
  label: string;
  min: number;
  max: number;
  waarde: number;
  stap?: number;
  vergrendeld?: boolean;
  beschrijving?: string;
  bedrag?: SchuifBedrag;
  onChange: (waarde: number) => void;
};

const toon = (x: number, eenheid: SchuifBedrag['eenheid']) =>
  x.toLocaleString('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: eenheid === 'mln' ? 3 : 2,
    useGrouping: eenheid === 'euro',
  });

function Bedrag({
  id,
  label,
  waarde,
  bedrag,
  onChange,
}: {
  id: string;
  label: string;
  waarde: number;
  bedrag: SchuifBedrag;
  onChange: (waarde: number) => void;
}) {
  const huidig = toon(bedrag.basis * (1 + waarde / 100), bedrag.eenheid);
  // Alleen tijdens het typen een eigen tekst; daarna weer het bedrag bij de schuif.
  const [getypt, setGetypt] = useState<string>();
  const bevestig = () => {
    const nieuw = getypt === undefined ? undefined : leesBedrag(getypt);
    setGetypt(undefined);
    if (nieuw === undefined || nieuw < 0) return;
    const pct = pctVoorBedrag(nieuw, bedrag.basis);
    if (pct !== waarde) onChange(pct);
  };
  const eenheid = bedrag.eenheid === 'mln' ? 'mln per jaar' : 'per jaar';
  return (
    <label className="schuif-bedrag" htmlFor={`${id}-bedrag`}>
      <span>{bedrag.soort}: €</span>
      <input
        id={`${id}-bedrag`}
        type="text"
        inputMode="decimal"
        value={getypt ?? huidig}
        aria-label={`${bedrag.soort} voor ${label}, in ${bedrag.eenheid === 'mln' ? 'miljoen euro' : 'euro'} per jaar`}
        onChange={(e) => setGetypt(e.target.value)}
        onBlur={bevestig}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            bevestig();
          }
        }}
      />
      <span>{eenheid}</span>
    </label>
  );
}

/**
 * Een schuif van min% tot max%, met het percentage ernaast. Toetsenbord: pijltjes per stap. Met
 * `bedrag` kan de speler ook het nieuwe bedrag intypen.
 */
export function Schuif({
  id,
  label,
  min,
  max,
  waarde,
  stap = 5,
  vergrendeld,
  beschrijving,
  bedrag,
  onChange,
}: SchuifProps) {
  const uitleg = beschrijving ? `${id}-uitleg` : undefined;
  return (
    <div className="schuif">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={stap}
        value={waarde}
        disabled={vergrendeld}
        aria-valuetext={formatPct(waarde)}
        aria-describedby={uitleg}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output htmlFor={id}>{formatPct(waarde)}</output>
      {bedrag && !vergrendeld && bedrag.basis > 0 && (
        <Bedrag id={id} label={label} waarde={waarde} bedrag={bedrag} onChange={onChange} />
      )}
      {beschrijving && (
        <p id={uitleg} className="schuif-uitleg">
          {beschrijving}
        </p>
      )}
    </div>
  );
}

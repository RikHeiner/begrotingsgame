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
  /** standaard "per jaar"; bij een uurtarief "per uur" */
  per?: string;
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
  /** een knopje op de schuif bij 0%: terug naar de begroting van het college */
  collegeKnop?: boolean;
  /**
   * Toon het bedrag in plaats van het percentage (bij nul: het percentage is ten opzichte van de
   * begroting van het college, en die zie je pas aan het eind). `toonBedrag` maakt de tekst.
   */
  toonBedrag?: (bedrag: number) => string;
  onChange: (waarde: number) => void;
};

/** Bovenkant van de schuif als een post geen maximum heeft. */
export const SCHUIF_MAX = 100;

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
  const per = bedrag.per ?? 'per jaar';
  const eenheid = bedrag.eenheid === 'mln' ? `mln ${per}` : per;
  return (
    <label className="schuif-bedrag" htmlFor={`${id}-bedrag`}>
      <span>{bedrag.soort}: €</span>
      <input
        id={`${id}-bedrag`}
        type="text"
        inputMode="decimal"
        value={getypt ?? huidig}
        aria-label={`${bedrag.soort} voor ${label}, in ${bedrag.eenheid === 'mln' ? 'miljoen euro' : 'euro'} ${per}`}
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
  collegeKnop,
  toonBedrag,
  onChange,
}: SchuifProps) {
  const alsBedrag =
    toonBedrag && bedrag ? toonBedrag(bedrag.basis * (1 + waarde / 100)) : undefined;
  const uitleg = beschrijving ? `${id}-uitleg` : undefined;
  // Zonder maximum loopt de schuif tot +100%; meer kun je als bedrag typen.
  const schuifMax = Number.isFinite(max) ? max : Math.max(SCHUIF_MAX, waarde);
  // Waar het college zit (0%), als deel van de schuif; alleen als de speler daar niet staat.
  const collegeDeel = min < 0 && schuifMax > 0 ? -min / (schuifMax - min) : undefined;
  const toonCollege = collegeKnop && !vergrendeld && collegeDeel !== undefined && waarde !== 0;
  return (
    <div className={`schuif${alsBedrag ? ' als-bedrag' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className={`schuif-baan${toonCollege ? ' met-college' : ''}`}>
        <input
          id={id}
          type="range"
          min={min}
          max={schuifMax}
          step={stap}
          value={waarde}
          disabled={vergrendeld}
          aria-valuetext={alsBedrag ?? formatPct(waarde)}
          aria-describedby={uitleg}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {toonCollege && (
          <button
            type="button"
            className="schuif-college"
            // De duim van de schuif is ongeveer 16px breed: het midden loopt van 8px tot 100% − 8px.
            style={{ left: `calc(8px + (100% - 16px) * ${collegeDeel})` }}
            aria-label={`${label}: terug naar de begroting van het college (0%)`}
            title="Terug naar de begroting van het college"
            onClick={() => onChange(0)}
          >
            college
          </button>
        )}
      </div>
      <output htmlFor={id}>{alsBedrag ?? formatPct(waarde)}</output>
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

import { formatPct } from '../../engine';

export type SchuifProps = {
  id: string;
  label: string;
  min: number;
  max: number;
  waarde: number;
  stap?: number;
  vergrendeld?: boolean;
  beschrijving?: string;
  onChange: (waarde: number) => void;
};

/** Een schuif van min% tot max%, met het percentage ernaast. Toetsenbord: pijltjes per stap. */
export function Schuif({
  id,
  label,
  min,
  max,
  waarde,
  stap = 5,
  vergrendeld,
  beschrijving,
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
      {beschrijving && (
        <p id={uitleg} className="schuif-uitleg">
          {beschrijving}
        </p>
      )}
    </div>
  );
}

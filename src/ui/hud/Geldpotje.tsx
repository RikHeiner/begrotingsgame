/**
 * Het geldpotje met het slot (opdracht 8.1 en 9). Het vult zich met het vrije structurele geld;
 * het slot is dicht als er niets vrij is. Schudt bij een geweigerde wijziging.
 */
import { useEffect, useRef } from 'react';
import { formatMln } from '../../engine';
import { useSpel } from '../../game/state/store';

const VOL_BIJ = 25e6;

export function Geldpotje({ vrij }: { vrij: number }) {
  const actie = useSpel((s) => s.actie);
  const ref = useRef<HTMLDivElement>(null);
  const open = vrij > 0.5;
  const vulling = Math.max(0, Math.min(1, vrij / VOL_BIJ));

  useEffect(() => {
    const el = ref.current;
    if (!el || !actie) return;
    const klasse = actie.geweigerd ? 'schud' : actie.delta > 0 ? 'hup' : '';
    if (!klasse) return;
    el.classList.remove('schud', 'hup');
    void el.offsetWidth;
    el.classList.add(klasse);
  }, [actie]);

  return (
    <div
      ref={ref}
      className="geldpotje"
      data-testid="geldpotje"
      role="img"
      aria-label={`Geldpotje: ${formatMln(Math.max(0, vrij))} per jaar vrij. Het slot is ${open ? 'open' : 'dicht'}.`}
    >
      <svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true">
        <defs>
          <clipPath id="pot-binnen">
            <path d="M14 22 Q12 54 22 58 L42 58 Q52 54 50 22 Z" />
          </clipPath>
        </defs>
        <path
          d="M14 22 Q12 54 22 58 L42 58 Q52 54 50 22 Z"
          fill="var(--pot)"
          stroke="var(--inkt)"
          strokeWidth="2.5"
        />
        <g clipPath="url(#pot-binnen)">
          <rect x="10" y={58 - 36 * vulling} width="44" height={36 * vulling} fill="#F2B705" />
          {vulling > 0.05 && (
            <>
              <circle cx="26" cy={58 - 36 * vulling + 4} r="4" fill="#FFD23F" stroke="#C98A00" />
              <circle cx="37" cy={58 - 36 * vulling + 6} r="4" fill="#FFD23F" stroke="#C98A00" />
            </>
          )}
        </g>
        <rect
          x="11"
          y="16"
          width="42"
          height="8"
          rx="3"
          fill="var(--pot)"
          stroke="var(--inkt)"
          strokeWidth="2.5"
        />
        <rect x="27" y="18.5" width="10" height="3" rx="1.5" fill="var(--inkt)" />
        {/* slot */}
        <g transform={open ? 'translate(40 2) rotate(25)' : 'translate(24 6)'}>
          <path
            d="M4 10 V6 a6 6 0 0 1 12 0 V10"
            fill="none"
            stroke="var(--inkt)"
            strokeWidth="2.5"
          />
          <rect
            x="1"
            y="10"
            width="18"
            height="13"
            rx="3"
            fill={open ? 'var(--positief)' : 'var(--oranje)'}
            stroke="var(--inkt)"
            strokeWidth="2"
          />
        </g>
      </svg>
    </div>
  );
}

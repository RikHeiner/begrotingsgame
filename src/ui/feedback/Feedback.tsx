/**
 * Reageert op elke wijziging (`actie` in de store): muntjes vliegen van het gebouw naar het
 * geldpotje, een korte melding over een kettingeffect, en geluid als dat aan staat.
 * Met prefers-reduced-motion vliegen er geen muntjes.
 */
import { useEffect, useRef, useState } from 'react';
import type { Data, Melding } from '../../engine';
import { useSpel } from '../../game/state/store';
import { speel } from './geluid';

const MELDING_MS = 6000;

function minderBeweging(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function vliegMuntjes(gebouw: string | undefined, aantal: number): void {
  const doel = document.querySelector('[data-testid="geldpotje"]')?.getBoundingClientRect();
  if (!doel) return;
  const bron =
    (gebouw && document.querySelector(`[data-gebouw="${gebouw}"]`)?.getBoundingClientRect()) ||
    document.querySelector('.paneel')?.getBoundingClientRect();
  if (!bron) return;
  const van = { x: bron.left + bron.width / 2, y: bron.top + Math.min(bron.height / 2, 60) };
  const naar = { x: doel.left + doel.width / 2, y: doel.top + doel.height / 2 };
  for (let i = 0; i < aantal; i++) {
    const munt = document.createElement('span');
    munt.className = 'vliegmunt';
    munt.textContent = '🪙';
    munt.setAttribute('aria-hidden', 'true');
    munt.style.left = `${van.x}px`;
    munt.style.top = `${van.y}px`;
    document.body.appendChild(munt);
    const dx = naar.x - van.x;
    const dy = naar.y - van.y;
    const anim = munt.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
        {
          transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${dy * 0.4 - 50}px)) scale(1)`,
          opacity: 1,
          offset: 0.4,
        },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.7)`,
          opacity: 0.9,
        },
      ],
      { duration: 700, delay: i * 90, easing: 'ease-in', fill: 'forwards' },
    );
    anim.onfinish = () => munt.remove();
  }
}

export function Feedback({ data }: { data: Data }) {
  const actie = useSpel((s) => s.actie);
  const geluid = useSpel((s) => s.geluid);
  const resultaat = useSpel((s) => s.resultaat);
  const [verborgen, setVerborgen] = useState(0);
  const slotWasOpen = useRef(false);

  useEffect(() => {
    if (!actie) return;
    if (actie.geweigerd) {
      if (geluid) void speel('fout');
      return;
    }
    if (actie.delta > 50_000) {
      if (!minderBeweging())
        vliegMuntjes(actie.gebouw, Math.min(8, Math.max(1, Math.ceil(actie.delta / 2e6))));
      if (geluid) void speel(actie.gebouw === 'veiling' ? 'hamer' : 'munt');
    } else if (actie.delta < -50_000 && geluid) {
      void speel('bouw');
    }
  }, [actie, geluid]);

  // De melding over een kettingeffect blijft even staan, ook als de speler verder schuift.
  const ketting = useSpel((s) => s.kettingMelding);
  useEffect(() => {
    if (!ketting) return;
    const t = window.setTimeout(() => setVerborgen(ketting.teller), MELDING_MS);
    return () => window.clearTimeout(t);
  }, [ketting]);
  const melding: Melding | undefined =
    ketting && ketting.teller !== verborgen ? ketting.melding : undefined;

  // Geluid als het slot opengaat
  useEffect(() => {
    if (!resultaat) return;
    const open = Math.min(...data.jaren.map((j) => resultaat.perJaar[j]?.structureel ?? 0)) > 0.5;
    if (open && !slotWasOpen.current && geluid) void speel('slot');
    slotWasOpen.current = open;
  }, [resultaat, data, geluid]);

  return (
    <p className="kettingmelding" role="status" aria-live="polite" data-testid="kettingmelding">
      {melding && (
        <span>
          🔗 {melding.tekst}
          {melding.zekerheid !== 'feit' && <em> ⚠︎ aanname</em>}
        </span>
      )}
    </p>
  );
}

/**
 * Bij een nieuw bezoek, als je al met je eigen begroting bezig was: ga verder of begin opnieuw.
 */
import { useEffect, useRef } from 'react';

export function WelkomTerug({
  stap,
  stappen,
  onVerder,
  onOpnieuw,
}: {
  /** de stap van de route waar je was (vanaf 1) */
  stap: number;
  stappen: number;
  onVerder: () => void;
  onOpnieuw: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => {
      if (d?.open) d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="startscherm welkom-terug"
      aria-labelledby="welkom-kop"
      data-testid="welkom-terug"
      // Escape: gewoon verder, zodat je keuzes niet per ongeluk verdwijnen.
      onClose={onVerder}
    >
      <div className="start-inhoud">
        <h2 id="welkom-kop">Welkom terug!</h2>
        <p>
          Je was bezig met je eigen begroting
          {stap <= stappen ? ` (stap ${stap} van ${stappen})` : ''}. Wil je verder gaan, of opnieuw
          beginnen bij nul?
        </p>
        <div className="welkom-knoppen">
          <button type="button" className="knop-indienen" onClick={onVerder} autoFocus>
            Ga verder met je begroting
          </button>
          <button type="button" className="knop" onClick={onOpnieuw}>
            Begin opnieuw
          </button>
        </div>
      </div>
    </dialog>
  );
}

/**
 * Toegankelijke dialoog op basis van het <dialog>-element: focus blijft in de dialoog,
 * Escape sluit, de focus gaat daarna terug naar de knop die hem opende.
 */
import { useEffect, useRef, type ReactNode } from 'react';

export function Dialoog({
  open,
  titel,
  onSluit,
  children,
  breed,
}: {
  open: boolean;
  titel: string;
  onSluit: () => void;
  children: ReactNode;
  breed?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`dialoog${breed ? ' breed' : ''}`}
      aria-labelledby="dialoog-titel"
      onClose={onSluit}
      onClick={(e) => {
        if (e.target === ref.current) onSluit();
      }}
    >
      {open && (
        <div className="dialoog-inhoud">
          <header className="dialoog-kop">
            <h2 id="dialoog-titel">{titel}</h2>
            <button type="button" className="knop-rond" aria-label="Sluiten" onClick={onSluit}>
              ✕
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

/**
 * Opslaan en later verder: de begroting staat al in deze browser (game/voortgang.ts). Deze
 * dialoog bewaart hem meteen en geeft ook een link, voor op een ander apparaat.
 */
import { useEffect, useState } from 'react';
import type { Data, Resultaat } from '../../engine';
import { maakLink } from '../../game/deellink';
import { useSpel } from '../../game/state/store';
import { bewaarVoortgang } from '../../game/voortgang';
import { Dialoog } from '../algemeen/Dialoog';

export function OpslaanDialoog({
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
  const beginpunt = useSpel((s) => s.beginpunt);
  const routeStap = useSpel((s) => s.routeStap);
  const [gekopieerd, setGekopieerd] = useState(false);
  const jaar = data.config.actiefJaar;
  const link = maakLink(window.location.href, resultaat.keuzes, jaar, beginpunt);

  useEffect(() => {
    if (!open) return;
    bewaarVoortgang(resultaat.keuzes, jaar, beginpunt, routeStap);
  }, [open, resultaat.keuzes, jaar, beginpunt, routeStap]);

  const sluit = () => {
    setGekopieerd(false);
    onSluit();
  };

  const kopieer = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setGekopieerd(true);
    } catch {
      setGekopieerd(false);
    }
  };

  return (
    <Dialoog open={open} onSluit={sluit} titel="Opslaan en later verder">
      <p data-testid="opgeslagen">
        <strong>✅ Je begroting is bewaard op dit apparaat.</strong> Kom je later terug op deze
        site, dan kies je <em>Ga verder met je begroting</em>.
      </p>
      <p className="klein">
        Wil je verder op een ander apparaat? Bewaar dan deze link. Je naam staat er niet in.
      </p>
      <p className="knoppen-rij">
        <button type="button" className="knop" onClick={kopieer}>
          {gekopieerd ? 'Link gekopieerd' : 'Kopieer de link'}
        </button>
        <button type="button" className="knop-indienen" onClick={sluit}>
          Verder spelen
        </button>
      </p>
      <p className="klein opslaan-link">{link}</p>
    </Dialoog>
  );
}

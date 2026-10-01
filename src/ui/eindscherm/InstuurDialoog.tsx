/**
 * Insturen naar de fractie (hoofdstuk 11): alleen na een duidelijke toestemming. Opgeslagen worden
 * de keuzes, het eigen idee en optioneel een gebied. Een e-mailadres alleen met een aparte
 * toestemming, en los van de inzending. Een verborgen veld en de speelduur houden robots tegen.
 */
import { useId, useState, type FormEvent } from 'react';
import type { Data, Resultaat } from '../../engine';
import { useSpel } from '../../game/state/store';
import { ideeVerdacht } from '../../inzending/filter';
import { kiesOpslag } from '../../inzending/opslag';
import { InstuurFout } from '../../inzending/types';
import { Dialoog } from '../algemeen/Dialoog';

/** Het moment waarop de pagina opende, voor de minimale speelduur. */
const GEOPEND = Date.now();

type Status =
  | { soort: 'invullen' }
  | { soort: 'bezig' }
  | { soort: 'klaar' }
  | { soort: 'fout'; tekst: string };

export function InstuurDialoog({
  data,
  resultaat,
  open,
  onSluit,
}: {
  data: Data;
  resultaat: Resultaat;
  open: boolean;
  onSluit: () => void;
}) {
  const t = data.teksten.insturen;
  const meta = useSpel((s) => s.meta);
  const zetMeta = useSpel((s) => s.zetMeta);
  const markeer = useSpel((s) => s.markeerIngestuurd);
  const [gebied, setGebied] = useState('');
  const [toestemming, setToestemming] = useState(false);
  const [opDeHoogte, setOpDeHoogte] = useState(false);
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>({ soort: 'invullen' });
  const id = useId();
  const verdacht = meta.idee.trim() !== '' && ideeVerdacht(meta.idee);

  const verstuur = async (e: FormEvent) => {
    e.preventDefault();
    if (!toestemming || status.soort === 'bezig') return;
    setStatus({ soort: 'bezig' });
    try {
      const opslag = await kiesOpslag();
      if (!opslag) throw new InstuurFout('Insturen staat nog niet aan.', 'netwerk');
      const k = resultaat.keuzes;
      await opslag.insturen({
        begrotingsjaar: data.config.actiefJaar,
        keuzes: {
          onderdelen: k.onderdelen,
          belastingen: k.belastingen,
          ...(k.parkeren ? { parkeren: k.parkeren } : {}),
          kaarten: k.kaarten,
          scenario: k.scenario,
          ...(k.reserve ? { reserve: k.reserve } : {}),
        },
        ...(gebied ? { gebied } : {}),
        ...(meta.idee.trim() ? { idee: meta.idee.trim() } : {}),
        ...(opDeHoogte && email.trim() ? { email: email.trim(), email_toestemming: true } : {}),
        toestemming: true,
        toestemming_versie: t.toestemming_versie,
        duur_ms: Date.now() - GEOPEND,
        website,
      });
      markeer();
      setStatus({ soort: 'klaar' });
    } catch (fout) {
      setStatus({
        soort: 'fout',
        tekst:
          fout instanceof InstuurFout
            ? fout.message
            : 'Er ging iets mis met de verbinding. Probeer het later nog eens.',
      });
    }
  };

  return (
    <Dialoog open={open} titel="Stuur in naar de fractie" onSluit={onSluit}>
      {status.soort === 'klaar' ? (
        <div data-testid="ingestuurd">
          <p role="status">{t.bedankt}</p>
          <button type="button" className="knop" onClick={onSluit}>
            Sluiten
          </button>
        </div>
      ) : (
        <form onSubmit={verstuur} className="instuur-formulier" noValidate>
          <p>{t.uitleg}</p>

          <label className="veld">
            Mijn eigen idee (mag leeg blijven)
            <textarea
              value={meta.idee}
              maxLength={1000}
              rows={3}
              aria-describedby={verdacht ? `${id}-waarschuwing` : undefined}
              onChange={(e) => zetMeta({ idee: e.target.value })}
            />
          </label>
          {verdacht && (
            <p id={`${id}-waarschuwing`} className="melding-blok klein">
              ⚠︎ {t.idee_waarschuwing}
            </p>
          )}

          <label className="veld">
            In welk gebied woon je? (mag leeg blijven)
            <select value={gebied} onChange={(e) => setGebied(e.target.value)}>
              <option value="">Zeg ik liever niet</option>
              {data.gebieden.gebieden.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.naam}
                </option>
              ))}
            </select>
          </label>

          {/* Verborgen veld tegen spam: mensen zien het niet en vullen het niet in. */}
          <div className="onzichtbaar" aria-hidden="true">
            <label>
              Website
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          </div>

          <label className="keuze toestemming">
            <input
              type="checkbox"
              checked={toestemming}
              onChange={(e) => setToestemming(e.target.checked)}
              required
            />
            <span>{t.toestemming}</span>
          </label>

          <label className="keuze toestemming">
            <input
              type="checkbox"
              checked={opDeHoogte}
              onChange={(e) => setOpDeHoogte(e.target.checked)}
            />
            <span>{t.email_toestemming}</span>
          </label>
          {opDeHoogte && (
            <label className="veld">
              Mijn e-mailadres
              <input
                type="email"
                value={email}
                maxLength={254}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}

          <details className="privacy">
            <summary>Wat gebeurt er met mijn gegevens?</summary>
            {t.privacy.map((x) => (
              <p key={x}>{x}</p>
            ))}
            <p>
              <a href="/privacy.html" target="_blank" rel="noopener">
                Lees de hele privacyverklaring
              </a>{' '}
              (opent in een nieuw tabblad)
            </p>
          </details>

          {status.soort === 'fout' && (
            <p role="alert" className="melding-blok">
              {status.tekst}
            </p>
          )}
          <div className="eind-knoppen">
            <button
              type="submit"
              className="knop-indienen"
              disabled={!toestemming || status.soort === 'bezig' || (opDeHoogte && !email.trim())}
              data-testid="verstuur"
            >
              {status.soort === 'bezig' ? 'Bezig met insturen…' : 'Insturen'}
            </button>
            <button type="button" className="knop" onClick={onSluit}>
              Annuleren
            </button>
          </div>
          {!toestemming && (
            <p className="klein">
              Vink eerst aan dat je toestemming geeft. Anders kunnen we niets opslaan.
            </p>
          )}
        </form>
      )}
    </Dialoog>
  );
}

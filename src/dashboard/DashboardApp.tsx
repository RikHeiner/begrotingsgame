/**
 * Het dashboard voor de fractie (fase 5). Inloggen met een magic link, alleen voor genodigden:
 * Supabase stuurt de link alleen naar bestaande gebruikers, en row level security laat alleen
 * mensen in de tabel fractie_leden de inzendingen zien.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { haalJson } from '../app/haalJson';
import { laadData, type Data } from '../engine';
import { kiesOpslag, type Opslag } from '../inzending/opslag';
import { Overzicht } from './Overzicht';

type Toestand =
  | { s: 'laden' }
  | { s: 'fout'; melding: string }
  | { s: 'uit' }
  | { s: 'inloggen'; data: Data; opslag: Opslag }
  | { s: 'geen-toegang'; data: Data; opslag: Opslag; email: string }
  | { s: 'klaar'; data: Data; opslag: Opslag; email: string };

const tekstVan = (e: unknown) => (e instanceof Error ? e.message : 'Onbekende fout.');

export function DashboardApp() {
  const [toestand, setToestand] = useState<Toestand>({ s: 'laden' });

  const controleer = useCallback(async (data: Data, opslag: Opslag) => {
    try {
      const email = await opslag.gebruiker();
      if (!email) return setToestand({ s: 'inloggen', data, opslag });
      const fractie = await opslag.isFractie();
      setToestand(
        fractie ? { s: 'klaar', data, opslag, email } : { s: 'geen-toegang', data, opslag, email },
      );
    } catch (e) {
      setToestand({ s: 'fout', melding: tekstVan(e) });
    }
  }, []);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let weg = false;
    Promise.all([laadData(haalJson), kiesOpslag(true)])
      .then(([data, opslag]) => {
        if (weg) return;
        if (!opslag) return setToestand({ s: 'uit' });
        stop = opslag.opWijziging(() => void controleer(data, opslag));
        return controleer(data, opslag);
      })
      .catch((e: unknown) => !weg && setToestand({ s: 'fout', melding: tekstVan(e) }));
    return () => {
      weg = true;
      stop?.();
    };
  }, [controleer]);

  return (
    <div className="dashboard">
      <header className="dash-kop">
        <h1>Dashboard Begrotingsgame</h1>
        {(toestand.s === 'klaar' || toestand.s === 'geen-toegang') && (
          <p className="dash-gebruiker">
            <span className="klein">Ingelogd als {toestand.email}</span>
            {toestand.opslag.soort === 'supabase' && (
              <button
                type="button"
                className="knop"
                onClick={() => void toestand.opslag.uitloggen()}
              >
                Uitloggen
              </button>
            )}
          </p>
        )}
      </header>
      <main>
        {toestand.s === 'laden' && <p aria-live="polite">Het dashboard wordt geladen…</p>}
        {toestand.s === 'fout' && (
          <p role="alert" className="melding-blok">
            {toestand.melding}
          </p>
        )}
        {toestand.s === 'uit' && (
          <p className="melding-blok">
            Het dashboard is nog niet gekoppeld aan een database. Zie de README (Supabase
            instellen).
          </p>
        )}
        {toestand.s === 'inloggen' && <Inloggen opslag={toestand.opslag} />}
        {toestand.s === 'geen-toegang' && (
          <p role="alert" className="melding-blok">
            Dit account heeft geen toegang tot het dashboard. Vraag de fractie om je uit te nodigen.
          </p>
        )}
        {toestand.s === 'klaar' && <Overzicht data={toestand.data} opslag={toestand.opslag} />}
      </main>
    </div>
  );
}

function Inloggen({ opslag }: { opslag: Opslag }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{
    soort: 'invullen' | 'bezig' | 'verstuurd' | 'fout';
    tekst?: string;
  }>({
    soort: 'invullen',
  });
  const verstuur = async (e: FormEvent) => {
    e.preventDefault();
    setStatus({ soort: 'bezig' });
    try {
      await opslag.inloggen(email.trim(), `${window.location.origin}${window.location.pathname}`);
      setStatus({ soort: 'verstuurd' });
    } catch {
      // Geen details: zo is niet te zien of een e-mailadres een account heeft.
      setStatus({
        soort: 'fout',
        tekst: 'Dat lukte niet. Controleer je e-mailadres of probeer het later nog eens.',
      });
    }
  };
  if (status.soort === 'verstuurd')
    return (
      <section className="dash-blok" role="status">
        <h2>Kijk in je mail</h2>
        <p>
          Als <strong>{email}</strong> is uitgenodigd, krijg je een e-mail met een inloglink. Open
          de link op dit apparaat.
        </p>
      </section>
    );
  return (
    <section className="dash-blok">
      <h2>Inloggen</h2>
      <p>Alleen voor genodigden van de fractie. Je krijgt een inloglink per e-mail.</p>
      <form onSubmit={verstuur}>
        <label className="veld">
          E-mailadres
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="knop-indienen"
          disabled={status.soort === 'bezig' || !email.trim()}
        >
          Stuur inloglink
        </button>
      </form>
      {status.soort === 'fout' && (
        <p role="alert" className="melding-blok">
          {status.tekst}
        </p>
      )}
    </section>
  );
}

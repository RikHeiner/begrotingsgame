import { useEffect, useState } from 'react';
import { laadActieveBegroting, type BegrotingKop, type Config } from '../engine/config';
import { haalJson } from './haalJson';

type Toestand =
  | { status: 'laden' }
  | { status: 'klaar'; config: Config; kop: BegrotingKop }
  | { status: 'fout'; melding: string };

export function App() {
  const [toestand, setToestand] = useState<Toestand>({ status: 'laden' });

  useEffect(() => {
    let actief = true;
    laadActieveBegroting(haalJson)
      .then(({ config, kop }) => actief && setToestand({ status: 'klaar', config, kop }))
      .catch(
        (fout: unknown) =>
          actief &&
          setToestand({
            status: 'fout',
            melding: fout instanceof Error ? fout.message : 'Onbekende fout bij het laden.',
          }),
      );
    return () => {
      actief = false;
    };
  }, []);

  return (
    <main className="pagina">
      <h1>Maak de begroting van de gemeente Groningen</h1>
      {toestand.status === 'laden' && <p aria-live="polite">De begroting wordt geladen…</p>}
      {toestand.status === 'fout' && (
        <p role="alert" className="fout">
          {toestand.melding}
        </p>
      )}
      {toestand.status === 'klaar' && (
        <section aria-labelledby="actief-jaar">
          <h2 id="actief-jaar" data-testid="actief-jaar">
            Begroting {toestand.kop.begrotingsjaar}
          </h2>
          <p>
            Meerjarenraming {toestand.config.meerjarenHorizon[0]} t/m{' '}
            {toestand.config.meerjarenHorizon.at(-1)}.
          </p>
          <p className="bron">
            Bron:{' '}
            <a href={toestand.kop.bronUrl} rel="noopener noreferrer">
              {toestand.kop.document}
            </a>
          </p>
        </section>
      )}
      <footer className="colofon">Een initiatief van de VVD-fractie Groningen-Haren</footer>
    </main>
  );
}

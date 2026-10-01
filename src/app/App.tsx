import { useEffect, useState } from 'react';
import { laadData, type Data } from '../engine';
import { DebugPagina } from './debug/DebugPagina';
import { haalJson } from './haalJson';

type Toestand =
  { status: 'laden' } | { status: 'klaar'; data: Data } | { status: 'fout'; melding: string };

export function App() {
  const [toestand, setToestand] = useState<Toestand>({ status: 'laden' });

  useEffect(() => {
    let actief = true;
    laadData(haalJson)
      .then((data) => actief && setToestand({ status: 'klaar', data }))
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
        <>
          <p data-testid="actief-jaar" className="ondertitel">
            Begroting {toestand.data.begroting.begrotingsjaar} · meerjarenraming{' '}
            {toestand.data.jaren[0]} t/m {toestand.data.jaren.at(-1)}
          </p>
          <DebugPagina data={toestand.data} />
        </>
      )}
      <footer className="colofon">
        Een initiatief van de VVD-fractie Groningen-Haren. Bron:{' '}
        {toestand.status === 'klaar' ? (
          <a href={toestand.data.begroting.bron_url} rel="noopener noreferrer">
            {toestand.data.begroting.document}
          </a>
        ) : (
          'ontwerpbegroting'
        )}
        .
      </footer>
    </main>
  );
}

import { useEffect, useState } from 'react';
import { laadData, type Data } from '../engine';
import { DebugPagina } from './debug/DebugPagina';
import { haalJson } from './haalJson';
import { Spel } from './Spel';

type Toestand =
  { status: 'laden' } | { status: 'klaar'; data: Data } | { status: 'fout'; melding: string };

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const bij = () => setHash(window.location.hash);
    window.addEventListener('hashchange', bij);
    return () => window.removeEventListener('hashchange', bij);
  }, []);
  return hash;
}

export function App() {
  const [toestand, setToestand] = useState<Toestand>({ status: 'laden' });
  const hash = useHash();

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

  if (toestand.status === 'laden') {
    return (
      <main className="pagina">
        <h1>Maak de begroting van de gemeente Groningen</h1>
        <p aria-live="polite">De begroting wordt geladen…</p>
      </main>
    );
  }
  if (toestand.status === 'fout') {
    return (
      <main className="pagina">
        <h1>Maak de begroting van de gemeente Groningen</h1>
        <p role="alert" className="fout">
          {toestand.melding}
        </p>
      </main>
    );
  }
  if (hash === '#debug') {
    return (
      <main className="pagina">
        <h1>Rekenmotor (debug)</h1>
        <p data-testid="actief-jaar" className="ondertitel">
          Begroting {toestand.data.begroting.begrotingsjaar} · meerjarenraming{' '}
          {toestand.data.jaren[0]} t/m {toestand.data.jaren.at(-1)} ·{' '}
          <a href="#">Terug naar de gemeente</a>
        </p>
        <DebugPagina data={toestand.data} />
      </main>
    );
  }
  return <Spel data={toestand.data} />;
}

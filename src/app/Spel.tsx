/**
 * De game: kaart of lijst, met het gebouwpaneel. De volledige HUD (geldpotje, meters, missies) volgt
 * in fase 3; hier staat alleen het saldo, zodat je ziet wat je keuzes doen.
 */
import { useCallback, useEffect, useState } from 'react';
import { formatMln, type Data } from '../engine';
import { useSpel } from '../game/state/store';
import { KaartWeergave } from '../ui/kaart/KaartWeergave';
import { Lijstweergave } from '../ui/lijstweergave/Lijstweergave';
import { GebouwPaneel } from '../ui/panelen/GebouwPaneel';
import './spel.css';

export function Spel({ data }: { data: Data }) {
  const start = useSpel((s) => s.start);
  const resultaat = useSpel((s) => s.resultaat);
  const standen = useSpel((s) => s.standen);
  const weergave = useSpel((s) => s.weergave);
  const zetWeergave = useSpel((s) => s.zetWeergave);
  const melding = useSpel((s) => s.melding);
  const wisMelding = useSpel((s) => s.wisMelding);
  const [kaartFout, setKaartFout] = useState<string>();

  useEffect(() => start(data), [data, start]);
  useEffect(() => {
    if (!melding) return;
    const t = window.setTimeout(wisMelding, 5000);
    return () => window.clearTimeout(t);
  }, [melding, wisMelding]);

  const onFout = useCallback(
    (m: string) => {
      setKaartFout(m);
      zetWeergave('lijst');
    },
    [zetWeergave],
  );

  if (!resultaat) return null;
  const jaar = data.jaren[0] ?? 0;
  const s = resultaat.perJaar[jaar]?.structureel ?? 0;
  const i = resultaat.perJaar[jaar]?.incidenteel ?? 0;

  return (
    <div className="spel">
      <header className="spel-kop">
        <h1>Maak de begroting van de gemeente Groningen</h1>
        <div className="spel-balk">
          <p className="saldo" data-testid="saldo" aria-live="polite">
            <span>
              Elk jaar{' '}
              <strong className={s < -0.5 ? 'negatief' : s > 0.5 ? 'positief' : ''}>
                {formatMln(s, { teken: true })}
              </strong>
            </span>
            <span>
              Eenmalig{' '}
              <strong className={i < -0.5 ? 'negatief' : i > 0.5 ? 'positief' : ''}>
                {formatMln(i, { teken: true })}
              </strong>
            </span>
          </p>
          <div className="wissel" role="group" aria-label="Weergave">
            <button
              type="button"
              aria-pressed={weergave === 'kaart'}
              disabled={!!kaartFout}
              onClick={() => zetWeergave('kaart')}
            >
              🗺️ Kaart
            </button>
            <button
              type="button"
              aria-pressed={weergave === 'lijst'}
              onClick={() => zetWeergave('lijst')}
            >
              ☰ Lijst
            </button>
          </div>
        </div>
      </header>
      {kaartFout && (
        <p className="melding-blok" role="alert">
          De kaart werkt niet op dit apparaat ({kaartFout}). Je kunt gewoon spelen met de lijst.
        </p>
      )}
      <main className="spel-inhoud">
        {weergave === 'kaart' && !kaartFout ? (
          <KaartWeergave data={data} resultaat={resultaat} standen={standen} onFout={onFout} />
        ) : (
          <Lijstweergave data={data} resultaat={resultaat} standen={standen} />
        )}
        {weergave === 'kaart' && (
          <GebouwPaneel data={data} resultaat={resultaat} standen={standen} />
        )}
      </main>
      <p className="toast" role="status" aria-live="polite" data-testid="melding">
        {melding && <span>🔒 {melding}</span>}
      </p>
      <footer className="colofon">
        Een initiatief van de VVD-fractie Groningen-Haren · Bron:{' '}
        <a href={data.begroting.bron_url} rel="noopener noreferrer">
          {data.begroting.document}
        </a>{' '}
        · <a href="#debug">Rekenmotor (debug)</a>
      </footer>
    </div>
  );
}

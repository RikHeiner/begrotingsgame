/**
 * Groninger Museum: "Moet of mag?". Tien kunstwerken, elk een post of een belasting. Is het
 * verplicht van de wet, een eigen keuze van de gemeente, of levert het geld op?
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMln } from '../../engine';
import { CATEGORIEEN, museumKaarten, type Categorie, type MuseumKaart } from '../../game/mgMuseum';
import type { MinigameProps } from './types';
import './Museum.css';

const KLEUREN = ['geel', 'roze', 'turkoois', 'paars', 'oranje'] as const;

function waarom(k: MuseumKaart): string {
  const mln = (x: number) => formatMln(x * 1e6);
  if (k.categorie === 'geld') {
    if (k.belasting) return `Dit is een belasting. Het brengt de gemeente ${mln(k.bedragMln)} op.`;
    return `De gemeente krijgt hier ${mln(k.batenMln)} binnen en geeft ${mln(k.bedragMln)} uit. Er blijft geld over.${k.reden ? ` Let op: ook dit moet. ${k.reden}` : ''}`;
  }
  if (k.categorie === 'verplicht')
    return k.reden ?? 'Dit is een taak die de gemeente van de wet moet doen.';
  return 'De gemeente kiest dit zelf. Geen wet verplicht het. Je kunt deze post helemaal schrappen.';
}

export default function Museum({ data, onKlaar }: MinigameProps) {
  const kaarten = useMemo(() => museumKaarten(data), [data]);
  const [i, setI] = useState(0);
  const [goed, setGoed] = useState(0);
  const [gekozen, setGekozen] = useState<Categorie>();
  const volgendeKnop = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (gekozen) volgendeKnop.current?.focus();
  }, [gekozen]);

  const k = kaarten[i];
  if (!k) return null;
  const jaar = data.begroting.begrotingsjaar;
  const kleur = KLEUREN[i % KLEUREN.length];
  const juistTekst = CATEGORIEEN.find((c) => c.id === k.categorie)?.tekst ?? '';

  const kies = (c: Categorie) => {
    if (gekozen) return;
    setGekozen(c);
    if (c === k.categorie) setGoed((g) => g + 1);
  };

  const volgende = () => {
    if (i + 1 >= kaarten.length) {
      onKlaar(goed, kaarten.length);
      return;
    }
    setI(i + 1);
    setGekozen(undefined);
  };

  return (
    <div className="mg-museum">
      <p className="klein" data-testid="mg-zaal">
        Kunstwerk {i + 1} van {kaarten.length} · goed: {goed}
      </p>
      <figure className={`mg-mu-lijst ${kleur}`}>
        <div className="mg-mu-doek">
          <span className="mg-mu-soort">{k.belasting ? 'Belasting' : 'Post van de begroting'}</span>
          <h3>{k.naam}</h3>
          <p className="klein">
            {k.belasting ? 'Opbrengst' : 'Uitgaven'} in {jaar}: {formatMln(k.bedragMln * 1e6)}
          </p>
        </div>
        <figcaption className="mg-mu-bordje">Moet of mag?</figcaption>
      </figure>

      <div className="mg-keuzes mg-mu-keuzes">
        {CATEGORIEEN.map((c) => {
          const klasse = !gekozen
            ? ''
            : c.id === k.categorie
              ? ' goed'
              : c.id === gekozen
                ? ' fout'
                : '';
          return (
            <button
              key={c.id}
              type="button"
              className={`mg-keuze${klasse}`}
              aria-pressed={gekozen === c.id}
              disabled={!!gekozen}
              onClick={() => kies(c.id)}
            >
              <strong>{c.tekst}</strong>
            </button>
          );
        })}
      </div>

      <div role="status" className="mg-mu-status">
        {gekozen && (
          <div className="mg-mu-uitleg">
            <p>
              <strong>{gekozen === k.categorie ? '✅ Goed!' : `❌ Helaas.`}</strong> Het goede
              antwoord is: {juistTekst}.
            </p>
            <p>{waarom(k)}</p>
            <button ref={volgendeKnop} type="button" className="knop-indienen" onClick={volgende}>
              {i + 1 >= kaarten.length ? 'Naar de uitslag' : 'Volgend kunstwerk'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

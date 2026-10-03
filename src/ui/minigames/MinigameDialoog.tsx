/**
 * Een minigame in een dialoog: eerst wat je doet en wat je ervan leert, dan het spel, dan je score
 * (en je beste score, alleen in deze browser).
 */
import { Suspense, useState } from 'react';
import type { Data } from '../../engine';
import { useSpel } from '../../game/state/store';
import { Dialoog } from '../algemeen/Dialoog';
import { FoutMelden } from '../algemeen/FoutMelden';
import { MINIGAMES } from './register';
import { bewaarBeste } from './scores';

export function MinigameDialoog({ data }: { data: Data }) {
  const id = useSpel((s) => s.minigame);
  const open = useSpel((s) => s.openMinigame);
  const m = data.minigames.find((x) => x.id === id);
  const Spel = id ? MINIGAMES[id] : undefined;
  const [fase, setFase] = useState<'uitleg' | 'spelen' | 'klaar'>('uitleg');
  const [ronde, setRonde] = useState(0);
  const [uitslag, setUitslag] = useState<{ score: number; max: number; beste: number }>();
  const sluit = () => {
    open(undefined);
    setFase('uitleg');
    setUitslag(undefined);
  };
  if (!m || !Spel) return null;
  return (
    <Dialoog open titel={`${m.icoon} ${m.naam}: ${m.spel}`} onSluit={sluit} breed>
      <div className="minigame" data-testid={`minigame-${m.id}`}>
        {fase === 'uitleg' && (
          <div className="minigame-uitleg">
            <p className="minigame-kort">{m.kort}</p>
            <p className="klein">
              <strong>Wat leer je?</strong> {m.leerdoel}
            </p>
            <button
              type="button"
              className="knop-indienen minigame-start"
              data-testid="minigame-start"
              onClick={() => setFase('spelen')}
            >
              Start
            </button>
          </div>
        )}
        {fase === 'spelen' && (
          <Suspense fallback={<p>Het spel wordt geladen…</p>}>
            <Spel
              key={ronde}
              data={data}
              onKlaar={(score, max) => {
                setUitslag({ score, max, beste: bewaarBeste(m.id, score) });
                useSpel.getState().markeerGespeeld(m.id);
                setFase('klaar');
              }}
            />
          </Suspense>
        )}
        {fase === 'klaar' && uitslag && (
          <div className="minigame-klaar" role="status" data-testid="minigame-klaar">
            <p className="minigame-score">
              Je score: <strong>{uitslag.score}</strong> van de {uitslag.max}
            </p>
            <p className="klein">Je beste score hier: {uitslag.beste}</p>
            <p className="knoppen-rij">
              <button
                type="button"
                className="knop"
                onClick={() => {
                  setRonde((r) => r + 1);
                  setFase('spelen');
                }}
              >
                Nog een keer
              </button>
              <button type="button" className="knop-indienen" onClick={sluit}>
                Terug naar de kaart
              </button>
            </p>
          </div>
        )}
      </div>
      <FoutMelden data={data} />
    </Dialoog>
  );
}

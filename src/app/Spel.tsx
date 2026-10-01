/**
 * De game: HUD, kaart of lijst met het gebouwpaneel, feedback, tutorial en het eindscherm.
 * De keuzes staan in de URL (?b=…), zodat elke begroting als link te delen is.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Data } from '../engine';
import { codeer, leesUitUrl, PARAM } from '../game/deellink';
import { useSpel } from '../game/state/store';
import { Eindscherm } from '../ui/eindscherm/Eindscherm';
import { Feedback } from '../ui/feedback/Feedback';
import { Hud } from '../ui/hud/Hud';
import { KaartWeergave } from '../ui/kaart/KaartWeergave';
import { Lijstweergave } from '../ui/lijstweergave/Lijstweergave';
import { GebouwPaneel } from '../ui/panelen/GebouwPaneel';
import { Startscherm } from '../ui/start/Startscherm';
import { Documentweergave } from '../ui/tegenbegroting/Documentweergave';
import { Tutorial } from '../ui/tutorial/Tutorial';
import './spel.css';

export function Spel({ data }: { data: Data }) {
  const start = useSpel((s) => s.start);
  const resultaat = useSpel((s) => s.resultaat);
  const keuzes = useSpel((s) => s.keuzes);
  const standen = useSpel((s) => s.standen);
  const weergave = useSpel((s) => s.weergave);
  const zetWeergave = useSpel((s) => s.zetWeergave);
  const melding = useSpel((s) => s.melding);
  const wisMelding = useSpel((s) => s.wisMelding);
  const fase = useSpel((s) => s.fase);
  const startscherm = useSpel((s) => s.startscherm);
  const zetStartscherm = useSpel((s) => s.zetStartscherm);
  const [kaartFout, setKaartFout] = useState<string>();
  const [gelezen] = useState(() => leesUitUrl(window.location.href));
  const zelfdeJaar = gelezen?.jaar === data.config.actiefJaar;
  const [linkMelding, setLinkMelding] = useState<string | undefined>(() =>
    !gelezen
      ? undefined
      : zelfdeJaar
        ? 'Je bekijkt een gedeelde begroting. Je kunt hem verder aanpassen.'
        : `Deze link hoort bij de begroting ${gelezen.jaar}. Nu staat de begroting ${data.config.actiefJaar} in de game, dus je begint opnieuw.`,
  );

  // Een gedeelde link opent direct de begroting, zonder startscherm.
  useEffect(() => {
    if (gelezen) zetStartscherm(false);
  }, [gelezen, zetStartscherm]);

  // Start, eventueel met de keuzes uit een gedeelde link
  useEffect(() => {
    if (gelezen && zelfdeJaar) start(data, gelezen.keuzes);
    else start(data);
  }, [data, start, gelezen, zelfdeJaar]);

  // Keuzes bijhouden in de URL
  useEffect(() => {
    if (!resultaat) return;
    const t = window.setTimeout(() => {
      const url = new URL(window.location.href);
      const leeg =
        !Object.keys(keuzes.onderdelen).length &&
        !Object.keys(keuzes.belastingen).length &&
        !Object.keys(keuzes.parkeren ?? {}).length &&
        !keuzes.kaarten.length &&
        !keuzes.reserve &&
        keuzes.scenario === data.config.scenario;
      if (leeg) url.searchParams.delete(PARAM);
      else url.searchParams.set(PARAM, codeer(keuzes, data.config.actiefJaar));
      window.history.replaceState(null, '', url);
    }, 300);
    return () => window.clearTimeout(t);
  }, [keuzes, resultaat, data]);

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

  if (startscherm && !gelezen) {
    return (
      <div className="spel">
        <Startscherm data={data} onBegin={() => zetStartscherm(false)} />
      </div>
    );
  }

  if (fase === 'document') {
    return (
      <div className="spel">
        <Documentweergave data={data} resultaat={resultaat} />
      </div>
    );
  }

  if (fase === 'eindscherm') {
    return (
      <div className="spel">
        <Eindscherm data={data} resultaat={resultaat} />
      </div>
    );
  }

  return (
    <div className="spel">
      <h1 className="spel-titel">{data.teksten.titel}</h1>
      <Hud data={data} resultaat={resultaat} />
      {kaartFout && (
        <p className="melding-blok" role="alert">
          De kaart werkt niet op dit apparaat ({kaartFout}). Je kunt gewoon spelen met de lijst.
        </p>
      )}
      {linkMelding && (
        <p className="melding-blok" role="status">
          {linkMelding}{' '}
          <button type="button" className="link-knop" onClick={() => setLinkMelding(undefined)}>
            Oké
          </button>
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
      <Feedback data={data} />
      <p className="toast" role="status" aria-live="polite" data-testid="melding">
        {melding && <span>🔒 {melding}</span>}
      </p>
      <Tutorial data={data} resultaat={resultaat} />
    </div>
  );
}

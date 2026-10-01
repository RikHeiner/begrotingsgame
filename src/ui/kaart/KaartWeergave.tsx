/**
 * De gemeentekaart (PixiJS) met daarover: onzichtbare knoppen op de gebouwen (voor toetsenbord en
 * schermlezer), zoomknoppen en de tekstballonnen van de inwoners. PixiJS wordt pas geladen als de
 * kaart in beeld komt.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMln, type Data, type Resultaat } from '../../engine';
import type { Camera } from '../../game/kaart/camera';
import type { GemeenteKaart } from '../../game/kaart/GemeenteKaart';
import type { BuurtGeo, KaartGeometrie } from '../../game/kaart/geometrie';
import { maakLezer } from '../../game/reacties/context';
import { compileer, kiesReactie } from '../../game/reacties/kies';
import { useSpel } from '../../game/state/store';
import { TOESTAND_NAAM, type GebouwStand } from '../../game/toestand';
import { haalJson } from '../../app/haalJson';

const BALLON_MS = 4000;
const BALLON_ZICHTBAAR_MS = 3200;

type Props = {
  data: Data;
  resultaat: Resultaat;
  standen: Record<string, GebouwStand>;
  onFout: (melding: string) => void;
};

function minderBeweging(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function KaartWeergave({ data, resultaat, standen, onFout }: Props) {
  const houder = useRef<HTMLDivElement>(null);
  const kaart = useRef<GemeenteKaart | undefined>(undefined);
  const [geo, setGeo] = useState<KaartGeometrie>();
  const [camera, setCamera] = useState<Camera>();
  const [klaar, setKlaar] = useState(false);
  const [ballon, setBallon] = useState<{ persona: string; tekst: string; id: string }>();
  const ballonEl = useRef<HTMLDivElement>(null);
  const kies = useSpel((s) => s.kiesGebouw);
  const laatste = useRef({ resultaat, standen });
  useEffect(() => {
    laatste.current = { resultaat, standen };
  }, [resultaat, standen]);

  // Kaart laden en opbouwen
  useEffect(() => {
    let weg = false;
    const el = houder.current;
    if (!el) return;
    (async () => {
      try {
        const [{ GemeenteKaart, LICHT, DONKER }, { maakGeometrie }, buurten] = await Promise.all([
          import('../../game/kaart/GemeenteKaart'),
          import('../../game/kaart/geometrie'),
          haalJson('gemeente-groningen-buurten.geojson'),
        ]);
        if (weg) return;
        const g = maakGeometrie(data, buurten as BuurtGeo);
        const donker = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const k = await GemeenteKaart.maak(el, {
          data,
          geo: g,
          kleuren: donker ? DONKER : LICHT,
          minderBeweging: minderBeweging(),
          onTik: (id) => kies(id),
          onCamera: (c) => setCamera(c),
        });
        if (weg) {
          k.vernietig();
          return;
        }
        kaart.current = k;
        k.zetStanden(
          laatste.current.standen,
          (laatste.current.resultaat.keuzes.onderdelen.k1 ?? 0) <= -50,
        );
        setGeo(g);
        setKlaar(true);
      } catch (e) {
        onFout(e instanceof Error ? e.message : 'De kaart kon niet worden geladen.');
      }
    })();
    return () => {
      weg = true;
      kaart.current?.vernietig();
      kaart.current = undefined;
    };
  }, [data, kies, onFout]);

  // Gebouwen bijwerken na elke keuze
  useEffect(() => {
    kaart.current?.zetStanden(standen, (resultaat.keuzes.onderdelen.k1 ?? 0) <= -50);
  }, [standen, resultaat, klaar]);

  // Kettingeffecten: lijn tussen gebouwen
  const actie = useSpel((s) => s.actie);
  useEffect(() => {
    if (!actie || !klaar) return;
    for (const l of actie.lijnen.slice(0, 3)) kaart.current?.toonLijn(l.van, l.naar, l.positief);
  }, [actie, klaar]);

  // Tekstballonnen: om de 4 seconden een inwoner, nooit twee keer achter elkaar hetzelfde
  const reacties = useMemo(() => compileer(data.reacties), [data]);
  useEffect(() => {
    if (!klaar) return;
    let vorige: string | undefined;
    let verberg: number | undefined;
    const praat = () => {
      const { resultaat: r, standen: s } = laatste.current;
      const keuze = kiesReactie(
        reacties,
        maakLezer(data, r, s),
        data.personas.personas.map((p) => p.id),
        vorige,
        Math.random,
      );
      if (!keuze) return;
      vorige = keuze.reactie.id;
      setBallon({
        persona: keuze.persona,
        tekst: keuze.reactie.tekst,
        id: `${keuze.reactie.id}-${Date.now()}`,
      });
      window.clearTimeout(verberg);
      verberg = window.setTimeout(() => setBallon(undefined), BALLON_ZICHTBAAR_MS);
    };
    const eerste = window.setTimeout(praat, 1200);
    const klok = window.setInterval(praat, BALLON_MS);
    return () => {
      window.clearTimeout(eerste);
      window.clearInterval(klok);
      window.clearTimeout(verberg);
    };
  }, [klaar, reacties, data]);

  // De ballon volgt de inwoner
  useEffect(() => {
    if (!ballon) return;
    let frame = 0;
    const volg = () => {
      const p = kaart.current?.inwonerOpScherm(ballon.persona);
      const el = ballonEl.current;
      const breedte = houder.current?.clientWidth ?? 0;
      if (p && el) {
        const half = el.offsetWidth / 2 + 8;
        const x = Math.min(Math.max(p.x, half), breedte - half);
        el.style.transform = `translate(${x}px, ${p.y}px) translate(-50%, -100%)`;
      }
      frame = requestAnimationFrame(volg);
    };
    volg();
    return () => cancelAnimationFrame(frame);
  }, [ballon]);

  const persona = (id: string) => data.personas.personas.find((p) => p.id === id)?.naam ?? id;

  return (
    <div className="kaart" data-testid="kaart">
      <div ref={houder} className="kaart-doek" />
      {!klaar && <p className="kaart-laden">De kaart wordt geladen…</p>}
      {klaar && geo && camera && (
        <ul className="kaart-knoppen" aria-label="Gebouwen op de kaart">
          {data.gebouwen.map((g) => {
            const p = geo.gebouwen[g.id];
            const s = standen[g.id];
            if (!p) return null;
            const x = p.x * camera.schaal + camera.x;
            const y = p.y * camera.schaal + camera.y;
            const bedrag =
              s && Math.abs(s.bedrag) >= 50_000 ? `, ${formatMln(s.bedrag, { teken: true })}` : '';
            return (
              <li key={g.id}>
                <button
                  type="button"
                  className="kaart-gebouw"
                  data-gebouw={g.id}
                  style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }}
                  aria-label={`${g.naam}: ${g.omschrijving}. ${s ? TOESTAND_NAAM[s.toestand] : ''}${bedrag}`}
                  onFocus={() => kaart.current?.toonGebouw(g.id)}
                  onClick={() => kies(g.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
      {ballon && (
        <div
          ref={ballonEl}
          className="ballon"
          aria-hidden="true"
          key={ballon.id}
          data-testid="ballon"
        >
          <strong>{persona(ballon.persona)}</strong> {ballon.tekst}
        </div>
      )}
      {klaar && (
        <div className="kaart-zoom">
          <button
            type="button"
            className="knop-rond"
            aria-label="Inzoomen"
            onClick={() => kaart.current?.zoom(1.5)}
          >
            +
          </button>
          <button
            type="button"
            className="knop-rond"
            aria-label="Uitzoomen"
            onClick={() => kaart.current?.zoom(1 / 1.5)}
          >
            −
          </button>
          <button
            type="button"
            className="knop-rond"
            aria-label="Hele gemeente tonen"
            onClick={() => kaart.current?.herstel()}
          >
            ⤢
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * De gemeentekaart (Canvas 2D) met daarover: onzichtbare knoppen op de gebouwen (voor toetsenbord en
 * schermlezer), zoomknoppen en de tekstballonnen van de inwoners. De kaartcode wordt pas geladen
 * als de kaart in beeld komt.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMln, type Data, type Resultaat } from '../../engine';
import type { Camera } from '../../game/kaart/camera';
import type { GemeenteKaart } from '../../game/kaart/GemeenteKaart';
import { BOVEN_DAK } from '../../game/kaart/maten';
import type { BuurtGeo, KaartGeometrie } from '../../game/kaart/geometrie';
import { doelVanVoorwaarde, type Doel } from '../../game/naarPost';
import { maakLezer } from '../../game/reacties/context';
import { compileer, kiesReactie } from '../../game/reacties/kies';
import { zetKaartFoto } from '../../game/kaartFoto';
import { routeNummer } from '../../game/route';
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
  const [ballon, setBallon] = useState<{
    persona: string;
    tekst: string;
    id: string;
    doel?: Doel;
  }>();
  const naarPost = useSpel((s) => s.naarPost);
  // Zolang de muis of focus op de ballon staat, blijft hij staan.
  const vastgehouden = useRef(false);
  const ballonEl = useRef<HTMLElement | null>(null);
  const kies = useSpel((s) => s.kiesGebouw);
  const openMinigame = useSpel((s) => s.openMinigame);
  const nul = useSpel((s) => s.beginpunt === 'nul');
  const routeStap = useSpel((s) => s.routeStap);
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
          onTikMinigame: (id) => openMinigame(id),
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
      // Een foto van jouw gemeente, voor het eindscherm en de deelafbeelding.
      zetKaartFoto(kaart.current?.foto());
      kaart.current?.vernietig();
      kaart.current = undefined;
    };
  }, [data, kies, openMinigame, onFout]);

  // Het openingsshot, zodra het startscherm dicht is (één keer per bezoek).
  const startscherm = useSpel((s) => s.startscherm);
  useEffect(() => {
    if (klaar && !startscherm) kaart.current?.speelIntro();
  }, [klaar, startscherm]);

  // De camera begeleidt de speler: naar het gebouw dat open is (boven het paneel op een telefoon,
  // links van het paneel op een groot scherm), en terug naar de hele gemeente als het dicht gaat.
  const gekozen = useSpel((s) => s.gekozenGebouw);
  const eerder = useRef<string | undefined>(undefined);
  useEffect(() => {
    const k = kaart.current;
    if (!klaar || !k) return;
    const vak = houder.current?.getBoundingClientRect();
    const breed = (vak?.width ?? 0) >= 900;
    if (gekozen && vak) {
      // Op een groot scherm staat het paneel rechts (25rem); op een telefoon onderin (68% van het
      // scherm). Het gebouw komt in het midden van wat er van de kaart te zien blijft.
      const vrij = Math.max(90, window.innerHeight * 0.32 - vak.top);
      k.vliegNaarGebouw(
        gekozen,
        breed ? 1.5 : 1.8,
        breed
          ? { x: (vak.width - 400) / 2 / vak.width, y: 0.5 }
          : { x: 0.5, y: Math.min(0.5, (vrij * 0.5) / vak.height) },
      );
    } else if (eerder.current) {
      k.overzicht();
    }
    eerder.current = gekozen;
  }, [gekozen, klaar]);

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
      if (vastgehouden.current) return;
      const doel = doelVanVoorwaarde(data, keuze.reactie.voorwaarde);
      setBallon({
        persona: keuze.persona,
        tekst: keuze.reactie.tekst,
        id: `${keuze.reactie.id}-${Date.now()}`,
        ...(doel ? { doel } : {}),
      });
      window.clearTimeout(verberg);
      const verdwijn = () => {
        if (vastgehouden.current) verberg = window.setTimeout(verdwijn, 1000);
        else setBallon(undefined);
      };
      verberg = window.setTimeout(verdwijn, BALLON_ZICHTBAAR_MS);
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

  // Dag en nacht: houdt je begroting over, dan schijnt de zon; is er een tekort, dan wordt het
  // avond boven de gemeente.
  const minSaldo = Math.min(...data.jaren.map((j) => resultaat.perJaar[j]?.structureel ?? 0));
  const lucht = minSaldo < -50_000 ? 'avond' : 'dag';

  return (
    <div className={`kaart kaart-${lucht}`} data-testid="kaart" data-lucht={lucht}>
      <div className="kaart-hemel" aria-hidden="true">
        <span className="hemel-zon" />
        <span className="hemel-maan">🌙</span>
      </div>
      <div ref={houder} className="kaart-doek" />
      <div className="kaart-schemer" aria-hidden="true" />
      {klaar && (
        // Wolkjes die langzaam over de gemeente drijven, met hun schaduw op de grond (sfeer).
        <div className="kaart-wolken" aria-hidden="true">
          <span className="wolk w1" />
          <span className="wolk w2" />
          <span className="wolk w3" />
        </div>
      )}
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
            // Bij nul: het nummer op de route, een vinkje als de stap klaar is.
            const nr = nul ? routeNummer(data, g.id) : undefined;
            const boven = { x, y: (p.y - BOVEN_DAK) * camera.schaal + camera.y };
            const routeKlasse =
              nr === undefined
                ? ''
                : nr - 1 < routeStap
                  ? ' klaar'
                  : nr - 1 === routeStap
                    ? ' huidig'
                    : '';
            return (
              <li key={g.id}>
                {nr !== undefined && (
                  <span
                    className={`route-nummer${routeKlasse}`}
                    data-route={nr}
                    aria-hidden="true"
                    style={{
                      transform: `translate(${boven.x}px, ${boven.y}px) translate(-50%, -50%)`,
                    }}
                  >
                    {nr - 1 < routeStap ? '✓' : nr}
                  </span>
                )}
                <button
                  type="button"
                  className="kaart-gebouw"
                  data-gebouw={g.id}
                  style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }}
                  aria-label={`${nr !== undefined ? `Stap ${nr}${nr - 1 < routeStap ? ' (klaar)' : ''}: ` : ''}${g.naam}: ${g.omschrijving}. ${s ? TOESTAND_NAAM[s.toestand] : ''}${bedrag}`}
                  onFocus={() => kaart.current?.toonGebouw(g.id)}
                  onClick={() => kies(g.id)}
                />
              </li>
            );
          })}
          {data.minigames.map((m) => {
            const p = geo.minigames[m.id];
            if (!p) return null;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className="kaart-minigame"
                  data-minigame={m.id}
                  style={{
                    transform: `translate(${p.x * camera.schaal + camera.x}px, ${p.y * camera.schaal + camera.y}px) translate(-50%, -50%)`,
                  }}
                  aria-label={`Minigame in de ${m.naam}: ${m.spel}. ${m.kort}`}
                  onFocus={() => kaart.current?.toonGebouw(m.id)}
                  onClick={() => openMinigame(m.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
      {ballon && !ballon.doel && (
        <div
          ref={(el) => {
            ballonEl.current = el;
          }}
          className="ballon"
          aria-hidden="true"
          key={ballon.id}
          data-testid="ballon"
        >
          <strong>{persona(ballon.persona)}</strong> {ballon.tekst}
        </div>
      )}
      {ballon?.doel && (
        // Een opmerking over een post: tik erop en je gaat naar die post.
        <button
          type="button"
          ref={(el) => {
            ballonEl.current = el;
          }}
          className="ballon ballon-knop"
          key={ballon.id}
          data-testid="ballon"
          aria-label={`${persona(ballon.persona)}: ${ballon.tekst} Naar ${ballon.doel.naam}`}
          onMouseEnter={() => (vastgehouden.current = true)}
          onMouseLeave={() => (vastgehouden.current = false)}
          onFocus={() => (vastgehouden.current = true)}
          onBlur={() => (vastgehouden.current = false)}
          onClick={() => {
            vastgehouden.current = false;
            const doel = ballon.doel;
            setBallon(undefined);
            if (doel) naarPost(doel);
          }}
        >
          <strong>{persona(ballon.persona)}</strong> {ballon.tekst}
          <span className="ballon-naar">Naar {ballon.doel.naam} ›</span>
        </button>
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

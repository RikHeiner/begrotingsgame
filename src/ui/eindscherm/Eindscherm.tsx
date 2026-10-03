/**
 * Het eindscherm (opdracht 8.9): score, saldo per jaar, badges en inwoners, wat stopt en
 * wat je terugkrijgt, de gevoeligheid voor aannames, de vergelijking met een tegenbegroting, en de
 * velden en knoppen voor de tegenbegroting.
 */
import { FoutMelden } from '../algemeen/FoutMelden';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMln, type Data, type Resultaat } from '../../engine';
import { maakLink } from '../../game/deellink';
import {
  behaaldeBadges,
  gevoeligheid,
  lezerVoor,
  maatregelen,
  personaZinnen,
  sterren,
  vergelijkPerThema,
  type Maatregel,
} from '../../game/score';
import { kaartFoto } from '../../game/kaartFoto';
import { useSpel } from '../../game/state/store';
import { insturenMogelijk } from '../../inzending/opslag';
import { CollegeVergelijking } from './CollegeVergelijking';
import { InstuurDialoog } from './InstuurDialoog';
import { SaldoGrafiek, VergelijkGrafiek } from './grafieken';

function Lijst({ titel, items, leeg }: { titel: string; items: Maatregel[]; leeg: string }) {
  return (
    <section className="eind-blok">
      <h2>{titel}</h2>
      {items.length === 0 ? (
        <p>{leeg}</p>
      ) : (
        <ul className="maatregelen">
          {items.map((m) => (
            <li key={m.id}>
              <strong>
                {m.naam} ({m.wijziging}).
              </strong>{' '}
              {m.tekst}{' '}
              <span className="bedrag-inline">
                {formatMln(m.bedrag, { decimalen: 2, teken: true })}
                {m.soort === 'I' ? ' eenmalig' : ' per jaar'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Eindscherm({ data, resultaat }: { data: Data; resultaat: Resultaat }) {
  const terug = useSpel((s) => s.terugNaarGemeente);
  const opnieuw = useSpel((s) => s.opnieuw);
  const meta = useSpel((s) => s.meta);
  const zetMeta = useSpel((s) => s.zetMeta);
  const toonDocument = useSpel((s) => s.toonDocument);
  const kop = useRef<HTMLHeadingElement>(null);
  const [gedeeld, setGedeeld] = useState<string>();
  const [toonVergelijking, setToonVergelijking] = useState(true);
  const [insturen, setInsturen] = useState(false);
  const kanInsturen = insturenMogelijk();
  const alIngestuurd = useSpel((s) => s.ingestuurd === JSON.stringify(s.keuzes));

  useEffect(() => {
    kop.current?.focus();
    window.scrollTo(0, 0);
  }, []);

  const lees = useMemo(() => lezerVoor(data, resultaat), [data, resultaat]);
  const st = sterren(data, resultaat);
  const aantal = st.filter((s) => s.gehaald).length;
  const badges = behaaldeBadges(data, lees);
  const m = maatregelen(data, resultaat);
  const g = useMemo(() => gevoeligheid(data, resultaat.keuzes), [data, resultaat]);
  const tb = data.vergelijking[0];
  const vergelijking = useMemo(
    () => vergelijkPerThema(data, resultaat, tb?.tegenbegroting),
    [data, resultaat, tb],
  );
  const laatste = data.jaren.at(-1) ?? 0;
  const foto = kaartFoto();
  const titel = resultaat.regels.sluitend
    ? data.teksten.eindscherm.ingediend
    : data.teksten.eindscherm.niet_sluitend;

  const deel = async () => {
    const link = maakLink(
      window.location.href,
      resultaat.keuzes,
      data.config.actiefJaar,
      useSpel.getState().beginpunt,
    );
    const tekst = `Mijn begroting voor de gemeente Groningen: ${aantal} van de ${st.length} sterren.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: meta.titel || 'Mijn begroting', text: tekst, url: link });
        setGedeeld('Gedeeld.');
        return;
      }
      await navigator.clipboard.writeText(link);
      setGedeeld('De link staat op je klembord.');
    } catch {
      setGedeeld(`Kopieer deze link: ${link}`);
    }
  };

  return (
    <main className="eindscherm" data-testid="eindscherm">
      {resultaat.regels.sluitend && (
        // Vuurwerk boven het Stadhuis als je begroting sluit (niet bij minder beweging).
        <div className="vuurwerk" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className={`pijl p${i}`} />
          ))}
        </div>
      )}
      <header className="eind-kop">
        <h1 ref={kop} tabIndex={-1}>
          {titel}
        </h1>
        <p className="sterren" role="img" aria-label={`${aantal} van de ${st.length} sterren`}>
          {st.map((s) => (
            <span key={s.id} aria-hidden="true" className={s.gehaald ? 'ster aan' : 'ster'}>
              ★
            </span>
          ))}
        </p>
        {foto && (
          <figure className="eind-foto">
            <img src={foto} alt="Jouw gemeente op de kaart, zoals je hem achterliet" />
          </figure>
        )}
        <ul className="ster-lijst">
          {st.map((s) => (
            <li key={s.id}>
              {s.gehaald ? '✓' : '✗'} {s.label}
            </li>
          ))}
        </ul>
      </header>

      <section className="eind-blok">
        <h2>Saldo per jaar</h2>
        <SaldoGrafiek data={data} resultaat={resultaat} />
        {resultaat.regels.overtredingen.length > 0 && (
          <ul className="overtredingen">
            {resultaat.regels.overtredingen.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        )}
        <p>
          Hoe zeker is dit? Met voorzichtige aannames houd je in {laatste}{' '}
          {formatMln(g.voorzichtig, { teken: true })} over, met optimistische{' '}
          {formatMln(g.optimistisch, { teken: true })}. {data.teksten.aanname_uitleg}
        </p>
      </section>

      {badges.length > 0 && (
        <section className="eind-blok">
          <h2>Badges</h2>
          <ul className="badges">
            {badges.map((b) => (
              <li key={b.id}>
                <span aria-hidden="true">{b.icoon}</span> <strong>{b.naam}</strong>
                <span className="klein">{b.uitleg}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="eind-blok">
        <h2>Wat merken de inwoners?</h2>
        <ul className="inwoners">
          {personaZinnen(data, resultaat).map((p) => (
            <li key={p.id}>{p.zin}</li>
          ))}
        </ul>
        <p className="klein">{data.teksten.inwoners_uitleg}</p>
      </section>

      <Lijst
        titel="Dit doet de gemeente niet meer"
        items={m.minder}
        leeg="Je hebt nergens op bezuinigd."
      />
      <Lijst
        titel="Hier krijg je meer voor terug"
        items={m.meer}
        leeg="Je hebt nergens extra in geïnvesteerd."
      />
      {m.belasting.length > 0 && <Lijst titel="Dit betaal je meer" items={m.belasting} leeg="" />}

      <CollegeVergelijking data={data} resultaat={resultaat} />

      {data.config.vergelijkingTonen && tb && (
        <section className="eind-blok">
          <h2>Vergelijking</h2>
          <label className="keuze">
            <input
              type="checkbox"
              checked={toonVergelijking}
              onChange={(e) => setToonVergelijking(e.target.checked)}
            />{' '}
            Toon de vergelijking met {tb.tegenbegroting.titel.split('.')[0]}
          </label>
          {toonVergelijking && (
            <>
              <p className="klein">
                Per thema in {data.jaren[0]}: wat jouw keuzes opleveren (+) of kosten (−), naast de
                tegenbegroting. De begroting van het college is steeds € 0: dat is de
                ontwerpbegroting zelf.
              </p>
              <VergelijkGrafiek rijen={vergelijking} naamVergelijking="VVD" />
            </>
          )}
        </section>
      )}

      <section className="eind-blok">
        <h2>Jouw tegenbegroting</h2>
        <label className="veld">
          Titel
          <input
            type="text"
            value={meta.titel}
            maxLength={80}
            placeholder="Bijvoorbeeld: Groningen kan het"
            onChange={(e) => zetMeta({ titel: e.target.value })}
          />
        </label>
        <label className="veld">
          Naam (mag leeg blijven)
          <input
            type="text"
            value={meta.naam}
            maxLength={60}
            autoComplete="name"
            onChange={(e) => zetMeta({ naam: e.target.value })}
          />
        </label>
        <label className="veld">
          Mijn eigen idee
          <textarea
            value={meta.idee}
            maxLength={1000}
            rows={4}
            onChange={(e) => zetMeta({ idee: e.target.value })}
          />
        </label>
        <div className="eind-knoppen">
          <button
            type="button"
            className="knop-indienen"
            onClick={toonDocument}
            data-testid="maak-tegenbegroting"
          >
            Maak mijn tegenbegroting
          </button>
          <button type="button" className="knop" onClick={deel}>
            Deel mijn begroting
          </button>
          {kanInsturen && (
            <button
              type="button"
              className="knop"
              onClick={() => setInsturen(true)}
              disabled={alIngestuurd}
              data-testid="insturen"
            >
              {alIngestuurd ? 'Ingestuurd ✓' : 'Stuur in naar de fractie'}
            </button>
          )}
          <button type="button" className="knop" onClick={terug}>
            Terug naar de gemeente
          </button>
          <button type="button" className="knop" onClick={opnieuw}>
            Opnieuw spelen
          </button>
        </div>
        <p role="status" aria-live="polite" className="klein">
          {gedeeld}
        </p>
      </section>
      <FoutMelden data={data} />
      <footer className="colofon">
        {data.teksten.colofon} <a href="/privacy.html">Privacyverklaring</a> ·{' '}
        <a href="/toegankelijkheid.html">Toegankelijkheid</a>
      </footer>
      {kanInsturen && (
        <InstuurDialoog
          data={data}
          resultaat={resultaat}
          open={insturen}
          onSluit={() => setInsturen(false)}
        />
      )}
    </main>
  );
}

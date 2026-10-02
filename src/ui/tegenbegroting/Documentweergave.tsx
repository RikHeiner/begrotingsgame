/**
 * De tegenbegroting als document in de app, met export naar Word, PDF (printen) en afbeelding.
 * Word en de afbeelding worden pas gemaakt als de speler op de knop drukt.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMln, type Data, type Resultaat } from '../../engine';
import { maakLink } from '../../game/deellink';
import { sterren } from '../../game/score';
import { useSpel } from '../../game/state/store';
import {
  bestandsnaam,
  maakTegenbegroting,
  mlnTabel,
  type TabelRij,
  type ThemaGroep,
} from '../../game/tegenbegroting/document';

const tabelGetal = mlnTabel;

function Maatregelen({ groepen, leeg }: { groepen: ThemaGroep[]; leeg: string }) {
  if (!groepen.length) return <p>{leeg}</p>;
  return (
    <>
      {groepen.map((g) => (
        <section key={g.thema}>
          <h3>{g.thema}</h3>
          <ul className="doc-maatregelen">
            {g.regels.map((r) => (
              <li key={r.id}>
                <strong>
                  {r.naam}
                  {r.wijziging ? ` (${r.wijziging})` : ''}.
                </strong>{' '}
                {r.toelichting}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function GeldTabel({
  titel,
  rijen,
  jaar,
  s,
  i,
}: {
  titel: string;
  rijen: TabelRij[];
  jaar: number;
  s: number;
  i: number;
}) {
  return (
    <table className="doc-tabel">
      <thead>
        <tr>
          <th scope="col">{titel}</th>
          <th scope="col">{jaar}</th>
          <th scope="col">S/I</th>
        </tr>
      </thead>
      <tbody>
        {rijen.map((r, n) => (
          <tr key={`${r.omschrijving}-${n}`}>
            <td>
              {r.aanname && <abbr title="Aanname">⚠︎ </abbr>}
              {r.omschrijving}
            </td>
            <td>{tabelGetal(r.bedrag)}</td>
            <td>{r.soort}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Totaal structureel</th>
          <td>{tabelGetal(s)}</td>
          <td>S</td>
        </tr>
        <tr>
          <th scope="row">Totaal incidenteel</th>
          <td>{tabelGetal(i)}</td>
          <td>I</td>
        </tr>
        <tr>
          <th scope="row">Totaal</th>
          <td>{tabelGetal(s + i)}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

export function Documentweergave({ data, resultaat }: { data: Data; resultaat: Resultaat }) {
  const meta = useSpel((s) => s.meta);
  const terug = useSpel((s) => s.indienen);
  const [status, setStatus] = useState<string>();
  const kop = useRef<HTMLHeadingElement>(null);
  const tb = useMemo(() => maakTegenbegroting(data, resultaat, meta), [data, resultaat, meta]);
  const f = tb.financieel;
  const t = f.totalen;

  useEffect(() => {
    kop.current?.focus();
    window.scrollTo(0, 0);
  }, []);

  const word = async () => {
    setStatus('Het Word-bestand wordt gemaakt…');
    try {
      const [{ maakWord }, { Packer }, { download }] = await Promise.all([
        import('../../game/tegenbegroting/word'),
        import('docx'),
        import('./afbeelding'),
      ]);
      download(await Packer.toBlob(maakWord(tb)), bestandsnaam(tb.titel, 'docx'));
      setStatus('Het Word-bestand is gedownload.');
    } catch {
      setStatus('Het Word-bestand kon niet worden gemaakt.');
    }
  };
  const afbeelding = async () => {
    setStatus('De afbeelding wordt gemaakt…');
    try {
      const { maakAfbeelding, download } = await import('./afbeelding');
      const st = sterren(data, resultaat);
      const aantal = st.filter((s) => s.gehaald).length;
      const link = maakLink(
        window.location.href,
        resultaat.keuzes,
        data.config.actiefJaar,
        useSpel.getState().beginpunt,
      );
      download(
        await maakAfbeelding(tb, { aantal, van: st.length }, link),
        bestandsnaam(tb.titel, 'png'),
      );
      setStatus('De afbeelding is gedownload.');
    } catch {
      setStatus('De afbeelding kon niet worden gemaakt.');
    }
  };

  return (
    <div className="document-scherm">
      <div className="document-balk geen-print">
        <button type="button" className="knop" onClick={terug}>
          ← Terug
        </button>
        <button type="button" className="knop-indienen" onClick={word} data-testid="download-word">
          Download Word
        </button>
        <button type="button" className="knop" onClick={() => window.print()}>
          Opslaan als PDF
        </button>
        <button
          type="button"
          className="knop"
          onClick={afbeelding}
          data-testid="download-afbeelding"
        >
          Afbeelding
        </button>
        <p role="status" aria-live="polite" className="klein">
          {status}
        </p>
      </div>
      <article className="document" data-testid="document">
        <header className="doc-voorblad">
          <p className="doc-soort">Tegenbegroting</p>
          <h1 ref={kop} tabIndex={-1}>
            {tb.titel}
          </h1>
          <p>{tb.ondertitel}</p>
          {tb.naam && <p className="doc-naam">{tb.naam}</p>}
        </header>

        <h2>Inleiding</h2>
        {tb.inleiding.map((x) => (
          <p key={x}>{x}</p>
        ))}

        <h2>Besparingen en opbrengsten</h2>
        <Maatregelen groepen={tb.besparingen} leeg="Geen besparingen." />

        <h2>Investeringen en lastenverlichting</h2>
        <Maatregelen groepen={tb.investeringen} leeg="Geen investeringen." />

        <h2>Kettingeffecten</h2>
        {tb.kettingeffecten.length ? (
          <>
            <p className="klein">
              ⚠︎ Deze bedragen zijn aannames of spelregels, geen getallen uit de begroting.
            </p>
            <ul className="doc-maatregelen">
              {tb.kettingeffecten.map((r) => (
                <li key={r.id}>
                  <strong>⚠︎ {r.naam}.</strong> {r.toelichting}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Geen kettingeffecten.</p>
        )}

        <h2>Mijn eigen ideeën</h2>
        {tb.ideeen ? (
          tb.ideeen.split(/\n+/).map((x) => <p key={x}>{x}</p>)
        ) : (
          <p>Geen eigen ideeën ingevuld.</p>
        )}

        <h2>Wat merken de inwoners?</h2>
        <p className="klein">{tb.gevolgen.uitleg}</p>
        <div className="doc-scroll">
          <table className="doc-tabel">
            <thead>
              <tr>
                <th scope="col">Inwoner</th>
                <th scope="col" className="links">
                  Wat merkt hij of zij?
                </th>
              </tr>
            </thead>
            <tbody>
              {tb.gevolgen.inwoners.map((x) => (
                <tr key={x.naam}>
                  <td>{x.naam}</td>
                  <td className="links">{x.zin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>Financieel overzicht</h2>
        <div className="doc-scroll">
          <GeldTabel
            titel="Ombuigingen en opbrengsten (x € 1 miljoen)"
            rijen={f.ombuigingen}
            jaar={f.jaar}
            s={t.ombuigingenS}
            i={t.ombuigingenI}
          />
          <GeldTabel
            titel="Uitgaven (x € 1 miljoen)"
            rijen={f.uitgaven}
            jaar={f.jaar}
            s={t.uitgavenS}
            i={t.uitgavenI}
          />
          <table className="doc-tabel">
            <tbody>
              <tr>
                <th scope="row">Saldo structureel</th>
                <td data-testid="doc-saldo-s">{tabelGetal(t.saldoS)}</td>
              </tr>
              <tr>
                <th scope="row">Saldo eenmalig</th>
                <td>{tabelGetal(t.saldoI)}</td>
              </tr>
            </tbody>
          </table>
          <h3>Meerjarig</h3>
          <table className="doc-tabel">
            <thead>
              <tr>
                <th scope="col">Saldo (x € 1 miljoen)</th>
                {f.meerjarig.map((m) => (
                  <th scope="col" key={m.jaar}>
                    {m.jaar}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Structureel</th>
                {f.meerjarig.map((m) => (
                  <td key={m.jaar}>{tabelGetal(m.structureel)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Eenmalig</th>
                {f.meerjarig.map((m) => (
                  <td key={m.jaar}>{tabelGetal(m.incidenteel)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Bronnen en uitleg</h2>
        <p>{tb.aanname}</p>
        <ul className="doc-bronnen">
          {tb.bronnen.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p className="klein geen-print">
          Saldo in de HUD: {formatMln(t.saldoS, { teken: true })} per jaar.
        </p>
      </article>
    </div>
  );
}

/**
 * De tegenbegroting als document in de app, met export naar Word, PDF (printen) en afbeelding.
 * Word en de afbeelding worden pas gemaakt als de speler op de knop drukt.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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

/** De beelden van de huisstijl (public/huisstijl), ook als de site in een submap staat. */
const beeld = (naam: string) => `${import.meta.env.BASE_URL}huisstijl/${naam}`;

/**
 * Bij "Opslaan als PDF" geen foto's in het document: die vallen in sommige browsers (Safari) over
 * twee pagina's. Ze gaan dan echt uit de pagina, niet alleen met de printstijl.
 */
const ZonderBeelden = createContext(false);

/** Het oranje-blauwe pijltje voor elke hoofdkop, zoals in de tegenbegroting van de fractie. */
function Kop1({ children, id }: { children: ReactNode; id?: string }) {
  const zonder = useContext(ZonderBeelden);
  return (
    <h2 className="doc-kop1" id={id}>
      {!zonder && <img src={beeld('pijltje.png')} alt="" width={20} height={23} />}
      {children}
    </h2>
  );
}

/** Een tussenblad, zoals in de tegenbegroting: een foto over de hele pagina, de titel groot in wit. */
function Tussenblad({ titel, foto }: { titel: string; foto: string }) {
  const zonder = useContext(ZonderBeelden);
  if (zonder) return null;
  return (
    <section className="doc-blad doc-tussenblad" aria-hidden="true">
      <img className="doc-tussenblad-foto" src={beeld(foto)} alt="" />
      <span className="doc-tussenblad-titel">{titel}</span>
    </section>
  );
}

function Maatregelen({ groepen, leeg }: { groepen: ThemaGroep[]; leeg: string }) {
  if (!groepen.length) return <p>{leeg}</p>;
  return (
    <>
      {groepen.map((g) => (
        <section key={g.thema} className="doc-kopje">
          <h3 className="doc-kop2">{g.thema}</h3>
          <p className="doc-intro">{g.intro}</p>
          {g.regels.map((r) => (
            <p key={r.id} className="doc-punt">
              <span className="doc-pijl" aria-hidden="true">
                ▶
              </span>
              <strong>
                {r.zekerheid !== 'feit' ? '⚠︎ ' : ''}
                {r.naam}
                {r.wijziging ? ` (${r.wijziging})` : ''}.
              </strong>{' '}
              {r.toelichting}
            </p>
          ))}
        </section>
      ))}
    </>
  );
}

function GeldTabel({ rijen, jaar, totaal }: { rijen: TabelRij[]; jaar: number; totaal: number }) {
  return (
    <table className="doc-tabel">
      <thead>
        <tr>
          <th scope="col">Omschrijving</th>
          <th scope="col">{jaar}</th>
          <th scope="col">Structureel/ incidenteel</th>
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
          <th scope="row">Totaal</th>
          <td>{tabelGetal(totaal)}</td>
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
  // Opslaan als PDF: eerst de foto's uit de pagina, dan printen, daarna de foto's terug.
  const [pdf, setPdf] = useState(false);
  useEffect(() => {
    if (!pdf) return;
    const terugzetten = () => setPdf(false);
    window.addEventListener('afterprint', terugzetten, { once: true });
    const t = window.setTimeout(() => window.print(), 50);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', terugzetten);
    };
  }, [pdf]);
  const kop = useRef<HTMLHeadingElement>(null);
  const tb = useMemo(() => maakTegenbegroting(data, resultaat, meta), [data, resultaat, meta]);
  const f = tb.financieel;
  const t = f.totalen;
  const d = tb.teksten;

  useEffect(() => {
    kop.current?.focus();
    window.scrollTo(0, 0);
  }, []);

  const word = async () => {
    setStatus('Het Word-bestand wordt gemaakt…');
    try {
      const [{ maakWord, BEELD_BESTANDEN: B }, { Packer }, { download }] = await Promise.all([
        import('../../game/tegenbegroting/word'),
        import('docx'),
        import('./afbeelding'),
      ]);
      // De foto's en pijlen van de huisstijl; lukt dat niet, dan een Word-bestand zonder beelden.
      const haal = async (naam: string) =>
        new Uint8Array(await (await fetch(beeld(naam))).arrayBuffer());
      const beelden = await Promise.all([
        haal(B.pijltje),
        haal(B.pijl),
        Promise.all(B.voorblad.map(haal)),
        haal(B.tussenbladen.besparingen),
        haal(B.tussenbladen.investeringen),
        haal(B.tussenbladen.financieel),
      ])
        .then(([pijltje, pijl, voorblad, besparingen, investeringen, financieel]) => ({
          pijltje,
          pijl,
          voorblad,
          tussenbladen: { besparingen, investeringen, financieel },
        }))
        .catch(() => undefined);
      download(await Packer.toBlob(maakWord(tb, beelden)), bestandsnaam(tb.titel, 'docx'));
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
        <button type="button" className="knop" onClick={() => setPdf(true)}>
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
      <ZonderBeelden.Provider value={pdf}>
        <article className="document" data-testid="document">
          {/* 1. Voorblad */}
          <section className="doc-blad doc-voorblad">
            <div className="doc-voorblad-boven">
              <h1 ref={kop} tabIndex={-1}>
                {tb.titel}
              </h1>
              <p className="doc-slogan">{d.ondertitel}</p>
            </div>
            {!pdf && (
              <div className="doc-pijlen" aria-hidden="true">
                <img src={beeld('pijl.png')} alt="" />
                <img src={beeld('voorblad-straat.png')} alt="" />
                <img src={beeld('voorblad-sportcentrum.png')} alt="" />
                <img src={beeld('voorblad-martinitoren.png')} alt="" />
              </div>
            )}
            <div className="doc-voorblad-onder">
              <p className="doc-soort">
                {d.soort}
                {tb.naam ? ` ${tb.naam}` : ''}
              </p>
              <p className="doc-onder">{tb.ondertitel}</p>
            </div>
          </section>

          {/* 2. Inhoudsopgave en wie het opstelde */}
          <section className="doc-blad">
            <Kop1>Inhoudsopgave</Kop1>
            <ul className="doc-inhoud">
              <li>
                {d.besparingen.titel}
                <ul>
                  {tb.besparingen.map((g) => (
                    <li key={g.thema}>{g.thema}</li>
                  ))}
                </ul>
              </li>
              <li>
                {d.investeringen.titel}
                <ul>
                  {tb.investeringen.map((g) => (
                    <li key={g.thema}>{g.thema}</li>
                  ))}
                  {tb.ideeen && <li>Mijn eigen ideeën</li>}
                </ul>
              </li>
              <li>
                {d.financieel.titel}
                <ul>
                  <li>Ombuigingen en opbrengsten (x1 miljoen)</li>
                  <li>Uitgaven (x1 miljoen)</li>
                </ul>
              </li>
            </ul>
            <Kop1>{d.opgesteld_door}</Kop1>
            {tb.naam && <p className="doc-naam">{tb.naam}</p>}
            <p>{d.makers}</p>
          </section>

          {/* 3. Besparingen */}
          <Tussenblad titel={d.besparingen.titel} foto="tussenblad-besparingen-staand.jpg" />
          <section className="doc-blad">
            <Kop1>{d.besparingen.titel}</Kop1>
            <p className="doc-intro">{d.besparingen.intro}</p>
            <Maatregelen groepen={tb.besparingen} leeg="Geen besparingen." />
          </section>

          {/* 4. Investeringen */}
          <Tussenblad titel={d.investeringen.titel} foto="tussenblad-investeringen-staand.jpg" />
          <section className="doc-blad">
            <Kop1>{d.investeringen.titel}</Kop1>
            <p className="doc-intro">{d.investeringen.intro}</p>
            <Maatregelen groepen={tb.investeringen} leeg="Geen investeringen." />
            {tb.ideeen && (
              <section className="doc-kopje">
                <h3 className="doc-kop2">Mijn eigen ideeën</h3>
                {tb.ideeen.split(/\n+/).map((x) => (
                  <p key={x}>{x}</p>
                ))}
              </section>
            )}
          </section>

          {/* 5. Financieel overzicht */}
          <Tussenblad titel={d.financieel.titel} foto="tussenblad-financieel-staand.jpg" />
          <section className="doc-blad">
            <Kop1>{d.financieel.titel}</Kop1>
            <p className="doc-intro">{d.financieel.intro}</p>
            {tb.inleiding.map((x) => (
              <p key={x}>{x}</p>
            ))}
            <div className="doc-scroll">
              <h3 className="doc-kop2">Ombuigingen en opbrengsten (x1 miljoen)</h3>
              <GeldTabel
                rijen={f.ombuigingen}
                jaar={f.jaar}
                totaal={t.ombuigingenS + t.ombuigingenI}
              />
              <h3 className="doc-kop2">Uitgaven (x1 miljoen)</h3>
              <GeldTabel rijen={f.uitgaven} jaar={f.jaar} totaal={t.uitgavenS + t.uitgavenI} />
              <h3 className="doc-kop2">Saldo (x1 miljoen)</h3>
              <table className="doc-tabel">
                <tbody>
                  <tr>
                    <th scope="row">Structureel (elk jaar)</th>
                    <td data-testid="doc-saldo-s">{tabelGetal(t.saldoS)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Incidenteel (eenmalig)</th>
                    <td>{tabelGetal(t.saldoI)}</td>
                  </tr>
                </tbody>
              </table>
              <h3 className="doc-kop2">Meerjarig (x1 miljoen)</h3>
              <table className="doc-tabel">
                <thead>
                  <tr>
                    <th scope="col">Saldo</th>
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
                    <th scope="row">Incidenteel</th>
                    {f.meerjarig.map((m) => (
                      <td key={m.jaar}>{tabelGetal(m.incidenteel)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {tb.kettingeffecten.length > 0 && (
              <section className="doc-kopje">
                <h3 className="doc-kop2">Kettingeffecten</h3>
                <p className="klein">
                  ⚠︎ Deze bedragen zijn aannames of spelregels, geen getallen uit de begroting.
                </p>
                {tb.kettingeffecten.map((r) => (
                  <p key={r.id} className="doc-punt">
                    <span className="doc-pijl" aria-hidden="true">
                      ▶
                    </span>
                    <strong>⚠︎ {r.naam}.</strong> {r.toelichting}
                  </p>
                ))}
              </section>
            )}
            <section className="doc-kopje doc-bronnen-blok">
              <h3 className="doc-kop2">Bronnen en uitleg</h3>
              <p className="klein">{tb.aanname}</p>
              <ul className="doc-bronnen">
                {tb.bronnen.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
            <p className="klein geen-print">
              Saldo in de HUD: {formatMln(t.saldoS, { teken: true })} per jaar.
            </p>
          </section>
        </article>
      </ZonderBeelden.Provider>
    </div>
  );
}

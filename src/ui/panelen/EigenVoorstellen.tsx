/**
 * Eigen voorstellen in het Beleidshuis (iets wat de gemeente niet meer hoeft te doen) en het
 * Veilinghuis (iets wat de gemeente kan verkopen). De speler noemt zelf een bedrag; dat is een eigen
 * schatting en staat zo ook in de tegenbegroting.
 */
import { useId, useState } from 'react';
import { EIGEN, formatMln, type Resultaat } from '../../engine';
import { useSpel } from '../../game/state/store';

const TEKST = {
  beleid: {
    kop: 'Zelf iets inbrengen',
    uitleg:
      'Weet je iets wat de gemeente niet meer hoeft te doen? Zet het erbij, met het bedrag dat het volgens jou scheelt.',
    veld: 'Wat hoeft de gemeente niet meer te doen?',
    voorbeeld: 'Bijvoorbeeld: stoppen met het gemeentelijk magazine',
    soort: 'S' as const,
  },
  veiling: {
    kop: 'Zelf iets inbrengen om te verkopen',
    uitleg:
      'Weet je iets wat de gemeente kan verkopen? Zet het erbij, met wat het volgens jou eenmalig oplevert boven de boekwaarde (de boekwinst).',
    veld: 'Wat kan de gemeente verkopen?',
    voorbeeld: 'Bijvoorbeeld: het oude pand aan de …',
    soort: 'I' as const,
  },
};

const leesMln = (x: string) => Number(x.replace(/\s/g, '').replace(',', '.'));

export function EigenVoorstellen({
  plek,
  resultaat,
}: {
  plek: 'beleid' | 'veiling';
  resultaat: Resultaat;
}) {
  const voegToe = useSpel((s) => s.voegEigenToe);
  const weg = useSpel((s) => s.verwijderEigen);
  const t = TEKST[plek];
  const id = useId();
  const [naam, setNaam] = useState('');
  const [bedrag, setBedrag] = useState('');
  const [soort, setSoort] = useState<'S' | 'I'>(t.soort);
  const [fout, setFout] = useState<string>();
  const lijst = (resultaat.keuzes.eigen ?? []).filter((x) => x.plek === plek);

  const opslaan = (e: React.FormEvent) => {
    e.preventDefault();
    const mln = leesMln(bedrag);
    if (naam.trim().length < EIGEN.naamMin) return setFout('Schrijf kort op wat het is.');
    if (!Number.isFinite(mln) || mln <= 0)
      return setFout('Vul een bedrag in miljoenen in, bijvoorbeeld 0,25.');
    if (mln > EIGEN.maxMln)
      return setFout(`Een eigen voorstel kan hooguit € ${EIGEN.maxMln} mln zijn.`);
    if (voegToe({ plek, naam: naam.trim(), bedrag_mln: mln, soort })) {
      setNaam('');
      setBedrag('');
      setFout(undefined);
    }
  };

  return (
    <section className="eigen" aria-labelledby={`${id}-kop`} data-testid={`eigen-${plek}`}>
      <h3 id={`${id}-kop`}>{t.kop}</h3>
      <p className="klein">{t.uitleg}</p>
      {lijst.length > 0 && (
        <ul className="eigen-lijst">
          {lijst.map((v) => (
            <li key={v.id}>
              <span>
                <strong>⚠︎ {v.naam}</strong>{' '}
                <span className="klein">
                  {formatMln(v.bedrag_mln * 1e6, { decimalen: 2, teken: true })}{' '}
                  {v.soort === 'S' ? 'per jaar' : 'eenmalig'} · eigen schatting
                </span>
              </span>
              <button
                type="button"
                className="knop"
                aria-label={`${v.naam} weghalen`}
                onClick={() => weg(v.id)}
              >
                Weghalen
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="eigen-form" onSubmit={opslaan} noValidate>
        <label htmlFor={`${id}-naam`}>{t.veld}</label>
        <input
          id={`${id}-naam`}
          type="text"
          maxLength={EIGEN.naamMax}
          placeholder={t.voorbeeld}
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
        />
        <div className="eigen-rij">
          <label htmlFor={`${id}-bedrag`}>
            {plek === 'veiling' ? 'Opbrengst (boekwinst)' : 'Dat scheelt'}: €
          </label>
          <input
            id={`${id}-bedrag`}
            type="text"
            inputMode="decimal"
            placeholder="0,25"
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
          />
          <span>mln</span>
        </div>
        <fieldset className="eigen-soort">
          <legend className="klein">Hoe vaak?</legend>
          <label>
            <input
              type="radio"
              name={`${id}-soort`}
              checked={soort === 'S'}
              onChange={() => setSoort('S')}
            />{' '}
            Elk jaar
          </label>
          <label>
            <input
              type="radio"
              name={`${id}-soort`}
              checked={soort === 'I'}
              onChange={() => setSoort('I')}
            />{' '}
            Eenmalig
          </label>
        </fieldset>
        {fout && (
          <p className="eigen-fout" role="alert">
            {fout}
          </p>
        )}
        <p className="klein">
          ⚠︎ Het bedrag is jouw eigen schatting. Zo staat het ook in je tegenbegroting.
        </p>
        <button type="submit" className="knop-indienen">
          Voeg toe
        </button>
      </form>
    </section>
  );
}

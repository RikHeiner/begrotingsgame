/**
 * Woonlasten van Groningen naast die van andere gemeenten (BEVINDINGEN punt 49), onderaan "Wat
 * betekent het voor mij?". Rekent met het standaardhuishouden van COELO.
 */
import { useState } from 'react';
import { formatEuro, type Keuzes } from '../../engine';
import type { Woonlasten } from '../../engine/schema';
import {
  AANTAL_STEDEN,
  vergelijkWoonlasten,
  type Grootte,
  type Rij,
  type Soort,
} from '../../game/woonlasten';

function Staven({
  rijen,
  gemiddelde,
  label,
}: {
  rijen: Rij[];
  gemiddelde?: number;
  label: string;
}) {
  const max = Math.max(...rijen.map((r) => r.bedrag), gemiddelde ?? 0);
  const alle: (Rij | { naam: string; bedrag: number; gemiddeld: true })[] = [...rijen];
  if (gemiddelde !== undefined) {
    const plek = rijen.findIndex((r) => r.bedrag > gemiddelde);
    alle.splice(plek < 0 ? rijen.length : plek, 0, {
      naam: 'Gemiddeld in Nederland',
      bedrag: gemiddelde,
      gemiddeld: true,
    });
  }
  return (
    <ol className="woonlasten-staven" aria-label={label}>
      {alle.map((r) => {
        const klasse = 'gemiddeld' in r ? 'gemiddeld' : r.eigen ? 'eigen' : undefined;
        return (
          <li key={r.naam} className={klasse} data-gemeente={r.naam}>
            <span className="woonlasten-naam">{r.naam}</span>
            <span className="woonlasten-staaf" aria-hidden="true">
              <span style={{ width: `${(r.bedrag / max) * 100}%` }} />
            </span>
            <span className="woonlasten-bedrag">{formatEuro(r.bedrag)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function WoonlastenVergelijking({
  woonlasten,
  keuzes,
  soort,
  grootte,
}: {
  woonlasten: Woonlasten;
  keuzes: Keuzes;
  soort: Soort;
  grootte: Grootte;
}) {
  const [lijst, setLijst] = useState<'steden' | 'provincie'>('steden');
  const v = vergelijkWoonlasten(woonlasten, keuzes, soort, grootte);
  if (!v) return null;
  const wie = `${grootte === 'een' ? 'Een eenpersoonshuishouden' : 'Een huishouden van drie personen'} met een ${soort === 'koop' ? 'koophuis' : 'huurhuis'}`;
  const anders = Math.abs(v.straks - v.nu) >= 0.5;
  const rijen = lijst === 'steden' ? v.steden : v.provincie;

  return (
    <section className="woonlasten" data-testid="woonlasten-vergelijking">
      <h3>Vergeleken met andere gemeenten</h3>
      <p>
        {wie} betaalt in {v.naam} in {v.jaar} <strong>{formatEuro(v.nu)}</strong> aan gemeentelijke
        woonlasten
        {v.gemiddelde !== undefined && <> (gemiddeld in Nederland: {formatEuro(v.gemiddelde)})</>}.
        {v.rang && (
          <>
            {' '}
            Dat is plaats <strong>{v.rang.nu}</strong> van de {v.rang.aantal} gemeenten; plaats 1 is
            het goedkoopst.
          </>
        )}
      </p>
      {soort === 'koop' ? (
        <p data-testid="woonlasten-straks">
          {anders ? (
            <>
              Met jouw OZB-keuze wordt dat <strong>{formatEuro(v.straks)}</strong>
              {v.rang && <>, plaats {v.rang.straks}</>}.
            </>
          ) : (
            <>Met jouw keuzes blijft dat gelijk: je verandert de OZB niet.</>
          )}
        </p>
      ) : (
        <p className="klein">
          Huurders betalen de afvalstoffenheffing (en in sommige gemeenten rioolheffing). Die kun je
          in de game niet veranderen. Een vergelijking per gemeente voor huurders staat niet in het
          databestand van COELO.
        </p>
      )}
      {soort === 'koop' && (
        <>
          <div className="woonlasten-tabs" role="group" aria-label="Vergelijk met">
            <button
              type="button"
              aria-pressed={lijst === 'steden'}
              onClick={() => setLijst('steden')}
            >
              Grote steden
            </button>
            <button
              type="button"
              aria-pressed={lijst === 'provincie'}
              onClick={() => setLijst('provincie')}
            >
              Provincie {v.provincieNaam}
            </button>
          </div>
          <Staven
            rijen={rijen}
            gemiddelde={v.gemiddelde}
            label={
              lijst === 'steden'
                ? 'Woonlasten in de grote steden'
                : `Woonlasten in de provincie ${v.provincieNaam}`
            }
          />
          {anders && <p className="klein">{v.naam} staat in de lijst met jouw OZB-keuze.</p>}
        </>
      )}
      <p className="klein">
        {woonlasten.definitie} Het gaat om dit standaardhuishouden, niet om de WOZ-waarde die je
        hierboven invult.
        {lijst === 'steden' &&
          soort === 'koop' &&
          ` Grote steden: de ${AANTAL_STEDEN} gemeenten met de meeste inwoners.`}{' '}
        Bron: {v.bronnen.join('; ')}.
      </p>
    </section>
  );
}

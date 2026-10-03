/**
 * Academiegebouw: "Rondkomen als student". Verdeel een maandbudget. Het inkomen en de vaste kosten
 * zijn een voorbeeld; de afvalstoffenheffing is het echte tarief van de gemeente.
 */
import { useId, useState } from 'react';
import {
  aandeelGemeente,
  BEGIN,
  gemeentePerMaand,
  saldo,
  SCHUIF,
  studentScore,
  VOORBEELD,
  type StudentKeuzes,
} from '../../game/mgAcademie';
import type { MinigameProps } from './types';
import './Academie.css';

const euro = (x: number): string =>
  x.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });

const SCHUIVEN: { sleutel: keyof StudentKeuzes; naam: string; uitleg: string }[] = [
  { sleutel: 'boodschappen', naam: 'Boodschappen', uitleg: 'eten, drinken, wasmiddel' },
  { sleutel: 'uitgaan', naam: 'Uitgaan en sport', uitleg: 'kroeg, film, sportclub' },
  { sleutel: 'sparen', naam: 'Sparen', uitleg: 'voor later of als iets kapotgaat' },
];

function Schuif({
  naam,
  uitleg,
  waarde,
  onWijzig,
}: {
  naam: string;
  uitleg: string;
  waarde: number;
  onWijzig: (w: number) => void;
}) {
  const id = useId();
  const zet = (w: number) => onWijzig(Math.max(SCHUIF.min, Math.min(SCHUIF.max, w)));
  return (
    <div className="mg-student-schuif">
      <label htmlFor={id}>
        <strong>{naam}</strong> <span className="klein">({uitleg})</span>
      </label>
      <div className="mg-student-rij">
        <button
          type="button"
          className="knop"
          aria-label={`${naam}: € ${SCHUIF.stap} minder`}
          disabled={waarde <= SCHUIF.min}
          onClick={() => zet(waarde - SCHUIF.stap)}
        >
          −
        </button>
        <input
          id={id}
          type="range"
          min={SCHUIF.min}
          max={SCHUIF.max}
          step={SCHUIF.stap}
          value={waarde}
          aria-valuetext={`${euro(waarde)} per maand`}
          onChange={(e) => zet(Number(e.target.value))}
        />
        <button
          type="button"
          className="knop"
          aria-label={`${naam}: € ${SCHUIF.stap} meer`}
          disabled={waarde >= SCHUIF.max}
          onClick={() => zet(waarde + SCHUIF.stap)}
        >
          +
        </button>
        <output htmlFor={id} className="mg-student-bedrag">
          {euro(waarde)}
        </output>
      </div>
    </div>
  );
}

export default function Academie({ data, onKlaar }: MinigameProps) {
  const [k, setK] = useState<StudentKeuzes>(BEGIN);
  const gemeente = gemeentePerMaand(data);
  const perJaar = data.tarieven?.afvalstoffenheffing.een_persoon;
  const over = saldo(k, gemeente);
  const tekort = Math.round(over * 100) < 0;
  const jaar = data.tarieven?.begrotingsjaar ?? data.begroting.begrotingsjaar;

  return (
    <div className="mg-student">
      <p>
        Je studeert in Groningen en woont alleen op een kamer. Verdeel je geld voor één maand. Kom
        je rond? En kun je ook wat sparen?
      </p>
      <table className="mg-student-tabel">
        <caption className="klein">Je maand (voorbeeld)</caption>
        <tbody>
          <tr>
            <th scope="row">
              Inkomen <span className="klein">(voorbeeld: studiefinanciering en bijbaan)</span>
            </th>
            <td className="mg-plus">{euro(VOORBEELD.inkomen)}</td>
          </tr>
          <tr>
            <th scope="row">
              Huur kamer <span className="klein">(voorbeeld)</span>
            </th>
            <td>− {euro(VOORBEELD.huur)}</td>
          </tr>
          <tr>
            <th scope="row">
              Zorgverzekering <span className="klein">(voorbeeld)</span>
            </th>
            <td>− {euro(VOORBEELD.zorgverzekering)}</td>
          </tr>
          <tr>
            <th scope="row">
              Telefoon <span className="klein">(voorbeeld)</span>
            </th>
            <td>− {euro(VOORBEELD.telefoon)}</td>
          </tr>
          <tr className="mg-student-gemeente">
            <th scope="row">
              🏛️ Afvalstoffenheffing van de gemeente{' '}
              <span className="klein">
                (echt tarief {jaar}, één persoon
                {perJaar !== undefined ? `: ${euro(perJaar)} per jaar, gedeeld door 12` : ''})
              </span>
            </th>
            <td>− {euro(gemeente)}</td>
          </tr>
        </tbody>
      </table>
      <p className="klein">
        Je huurt, dus je betaalt geen OZB en rioolheffing zelf. Die betaalt de eigenaar van het
        huis. Hij rekent ze wel mee in je huur: zo betaal je de OZB toch, via je huur.
      </p>

      {SCHUIVEN.map((s) => (
        <Schuif
          key={s.sleutel}
          naam={s.naam}
          uitleg={s.uitleg}
          waarde={k[s.sleutel]}
          onWijzig={(w) => setK((oud) => ({ ...oud, [s.sleutel]: w }))}
        />
      ))}

      <div
        role="status"
        className={`mg-student-saldo ${tekort ? 'tekort' : 'genoeg'}`}
        data-testid="mg-student-saldo"
      >
        {tekort ? (
          <p>
            ❌ Je komt <strong>{euro(-over)}</strong> tekort deze maand.
          </p>
        ) : (
          <p>
            ✅ Je houdt <strong>{euro(Math.max(0, over))}</strong> over.
            {k.sparen > 0 ? ` En je spaart ${euro(k.sparen)}.` : ' Je spaart nog niets.'}
          </p>
        )}
        <p className="klein">
          Naar de gemeente: {euro(gemeente)} per maand. Dat is{' '}
          {aandeelGemeente(gemeente).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}% van je
          inkomen.
        </p>
      </div>

      <p className="klein">
        Spelregel voor de punten: rondkomen en sparen = 100, alleen rondkomen = 70, tekort = 30.
      </p>
      <button
        type="button"
        className="knop-indienen"
        onClick={() => onKlaar(studentScore(k, gemeente), 100)}
      >
        Klaar
      </button>
    </div>
  );
}

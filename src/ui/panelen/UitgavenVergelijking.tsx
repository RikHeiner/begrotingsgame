/**
 * Onderaan een gebouw: wat de gemeente per inwoner uitgaf aan de thema's van dat gebouw, naast
 * andere grote gemeenten. Het zijn cijfers van een eerder jaar; dat staat er steeds bij, zodat
 * niemand denkt dat het om de begroting in de game of om de keuzes van de speler gaat.
 */
import { useState } from 'react';
import { formatEuro } from '../../engine';
import type { Uitgaven } from '../../engine/schema';
import { vergelijkUitgaven, type ThemaVergelijking, type UitgavenRij } from '../../game/uitgaven';

const euro = (x: number) => formatEuro(Math.round(x));

function Staven({
  rijen,
  middelste,
  label,
}: {
  rijen: UitgavenRij[];
  middelste: { naam: string; perInwoner: number };
  label: string;
}) {
  const max = Math.max(...rijen.map((r) => r.perInwoner), middelste.perInwoner, 1);
  const plek = rijen.findIndex((r) => r.perInwoner > middelste.perInwoner);
  const alle: (UitgavenRij | { naam: string; perInwoner: number; middelste: true })[] = [...rijen];
  alle.splice(plek < 0 ? rijen.length : plek, 0, { ...middelste, middelste: true });
  return (
    <ol className="woonlasten-staven" aria-label={label}>
      {alle.map((r) => {
        const klasse = 'middelste' in r ? 'gemiddeld' : r.eigen ? 'eigen' : undefined;
        return (
          <li
            key={'middelste' in r ? 'middelste' : r.code}
            className={klasse}
            {...('middelste' in r ? {} : { 'data-gemeente': r.naam })}
          >
            <span className="woonlasten-naam">{r.naam}</span>
            <span className="woonlasten-staaf" aria-hidden="true">
              <span style={{ width: `${(Math.max(0, r.perInwoner) / max) * 100}%` }} />
            </span>
            <span className="woonlasten-bedrag">{euro(r.perInwoner)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Thema({ t, jaar, stuk }: { t: ThemaVergelijking; jaar: number; stuk: string }) {
  const [alle, setAlle] = useState(false);
  return (
    <section className="uitgaven-thema" data-thema={t.id}>
      <h4>
        {t.naam} <span className="uitgaven-jaar">{jaar}</span>
      </h4>
      <p>
        {t.eigen.naam} begrootte in {jaar} <strong>{euro(t.eigen.perInwoner)} per inwoner</strong>.
        De middelste van de {t.aantal} grote gemeenten: {euro(t.middelste)}. {t.eigen.naam} staat op
        plaats {t.rang} van de {t.aantal}; plaats 1 geeft het minst uit.
      </p>
      {t.letOp && <p className="klein">{t.letOp}</p>}
      <Staven
        rijen={alle ? t.alle : t.kort}
        middelste={{ naam: `Middelste van de ${t.aantal}`, perInwoner: t.middelste }}
        label={`${t.naam}: uitgaven per inwoner in de ${stuk} ${jaar}`}
      />
      <button type="button" className="link-knop" onClick={() => setAlle((a) => !a)}>
        {alle ? 'Minder gemeenten tonen' : `Alle ${t.aantal} grote gemeenten tonen`}
      </button>
    </section>
  );
}

export function UitgavenVergelijking({
  uitgaven,
  gebouw,
  begrotingsjaar,
}: {
  uitgaven: Uitgaven;
  gebouw: string;
  begrotingsjaar: number;
}) {
  const v = vergelijkUitgaven(uitgaven, gebouw);
  if (!v) return null;
  const stuk = v.verslagsoort === 'begroting' ? 'begrotingen' : 'jaarrekeningen';
  return (
    <details className="uitgaven" data-testid="uitgaven-vergelijking">
      <summary>
        Vergelijk met andere gemeenten <span className="uitgaven-jaar">cijfers uit {v.jaar}</span>
      </summary>
      <p className="uitgaven-let-op" role="note" data-testid="uitgaven-let-op">
        <strong>Let op: dit zijn cijfers uit {v.jaar}.</strong> Ze komen uit de {stuk} {v.jaar} van
        de gemeenten zelf
        {v.jaar < begrotingsjaar && <>, niet uit de begroting {begrotingsjaar} van deze game</>}.
        Jouw keuzes zie je hier niet terug.
      </p>
      {v.themas.map((t) => (
        <Thema key={t.id} t={t} jaar={v.jaar} stuk={stuk} />
      ))}
      <p className="klein">
        {v.definitie} Grote gemeenten: {v.groep}. Bron: {v.bronnen.join('; ')}.
      </p>
    </details>
  );
}

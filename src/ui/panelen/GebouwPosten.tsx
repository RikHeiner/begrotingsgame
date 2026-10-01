/**
 * De posten van één gebouw: schuiven voor de onderdelen, het belastingloket of de actiekaarten van
 * het veilinghuis. Gebruikt in het gebouwpaneel én in de lijstweergave.
 */
import { formatMln, grensBelasting, grensOnderdeel, type Data, type Resultaat } from '../../engine';
import type { Gebouw } from '../../engine/schema';
import { useSpel } from '../../game/state/store';
import { Schuif } from './Schuif';

function directBedrag(data: Data, r: Resultaat, bron: string): number {
  const jaar = data.jaren[0];
  return r.effecten
    .filter((e) => e.jaar === jaar && e.stap === 'direct' && e.bron === bron)
    .reduce((s, e) => s + e.bedrag, 0);
}

function Bedrag({ euro }: { euro: number }) {
  if (Math.abs(euro) < 50_000) return null;
  return (
    <span className={`bedrag ${euro > 0 ? 'positief' : 'negatief'}`}>
      {formatMln(euro, { teken: true })} per jaar
    </span>
  );
}

export function GebouwPosten({
  gebouw,
  data,
  resultaat,
}: {
  gebouw: Gebouw;
  data: Data;
  resultaat: Resultaat;
}) {
  const zetOnderdeel = useSpel((s) => s.zetOnderdeel);
  const zetBelasting = useSpel((s) => s.zetBelasting);
  const wisselKaart = useSpel((s) => s.wisselKaart);
  const k = resultaat.keuzes;

  if (gebouw.soort === 'loket') {
    return (
      <ul className="posten">
        {data.begroting.belastingen.map((b) => {
          const g = grensBelasting(b);
          return (
            <li key={b.id}>
              <Schuif
                id={`${gebouw.id}-${b.id}`}
                label={`${b.naam} (${formatMln(b.opbrengst_mln * 1e6)})`}
                min={g.min}
                max={g.max}
                waarde={k.belastingen[b.id] ?? 0}
                beschrijving={b.uitleg}
                onChange={(v) => zetBelasting(b.id, v)}
              />
              <Bedrag euro={directBedrag(data, resultaat, b.id)} />
            </li>
          );
        })}
      </ul>
    );
  }

  if (gebouw.soort === 'veilinghuis') {
    return (
      <ul className="posten kaarten">
        {data.begroting.actiekaarten.map((kaart) => {
          const aan = k.kaarten.includes(kaart.id);
          return (
            <li key={kaart.id}>
              <button
                type="button"
                className={`actiekaart${aan ? ' aan' : ''}`}
                aria-pressed={aan}
                onClick={() => wisselKaart(kaart.id)}
              >
                <span className="actiekaart-soort">
                  {kaart.structureel_of_incidenteel === 'S' ? 'Elk jaar' : 'Eenmalig'}
                </span>
                <strong>{kaart.naam}</strong>
                <span>{kaart.uitleg}</span>
                <span className={kaart.bedrag_mln >= 0 ? 'positief' : 'negatief'}>
                  {formatMln(kaart.bedrag_mln * 1e6, { decimalen: 2, teken: true })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="posten">
      {gebouw.onderdelen.map((id) => {
        const o = data.index.onderdelen.get(id);
        if (!o) return null;
        const g = grensOnderdeel(o);
        const pct = k.onderdelen[id] ?? 0;
        const vergrendeld = g.min === 0 && g.max === 0;
        const tekst = vergrendeld
          ? o.reden_vergrendeld
          : pct < 0
            ? o.tekst_bezuinigen
            : pct > 0
              ? o.tekst_investeren
              : null;
        const label = `${vergrendeld ? '🔒 ' : o.wettelijke_taak ? '⚖️ ' : ''}${o.naam} (${formatMln((o.lasten_mln - o.gekoppelde_baten_mln) * 1e6)} netto)`;
        return (
          <li key={id}>
            <Schuif
              id={`${gebouw.id}-${id}`}
              label={label}
              min={g.min}
              max={g.max}
              waarde={pct}
              vergrendeld={vergrendeld}
              beschrijving={
                [
                  tekst,
                  o.wettelijke_taak && !vergrendeld
                    ? `Wettelijke taak: niet lager dan ${g.min}%.`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              onChange={(v) => zetOnderdeel(id, v)}
            />
            <Bedrag euro={directBedrag(data, resultaat, id)} />
          </li>
        );
      })}
    </ul>
  );
}

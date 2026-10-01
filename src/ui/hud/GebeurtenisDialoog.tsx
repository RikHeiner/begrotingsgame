/**
 * Campagnemodus: de kaarten van deze ronde. Elk bedrag is een scenario (percentage van een post uit
 * de begroting), geen voorspelling.
 */
import { formatMln, type Data, type Resultaat } from '../../engine';
import { jaarVanRonde, kaartBedrag } from '../../game/campagne';
import { useSpel } from '../../game/state/store';
import { Dialoog } from '../algemeen/Dialoog';

export function GebeurtenisDialoog({ data, resultaat }: { data: Data; resultaat: Resultaat }) {
  const campagne = useSpel((s) => s.campagne);
  const open = useSpel((s) => s.kaartenOpen);
  const zetOpen = useSpel((s) => s.zetKaartenOpen);
  if (!campagne) return null;
  const jaar = jaarVanRonde(data, campagne.ronde);
  const kaarten = campagne.getrokken[campagne.ronde - 1] ?? [];
  const s = resultaat.perJaar[jaar]?.structureel ?? 0;
  const i = resultaat.perJaar[jaar]?.incidenteel ?? 0;
  const laatste = campagne.ronde === data.jaren.length;
  return (
    <Dialoog
      open={open}
      onSluit={() => zetOpen(false)}
      titel={`Ronde ${campagne.ronde} van ${data.jaren.length}: ${jaar}`}
    >
      <div data-testid="gebeurtenissen">
        <p>
          {campagne.ronde === 1
            ? `Je bestuurt de gemeente vier jaar, van ${data.jaren[0]} tot en met ${data.jaren.at(-1)}. Elk jaar gebeurt er iets. Wat je kiest, geldt vanaf het jaar van de ronde.`
            : `Het is ${jaar}. Je keuzes uit eerdere jaren werken door. Dit is er gebeurd:`}
        </p>
        <ul className="kaartjes">
          {kaarten.map((id) => {
            const g = data.index.gebeurtenissen.get(id);
            if (!g) return null;
            const { bedrag, soort } = kaartBedrag(resultaat, id, jaar);
            return (
              <li key={id} className={`gebeurtenis ${bedrag >= 0 ? 'meevaller' : 'tegenvaller'}`}>
                <p className="gebeurtenis-soort">
                  {bedrag >= 0 ? '🎉 Meevaller' : '⚡ Tegenvaller'}
                </p>
                <h3>{g.naam}</h3>
                <p>{g.tekst}</p>
                <p className="gebeurtenis-bedrag">
                  <strong className={bedrag >= 0 ? 'positief' : 'negatief'}>
                    {formatMln(bedrag, { teken: true })}
                  </strong>{' '}
                  {soort === 'S' ? `per jaar, vanaf ${jaar}` : `eenmalig in ${jaar}`}
                </p>
                <p className="klein">⚠︎ Dit bedrag is een scenario, geen voorspelling.</p>
              </li>
            );
          })}
        </ul>
        <p>
          Je saldo in {jaar}: elk jaar{' '}
          <strong className={s < -0.5 ? 'negatief' : 'positief'}>
            {formatMln(s, { teken: true })}
          </strong>
          , eenmalig <strong>{formatMln(i, { teken: true })}</strong>.{' '}
          {s < -0.5 || s + i < -0.5
            ? 'Stuur bij, zodat je begroting weer sluit.'
            : 'Je begroting sluit nog.'}
        </p>
        {laatste && <p>Dit is de laatste ronde. Daarna zie je je score over de hele periode.</p>}
        <button type="button" className="knop-indienen" onClick={() => zetOpen(false)}>
          Aan de slag
        </button>
      </div>
    </Dialoog>
  );
}

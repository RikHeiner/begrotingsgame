/**
 * Startscherm: jij bent gemeenteraadslid. Wie betaalt meer of minder, wat gaat de gemeente doen,
 * wat kan minder of later, en sluit je begroting? De teksten staan in spel/teksten.json.
 */
import { useEffect, useRef } from 'react';
import type { Data } from '../../engine';

const vul = (tekst: string, waarden: Record<string, string>) =>
  tekst.replace(/\{(\w+)\}/g, (m, k: string) => waarden[k] ?? m);

export function Startscherm({ data, onBegin }: { data: Data; onBegin: () => void }) {
  const kop = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    kop.current?.focus();
    window.scrollTo(0, 0);
  }, []);
  const t = data.teksten.start;
  const jaar = data.begroting.begrotingsjaar;
  const lasten = data.begroting.totalen.lasten_excl_reserves_x1000[String(jaar)] ?? 0;
  const waarden = {
    bedrag: `€ ${Math.round(lasten / 1000).toLocaleString('nl-NL')} miljoen`,
    jaar: String(jaar),
  };
  return (
    <main className="startscherm" data-testid="startscherm">
      <p className="start-boven">{data.teksten.titel}</p>
      <h1 ref={kop} tabIndex={-1}>
        {t.kop}
      </h1>
      <p className="start-intro">{vul(t.intro, waarden)}</p>
      <ul className="start-vragen">
        {t.vragen.map((v) => (
          <li key={v.kop}>
            <span className="start-icoon" aria-hidden="true">
              {v.icoon}
            </span>
            <h2>{v.kop}</h2>
            <p>{v.tekst}</p>
          </li>
        ))}
      </ul>
      <h2 className="start-hoe-kop">{t.hoe_kop}</h2>
      <ol className="start-hoe">
        {t.hoe.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ol>
      <button
        type="button"
        className="knop-indienen start-knop"
        data-testid="begin"
        onClick={onBegin}
      >
        {t.knop}
      </button>
      <p className="klein start-noot">{vul(t.noot, waarden)}</p>
    </main>
  );
}

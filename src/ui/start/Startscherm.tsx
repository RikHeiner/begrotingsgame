/**
 * Startscherm als pop-up over de gemeente: jij bent gemeenteraadslid. Wie betaalt meer of minder,
 * wat gaat de gemeente doen, wat kan minder of later, en sluit je begroting? De kaart blijft
 * erachter zichtbaar. Bij het eerste bezoek kies je waar je begint: bij nul (de standaard) of met
 * de begroting van het college. Later (vanuit Instellingen) is het alleen uitleg, zodat je keuzes
 * niet per ongeluk verdwijnen. De teksten staan in spel/teksten.json.
 */
import { useEffect, useRef } from 'react';
import type { Data } from '../../engine';
import type { Beginpunt } from '../../game/nulbasis';

const vul = (tekst: string, waarden: Record<string, string>) =>
  tekst.replace(/\{(\w+)\}/g, (m, k: string) => waarden[k] ?? m);

export function Startscherm({
  data,
  alleenUitleg = false,
  onSluit,
  onBegin,
}: {
  data: Data;
  /** later geopend: alleen een knop terug, je keuzes blijven */
  alleenUitleg?: boolean;
  /** sluiten zonder opnieuw te beginnen (Escape, buiten de pop-up, of terug) */
  onSluit: () => void;
  onBegin: (beginpunt: Beginpunt) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    d?.scrollTo?.(0, 0);
    return () => {
      if (d?.open) d.close();
    };
  }, []);
  const t = data.teksten.start;
  const jaar = data.begroting.begrotingsjaar;
  const lasten = data.begroting.totalen.lasten_excl_reserves_x1000[String(jaar)] ?? 0;
  const waarden = {
    bedrag: `€ ${Math.round(lasten / 1000).toLocaleString('nl-NL')} miljoen`,
    jaar: String(jaar),
  };
  return (
    <dialog
      ref={ref}
      className="startscherm"
      aria-labelledby="start-kop"
      data-testid="startscherm"
      // Escape of buiten de pop-up klikken: verder met het beginpunt dat al klaarstaat.
      onClose={onSluit}
      onClick={(e) => {
        if (e.target === ref.current) onSluit();
      }}
    >
      <div className="start-inhoud">
        <p className="start-boven">{data.teksten.titel}</p>
        {/* De focus begint bij de kop, zodat de pop-up bovenaan opent. */}
        <h2 id="start-kop" tabIndex={-1} autoFocus>
          {t.kop}
        </h2>
        <p className="start-intro">{vul(t.intro, waarden)}</p>
        <ul className="start-vragen">
          {t.vragen.map((v) => (
            <li key={v.kop}>
              <span className="start-icoon" aria-hidden="true">
                {v.icoon}
              </span>
              <h3>{v.kop}</h3>
              <p>{v.tekst}</p>
            </li>
          ))}
        </ul>
        <h3 className="start-hoe-kop">{t.hoe_kop}</h3>
        <ol className="start-hoe">
          {t.hoe.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ol>
        {alleenUitleg ? (
          <button
            type="button"
            className="knop-indienen start-knop"
            data-testid="start-terug"
            onClick={onSluit}
          >
            {t.knop_terug}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="knop-indienen start-knop"
              data-testid="begin"
              onClick={() => onBegin('nul')}
            >
              {t.knop}
            </button>
            <button
              type="button"
              className="knop start-knop start-knop-college"
              data-testid="begin-college"
              onClick={() => onBegin('college')}
            >
              {t.knop_college}
            </button>
            <p className="klein start-keuze-uitleg">{t.keuze_uitleg}</p>
          </>
        )}
        <p className="klein start-noot">{vul(t.noot, waarden)}</p>
      </div>
    </dialog>
  );
}

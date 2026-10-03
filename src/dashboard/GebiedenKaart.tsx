/**
 * Heatmap van de inzendingen per gebied, op dezelfde kaart als de game (zonder gebouwen).
 * Eén kleur, van licht naar donker; elk gebied heeft ook het aantal als label, en er is een tabel.
 */
import { useEffect, useState } from 'react';
import { haalJson } from '../app/haalJson';
import type { Data } from '../engine';
import type { BuurtGeo, KaartGeometrie } from '../game/kaart/geometrie';

type Rij = { id: string; naam: string; aantal: number };

const STAPPEN = 4;

/** Klasse 0 is "geen inzendingen"; 1 tot en met 4 verdelen het bereik tot het hoogste aantal. */
function klasse(aantal: number, max: number): number {
  if (aantal <= 0 || max <= 0) return 0;
  return Math.max(1, Math.ceil((aantal / max) * STAPPEN));
}

export function GebiedenKaart({ data, rijen }: { data: Data; rijen: Rij[] }) {
  const [geo, setGeo] = useState<KaartGeometrie>();
  const [fout, setFout] = useState(false);
  useEffect(() => {
    let weg = false;
    Promise.all([import('../game/kaart/geometrie'), haalJson('gemeente-groningen-buurten.geojson')])
      .then(([{ maakGeometrie }, buurten]) => {
        if (!weg) setGeo(maakGeometrie(data, buurten as BuurtGeo));
      })
      .catch(() => !weg && setFout(true));
    return () => {
      weg = true;
    };
  }, [data]);

  const opGebied = new Map(rijen.map((r) => [r.id, r.aantal]));
  const max = Math.max(0, ...data.gebieden.gebieden.map((g) => opGebied.get(g.id) ?? 0));
  // Legenda: alleen de klassen die bij dit hoogste aantal echt voorkomen, met hun bereik.
  const grenzen: { klasse: number; van: number; tot: number }[] = [];
  for (let v = 1; v <= max; v++) {
    const k = klasse(v, max);
    const laatste = grenzen.at(-1);
    if (laatste?.klasse === k) laatste.tot = v;
    else grenzen.push({ klasse: k, van: v, tot: v });
  }
  const onbekend = rijen.find((r) => r.id === 'onbekend')?.aantal ?? 0;

  const midden = (gebied: string) => {
    if (!geo) return undefined;
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const b of geo.buurten)
      if (b.gebied === gebied)
        for (const p of b.ringen[0] ?? []) {
          sx += p.x;
          sy += p.y;
          n++;
        }
    return n ? { x: sx / n, y: sy / n } : undefined;
  };

  return (
    <figure className="grafiek dash-kaart">
      {geo ? (
        <svg
          viewBox={`0 0 ${geo.breedte} ${geo.hoogte}`}
          role="img"
          aria-labelledby="heat-titel"
          data-testid="heatmap"
        >
          <title id="heat-titel">Aantal inzendingen per gebied van de gemeente Groningen</title>
          {geo.buurten.map((b) => (
            <path
              key={b.code}
              className={`heat-${klasse(opGebied.get(b.gebied) ?? 0, max)}`}
              d={b.ringen
                .map((r) => `M${r.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')}Z`)
                .join('')}
            >
              <title>
                {data.gebieden.gebieden.find((g) => g.id === b.gebied)?.naam}:{' '}
                {opGebied.get(b.gebied) ?? 0} inzendingen
              </title>
            </path>
          ))}
          {geo.gebiedsgrenzen.map(([a, z], i) => (
            <line key={i} x1={a.x} y1={a.y} x2={z.x} y2={z.y} className="heat-grens" />
          ))}
          {data.gebieden.gebieden.map((g) => {
            const m = midden(g.id);
            if (!m) return null;
            return (
              <text
                key={g.id}
                x={m.x}
                y={m.y}
                className="heat-label"
                textAnchor="middle"
                fontSize={geo.breedte / 55}
                strokeWidth={geo.breedte / 300}
              >
                <tspan x={m.x}>{g.naam}</tspan>
                <tspan x={m.x} dy="1.15em" className="heat-getal">
                  {opGebied.get(g.id) ?? 0}
                </tspan>
              </text>
            );
          })}
        </svg>
      ) : (
        <p className="klein">{fout ? 'De kaart kon niet worden geladen.' : 'Kaart laden…'}</p>
      )}
      <p className="legenda" aria-hidden="true">
        <span className="legenda-item">
          <span className="stip heat-0" /> 0
        </span>
        {grenzen.map((g) => (
          <span key={g.klasse} className="legenda-item">
            <span className={`stip heat-${g.klasse}`} />{' '}
            {g.van === g.tot ? g.van : `${g.van}–${g.tot}`}
          </span>
        ))}
      </p>
      <figcaption className="klein">
        Aantal inzendingen per gebied. {onbekend} inzenders vulden geen gebied in.
      </figcaption>
      <details>
        <summary>Als tabel</summary>
        <table className="tabel">
          <thead>
            <tr>
              <th scope="col">Gebied</th>
              <th scope="col">Inzendingen</th>
            </tr>
          </thead>
          <tbody>
            {rijen.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.naam}</th>
                <td>{r.aantal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

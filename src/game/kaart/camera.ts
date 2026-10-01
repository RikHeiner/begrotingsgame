/**
 * Camera van de kaart: scherm = wereld × schaal + (x, y). Pure functies voor passen, zoomen en
 * de grenzen (de kaart blijft altijd in beeld).
 */
export type Camera = { x: number; y: number; schaal: number };
export type Maat = { breedte: number; hoogte: number };

/** De schaal waarop de hele gemeente in beeld past. */
export function pasSchaal(wereld: Maat, scherm: Maat, ruimte = 0.96): number {
  return Math.min(scherm.breedte / wereld.breedte, scherm.hoogte / wereld.hoogte) * ruimte;
}

export function pas(wereld: Maat, scherm: Maat): Camera {
  const schaal = pasSchaal(wereld, scherm);
  return {
    schaal,
    x: (scherm.breedte - wereld.breedte * schaal) / 2,
    y: (scherm.hoogte - wereld.hoogte * schaal) / 2,
  };
}

/** Houdt de schaal tussen min en max, en de kaart in beeld. */
export function klem(c: Camera, wereld: Maat, scherm: Maat, zoomMax: number): Camera {
  const min = pasSchaal(wereld, scherm);
  const schaal = Math.min(min * zoomMax, Math.max(min, c.schaal));
  const as = (pos: number, wereldMaat: number, schermMaat: number) => {
    const maat = wereldMaat * schaal;
    if (maat <= schermMaat) return (schermMaat - maat) / 2;
    return Math.min(0, Math.max(schermMaat - maat, pos));
  };
  return {
    schaal,
    x: as(c.x, wereld.breedte, scherm.breedte),
    y: as(c.y, wereld.hoogte, scherm.hoogte),
  };
}

/** Zoomt met een factor rond een punt op het scherm (dat punt blijft op zijn plek). */
export function zoomOm(c: Camera, factor: number, sx: number, sy: number): Camera {
  const schaal = c.schaal * factor;
  return { schaal, x: sx - (sx - c.x) * factor, y: sy - (sy - c.y) * factor };
}

/** Camera die een rechthoek in de wereld vult. */
export function naarKader(
  kader: { x: number; y: number; b: number; h: number },
  scherm: Maat,
  ruimte = 0.8,
): Camera {
  const schaal = Math.min(scherm.breedte / kader.b, scherm.hoogte / kader.h) * ruimte;
  return {
    schaal,
    x: scherm.breedte / 2 - (kader.x + kader.b / 2) * schaal,
    y: scherm.hoogte / 2 - (kader.y + kader.h / 2) * schaal,
  };
}

export const naarWereld = (c: Camera, sx: number, sy: number) => ({
  x: (sx - c.x) / c.schaal,
  y: (sy - c.y) / c.schaal,
});
export const naarScherm = (c: Camera, wx: number, wy: number) => ({
  x: wx * c.schaal + c.x,
  y: wy * c.schaal + c.y,
});

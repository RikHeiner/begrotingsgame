/**
 * De laatste foto van de gemeentekaart (een data-URL), gemaakt als de kaart verdwijnt, bijvoorbeeld
 * bij indienen. De deelafbeelding en het eindscherm laten "jouw gemeente" zien.
 */
let foto: string | undefined;

export function zetKaartFoto(url: string | undefined): void {
  if (url) foto = url;
}

export function kaartFoto(): string | undefined {
  return foto;
}

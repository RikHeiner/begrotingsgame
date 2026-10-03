/**
 * De waarschuwing dat er een fout in kan zitten: meld het, maar je kunt er geen rechten aan
 * ontlenen (spel/teksten.json, fout_melden). Met een e-mailadres wordt de vraag een link.
 */
import type { Data } from '../../engine';

export function FoutMelden({ data }: { data: Data }) {
  const f = data.teksten.fout_melden;
  const link = f.email
    ? `mailto:${f.email}?subject=${encodeURIComponent(f.onderwerp)}&body=${encodeURIComponent(
        `Pagina: ${window.location.href}\n\nWat klopt er niet?\n`,
      )}`
    : undefined;
  return (
    <p className="klein fout-melden" data-testid="fout-melden">
      <span aria-hidden="true">⚠︎ </span>
      {f.tekst} {link ? <a href={link}>{f.vraag}</a> : <strong>{f.vraag}</strong>}
    </p>
  );
}

import type { Data } from '../../engine';

export function DebugPagina({ data }: { data: Data }) {
  return <p>{data.begroting.onderdelen.length} posten geladen.</p>;
}

/** Gezichtje in vijf stappen bij een tevredenheid van 0 tot 100. */
export function gezicht(score: number): string {
  if (score < 30) return '😢';
  if (score < 45) return '🙁';
  if (score < 55) return '😐';
  if (score < 70) return '🙂';
  return '😄';
}

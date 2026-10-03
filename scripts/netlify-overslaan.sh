#!/bin/sh
# Netlify vraagt dit script of een build mag worden overgeslagen (exit 0 = overslaan, 1 = bouwen).
# We publiceren alleen als de fractie erom vraagt: dan staat [netlify] in een commitbericht.
# Netlify geeft mee welke commit nu wordt gebouwd (COMMIT_REF) en welke de vorige keer
# (CACHED_COMMIT_REF). We kijken naar alle commits daartussen, niet alleen de laatste.

# Een voorbeeldversie van een pull request: altijd overslaan (kost alleen tegoed).
[ "$CONTEXT" = "deploy-preview" ] && exit 0

# Met de hand gestart in Netlify (zelfde commit als de vorige keer): gewoon bouwen.
[ -n "$COMMIT_REF" ] && [ "$COMMIT_REF" = "$CACHED_COMMIT_REF" ] && exit 1

if [ -n "$CACHED_COMMIT_REF" ] && git cat-file -e "$CACHED_COMMIT_REF" 2>/dev/null; then
  berichten=$(git log --pretty=%B "$CACHED_COMMIT_REF..${COMMIT_REF:-HEAD}")
else
  # De vorige commit is niet bekend (bijvoorbeeld een ondiepe kopie): kijk naar de laatste tien.
  berichten=$(git log -10 --pretty=%B "${COMMIT_REF:-HEAD}")
fi

echo "$berichten" | grep -qF '[netlify]' && exit 1
exit 0

#!/usr/bin/env bash
# Renders easywed-pilot-sale.html to easywed-pilot-sale.pdf (A4, one page) with headless Chrome.
# Usage: ./build-pdf.sh [file.html]   (defaults to easywed-pilot-sale.html)
set -euo pipefail

cd "$(dirname "$0")"
SRC="${1:-easywed-pilot-sale.html}"
OUT="${SRC%.html}.pdf"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

if [[ ! -x "$CHROME" ]]; then
  echo "Chrome not found at: $CHROME (set CHROME=/path/to/chrome)" >&2
  exit 1
fi

# virtual-time-budget gives Google Fonts time to load before printing.
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=8000 \
  --print-to-pdf="$PWD/$OUT" "file://$PWD/$SRC" 2>/dev/null

# The page tree's /Count is the page total; Chrome writes it uncompressed.
PAGES=$(grep -a -o "/Count [0-9]*" "$OUT" | head -1 | awk '{print $2}')
echo "Wrote $OUT (${PAGES:-?} page(s))"
if [[ "$PAGES" -gt 1 ]]; then
  echo "Warning: PDF looks like $PAGES pages; the offer should fit on one." >&2
fi
if grep -q "—\|–" "$SRC"; then
  echo "Warning: $SRC contains an em/en dash." >&2
fi

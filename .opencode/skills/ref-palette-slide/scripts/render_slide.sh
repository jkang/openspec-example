#!/usr/bin/env bash
# Render a .pptx to PNG so it can be visually inspected.
#
# Two backends, tried in order:
#   1. LibreOffice (soffice) -> PDF -> pdftoppm/sips     (preferred, headless)
#   2. macOS Keynote via AppleScript -> PDF -> sips      (fallback; see CAVEAT)
#
# Usage:  ./render_slide.sh deck.pptx out_dir
#
# CAVEAT (Keynote backend): Keynote restores whatever decks the user had open
# ("Resume"). A naive `set theDoc to front document` will silently export the
# USER'S deck instead of yours. This script therefore copies the deck to a
# unique filename, opens it, and targets the document by name. It never closes
# or modifies any other open document.
set -euo pipefail

IN="${1:?usage: render_slide.sh deck.pptx out_dir}"
OUTDIR="${2:?usage: render_slide.sh deck.pptx out_dir}"
mkdir -p "$OUTDIR"
rm -f "$OUTDIR/render.pdf" "$OUTDIR"/render*.png

ABS_IN="$(cd "$(dirname "$IN")" && pwd)/$(basename "$IN")"
ABS_OUT="$(cd "$OUTDIR" && pwd)"

# ---------------------------------------------------------------- backend 1
if command -v soffice >/dev/null 2>&1 || [ -x "/Applications/LibreOffice.app/Contents/MacOS/soffice" ]; then
  SOFFICE="$(command -v soffice || echo /Applications/LibreOffice.app/Contents/MacOS/soffice)"
  "$SOFFICE" --headless --convert-to pdf --outdir "$ABS_OUT" "$ABS_IN" >/dev/null
  PDF="$ABS_OUT/$(basename "${ABS_IN%.*}").pdf"
  if command -v pdftoppm >/dev/null 2>&1; then
    pdftoppm -jpeg -r 150 "$PDF" "$ABS_OUT/slide"
    echo "rendered with LibreOffice -> $ABS_OUT/slide-*.jpg"
  else
    sips -s format png --resampleWidth 1920 "$PDF" --out "$ABS_OUT/render.png" >/dev/null
    echo "rendered with LibreOffice -> $ABS_OUT/render.png"
  fi
  exit 0
fi

# ---------------------------------------------------------------- backend 2
if [ "$(uname)" != "Darwin" ]; then
  echo "no renderer available (install LibreOffice + poppler)" >&2
  exit 1
fi

TS="$(date +%s)$$"
WORK="$ABS_OUT/_kwork"
mkdir -p "$WORK"
TMP="$WORK/_refslide_${TS}.pptx"
cp "$ABS_IN" "$TMP"

osascript <<APPLESCRIPT
set inPath to "$TMP"
set outPath to "$ABS_OUT/render.pdf"
set baseName to do shell script "basename " & quoted form of inPath & " | sed 's/\\\\.[^.]*\$//'"
tell application "Keynote"
  activate
  set targetDoc to missing value
  repeat with d in documents
    if (name of d) is baseName then set targetDoc to d
  end repeat
  if targetDoc is missing value then
    open POSIX file inPath
    repeat 40 times
      delay 1
      repeat with d in documents
        if (name of d) is baseName then set targetDoc to d
      end repeat
      if targetDoc is not missing value then exit repeat
    end repeat
  end if
  if targetDoc is missing value then error "target document not found: " & baseName
  export targetDoc to POSIX file outPath as PDF
  delay 1
  close targetDoc saving no
end tell
APPLESCRIPT

rm -rf "$WORK"
sips -s format png --resampleWidth 1920 "$ABS_OUT/render.pdf" --out "$ABS_OUT/render.png" >/dev/null
echo "rendered with Keynote -> $ABS_OUT/render.png"

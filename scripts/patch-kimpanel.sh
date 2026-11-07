#!/bin/bash
# Patch the kimpanel GNOME Shell extension to replace the default input
# method indicator with an EVKey-style badge: a fixed-size colored square
# with the language letter ("V" on red for Vietnamese, "E" on blue for
# English). The badge is always rendered as text, so fcitx5's colored
# icons (e.g. the unikey flag) are never displayed, and switching input
# methods never shifts the panel items.
#
# Why vendored: gnome-shell-ext (gext) updates overwrite the extension
# files, hence this script. If the kimpanel extension gets updated and
# the indicator changes, re-run this script; but also diff
# configs/kimpanel-indicator.js against the new upstream indicator.js to
# make sure nothing important is missed (the vendored file was made
# against kimpanel extension version 92 / GNOME Shell 48).
set -euo pipefail

OMADEBIAN_PATH="${OMADEBIAN_PATH:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)}"
INDICATOR="$HOME/.local/share/gnome-shell/extensions/kimpanel@kde.org/indicator.js"
VENDORED="$OMADEBIAN_PATH/configs/kimpanel-indicator.js"

if [ ! -f "$INDICATOR" ]; then
    echo "kimpanel extension not installed (expected at $INDICATOR)" >&2
    exit 1
fi
if [ ! -f "$VENDORED" ]; then
    echo "vendored patch not found at $VENDORED" >&2
    exit 1
fi

if grep -q "EVKey-style indicator" "$INDICATOR" 2>/dev/null; then
    echo "kimpanel indicator was already patched (no change)."
    exit 0
fi

# Sanity check: the vendored file was written for this indicator layout.
if ! grep -q "panel-status-menu-box" "$INDICATOR"; then
    echo "Upstream indicator.js looks different from what the patch " >&2
    echo "was written against. Review the new version before forcing." >&2
    exit 1
fi

cp "$VENDORED" "$INDICATOR"
echo "kimpanel indicator patched. Relogin (Wayland) for it to take effect."

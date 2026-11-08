#!/bin/bash
# Launch the Zalo web app in an isolated Chromium profile (own process,
# --class=zalo, X11 ozone) and tag the window with _GTK_APPLICATION_ID=zalo
# so GNOME Shell associates it with zalo.desktop regardless of any WM_CLASS
# heuristics. _GTK_APPLICATION_ID is the highest-priority signal in the
# shell window tracker, which makes the Zalo icon stick in Alt-Tab/overview.
set -uo pipefail

ZALO_PROFILE="$HOME/.local/share/zalo-pwa"

flatpak run --command=/app/bin/chromium org.chromium.Chromium \
  --user-data-dir="$ZALO_PROFILE" \
  --class=zalo \
  --ozone-platform=x11 \
  --app=https://chat.zalo.me/ >/dev/null 2>&1 &

# Wait for the window to appear, then tag it. Best effort: if xprop is
# missing or the window is slow, the WM_CLASS fallback still applies.
for _ in $(seq 1 20); do
    sleep 1
    id=$(DISPLAY=:0 xprop -root _NET_CLIENT_LIST 2>/dev/null | grep -oE '0x[0-9a-f]+' |
        while read -r wid; do
            cls=$(DISPLAY=:0 xprop -id "$wid" WM_CLASS 2>/dev/null)
            case "$cls" in *'"zalo"'*) echo "$wid"; break ;; esac
        done | head -1)
    [ -n "$id" ] && DISPLAY=:0 xprop -id "$id" -f _GTK_APPLICATION_ID 8s \
        -set _GTK_APPLICATION_ID "zalo" >/dev/null 2>&1 && break
done
exit 0

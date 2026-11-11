#!/bin/bash
# Launch the Zalo web app in an isolated Chromium profile (own process,
# --class=zalo, X11 ozone) at a fixed, comfortable size, centered on the
# primary monitor.
#
# The window is a Flatpak sandbox window, so GNOME Shell's window tracker
# only accepts desktop files whose ID starts with the sandbox prefix
# "org.gnome.Chromium." — hence the companion desktop entry must be
# named org.gnome.Chromium.zalo.desktop (StartupWMClass=zalo).
set -u

ZALO_PROFILE="$HOME/.local/share/zalo-pwa"
SIZE="1150,850"

# Center on the primary monitor (the window is an X11 client, so ask X).
POS=""
geo=$(DISPLAY=:0 xrandr --current 2>/dev/null | grep -w primary | grep -oE '[0-9]+x[0-9]+\+[0-9]+\+[0-9]+' | head -1)
if [[ "$geo" =~ ([0-9]+)x([0-9]+)\+([0-9]+)\+([0-9]+) ]]; then
    W=${BASH_REMATCH[1]}; H=${BASH_REMATCH[2]}
    X=${BASH_REMATCH[3]}; Y=${BASH_REMATCH[4]}
    read -r w h < <(echo "$SIZE" | tr ',' ' ')
    POS="--window-position=$((X + (W - w) / 2)),$((Y + (H - h) / 2))"
fi

exec flatpak run --command=/app/bin/chromium org.chromium.Chromium \
  --user-data-dir="$ZALO_PROFILE" \
  --class=zalo \
  --ozone-platform=x11 \
  --app=https://chat.zalo.me/ \
  --window-size="$SIZE" ${POS:+"$POS"} >/dev/null 2>&1

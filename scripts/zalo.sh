#!/bin/bash
# Launch the Zalo web app in an isolated Chromium profile (own process,
# --class=zalo, X11 ozone).
#
# The window is a Flatpak sandbox window, so GNOME Shell's window tracker
# only accepts desktop files whose ID starts with the sandbox prefix
# "org.chromium.Chromium." — hence the companion desktop entry must be
# named org.chromium.Chromium.zalo.desktop (StartupWMClass=zalo). With
# that naming, WM_CLASS matching succeeds and Alt-Tab/overview show the
# Zalo icon instead of Chromium's.
set -u

ZALO_PROFILE="$HOME/.local/share/zalo-pwa"

exec flatpak run --command=/app/bin/chromium org.chromium.Chromium \
  --user-data-dir="$ZALO_PROFILE" \
  --class=zalo \
  --ozone-platform=x11 \
  --app=https://chat.zalo.me/ >/dev/null 2>&1

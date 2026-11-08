#!/bin/bash
# Launch the Zalo web app in an isolated Chromium profile (own process,
# --class=zalo, X11 ozone) and remember the window size across launches:
# a small watcher records the window geometry to ~/.cache/zalo-window-size
# while the app runs, and the last recorded size is restored on next start.
#
# The window is a Flatpak sandbox window, so GNOME Shell's window tracker
# only accepts desktop files whose ID starts with the sandbox prefix
# "org.chromium.Chromium." — hence the companion desktop entry must be
# named org.chromium.Chromium.zalo.desktop (StartupWMClass=zalo).
set -u

STATE="$HOME/.cache/zalo-window-size"
PROFILE="$HOME/.local/share/zalo-pwa"
XDISPLAY="${DISPLAY:-:0}"

restore_args=()
if [ -f "$STATE" ]; then
    read -r w h < <(tr ',' ' ' < "$STATE" 2>/dev/null)
    if [[ "$w" =~ ^[0-9]+$ ]] && [[ "$h" =~ ^[0-9]+$ ]]; then
        restore_args=(--window-size="$w,$h")
    fi
fi

flatpak run --command=/app/bin/chromium org.chromium.Chromium \
    --user-data-dir="$PROFILE" \
    --class=zalo \
    --ozone-platform=x11 \
    --app=https://chat.zalo.me/ \
    ${restore_args[@]+"${restore_args[@]}"} >/dev/null 2>&1 &
APP_PID=$!

# Record the window geometry until the app exits.
(
    while kill -0 "$APP_PID" 2>/dev/null; do
        id=$(DISPLAY=$XDISPLAY xprop -root _NET_CLIENT_LIST 2>/dev/null |
            grep -oE '0x[0-9a-f]+' |
            while read -r wid; do
                case "$(DISPLAY=$XDISPLAY xprop -id "$wid" WM_CLASS 2>/dev/null)" in
                    *'"zalo"'*) echo "$wid"; break ;;
                esac
            done | head -1)
        if [ -n "$id" ]; then
            DISPLAY=$XDISPLAY xwininfo -id "$id" 2>/dev/null |
                awk '/^  Width:/{w=$2} /^  Height:/{h=$2}
                     END{if(w && h) printf "%d %d\n", w, h}' > "$STATE"
        fi
        sleep 3
    done
) >/dev/null 2>&1 &
disown

exit 0

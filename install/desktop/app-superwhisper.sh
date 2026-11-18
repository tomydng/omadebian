#!/usr/bin/env bash
set -euo pipefail

# Superwhisper: offline voice dictation (English + Vietnamese) running the
# Cohere Transcribe model on the local GPU (Vulkan). Keys in daily use:
#   F9 = press to start, press again to stop (toggle)
#   F8 = hold to talk, release to paste (hold)
#
# Traps learned the hard way — do not "simplify" these away:
# - The official installer and the daemon both spawn `python3`; a mise/nix
#   python3 shadows the system one and lacks python3-gi, which breaks the
#   desktop-portal keybinding flow. The install runs with the system python
#   first on PATH, and a systemd user override pins the daemon to it.
# - GNOME forbids modifier-only shortcuts: RightAlt/RightSuper/RightControl
#   alone are all rejected ("hold Alt" only works on Hyprland/Omarchy).
#   That is why dictation lives on F8/F9 instead.
# - Shortcut registration goes through the GlobalShortcuts portal, so GNOME
#   shows an approval dialog that a human must click — see the manual steps
#   printed at the end.

SUDO=sudo
export PATH="$HOME/.local/bin:$PATH"

# 1) System dependencies (apt skips anything already installed).
$SUDO apt-get install -y \
  python3 python3-gi python3-gi-cairo gir1.2-gtk-4.0 gir1.2-atspi-2.0 \
  at-spi2-core pipewire-bin pulseaudio-utils libnotify-bin wl-clipboard \
  ffmpeg libvulkan1 mesa-vulkan-drivers minisign librsvg2-common \
  libxkbcommon0 libxkbcommon-x11-0 libwayland-client0 \
  gir1.2-gtk4layershell-1.0 libgtk4-layer-shell0 wtype

# 2) Official installer, with the system python3 first on PATH (see traps).
if ! command -v superwhisper >/dev/null 2>&1; then
  curl -fsSL https://tux.superwhisper.com/install.sh \
    | PATH=/usr/bin:/bin:/usr/local/bin:"$PATH" sh
fi

# 3) Pin the daemon to the system python3 as well: its desktop-portal
#    bindings need python3-gi, which the mise-installed python3 lacks.
mkdir -p "$HOME/.config/systemd/user/superwhisper.service.d"
cat > "$HOME/.config/systemd/user/superwhisper.service.d/override.conf" <<'EOF'
[Service]
# System python first: the desktop-portal bindings need python3-gi, which the
# mise-installed python3 lacks.
Environment="PATH=/usr/bin:/bin:/usr/local/bin:%h/.local/bin"
EOF
systemctl --user daemon-reload
systemctl --user restart superwhisper 2>/dev/null || true

# 4) Load the fcitx5 text-commit addon, so dictation types through the IME
#    instead of clipboard-pasting.
pgrep -x fcitx5 >/dev/null 2>&1 && fcitx5 -r -d >/dev/null 2>&1 || true

# 5) Settings: auto language detection (EN/VI), casual tone, autostart,
#    free the model RAM after 5 idle minutes.
superwhisper general set language '"auto"'
superwhisper general set tone '"casual"'
superwhisper general set launchAtLogin true
superwhisper general set linux.autoUnloadModels true
superwhisper general set linux.historyEnabled true

# 6) Offline mode + models (~2.2 GB total). The service downloads one model
#    at a time, so a detached queue waits for each and starts the next.
superwhisper models select offline
if ! pgrep -f superwhisper-model-queue >/dev/null 2>&1; then
  nohup bash -c '
    # superwhisper-model-queue
    export PATH="$HOME/.local/bin:$PATH"
    for _ in $(seq 1 240); do
      states=$(superwhisper models show 2>/dev/null | /usr/bin/python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    raise SystemExit(1)
wanted = {\"cohere-transcription\", \"cleanup\", \"vocabulary\", \"voice-detection\"}
print(\" \".join(m[\"id\"] + \":\" + m[\"download\"][\"state\"]
                for m in d.get(\"models\", []) if m[\"id\"] in wanted))")
      [ -n "$states" ] || { sleep 15; continue; }
      echo "$states" | grep -qE ":(downloading|paused|cancelling)" && { sleep 15; continue; }
      next=$(echo "$states" | tr " " "\n" | grep ":missing" | head -1 | cut -d: -f1)
      [ -z "$next" ] && break
      superwhisper models download "$next" >/dev/null 2>&1 || true
      sleep 5
    done
  ' >/dev/null 2>&1 &
fi

# 7) Keys: F9 toggle, F8 hold (modifier-only keys are blocked on GNOME).
superwhisper shortcuts set toggle "F9" >/dev/null 2>&1 || true
superwhisper shortcuts set hold "F8" >/dev/null 2>&1 || true

cat <<'EOF'

Superwhisper configured. Two manual steps remain:
  1. Approve the shortcut dialogs GNOME shows on screen (or re-run
     `superwhisper shortcuts apply`): it asks once per key — F9, F8.
  2. Log out and back in once: enables the recording-pill extension and
     the plain-Escape cancel key.

Daily use: F9 = press to start/stop, F8 = hold to talk, release to paste.
EOF

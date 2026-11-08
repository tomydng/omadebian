#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
uuid='wireguard@tomydng.local'
mkdir -p "$project_dir/dist"
gnome-extensions pack --force --out-dir="$project_dir/dist" \
  --extra-source=icons "$project_dir"
if [[ "${1:-}" == '--pack-only' ]]; then
  printf 'Built: %s/dist/%s.shell-extension.zip\n' "$project_dir" "$uuid"
  exit 0
fi
gnome-extensions install --force "$project_dir/dist/$uuid.shell-extension.zip"

# polkit rule: remember the wg-quick authorization during the session
# (one password prompt on the first toggle). Also make /etc/wireguard
# listable so reading profile names needs no privileges at all; the
# .conf files themselves stay root-only (mode 600).
if sudo -n true 2>/dev/null; then
  SUDO=sudo
elif [[ -t 0 ]]; then
  SUDO=sudo
else
  SUDO=''
fi
if [[ -n "$SUDO" ]]; then
  "$SUDO" cp "$project_dir/polkit/50-omadebian-wireguard.rules" \
    /etc/polkit-1/rules.d/
  "$SUDO" chmod 755 /etc/wireguard
  printf 'Polkit rule installed; /etc/wireguard is now listable.\n'
else
  printf 'NOTE: run this once manually:\n'
  printf '  sudo cp %s/polkit/50-omadebian-wireguard.rules /etc/polkit-1/rules.d/\n' "$project_dir"
  printf '  sudo chmod 755 /etc/wireguard\n'
fi

if gnome-extensions enable "$uuid" 2>/dev/null; then
  printf 'Installed and enabled WireGuard Toggle.\n'
else
  /usr/bin/python3 - <<'PY'
from gi.repository import Gio
settings = Gio.Settings.new('org.gnome.shell')
uuid = 'wireguard@tomydng.local'
enabled = list(settings.get_strv('enabled-extensions'))
if uuid not in enabled:
    settings.set_strv('enabled-extensions', enabled + [uuid])
disabled = list(settings.get_strv('disabled-extensions'))
if uuid in disabled:
    settings.set_strv('disabled-extensions', [value for value in disabled if value != uuid])
Gio.Settings.sync()
PY
  printf 'Installed WireGuard Toggle and queued enablement. Log out and back in once to load the new extension.\n'
fi

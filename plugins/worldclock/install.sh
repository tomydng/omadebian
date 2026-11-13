#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
uuid='worldclock@tomydng.local'
mkdir -p "$project_dir/dist"
glib-compile-schemas --strict "$project_dir/schemas"
gnome-extensions pack --force --out-dir="$project_dir/dist" \
  --schema=schemas/org.gnome.shell.extensions.worldclock.gschema.xml "$project_dir"

# Expose the schema to the user schema source as well, so gsettings CLI
# and external tools can read it.
mkdir -p "$HOME/.local/share/glib-2.0/schemas"
cp "$project_dir/schemas/org.gnome.shell.extensions.worldclock.gschema.xml" \
  "$HOME/.local/share/glib-2.0/schemas/"
glib-compile-schemas "$HOME/.local/share/glib-2.0/schemas"
if [[ "${1:-}" == '--pack-only' ]]; then
  printf 'Built: %s/dist/%s.shell-extension.zip\n' "$project_dir" "$uuid"
  exit 0
fi
gnome-extensions install --force "$project_dir/dist/$uuid.shell-extension.zip"
# Already-known extensions enable immediately; new ones are discovered at login.
if gnome-extensions enable "$uuid" 2>/dev/null; then
  printf 'Installed and enabled World Clock.\n'
else
  /usr/bin/python3 - <<'PY'
from gi.repository import Gio
settings = Gio.Settings.new('org.gnome.shell')
uuid = 'worldclock@tomydng.local'
enabled = list(settings.get_strv('enabled-extensions'))
if uuid not in enabled:
    settings.set_strv('enabled-extensions', enabled + [uuid])
disabled = list(settings.get_strv('disabled-extensions'))
if uuid in disabled:
    settings.set_strv('disabled-extensions', [value for value in disabled if value != uuid])
Gio.Settings.sync()
PY
  printf 'Installed World Clock and queued enablement. Log out and back in once to load the new extension.\n'
fi

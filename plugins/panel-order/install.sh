#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
uuid='panel-order@tomydng.local'
mkdir -p "$project_dir/dist"
gnome-extensions pack --force --out-dir="$project_dir/dist" "$project_dir"
if [[ "${1:-}" == '--pack-only' ]]; then
  printf 'Built: %s/dist/%s.shell-extension.zip\n' "$project_dir" "$uuid"
  exit 0
fi
gnome-extensions install --force "$project_dir/dist/$uuid.shell-extension.zip"
if gnome-extensions enable "$uuid" 2>/dev/null; then
  printf 'Installed and enabled Panel Order.\n'
else
  /usr/bin/python3 - <<'PY'
from gi.repository import Gio
settings = Gio.Settings.new('org.gnome.shell')
uuid = 'panel-order@tomydng.local'
enabled = list(settings.get_strv('enabled-extensions'))
if uuid not in enabled:
    settings.set_strv('enabled-extensions', enabled + [uuid])
Gio.Settings.sync()
PY
  printf 'Installed Panel Order and queued enablement. Log out and back in once to load it.\n'
fi

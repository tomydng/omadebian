#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
uuid='agents@tomydng.local'
mkdir -p "$project_dir/dist"
glib-compile-schemas --strict "$project_dir/schemas"
gnome-extensions pack --force --out-dir="$project_dir/dist" \
  --extra-source=collector.py --extra-source=quota.js --extra-source=icons \
  --extra-source=LICENSE --extra-source=THIRD_PARTY_NOTICES.md \
  --schema=schemas/org.gnome.shell.extensions.agents.gschema.xml "$project_dir"
if [[ "${1:-}" == '--pack-only' ]]; then
  printf 'Built: %s/dist/%s.shell-extension.zip\n' "$project_dir" "$uuid"
  exit 0
fi
gnome-extensions install --force "$project_dir/dist/$uuid.shell-extension.zip"
# Some Shell versions can register it immediately; others discover it at login.
gdbus call --session --dest org.gnome.Shell.Extensions \
  --object-path /org/gnome/Shell/Extensions \
  --method org.gnome.Shell.Extensions.ReloadExtension "$uuid" >/dev/null 2>&1 || true
if gnome-extensions enable "$uuid" 2>/dev/null; then
  printf 'Installed and enabled Agents.\n'
else
  /usr/bin/python3 - <<'PY'
from gi.repository import Gio
settings = Gio.Settings.new('org.gnome.shell')
uuid = 'agents@tomydng.local'
enabled = list(settings.get_strv('enabled-extensions'))
if uuid not in enabled:
    settings.set_strv('enabled-extensions', enabled + [uuid])
disabled = list(settings.get_strv('disabled-extensions'))
if uuid in disabled:
    settings.set_strv('disabled-extensions', [value for value in disabled if value != uuid])
Gio.Settings.sync()
PY
  printf 'Installed Agents and queued enablement. Log out and back in once to load the new extension.\n'
fi

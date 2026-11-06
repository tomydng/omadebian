#!/usr/bin/env bash
set -euo pipefail
uuid='agents@tomydng.local'
gnome-extensions disable "$uuid" 2>/dev/null || true
gnome-extensions uninstall "$uuid"
printf 'Removed Agents. Your Claude/Codex sign-ins are unchanged.\n'

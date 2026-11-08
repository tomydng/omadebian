#!/bin/bash
# Update the tarball-installed Anki at ~/.local/opt/anki/<version> (the
# `current` symlink selects the active one). Downloads the latest
# linux-qt6 release from GitHub, installs it side-by-side and flips the
# symlink, keeping only the two most recent versions.
set -euo pipefail

ANKI_HOME="$HOME/.local/opt/anki"
API_URL="https://api.github.com/repos/ankitects/anki/releases/latest"

if [ -d "$ANKI_HOME" ]; then
    :
elif [ -e /usr/local/bin/anki ]; then
    echo "⚠️  Anki: found a foreign install at /usr/local (not managed here)."
    echo "    Remove it (sudo rm /usr/local/bin/anki; sudo rm -rf /usr/local/share/anki)"
    echo "    and make sure launchers point at ~/.local/bin/anki."
    exit 0
else
    echo "⚠️  Anki install not found at $ANKI_HOME, skipping..."
    exit 0
fi
if [ -e /usr/local/bin/anki ]; then
    foreign="$(readlink -f /usr/local/bin/anki 2>/dev/null || true)"
    managed="$(readlink -f "$HOME/.local/bin/anki" 2>/dev/null || true)"
    if [ -n "$foreign" ] && [ "$foreign" != "$managed" ]; then
        echo "⚠️  Anki: stale copy also installed at /usr/local — remove it to avoid update nags:"
        echo "    sudo rm /usr/local/bin/anki && sudo rm -rf /usr/local/share/anki"
    fi
fi

current="$(basename "$(readlink -f "$ANKI_HOME/current" 2>/dev/null || true)")"
echo "🔄 Anki: checking latest version (current: ${current:-unknown})..."
release_json="$(curl -fsSL "$API_URL")" || {
    echo "⚠️  Anki: cannot reach GitHub, skipping..."
    exit 0
}
latest="$(printf '%s' "$release_json" | grep -m1 '"tag_name"' | cut -d'"' -f4 || true)"
case "$(dpkg --print-architecture)" in
    amd64) asset_arch='x86_64' ;;
    arm64) asset_arch='aarch64' ;;
    *) asset_arch="$(dpkg --print-architecture)" ;;
esac
url="$(printf '%s' "$release_json" | grep -m1 -o "https://[^\"]*linux-${asset_arch}.tar.zst" || true)"

if [ -z "$latest" ] || [ -z "$url" ]; then
    echo "⚠️  Anki: could not parse latest release, skipping..."
    exit 0
fi
if [ "$current" = "$latest" ]; then
    echo "✅ Anki $current is already the latest."
    exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "🔄 Anki: downloading $latest..."
curl -fsSL "$url" -o "$tmp/anki.tar.zst"
tar --zstd -xf "$tmp/anki.tar.zst" -C "$tmp"
src="$(find "$tmp" -maxdepth 1 -mindepth 1 -type d -name 'anki-*' | head -1)"
if [ -z "$src" ]; then
    echo "⚠️  Anki: archive layout unexpected, skipping..."
    exit 1
fi
mv "$src" "$ANKI_HOME/$latest"
ln -sfn "$ANKI_HOME/$latest" "$ANKI_HOME/current"

# Keep only the two most recent versions (new + previous rollback).
find "$ANKI_HOME" -maxdepth 1 -mindepth 1 -type d -name '[0-9]*' \
    | sort -V | head -n -2 | xargs -r rm -rf

echo "✅ Anki updated: ${current:-none} → $latest"

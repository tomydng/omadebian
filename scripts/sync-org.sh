#!/usr/bin/env bash

ORG="h3tech-solutions"

echo "📦 Sync org: $ORG"
echo

while read repo; do
  name="$(basename "$repo")"

  if [ -d "$name/.git" ]; then
    echo "🔄 $repo"

    if [ -n "$(git -C "$name" status --porcelain)" ]; then
      echo "⚠  Skip $repo (dirty)"
      continue
    fi

    if ! git -C "$name" pull --ff-only; then
      echo "❌ Pull failed, skip $repo"
      continue
    fi

  else
    echo "🆕 $repo"

    if ! gh repo clone "$repo"; then
      echo "❌ Clone failed, skip $repo"
      continue
    fi
  fi

done < <(
  gh repo list "$ORG" \
    --visibility private \
    --limit 1000 \
    --json nameWithOwner \
    --jq '.[].nameWithOwner'
)

echo
echo "✅ Done (errors were skipped)"

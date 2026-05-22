#!/bin/bash

if [[ -v OMADEBIAN_FIRST_RUN_OPTIONAL_APPS ]] && [[ -n "$OMADEBIAN_FIRST_RUN_OPTIONAL_APPS" ]]; then
  for app in $OMADEBIAN_FIRST_RUN_OPTIONAL_APPS; do
    script="$OMADEBIAN_PATH/install/desktop/optional/app-${app,,}.sh"
    if [ -f "$script" ]; then
      echo "→ optional: $app"
      bash "$script" || echo "  Warning: optional app $app failed, continuing..."
    fi
  done
fi

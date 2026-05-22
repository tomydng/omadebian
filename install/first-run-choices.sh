#!/bin/bash

if [[ "$XDG_CURRENT_DESKTOP" == *"GNOME"* ]]; then
  OPTIONAL_APPS=("Dropbox" "Joplin" "Simplenote" "xpipe")
  OMADEBIAN_FIRST_RUN_OPTIONAL_APPS=$(gum choose "${OPTIONAL_APPS[@]}" --no-limit --height 6 --header "Select optional apps" | tr ' ' '-') || true
  export OMADEBIAN_FIRST_RUN_OPTIONAL_APPS
fi

AVAILABLE_LANGUAGES=("Node.js" "Go" "PHP" "Python" "Elixir" "Rust" "Java")
SELECTED_LANGUAGES="Node.js","Python","Go","Rust"
OMADEBIAN_FIRST_RUN_LANGUAGES=$(gum choose "${AVAILABLE_LANGUAGES[@]}" --no-limit --selected "$SELECTED_LANGUAGES" --height 10 --header "Select programming languages") || true
export OMADEBIAN_FIRST_RUN_LANGUAGES

AVAILABLE_DBS=("MySQL" "Redis" "PostgreSQL")
SELECTED_DBS="MySQL,Redis,PostgreSQL"
OMADEBIAN_FIRST_RUN_DBS=$(gum choose "${AVAILABLE_DBS[@]}" --no-limit --selected "$SELECTED_DBS" --height 5 --header "Select databases (runs in Docker)") || true
export OMADEBIAN_FIRST_RUN_DBS

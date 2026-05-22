#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export OMADEBIAN_PATH="$SCRIPT_DIR"

sudo -v
( while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done ) 2>/dev/null &
SUDO_KEEPALIVE_PID=$!
trap 'kill "$SUDO_KEEPALIVE_PID" 2>/dev/null || true' EXIT

source "$OMADEBIAN_PATH/install/check-version.sh" || { echo "Unsupported system. Aborting."; exit 1; }

echo "Installing gum for interactive prompts..."
bash "$OMADEBIAN_PATH/install/terminal/required/app-gum.sh"

echo "Get ready to make a few choices..."
source "$OMADEBIAN_PATH/install/first-run-choices.sh"
source "$OMADEBIAN_PATH/install/identification.sh"

if [[ "$XDG_CURRENT_DESKTOP" == *"GNOME"* ]]; then
  gsettings set org.gnome.desktop.screensaver lock-enabled false
  gsettings set org.gnome.desktop.session idle-delay 0

  echo "Installing terminal and desktop tools..."
  bash "$OMADEBIAN_PATH/install/terminal.sh"
  bash "$OMADEBIAN_PATH/install/desktop.sh"

  gsettings set org.gnome.desktop.screensaver lock-enabled true
  gsettings set org.gnome.desktop.session idle-delay 300
else
  echo "Only installing terminal tools..."
  bash "$OMADEBIAN_PATH/install/terminal.sh"
fi

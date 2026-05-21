#!/bin/bash

CHOICES=(
  "Dev Language      Install programming language environment"
  "Dev Database      Install development database in Docker"
  "Dropbox           Sync files across computers with ease"
  "Geekbench         CPU benchmaking tool"
  "Ollama            Run LLMs, like Meta's Llama3, locally"
  "Retroarch         Play retro games"
  "Tailscale         Mesh VPN based on WireGuard and with Magic DNS"
  "> All             Re-run any of the default installers"
  "<< Back           "
)

CHOICE=$(gum choose "${CHOICES[@]}" --height 12 --header "Install application")

if [[ "$CHOICE" == "<< Back"* ]] || [[ -z "$CHOICE" ]]; then
  echo ""
elif [[ "$CHOICE" == "> All"* ]]; then
  INSTALLER_FILE=$(gum file $OMADEBIAN_PATH/install)

  [[ -n "$INSTALLER_FILE" ]] &&
    gum confirm "Run installer?" &&
    source $INSTALLER_FILE &&
    gum spin --spinner globe --title "Install completed!" -- sleep 3
else
  INSTALLER=$(echo "$CHOICE" | awk -F ' {2,}' '{print $1}' | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')

  case "$INSTALLER" in
  "dev-language") INSTALLER_FILE="$OMADEBIAN_PATH/install/terminal/select-dev-language.sh" ;;
  "dev-database") INSTALLER_FILE="$OMADEBIAN_PATH/install/terminal/select-dev-storage.sh" ;;
  "ollama") INSTALLER_FILE="$OMADEBIAN_PATH/install/terminal/optional/app-ollama.sh" ;;
  "tailscale") INSTALLER_FILE="$OMADEBIAN_PATH/install/terminal/optional/app-tailscale.sh" ;;
  "geekbench") INSTALLER_FILE="$OMADEBIAN_PATH/install/terminal/optional/app-geekbench.sh" ;;
  *) INSTALLER_FILE="$OMADEBIAN_PATH/install/desktop/optional/app-$INSTALLER.sh" ;;
  esac

  source $INSTALLER_FILE && gum spin --spinner globe --title "Install completed!" -- sleep 3
fi

clear
source $OMADEBIAN_PATH/bin/omadebian

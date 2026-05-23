#!/bin/bash

export PATH="$HOME/.local/bin:$PATH"

run() {
  local name
  name=$(basename "$1")
  echo "→ $name"
  bash "$1" || echo "  Warning: $name failed, continuing..."
}

# Flatpak must run first (other apps depend on it)
run "$OMADEBIAN_PATH/install/desktop/a-flatpak.sh"

# Terminal emulators
run "$OMADEBIAN_PATH/install/desktop/app-ghostty.sh"
run "$OMADEBIAN_PATH/install/desktop/app-alacritty.sh"

# Browsers
run "$OMADEBIAN_PATH/install/desktop/app-firefox.sh"
run "$OMADEBIAN_PATH/install/desktop/app-brave.sh"
run "$OMADEBIAN_PATH/install/desktop/app-chrome.sh"

# Editors
run "$OMADEBIAN_PATH/install/desktop/app-vscode.sh"
run "$OMADEBIAN_PATH/install/desktop/app-zed.sh"

# Desktop apps (APT)
sudo apt install -y vlc flameshot gnome-sushi gnome-tweaks wl-clipboard obs-studio

# Desktop apps (Flatpak)
flatpak install -y flathub \
  com.bitwarden.desktop \
  com.usebruno.Bruno \
  org.gimp.GIMP \
  com.getpostman.Postman \
  com.mongodb.Compass || true

# Apps with complex installs
run "$OMADEBIAN_PATH/install/desktop/app-lens-k8s.sh"
run "$OMADEBIAN_PATH/install/desktop/app-localsend.sh"

# Ulauncher (app launcher)
run "$OMADEBIAN_PATH/install/desktop/ulauncher.sh"

# GNOME configuration
run "$OMADEBIAN_PATH/install/desktop/set-gnome-settings.sh"
run "$OMADEBIAN_PATH/install/desktop/set-gnome-hotkeys.sh"
run "$OMADEBIAN_PATH/install/desktop/set-gnome-extensions.sh"
run "$OMADEBIAN_PATH/install/desktop/set-dock.sh"

# Custom GNOME application shortcuts
for script in "$OMADEBIAN_PATH/applications/"*.sh; do
  bash "$script" || true
done

echo ""
echo "Installation complete. Reboot to apply all settings."
read -rp "Reboot now? [y/N] " choice
[[ "$choice" =~ ^[Yy]$ ]] && sudo reboot || true

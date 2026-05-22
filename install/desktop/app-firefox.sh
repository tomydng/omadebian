#!/bin/bash

# Remove Firefox ESR and Flatpak versions if present
sudo apt remove --purge firefox-esr -y
flatpak uninstall -y org.mozilla.firefox 2>/dev/null || true

# Install Firefox from Mozilla's official APT repo
if [ ! -f /etc/apt/sources.list.d/mozilla.list ]; then
  curl -fsSL https://packages.mozilla.org/apt/repo-signing-key.gpg \
    | sudo gpg --dearmor -o /usr/share/keyrings/packages.mozilla.org.gpg
  echo "deb [signed-by=/usr/share/keyrings/packages.mozilla.org.gpg] https://packages.mozilla.org/apt mozilla main" \
    | sudo tee /etc/apt/sources.list.d/mozilla.list
fi
sudo apt update && sudo apt install -y firefox

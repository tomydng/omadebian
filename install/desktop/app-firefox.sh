#!/bin/bash

# Remove default Firefox ESR if installed
sudo apt remove --purge firefox-esr -y

# Install standard Firefox via Flatpak
flatpak install -y flathub org.mozilla.firefox

#!/bin/bash

cd /tmp
ULAUNCHER_VERSION=$(curl -s https://api.github.com/repos/Ulauncher/Ulauncher/releases/latest | grep -Po '"tag_name": "\K[^"]*')
wget -O ulauncher.deb "https://github.com/Ulauncher/Ulauncher/releases/download/${ULAUNCHER_VERSION}/ulauncher_${ULAUNCHER_VERSION}_all.deb"
sudo apt install -y ./ulauncher.deb
rm ulauncher.deb
cd -

# Start ulauncher to have it populate config before we overwrite
mkdir -p ~/.config/autostart/
cp ~/.local/share/omadebian/configs/ulauncher.desktop ~/.config/autostart/ulauncher.desktop
gtk-launch ulauncher.desktop >/dev/null 2>&1
sleep 2 # ensure enough time for ulauncher to set defaults
cp ~/.local/share/omadebian/configs/ulauncher.json ~/.config/ulauncher/settings.json

#!/bin/bash

cd /tmp
ULAUNCHER_VERSION=$(curl -s https://api.github.com/repos/Ulauncher/Ulauncher/releases/latest | grep -Po '"tag_name": "\K[^"]*')
wget -O ulauncher.deb "https://github.com/Ulauncher/Ulauncher/releases/download/${ULAUNCHER_VERSION}/ulauncher_${ULAUNCHER_VERSION}_all.deb"
sudo apt install -y ./ulauncher.deb
rm ulauncher.deb
cd -

mkdir -p ~/.config/autostart/
cp "$OMADEBIAN_PATH/configs/ulauncher.desktop" ~/.config/autostart/ulauncher.desktop
gtk-launch ulauncher.desktop >/dev/null 2>&1
sleep 2
cp "$OMADEBIAN_PATH/configs/ulauncher.json" ~/.config/ulauncher/settings.json

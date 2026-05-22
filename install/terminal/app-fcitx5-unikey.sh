#!/bin/bash

sudo apt install -y fcitx5 fcitx5-unikey fcitx5-frontend-all fcitx5-config-qt

mkdir -p ~/.config/fcitx5
cp "$OMADEBIAN_PATH/configs/fcitx5/config" ~/.config/fcitx5/config
cp "$OMADEBIAN_PATH/configs/fcitx5/profile" ~/.config/fcitx5/profile

mkdir -p ~/.config/autostart
cp /usr/share/applications/org.fcitx.Fcitx5.desktop ~/.config/autostart/
